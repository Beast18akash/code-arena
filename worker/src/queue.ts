import { randomUUID } from "node:crypto";
import type { PrismaClientResources } from "../../lib/db-client.js";
import {
  SubmissionJobStatus,
  SubmissionStatus,
  SubmissionVerdict,
} from "../../lib/generated/prisma/index.js";
import type { SubmissionProcessingResult } from "./process-submission.js";

type PrismaClient = PrismaClientResources["prisma"];

const LEASE_DURATION_SECONDS = 180;
const DEFAULT_RECOVERY_BATCH_SIZE = 100;
const BASE_RETRY_DELAY_SECONDS = 5;
const MAX_RETRY_DELAY_SECONDS = 300;
const SAFE_ERROR_CATEGORIES = [
  "judge0-configuration",
  "judge0-request",
  "judge0-timeout",
  "unexpected-judge0-response",
  "execution-failure",
] as const;

export type SafeJobErrorCategory = (typeof SAFE_ERROR_CATEGORIES)[number];

export async function claimAvailableJob(prisma: PrismaClient) {
  const lockToken = randomUUID();

  return prisma.$transaction(async (transaction) => {
    const claimedJobs = await transaction.$queryRaw<{ id: string }[]>`
      WITH candidate AS (
        SELECT "id"
        FROM "SubmissionJob"
        WHERE "attempts" < "maxAttempts"
          AND (
            (
              "status" IN (
                'PENDING'::"SubmissionJobStatus",
                'RETRY_WAIT'::"SubmissionJobStatus"
              )
              AND "availableAt" <= CURRENT_TIMESTAMP
            )
            OR (
              "status" = 'RUNNING'::"SubmissionJobStatus"
              AND "leaseExpiresAt" <= CURRENT_TIMESTAMP
            )
          )
        ORDER BY "availableAt", "createdAt"
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE "SubmissionJob" AS job
      SET
        "status" = 'RUNNING'::"SubmissionJobStatus",
        "attempts" = job."attempts" + 1,
        "lockToken" = ${lockToken},
        "lockedAt" = CURRENT_TIMESTAMP,
        "leaseExpiresAt" = CURRENT_TIMESTAMP + (${LEASE_DURATION_SECONDS} * INTERVAL '1 second'),
        "updatedAt" = CURRENT_TIMESTAMP
      FROM candidate
      WHERE job."id" = candidate."id"
      RETURNING job."id"
    `;

    const claimedJob = claimedJobs[0];
    if (!claimedJob) {
      return null;
    }

    return transaction.submissionJob.findUnique({
      where: { id: claimedJob.id },
      include: { submission: true },
    });
  }, { maxWait: 10_000, timeout: 15_000 });
}

export async function heartbeatJob(
  prisma: PrismaClient,
  jobId: string,
  lockToken: string,
) {
  const updatedRows = await prisma.$executeRaw`
    UPDATE "SubmissionJob"
    SET
      "leaseExpiresAt" = CURRENT_TIMESTAMP + (${LEASE_DURATION_SECONDS} * INTERVAL '1 second'),
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${jobId}
      AND "status" = 'RUNNING'::"SubmissionJobStatus"
      AND "lockToken" = ${lockToken}
      AND "leaseExpiresAt" > CURRENT_TIMESTAMP
  `;

  return updatedRows === 1;
}

export async function completeJob(
  prisma: PrismaClient,
  jobId: string,
  lockToken: string,
  submissionId: string,
  result: SubmissionProcessingResult,
) {
  return prisma.$transaction(async (transaction) => {
    const jobUpdate = await transaction.$executeRaw`
      UPDATE "SubmissionJob"
      SET
        "status" = ${SubmissionJobStatus.SUCCEEDED}::"SubmissionJobStatus",
        "lockedAt" = NULL,
        "leaseExpiresAt" = NULL,
        "lockToken" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${jobId}
        AND "submissionId" = ${submissionId}
        AND "status" = ${SubmissionJobStatus.RUNNING}::"SubmissionJobStatus"
        AND "lockToken" = ${lockToken}
        AND "leaseExpiresAt" > CURRENT_TIMESTAMP
    `;

    if (jobUpdate !== 1) {
      return false;
    }

    await transaction.submission.update({
      where: { id: submissionId },
      data: {
        status: result.verdict === "ACCEPTED"
          ? SubmissionStatus.COMPLETED
          : SubmissionStatus.FAILED,
        verdict: SubmissionVerdict[result.verdict],
        score: result.score,
        stdout: result.stdout,
        stderr: result.stderr,
        compileOutput: result.compileOutput,
      },
    });

    return true;
  });
}

export async function failOrRetryJob(
  prisma: PrismaClient,
  jobId: string,
  lockToken: string,
  submissionId: string,
  attempts: number,
  maxAttempts: number,
  errorCategory: SafeJobErrorCategory,
) {
  if (
    !Number.isSafeInteger(attempts) ||
    attempts < 1 ||
    !Number.isSafeInteger(maxAttempts) ||
    maxAttempts < 1
  ) {
    throw new RangeError("Attempt counts must be positive safe integers.");
  }
  if (!SAFE_ERROR_CATEGORIES.includes(errorCategory)) {
    throw new TypeError("Unsupported job error category.");
  }

  const shouldRetry = attempts < maxAttempts;
  const retryDelaySeconds = Math.min(
    BASE_RETRY_DELAY_SECONDS * 2 ** Math.max(0, attempts - 1),
    MAX_RETRY_DELAY_SECONDS,
  );

  return prisma.$transaction(async (transaction) => {
    const jobUpdate = shouldRetry
      ? await transaction.$executeRaw`
        UPDATE "SubmissionJob"
        SET
          "status" = ${SubmissionJobStatus.RETRY_WAIT}::"SubmissionJobStatus",
          "availableAt" = CURRENT_TIMESTAMP + (${retryDelaySeconds} * INTERVAL '1 second'),
          "lockedAt" = NULL,
          "leaseExpiresAt" = NULL,
          "lockToken" = NULL,
          "lastErrorCode" = ${errorCategory},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${jobId}
          AND "submissionId" = ${submissionId}
          AND "status" = ${SubmissionJobStatus.RUNNING}::"SubmissionJobStatus"
          AND "lockToken" = ${lockToken}
          AND "attempts" = ${attempts}
          AND "maxAttempts" = ${maxAttempts}
          AND "leaseExpiresAt" > CURRENT_TIMESTAMP
      `
      : await transaction.$executeRaw`
        UPDATE "SubmissionJob"
        SET
          "status" = ${SubmissionJobStatus.DEAD}::"SubmissionJobStatus",
          "lockedAt" = NULL,
          "leaseExpiresAt" = NULL,
          "lockToken" = NULL,
          "lastErrorCode" = ${errorCategory},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${jobId}
          AND "submissionId" = ${submissionId}
          AND "status" = ${SubmissionJobStatus.RUNNING}::"SubmissionJobStatus"
          AND "lockToken" = ${lockToken}
          AND "attempts" = ${attempts}
          AND "maxAttempts" = ${maxAttempts}
          AND "leaseExpiresAt" > CURRENT_TIMESTAMP
      `;

    if (jobUpdate !== 1) {
      return false;
    }

    if (!shouldRetry) {
      await transaction.submission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.FAILED,
          verdict: SubmissionVerdict.JUDGE_ERROR,
          score: 0,
        },
      });
    }

    return true;
  });
}

export async function rejectInvalidJob(
  prisma: PrismaClient,
  jobId: string,
  lockToken: string,
  submissionId: string,
) {
  return prisma.$transaction(async (transaction) => {
    const jobUpdate = await transaction.$executeRaw`
      UPDATE "SubmissionJob"
      SET
        "status" = ${SubmissionJobStatus.DEAD}::"SubmissionJobStatus",
        "lockedAt" = NULL,
        "leaseExpiresAt" = NULL,
        "lockToken" = NULL,
        "lastErrorCode" = 'invalid-submission',
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${jobId}
        AND "submissionId" = ${submissionId}
        AND "status" = ${SubmissionJobStatus.RUNNING}::"SubmissionJobStatus"
        AND "lockToken" = ${lockToken}
        AND "leaseExpiresAt" > CURRENT_TIMESTAMP
    `;

    if (jobUpdate !== 1) {
      return false;
    }

    await transaction.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.FAILED,
        verdict: SubmissionVerdict.JUDGE_ERROR,
        score: 0,
      },
    });

    return true;
  });
}

export async function recoverExhaustedJobs(
  prisma: PrismaClient,
  batchSize = DEFAULT_RECOVERY_BATCH_SIZE,
) {
  if (
    !Number.isSafeInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > DEFAULT_RECOVERY_BATCH_SIZE
  ) {
    throw new RangeError(
      `Recovery batch size must be between 1 and ${DEFAULT_RECOVERY_BATCH_SIZE}.`,
    );
  }

  return prisma.$transaction(async (transaction) => {
    const recoveryResult = await transaction.$queryRaw<{ recoveredCount: number }[]>`
      WITH candidates AS (
        SELECT "id", "submissionId"
        FROM "SubmissionJob"
        WHERE "attempts" >= "maxAttempts"
          AND (
            (
              "status" IN (
                'PENDING'::"SubmissionJobStatus",
                'RETRY_WAIT'::"SubmissionJobStatus"
              )
              AND "availableAt" <= CURRENT_TIMESTAMP
            )
            OR (
              "status" = 'RUNNING'::"SubmissionJobStatus"
              AND "leaseExpiresAt" <= CURRENT_TIMESTAMP
            )
          )
        ORDER BY "availableAt", "createdAt"
        FOR UPDATE SKIP LOCKED
        LIMIT ${batchSize}
      ),
      dead_jobs AS (
        UPDATE "SubmissionJob" AS job
        SET
          "status" = 'DEAD'::"SubmissionJobStatus",
          "lockedAt" = NULL,
          "leaseExpiresAt" = NULL,
          "lockToken" = NULL,
          "updatedAt" = CURRENT_TIMESTAMP
        FROM candidates
        WHERE job."id" = candidates."id"
        RETURNING job."submissionId"
      ),
      failed_submissions AS (
        UPDATE "Submission" AS submission
        SET
          "status" = 'FAILED'::"SubmissionStatus",
          "verdict" = 'JUDGE_ERROR'::"SubmissionVerdict",
          "updatedAt" = CURRENT_TIMESTAMP
        FROM dead_jobs
        WHERE submission."id" = dead_jobs."submissionId"
        RETURNING submission."id"
      )
      SELECT COUNT(*)::int AS "recoveredCount"
      FROM failed_submissions
    `;

    return recoveryResult[0]?.recoveredCount ?? 0;
  }, { maxWait: 10_000, timeout: 15_000 });
}
