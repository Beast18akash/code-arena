import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { UserRole } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { problemSchema } from "@/modules/problems/schema";
import { validateReferenceSolutions } from "@/lib/problem-validation";

type RouteContext = { params: Promise<{ problemId: string }> };

async function getAdminResponse() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    select: { id: true, role: true },
  });

  if (!user || user.role !== UserRole.ADMIN) {
    return { response: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }

  return { userId: user.id };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authorization = await getAdminResponse();
    if (authorization.response) return authorization.response;

    const { problemId } = await params;
    const existingProblem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true },
    });
    if (!existingProblem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    const parsed = problemSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid problem data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const values = parsed.data;
    const title = values.title.trim();
    const duplicate = await prisma.problem.findFirst({
      where: {
        id: { not: problemId },
        title: { equals: title, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "A problem with this title already exists" },
        { status: 409 },
      );
    }

    const validationFailure = await validateReferenceSolutions(
      values.testCases,
      values.referenceSolutions,
    );
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

    const problem = await prisma.problem.update({
      where: { id: problemId },
      data: {
        title,
        description: values.description,
        difficulty: values.difficulty,
        tags: values.tags,
        constraints: values.constraints,
        hints: values.hints || null,
        editorial: values.editorial || null,
        example: values.examples,
        testCases: values.testCases,
        codeSnippets: values.codeSnippets,
        referenceSolutions: values.referenceSolutions,
      },
    });

    return NextResponse.json({ success: true, data: problem });
  } catch (error) {
    console.error("Error updating problem:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update problem" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const authorization = await getAdminResponse();
    if (authorization.response) return authorization.response;

    const { problemId } = await params;
    const existingProblem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true },
    });
    if (!existingProblem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    await prisma.problem.delete({ where: { id: problemId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting problem:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete problem" },
      { status: 500 },
    );
  }
}