-- CreateEnum
CREATE TYPE "SubmissionJobStatus" AS ENUM ('PENDING', 'RUNNING', 'RETRY_WAIT', 'SUCCEEDED', 'DEAD');

-- CreateTable
CREATE TABLE "SubmissionJob" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "status" "SubmissionJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "leaseExpiresAt" TIMESTAMP(3),
    "lockToken" TEXT,
    "lastErrorCode" TEXT,
    "testCases" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubmissionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionJob_submissionId_key" ON "SubmissionJob"("submissionId");

-- CreateIndex
CREATE INDEX "SubmissionJob_status_availableAt_idx" ON "SubmissionJob"("status", "availableAt");

-- CreateIndex
CREATE INDEX "SubmissionJob_status_leaseExpiresAt_idx" ON "SubmissionJob"("status", "leaseExpiresAt");

-- AddForeignKey
ALTER TABLE "SubmissionJob" ADD CONSTRAINT "SubmissionJob_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
