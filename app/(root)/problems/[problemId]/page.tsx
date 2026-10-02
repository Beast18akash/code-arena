import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { onBoardUser } from "@/modules/auth/actions";
import { ProblemSolver } from "@/modules/problems/components/problem-solver";

export const dynamic = "force-dynamic";

const LANGUAGES = ["JAVASCRIPT", "PYTHON", "JAVA"] as const;

export default async function ProblemDetailPage({
  params,
}: {
  params: Promise<{ problemId: string }>;
}) {
  const { problemId } = await params;
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    select: {
      id: true,
      title: true,
      description: true,
      difficulty: true,
      tags: true,
      constraints: true,
      hints: true,
      example: true,
      codeSnippets: true,
    },
  });

  if (!problem) {
    notFound();
  }

  const user = await onBoardUser();
  const clerkUser = await currentUser();
  const userId = user?.id ?? (clerkUser
    ? (await prisma.user.findUnique({ where: { clerkId: clerkUser.id }, select: { id: true } }))?.id
    : undefined);

  const submissions = userId
    ? await prisma.submission.findMany({
        where: { problemId: problem.id, userId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          language: true,
          status: true,
          verdict: true,
          score: true,
          createdAt: true,
        },
      })
    : [];

  const snippets = problem.codeSnippets as Record<string, unknown>;
  const starterCodeByLanguage = Object.fromEntries(
    LANGUAGES.map((language) => [
      language,
      typeof snippets?.[language] === "string" ? snippets[language] : "",
    ]),
  ) as Record<(typeof LANGUAGES)[number], string>;

  const examples = problem.example as Record<string, unknown>;
  const examplesByLanguage = Object.fromEntries(
    LANGUAGES.map((language) => {
      const example = examples?.[language];
      if (!example || typeof example !== "object" || Array.isArray(example)) {
        return [language, null];
      }

      const value = example as Record<string, unknown>;
      return [language, {
        input: typeof value.input === "string" ? value.input : "",
        output: typeof value.output === "string" ? value.output : "",
        explanation: typeof value.explanation === "string" ? value.explanation : "",
      }];
    }),
  );

  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-6 pt-24 pb-10 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <section className="min-w-0 space-y-7">
        <header className="border-b border-border pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{problem.title}</h1>
            <span className="text-xs font-semibold uppercase text-muted-foreground">{problem.difficulty.toLowerCase()}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {problem.tags.map((tag) => (
              <span key={tag} className="border border-border px-2 py-1 text-xs text-muted-foreground">{tag}</span>
            ))}
          </div>
        </header>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Description</h2>
          <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{problem.description}</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Examples</h2>
          <div className="space-y-3">
            {LANGUAGES.map((language) => {
              const example = examplesByLanguage[language] as { input: string; output: string; explanation: string } | null;
              if (!example) return null;
              return (
                <div key={language} className="border border-border p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">{language}</h3>
                  <p className="text-sm"><span className="font-semibold">Input:</span> <code className="font-mono">{example.input}</code></p>
                  <p className="mt-1 text-sm"><span className="font-semibold">Output:</span> <code className="font-mono">{example.output}</code></p>
                  {example.explanation && <p className="mt-2 text-sm text-muted-foreground">{example.explanation}</p>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-5">
          <h2 className="text-lg font-semibold">Constraints</h2>
          <p className="whitespace-pre-wrap font-mono text-sm text-muted-foreground">{problem.constraints}</p>
          {problem.hints && <p className="pt-2 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Hint:</span> {problem.hints}</p>}
        </div>

        <section className="border-t border-border pt-5" aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-lg font-semibold">Your recent submissions</h2>
          {submissions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {submissions.map((submission) => (
                <li key={submission.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span className="font-medium">{submission.verdict ? formatVerdict(submission.verdict) : submission.status.toLowerCase()}</span>
                  <span className="text-muted-foreground">{submission.language} · {submission.score ?? 0} score · {submission.createdAt.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>

      <ProblemSolver
        problemId={problem.id}
        starterCodeByLanguage={starterCodeByLanguage}
        examplesByLanguage={examplesByLanguage as Record<string, { input: string; output: string; explanation: string } | null>}
      />
    </div>
  );
}

function formatVerdict(verdict: string) {
  return verdict.toLowerCase().split("_").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}
