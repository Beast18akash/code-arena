import { NextResponse } from "next/server";
import { UserRole } from "@/lib/generated/prisma/client";
import { getCurrentUserData, currentUserRole } from "@/modules/auth/actions";
import {
  Judge0ConfigurationError,
  Judge0RequestError,
  Judge0TimeoutError,
  validateJudge0Configuration,
} from "@/lib/judge0";
import { prisma } from "@/lib/db";
import { validateReferenceSolutions } from "@/lib/problem-validation";
import { problemSchema } from "@/modules/problems/schema";

export async function POST(request: Request) {
  try {
    const userRole = await currentUserRole();
    const userData = await getCurrentUserData();

    if (!userRole || !userData) {
      return NextResponse.json({ error: "You are not logged in" }, { status: 401 });
    }

    if (userRole !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Not authorized to create problem" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    const parsedBody = problemSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid problem data", details: parsedBody.error.flatten() },
        { status: 400 },
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
    } = parsedBody.data;

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

    validateJudge0Configuration();

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

    if (error instanceof Judge0ConfigurationError) {
      return NextResponse.json(
        { error: "Judge0 is not configured correctly" },
        { status: 500 },
      );
    }

    if (error instanceof Judge0TimeoutError) {
      return NextResponse.json({ error: "Judge0 execution timed out" }, { status: 504 });
    }

    if (error instanceof Judge0RequestError) {
      const requestErrorResponse = {
        authentication: { status: 502, message: "Judge0 authentication failed" },
        "rate-limit": {
          status: 503,
          message: "Judge0 is rate limiting requests. Please try again later",
        },
        upstream: { status: 502, message: "Judge0 is temporarily unavailable" },
        network: { status: 502, message: "Judge0 could not be reached" },
        "request-timeout": { status: 504, message: "Judge0 request timed out" },
        http: { status: 502, message: "Judge0 could not complete the request" },
      }[error.kind];

      return NextResponse.json(
        { error: requestErrorResponse.message },
        { status: requestErrorResponse.status },
      );
    }

    return NextResponse.json(
      { error: "Failed to create problem" },
      { status: 500 },
    );
  }
}