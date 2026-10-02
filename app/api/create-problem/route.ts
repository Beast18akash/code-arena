import { NextResponse } from "next/server";
import { UserRole } from "@/lib/generated/prisma/client";
import { getCurrentUserData, currentUserRole } from "@/modules/auth/actions";
import {
  getJudge0Url,
} from "@/lib/judge0";
import { prisma } from "@/lib/db";
import { validateReferenceSolutions } from "@/lib/problem-validation";

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

    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "A problem title is required" }, { status: 400 });
    }

    const normalizedTitle = title.trim();
    const existingProblem = await prisma.problem.findFirst({
      where: { title: { equals: normalizedTitle, mode: "insensitive" } },
      select: { id: true },
    });

    if (existingProblem) {
      return NextResponse.json(
        { error: "A problem with this title already exists" },
        { status: 409 },
      );
    }

    if (!title || !description || !difficulty || !tags || !examples || !constraints || !testCases || !codeSnippets || !referenceSolutions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!Array.isArray(testCases) || testCases.length === 0) {
      return NextResponse.json({ error: "At least one test case is required" }, { status: 400 });
    }

    const validationFailure = await validateReferenceSolutions(testCases, referenceSolutions);
    if (validationFailure) {
      return NextResponse.json(
        {
          error: `Validation failed for ${validationFailure.language}`,
          testCase: validationFailure.testCase,
          actualOutput: validationFailure.actualOutput,
          details: validationFailure.error,
        },
        { status: 400 },
      );
    }

    const newProblem = await prisma.problem.create({
      data: {
        title: normalizedTitle,
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