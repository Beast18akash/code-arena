import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { UserRole } from "@/lib/generated/prisma/client";
import { currentUserRole } from "@/modules/auth/actions";
import { ProblemAdminActions } from "@/modules/problems/components/problem-admin-actions";

export const dynamic = "force-dynamic";

export default async function ProblemsPage() {
  const isAdmin = (await currentUserRole()) === UserRole.ADMIN;
  const problems = await prisma.problem.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      difficulty: true,
      tags: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const seenTitles = new Set<string>();
  const uniqueProblems = problems.filter((problem) => {
    const normalizedTitle = problem.title.trim().toLowerCase();
    if (seenTitles.has(normalizedTitle)) {
      return false;
    }

    seenTitles.add(normalizedTitle);
    return true;
  });

  return (
    <section className="mx-auto w-full max-w-6xl space-y-8 pt-24 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Practice</p>
          <h1 className="mt-2 text-3xl font-bold">Problems</h1>
        </div>
        <p className="text-sm text-muted-foreground">{uniqueProblems.length} available</p>
      </header>

      {uniqueProblems.length === 0 ? (
        <div className="border border-dashed border-border px-6 py-12 text-center">
          <h2 className="text-lg font-semibold">No problems yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">New challenges will appear here when they are published.</p>
        </div>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {uniqueProblems.map((problem, index) => (
            <article key={problem.id} className="grid gap-4 py-5 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center">
              <span className="font-mono text-sm text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="text-lg font-semibold">{problem.title}</h2>
                  <span className={`text-xs font-semibold uppercase ${difficultyColor(problem.difficulty)}`}>
                    {problem.difficulty.toLowerCase()}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{problem.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {problem.tags.map((tag) => (
                    <span key={tag} className="border border-border px-2 py-1 text-xs text-muted-foreground">{tag}</span>
                  ))}
                </div>
              </div>
              {isAdmin ? (
                <ProblemAdminActions problemId={problem.id} problemTitle={problem.title} />
              ) : (
                <Link
                  href={`/problems/${problem.id}`}
                  aria-label={`Solve ${problem.title}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  Solve <ArrowUpRight aria-hidden="true" />
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function difficultyColor(difficulty: string) {
  if (difficulty === "EASY") return "text-emerald-700 dark:text-emerald-400";
  if (difficulty === "MEDIUM") return "text-amber-700 dark:text-amber-400";
  return "text-rose-700 dark:text-rose-400";
}
