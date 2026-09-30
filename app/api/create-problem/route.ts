import { NextResponse } from "next/server";
import { UserRole } from "@/lib/generated/prisma/client";
import { getCurrentUserData, currentUserRole } from "@/modules/auth/actions";
import {
  executeJudge0Submission,
  getJudge0LanguageConfig,
  getJudge0Url,
  normalizeJudge0Output,
} from "@/lib/judge0";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const userRole = await currentUserRole();
    const userData = await getCurrentUserData();

    if (!userRole || !userData) {
      return NextResponse.json({ error: "You are not logged in" }, { status: 401 });
    }

    if (userRole !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Not authorized to create problem" }, { status: 401 });
    }

    const judge0Url = getJudge0Url();
    if (!judge0Url) {
      return NextResponse.json(
        { error: "Judge0 is not configured. Set JUDGE0_URL in the server environment." },
        { status: 500 },
      );
    }

    const {
      title,
      description,
      difficulty,
      tags,
      examples,
      constraints,
      testCases,
      codeSnippets,
      referenceSolutions,
    } = await request.json();

    if (!title || !description || !difficulty || !tags || !examples || !constraints || !testCases || !codeSnippets || !referenceSolutions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!Array.isArray(testCases) || testCases.length === 0) {
      return NextResponse.json({ error: "At least one test case is required" }, { status: 400 });
    }

    for (const [language, solutionCode] of Object.entries(referenceSolutions)) {
      const languageConfig = getJudge0LanguageConfig(language);
      if (!languageConfig) {
        return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 });
      }

      const codeString = typeof solutionCode === "string" ? solutionCode.trim() : "";
      const isPlaceholderCode =
        !codeString ||
        /Add your reference solution here|Write your code here/i.test(codeString);

      if (isPlaceholderCode) {
        continue;
      }

      for (const testCase of testCases) {
        const submission = await executeJudge0Submission({
          language_id: languageConfig.judge0LanguageId,
          source_code: codeString,
          stdin: String(testCase.input ?? ""),
          expected_output: String(testCase.output ?? ""),
        });

        const statusId = submission.status?.id;
        const actualOutput = normalizeJudge0Output(submission.stdout ?? "");
        const expectedOutput = normalizeJudge0Output(String(testCase.output ?? ""));

        if (statusId === 6) {
          return NextResponse.json(
            {
              error: `Validation failed for ${language}`,
              testCases: {
                input: String(testCase.input ?? ""),
                expectedOutput: String(testCase.output ?? ""),
                actualOutput: submission.stdout ?? "",
                error: submission.compile_output || submission.stderr || "Compilation failed",
              },
              details: submission,
            },
            { status: 400 },
          );
        }

        if (statusId === 5 || statusId === 7 || statusId === 8 || statusId === 9 || statusId === 10 || statusId === 11 || statusId === 12 || statusId === 13) {
          return NextResponse.json(
            {
              error: `Validation failed for ${language}`,
              testCases: {
                input: String(testCase.input ?? ""),
                expectedOutput: String(testCase.output ?? ""),
                actualOutput: submission.stdout ?? "",
                error: submission.stderr || submission.compile_output || "Execution failed",
              },
              details: submission,
            },
            { status: 400 },
          );
        }

        if (statusId !== 3 || actualOutput !== expectedOutput) {
          return NextResponse.json(
            {
              error: `Validation failed for ${language}`,
              testCases: {
                input: String(testCase.input ?? ""),
                expectedOutput: String(testCase.output ?? ""),
                actualOutput: submission.stdout ?? "",
                error: submission.stderr || submission.compile_output || "Wrong answer",
              },
              details: submission,
            },
            { status: 400 },
          );
        }
      }
    }

    const newProblem = await prisma.problem.create({
      data: {
        title,
        description,
        difficulty,
        tags,
        example: examples,
        constraints,
        testCases,
        codeSnippets,
        referenceSolutions,
        userId: userData.id,
      },
    });

    return NextResponse.json(
      { success: true, message: "Problem created successfully", data: newProblem },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating problem:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create problem" },
      { status: 500 },
    );
  }
}