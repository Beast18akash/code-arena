import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { prepareJavaSubmission } from "@/lib/java-submission";
import { prepareJavaScriptSubmission } from "@/lib/javascript-submission";
import { preparePythonSubmission } from "@/lib/python-submission";
import { getJudge0LanguageConfig } from "@/lib/judge0";
import {
  SubmissionJobStatus,
  SubmissionStatus,
} from "@/lib/generated/prisma/client";

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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    if (!isRecord(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }

    const problemId = typeof body.problemId === "string" ? body.problemId.trim() : "";
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

    try {
      if (languageConfig.codeArenaLanguage === "Java") {
        prepareJavaSubmission(sourceCode);
      } else if (languageConfig.codeArenaLanguage === "Python") {
        preparePythonSubmission(sourceCode);
      } else if (languageConfig.codeArenaLanguage === "JavaScript") {
        prepareJavaScriptSubmission(sourceCode);
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not prepare submission" },
        { status: 400 },
      );
    }

    const submissionRecord = await prisma.$transaction(async (transaction) => {
      const submission = await transaction.submission.create({
        data: {
          userId: userRecord.id,
          problemId: problem.id,
          language: languageConfig.codeArenaLanguage,
          sourceCode,
          status: SubmissionStatus.PENDING,
        },
      });

      await transaction.submissionJob.create({
        data: {
          submissionId: submission.id,
          status: SubmissionJobStatus.PENDING,
          testCases,
        },
      });

      return submission;
    });

    return NextResponse.json(
      {
        submissionId: submissionRecord.id,
        status: SubmissionStatus.PENDING,
        message: "Submission queued successfully",
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("Submission enqueue error:", error);
    return NextResponse.json({ error: "Failed to queue submission" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const submissionId = new URL(request.url).searchParams.get("submissionId")?.trim();
  if (!submissionId || !/^c[a-z0-9]{24}$/.test(submissionId)) {
    return NextResponse.json({ error: "A valid submissionId is required" }, { status: 400 });
  }

  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "You are not logged in" }, { status: 401 });
    }

    const userRecord = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });

    if (!userRecord) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        userId: userRecord.id,
      },
      select: {
        id: true,
        status: true,
        verdict: true,
        score: true,
        stdout: true,
        stderr: true,
        compileOutput: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    return NextResponse.json({ submission }, { status: 200 });
  } catch (error) {
    console.error("Submission retrieval error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve submission" },
      { status: 500 },
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
