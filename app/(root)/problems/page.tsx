import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { UserRole } from "@/lib/generated/prisma/client";
import { currentUserRole } from "@/modules/auth/actions";
import { ProblemsList } from "@/modules/problems/components/problems-list";

export const dynamic = "force-dynamic";

export default async function ProblemsPage() {
  const [role, clerkUser] = await Promise.all([currentUserRole(), currentUser()]);
  const isAdmin = role === UserRole.ADMIN;
  const databaseUser = clerkUser
    ? await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        select: { id: true },
      })
    : null;
  const [problems, acceptedSubmissions] = await Promise.all([
    prisma.problem.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        tags: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    databaseUser
      ? prisma.submission.findMany({
          where: { userId: databaseUser.id, verdict: "ACCEPTED" },
          select: { problemId: true },
        })
      : Promise.resolve([]),
  ]);
  const seenTitles = new Set<string>();
  const uniqueProblems = problems.filter((problem) => {
    const normalizedTitle = problem.title.trim().toLowerCase();
    if (seenTitles.has(normalizedTitle)) {
      return false;
    }

    seenTitles.add(normalizedTitle);
    return true;
  });
  const solvedProblemIds = new Set(acceptedSubmissions.map((submission) => submission.problemId));

  return (
    <ProblemsList
      isAdmin={isAdmin}
      problems={uniqueProblems.map((problem) => ({
        id: problem.id,
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        tags: problem.tags,
        isSolved: solvedProblemIds.has(problem.id),
      }))}
    />
  );
}
