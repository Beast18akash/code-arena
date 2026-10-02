"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Plus, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ProblemAdminActions } from "@/modules/problems/components/problem-admin-actions";

type ProblemItem = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  tags: string[];
  isSolved: boolean;
};

export function ProblemsList({
  problems,
  isAdmin,
}: {
  problems: ProblemItem[];
  isAdmin: boolean;
}) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const searchTerm = search.trim().toLowerCase();
  const filteredProblems = problems.filter((problem) => {
    const matchesSearch =
      !searchTerm ||
      problem.title.toLowerCase().includes(searchTerm) ||
      problem.tags.some((tag) => tag.toLowerCase().includes(searchTerm));
    const matchesDifficulty = difficulty === "ALL" || problem.difficulty === difficulty;
    const matchesStatus =
      status === "ALL" || (status === "SOLVED" ? problem.isSolved : !problem.isSolved);

    return matchesSearch && matchesDifficulty && matchesStatus;
  });

  return (
    <section className="mx-auto w-full max-w-6xl space-y-7 pt-24 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6">
        <div>
          <p className="text-xs font-semibold uppercase text-amber-500">Practice library</p>
          <h1 className="mt-2 text-3xl font-bold">Problems</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage and solve coding problems</p>
        </div>
        {isAdmin && (
          <Link href="/create-problem" className={buttonVariants()}>
            <Plus aria-hidden="true" />
            Create Problem
          </Link>
        )}
      </header>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search problems</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search problems"
              className="h-10 w-full border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            />
          </label>
          <label className="sm:w-48">
            <span className="sr-only">Filter by difficulty</span>
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              className="h-10 w-full border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            >
              <option value="ALL">All difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </label>
          <label className="sm:w-40">
            <span className="sr-only">Filter by status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 w-full border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            >
              <option value="ALL">All statuses</option>
              <option value="SOLVED">Solved</option>
              <option value="UNSOLVED">Unsolved</option>
            </select>
          </label>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filteredProblems.length} of {problems.length} problems</span>
          <span>{problems.filter((problem) => problem.isSolved).length} solved</span>
        </div>

        {problems.length === 0 ? (
          <div className="border-y border-border py-14 text-center">
            <h2 className="text-lg font-semibold">No problems yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">New challenges will appear here when they are published.</p>
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="border-y border-border py-14 text-center">
            <h2 className="text-lg font-semibold">No matching problems</h2>
            <p className="mt-2 text-sm text-muted-foreground">Try another search or filter combination.</p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setDifficulty("ALL");
                setStatus("ALL");
              }}
              className="mt-4 text-sm font-semibold text-amber-500 underline underline-offset-4"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="border-y border-border">
            <div className="hidden grid-cols-[minmax(0,1fr)_8rem_8rem_auto] items-center gap-5 border-b border-border px-3 py-3 text-xs font-semibold uppercase text-muted-foreground sm:grid">
              <span>Title</span>
              <span>Difficulty</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-border">
              {filteredProblems.map((problem) => (
                <article
                  key={problem.id}
                  className="grid gap-3 px-3 py-4 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] sm:items-center sm:gap-5"
                >
                  <div className="min-w-0">
                    {isAdmin ? (
                      <h2 className="truncate font-semibold">{problem.title}</h2>
                    ) : (
                      <Link href={`/problems/${problem.id}`} className="truncate font-semibold hover:text-amber-500">
                        {problem.title}
                      </Link>
                    )}
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {problem.tags.join(" · ") || problem.description}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold uppercase ${difficultyColor(problem.difficulty)}`}>
                    {problem.difficulty.toLowerCase()}
                  </span>
                  <span className={`flex items-center gap-2 text-xs ${problem.isSolved ? "text-emerald-500" : "text-muted-foreground"}`}>
                    <span className={`size-1.5 rounded-full ${problem.isSolved ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
                    {problem.isSolved ? "Solved" : "Unsolved"}
                  </span>
                  <div className="flex items-center justify-end">
                    {isAdmin ? (
                      <ProblemAdminActions problemId={problem.id} problemTitle={problem.title} />
                    ) : (
                      <Link
                        href={`/problems/${problem.id}`}
                        aria-label={`Solve ${problem.title}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Solve <ArrowUpRight aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function difficultyColor(difficulty: string) {
  if (difficulty === "EASY") return "text-emerald-500";
  if (difficulty === "MEDIUM") return "text-amber-500";
  return "text-rose-500";
}