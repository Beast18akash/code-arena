import Link from "next/link";
import { ArrowUpRight, CalendarDays, CheckCircle2, Code2, Languages, Trophy, XCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ProfileData = {
  id: string;
  name: string;
  username: string;
  email: string;
  imageUrl: string | null;
  createdAt: Date;
  totalSubmissions: number;
  acceptedSubmissions: number;
  solvedProblems: number;
  acceptanceRate: number;
  solvedProblemList: Array<{
    problemId: string;
    title: string;
    difficulty: string;
    language: string;
    solvedAt: Date;
  }>;
  recentSubmissions: Array<{
    id: string;
    problemTitle: string;
    language: string;
    verdict: string | null;
    score: number | null;
    status: string;
    createdAt: Date;
  }>;
  languageActivity: Array<{
    language: string;
    count: number;
  }>;
};

function formatVerdict(verdict: string | null | undefined) {
  if (!verdict) return "Pending";

  return verdict
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDifficulty(difficulty: string) {
  const value = difficulty?.toLowerCase() ?? "medium";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toLocaleString() : "0";
}

export function ProfilePage({ profile }: { profile: ProfileData }) {
  const joinedDate = new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(new Date(profile.createdAt));

  const userInitials = profile.name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-24 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[1.45fr_0.8fr]">
        <Card className="border-border bg-card/80">
          <CardHeader className="flex flex-col gap-4 border-b border-border px-6 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar size="lg" className="h-18 w-18">
                {profile.imageUrl ? (
                  <AvatarImage src={profile.imageUrl} alt={profile.name} />
                ) : null}
                <AvatarFallback className="text-lg font-semibold">{userInitials || "C"}</AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">{profile.name}</h1>
                  {profile.username ? (
                    <Badge variant="secondary" className="rounded-sm px-2 py-1 text-[10px] uppercase tracking-[0.12em]">
                      @{profile.username}
                    </Badge>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>Joined {joinedDate}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/problems">
                <Button variant="outline" size="sm">Browse Problems</Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="px-6 py-5">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Code2 className="h-4 w-4" />
              <span>{profile.totalSubmissions} total submissions</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80">
          <CardHeader className="px-6 pb-4">
            <CardTitle className="text-base font-medium text-foreground">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Solved</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(profile.solvedProblems)}</p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Accepted</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(profile.acceptedSubmissions)}</p>
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Acceptance</span>
                <span className="text-sm font-medium text-foreground">{profile.totalSubmissions === 0 ? "0%" : `${profile.acceptanceRate.toFixed(1)}%`}</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden border border-border bg-background">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${Math.min(profile.totalSubmissions === 0 ? 0 : profile.acceptanceRate, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card/80">
          <CardContent className="flex items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Problems Solved</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(profile.solvedProblems)}</p>
            </div>
            <Trophy className="h-8 w-8 text-amber-500" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80">
          <CardContent className="flex items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Submissions</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(profile.totalSubmissions)}</p>
            </div>
            <Code2 className="h-8 w-8 text-indigo-500" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80">
          <CardContent className="flex items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Accepted</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(profile.acceptedSubmissions)}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80">
          <CardContent className="flex items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Acceptance Rate</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{profile.totalSubmissions === 0 ? "0%" : `${profile.acceptanceRate.toFixed(1)}%`}</p>
            </div>
            <XCircle className="h-8 w-8 text-rose-500" />
          </CardContent>
        </Card>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border bg-card/80">
          <CardHeader className="px-6 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
              <Trophy className="h-4 w-4 text-amber-500" />
              Solved Problems
            </CardTitle>
            <CardDescription>Problems you have accepted.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {profile.solvedProblemList.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                No solved problems yet. Start with a problem from the list and submit your first accepted solution.
              </div>
            ) : (
              <div className="space-y-3">
                {profile.solvedProblemList.map((problem) => (
                  <Link
                    key={problem.problemId}
                    href={`/problems/${problem.problemId}`}
                    className="group flex items-center justify-between gap-4 rounded-md border border-border bg-background/60 px-3 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{problem.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDifficulty(problem.difficulty)}</span>
                        <span className="text-border">•</span>
                        <span>{problem.language}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(problem.solvedAt))}</span>
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80">
          <CardHeader className="px-6 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
              <Languages className="h-4 w-4 text-indigo-500" />
              Language Activity
            </CardTitle>
            <CardDescription>Languages used in your submissions.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {profile.languageActivity.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                No coding activity yet.
              </div>
            ) : (
              <div className="space-y-3">
                {profile.languageActivity.map((entry) => (
                  <div key={entry.language} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-foreground">{entry.language}</span>
                      <span className="text-muted-foreground">{entry.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden border border-border bg-background">
                      <div
                        className="h-full bg-indigo-500"
                        style={{ width: `${Math.max(12, (entry.count / Math.max(profile.totalSubmissions || 1, 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-border bg-card/80">
        <CardHeader className="px-6 pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
            <Code2 className="h-4 w-4 text-emerald-500" />
            Recent Submissions
          </CardTitle>
          <CardDescription>Your latest activity.</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {profile.recentSubmissions.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
              No submissions yet. Your recent attempts will appear here.
            </div>
          ) : (
            <div className="space-y-3">
              {profile.recentSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex flex-col gap-2 rounded-md border border-border bg-background/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{submission.problemTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {submission.language} • {new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(submission.createdAt))}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        submission.verdict === "ACCEPTED"
                          ? "default"
                          : submission.verdict === "WRONG_ANSWER"
                            ? "secondary"
                            : "outline"
                      }
                      className="rounded-sm px-2 py-1 text-[10px] uppercase tracking-[0.12em]"
                    >
                      {formatVerdict(submission.verdict)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Score: {submission.score ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
