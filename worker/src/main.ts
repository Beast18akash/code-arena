import "dotenv/config";
import { createPrismaClient } from "../../lib/db-client.js";
import { Prisma } from "../../lib/generated/prisma/index.js";
import {
  claimAvailableJob,
  completeJob,
  failOrRetryJob,
  heartbeatJob,
  recoverExhaustedJobs,
  rejectInvalidJob,
} from "./queue.js";
import {
  processSubmission,
  SubmissionInfrastructureError,
  SubmissionInputError,
  type SubmissionProcessingResult,
} from "./process-submission.js";

const HEARTBEAT_INTERVAL_MS = 60_000;
const EMPTY_QUEUE_DELAY_MS = 2_000;
const RECOVERY_INTERVAL_MS = 60_000;

async function main() {
  let prismaResources: ReturnType<typeof createPrismaClient> | undefined;
  try {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) {
      console.error("DATABASE_URL is required to start the worker.");
      process.exitCode = 1;
      return;
    }

    prismaResources = createPrismaClient(databaseUrl, {
      max: 1,
      connectionTimeoutMillis: 30_000,
      idleTimeoutMillis: 30_000,
    });
    await prismaResources.prisma.$connect();
    console.log("Outcode worker initialized successfully.");
  } catch {
    console.error("Outcode worker initialization failed.");
    process.exitCode = 1;
    if (prismaResources) {
      await disconnectSafely(prismaResources);
    }
    return;
  }

  if (!prismaResources) {
    return;
  }

  try {
    await runWorker(prismaResources.prisma);
  } catch {
    console.error("Outcode worker stopped after an unexpected internal error.");
    process.exitCode = 1;
  } finally {
    await disconnectSafely(prismaResources);
  }
}

async function runWorker(prisma: ReturnType<typeof createPrismaClient>["prisma"]) {
  let shuttingDown = false;
  let nextRecoveryAt = 0;
  let resolveShutdown!: () => void;
  const shutdownSignal = new Promise<void>((resolve) => {
    resolveShutdown = resolve;
  });

  const handleShutdown = () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log("Outcode worker is shutting down; no further jobs will be claimed.");
    resolveShutdown();
  };

  process.once("SIGINT", handleShutdown);
  process.once("SIGTERM", handleShutdown);

  try {
    while (!shuttingDown) {
      if (Date.now() >= nextRecoveryAt) {
        try {
          await recoverExhaustedJobs(prisma);
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            const clientVersion = /^[0-9A-Za-z.+-]{1,32}$/.test(error.clientVersion)
              ? error.clientVersion
              : undefined;
            console.error(
              `Worker could not recover exhausted jobs. Error: PrismaClientKnownRequestError (code: ${error.code}${clientVersion ? `, client: ${clientVersion}` : ""}).`,
            );
          } else {
            let errorName = "UnknownError";
            try {
              if (
                error instanceof Error &&
                /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(error.name)
              ) {
                errorName = error.name;
              }
            } catch {
              errorName = "UnknownError";
            }
            console.error(
              `Worker could not recover exhausted jobs. Error: ${errorName}.`,
            );
          }
        }
        nextRecoveryAt = Date.now() + RECOVERY_INTERVAL_MS;
        if (shuttingDown) {
          break;
        }
      }

      let job;
      try {
        job = await claimAvailableJob(prisma);
      } catch {
        console.error("Worker could not claim a submission job.");
        await waitOrShutdown(EMPTY_QUEUE_DELAY_MS, shutdownSignal);
        continue;
      }

      if (!job) {
        await waitOrShutdown(EMPTY_QUEUE_DELAY_MS, shutdownSignal);
        continue;
      }

      await processClaimedJob(prisma, job);
    }
  } finally {
    process.off("SIGINT", handleShutdown);
    process.off("SIGTERM", handleShutdown);
  }
}

async function processClaimedJob(
  prisma: ReturnType<typeof createPrismaClient>["prisma"],
  job: NonNullable<Awaited<ReturnType<typeof claimAvailableJob>>>,
) {
  const lockToken = job.lockToken;
  if (!lockToken) {
    console.error("Claimed job has no ownership token; leaving it for lease recovery.");
    return;
  }

  let ownershipLost = false;
  let heartbeatInFlight: Promise<void> | undefined;

  const heartbeatTimer = setInterval(() => {
    if (heartbeatInFlight || ownershipLost) {
      return;
    }

    heartbeatInFlight = heartbeatJob(prisma, job.id, lockToken)
      .then((extended) => {
        if (!extended) {
          ownershipLost = true;
          console.error("Worker lost ownership of a submission job.");
        }
      })
      .catch(() => {
        ownershipLost = true;
        console.error("Worker could not confirm submission job ownership.");
      })
      .finally(() => {
        heartbeatInFlight = undefined;
      });
  }, HEARTBEAT_INTERVAL_MS);

  let result: SubmissionProcessingResult | undefined;
  let processingError: unknown;
  let processingFailed = false;

  try {
    result = await processSubmission({
      sourceCode: job.submission.sourceCode,
      language: job.submission.language,
      testCases: job.testCases,
    });
  } catch (error) {
    processingFailed = true;
    processingError = error;
  } finally {
    clearInterval(heartbeatTimer);
    if (heartbeatInFlight) {
      await heartbeatInFlight;
    }
  }

  if (ownershipLost) {
    console.error("Worker discarded a result after ownership became uncertain.");
    return;
  }

  if (!processingFailed && result) {
    try {
      const completed = await completeJob(
        prisma,
        job.id,
        lockToken,
        job.submissionId,
        result,
      );
      if (!completed) {
        console.error("Worker discarded a result because job ownership was no longer valid.");
      }
    } catch {
      console.error("Worker could not persist a completed submission.");
    }
    return;
  }

  if (processingError instanceof SubmissionInputError) {
    try {
      const rejected = await rejectInvalidJob(
        prisma,
        job.id,
        lockToken,
        job.submissionId,
      );
      if (!rejected) {
        console.error("Worker could not reject a submission after ownership was lost.");
      }
    } catch {
      console.error("Worker could not mark an invalid submission as failed.");
    }
    return;
  }

  const errorCategory = processingError instanceof SubmissionInfrastructureError
    ? processingError.code
    : "execution-failure";

  try {
    const transitioned = await failOrRetryJob(
      prisma,
      job.id,
      lockToken,
      job.submissionId,
      job.attempts,
      job.maxAttempts,
      errorCategory,
    );
    if (!transitioned) {
      console.error("Worker could not retry a submission after ownership was lost.");
    }
  } catch {
    console.error("Worker could not schedule a submission retry.");
  }
}

async function waitOrShutdown(delayMs: number, shutdownSignal: Promise<void>) {
  let timeout: ReturnType<typeof setTimeout>;
  await Promise.race([
    new Promise<void>((resolve) => {
      timeout = setTimeout(resolve, delayMs);
    }),
    shutdownSignal,
  ]);
  clearTimeout(timeout!);
}

async function disconnectSafely(
  prismaResources: ReturnType<typeof createPrismaClient>,
) {
  try {
    await prismaResources.disconnect();
  } catch {
    console.error("Outcode worker failed to close its database connection.");
    process.exitCode = 1;
  }
}

void main();
