import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import {
  executeJudge0Submission,
  getJudge0LanguageConfig,
  normalizeJudge0Output,
} from "@/lib/judge0";
import { SubmissionStatus, SubmissionVerdict } from "@/lib/generated/prisma/client";

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "You are not logged in" }, { status: 401 });
    }

    const userRecord = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const problemId = typeof body.problemId === "string" ? body.problemId : "";
    const language = typeof body.language === "string" ? body.language : "";
    const sourceCode = typeof body.sourceCode === "string" ? body.sourceCode : "";

    if (!problemId || !language || !sourceCode.trim()) {
      return NextResponse.json(
        { error: "problemId, language, and sourceCode are required" },
        { status: 400 },
      );
    }

    const languageConfig = getJudge0LanguageConfig(language);
    if (!languageConfig) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
    });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    const testCases = Array.isArray(problem.testCases) ? problem.testCases : [];
    if (!testCases.length) {
      return NextResponse.json({ error: "Problem has no test cases" }, { status: 400 });
    }

    const submissionRecord = await prisma.submission.create({
      data: {
        userId: userRecord.id,
        problemId: problem.id,
        language: languageConfig.codeArenaLanguage,
        sourceCode,
        status: SubmissionStatus.PENDING,
      },
    });

    let passedCases = 0;
    let verdict: SubmissionVerdict = SubmissionVerdict.JUDGE_ERROR;
    let compileOutput: string | null = null;
    let stderr: string | null = null;
    let stdout: string | null = null;
    let finalStatus: SubmissionStatus = SubmissionStatus.COMPLETED;

    for (const testCase of testCases) {
      const input = String((testCase as { input?: string }).input ?? "");
      const expectedOutput = String((testCase as { output?: string }).output ?? "");

      const judgeResult = await executeJudge0Submission({
        language_id: languageConfig.judge0LanguageId,
        source_code: sourceCode,
        stdin: input,
      });

      const statusId = judgeResult.status?.id;
      const actualOutput = normalizeJudge0Output(judgeResult.stdout ?? "");
      const expectedOutputNormalized = normalizeJudge0Output(expectedOutput);

      if (statusId === 6) {
        verdict = SubmissionVerdict.COMPILATION_ERROR;
        compileOutput = judgeResult.compile_output ?? null;
        stderr = judgeResult.stderr ?? null;
        stdout = judgeResult.stdout ?? null;
        finalStatus = SubmissionStatus.FAILED;
        break;
      }

      if (statusId === 5) {
        verdict = SubmissionVerdict.TIME_LIMIT_EXCEEDED;
        stderr = judgeResult.stderr ?? null;
        stdout = judgeResult.stdout ?? null;
        finalStatus = SubmissionStatus.FAILED;
        break;
      }

      if ([7, 8, 9, 10, 11, 12, 13].includes(Number(statusId ?? 0))) {
        verdict = SubmissionVerdict.RUNTIME_ERROR;
        stderr = judgeResult.stderr ?? null;
        stdout = judgeResult.stdout ?? null;
        finalStatus = SubmissionStatus.FAILED;
        break;
      }

      if (actualOutput !== expectedOutputNormalized) {
        verdict = SubmissionVerdict.WRONG_ANSWER;
        stdout = judgeResult.stdout ?? null;
        stderr = judgeResult.stderr ?? null;
        finalStatus = SubmissionStatus.FAILED;
        break;
      }

      passedCases += 1;
      stdout = judgeResult.stdout ?? null;
      stderr = judgeResult.stderr ?? null;
      verdict = SubmissionVerdict.ACCEPTED;
    }

    if (passedCases === testCases.length && verdict === SubmissionVerdict.ACCEPTED) {
      verdict = SubmissionVerdict.ACCEPTED;
      finalStatus = SubmissionStatus.COMPLETED;
    }

    const finalVerdict = verdict ?? SubmissionVerdict.JUDGE_ERROR;
    const finalStatusUpdate = finalStatus ?? SubmissionStatus.COMPLETED;

    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionRecord.id },
      data: {
        status: finalStatusUpdate,
        verdict: finalVerdict,
        score: finalVerdict === SubmissionVerdict.ACCEPTED ? 1 : 0,
        stdout: stdout ?? null,
        stderr: stderr ?? null,
        compileOutput: compileOutput ?? null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        submission: {
          id: updatedSubmission.id,
          verdict: finalVerdict,
          status: finalStatusUpdate,
          score: updatedSubmission.score,
          passedCases,
          totalCases: testCases.length,
          language: updatedSubmission.language,
          stdout: updatedSubmission.stdout,
          stderr: updatedSubmission.stderr,
          compileOutput: updatedSubmission.compileOutput,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Submission execution error:", error);

    if (error instanceof Error && error.message.includes("JUDGE0")) {
      return NextResponse.json(
        { error: "Judge0 is unavailable or failed to execute the submission" },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process submission" },
      { status: 500 },
    );
  }
}
