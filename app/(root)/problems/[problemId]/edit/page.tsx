import { notFound, redirect } from "next/navigation";
import { UserRole } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { currentUserRole } from "@/modules/auth/actions";
import { CreateProblemForm } from "@/modules/problems/components/create-problem-form";
import type { ProblemFormData } from "@/modules/problems/schema";

export const dynamic = "force-dynamic";

export default async function EditProblemPage({
  params,
}: {
  params: Promise<{ problemId: string }>;
}) {
  const role = await currentUserRole();
  if (role !== UserRole.ADMIN) {
    redirect("/problems");
  }

  const { problemId } = await params;
  const problem = await prisma.problem.findUnique({ where: { id: problemId } });
  if (!problem) {
    notFound();
  }

  const initialValues: ProblemFormData = {
    title: problem.title,
    description: problem.description,
    difficulty: problem.difficulty,
    tags: problem.tags,
    constraints: problem.constraints,
    hints: problem.hints ?? "",
    editorial: problem.editorial ?? "",
    testCases: problem.testCases as unknown as ProblemFormData["testCases"],
    examples: problem.example as unknown as ProblemFormData["examples"],
    codeSnippets: problem.codeSnippets as unknown as ProblemFormData["codeSnippets"],
    referenceSolutions: problem.referenceSolutions as unknown as ProblemFormData["referenceSolutions"],
  };

  return (
    <section className="mx-4 my-4 flex flex-col items-center justify-center">
      <CreateProblemForm problemId={problem.id} initialValues={initialValues} />
    </section>
  );
}