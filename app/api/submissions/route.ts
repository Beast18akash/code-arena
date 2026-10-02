import { NextResponse } from "next/server";
import axios from "axios";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { prepareJavaSubmission } from "@/lib/java-submission";
import { prepareJavaScriptSubmission } from "@/lib/javascript-submission";
import { preparePythonSubmission } from "@/lib/python-submission";
import {
  executeJudge0Submission,
  getJudge0LanguageConfig,
  normalizeJudge0Output,
} from "@/lib/judge0";
import { SubmissionStatus, SubmissionVerdict } from "@/lib/generated/prisma/client";

export async function POST(request: Request) {
  let submissionId: string | null = null;

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

    let executableSource = sourceCode;
    try {
      if (languageConfig.codeArenaLanguage === "Java") {
        executableSource = prepareJavaSubmission(sourceCode);
      } else if (languageConfig.codeArenaLanguage === "Python") {
        executableSource = preparePythonSubmission(sourceCode);
      } else if (languageConfig.codeArenaLanguage === "JavaScript") {
        executableSource = prepareJavaScriptSubmission(sourceCode);
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not prepare submission" },
        { status: 400 },
      );
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
    submissionId = submissionRecord.id;

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
        source_code: executableSource,
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

      if ([7, 8, 9, 10, 11].includes(Number(statusId ?? 0))) {
        verdict = SubmissionVerdict.RUNTIME_ERROR;
        stderr = judgeResult.stderr ?? null;
        stdout = judgeResult.stdout ?? null;
        finalStatus = SubmissionStatus.FAILED;
        break;
      }

      if (statusId !== 3 && statusId !== 4) {
        verdict = SubmissionVerdict.JUDGE_ERROR;
        stderr = judgeResult.stderr ?? null;
        compileOutput = judgeResult.compile_output ?? null;
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
          message: getVerdictMessage(finalVerdict),
          stdout: updatedSubmission.stdout,
          stderr: updatedSubmission.stderr,
          compileOutput: updatedSubmission.compileOutput,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Submission execution error:", error);

    if (submissionId) {
      try {
        await prisma.submission.update({
          where: { id: submissionId },
          data: {
            status: SubmissionStatus.FAILED,
            verdict: SubmissionVerdict.JUDGE_ERROR,
            score: 0,
            stderr: error instanceof Error ? error.message : "Judge0 execution failed",
          },
        });
      } catch (persistenceError) {
        console.error("Failed to persist Judge0 error:", persistenceError);
      }
    }

    if (axios.isAxiosError(error)) {
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

function getVerdictMessage(verdict: SubmissionVerdict) {
  switch (verdict) {
    case SubmissionVerdict.ACCEPTED:
      return "All test cases passed.";
    case SubmissionVerdict.WRONG_ANSWER:
      return "Your program ran, but its output did not match the expected answer.";
    case SubmissionVerdict.COMPILATION_ERROR:
      return "Your code could not be compiled.";
    case SubmissionVerdict.RUNTIME_ERROR:
      return "Your program started but exited with an error.";
    case SubmissionVerdict.TIME_LIMIT_EXCEEDED:
      return "Your program exceeded the execution time limit.";
    case SubmissionVerdict.JUDGE_ERROR:
      return "The judge could not evaluate this submission. Please try again later.";
  }
}
