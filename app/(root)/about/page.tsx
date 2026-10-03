import Link from "next/link";
import {
  ArrowRight,
  Braces,
  CheckCircle2,
  Code2,
  Cpu,
  Database,
  FileCode2,
  Play,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const practicePillars = [
  {
    icon: Code2,
    title: "Practice",
    description: "Solve coding problems and build consistency through repetition.",
  },
  {
    icon: FileCode2,
    title: "Code",
    description: "Write your solution in the language you want to improve in.",
  },
  {
    icon: CheckCircle2,
    title: "Improve",
    description: "Use result feedback to refine your approach and keep moving forward.",
  },
];

const flowSteps = [
  "Problem",
  "Write Code",
  "Submit",
  "Judge0",
  "Test Cases",
  "Result",
];

const platformFeatures = [
  {
    title: "Multiple languages",
    description: "JavaScript, Python, and Java are supported in the current editor flow.",
  },
  {
    title: "Test-case evaluation",
    description: "Problems are judged against cases defined for the challenge.",
  },
  {
    title: "Submission feedback",
    description: "Results are surfaced back to the user with verdict and output details.",
  },
  {
    title: "Submission history",
    description: "Users can review recent attempts and track their progress over time.",
  },
  {
    title: "Profile tracking",
    description: "Solved problems and language activity are tracked in the profile page.",
  },
];

const techStack = [
  "Next.js",
  "React",
  "TypeScript",
  "Prisma",
  "PostgreSQL",
  "Clerk",
  "Judge0",
];

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-[7rem]">
      <section className="relative overflow-hidden rounded-none border border-border bg-card/70 px-4 py-8 shadow-sm sm:px-8 md:px-10 md:py-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),transparent_38%)] dark:bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.15),transparent_38%)]" />

        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Badge className="mb-6 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              CodeArena
            </Badge>

            <h1 className="max-w-xl text-4xl font-black tracking-tight text-foreground md:text-5xl">
              Welcome to the Arena
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              Code. Solve. Improve.
            </p>

            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
              CodeArena is a coding practice platform built for people who want to work through problems,
              write real solutions, and improve through feedback.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                render={<Link href="/problems" />}
                nativeButton={false}
                size="lg"
                className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-gray-900 dark:hover:bg-amber-300"
              >
                <Play className="mr-2 h-4 w-4" />
                Explore Problems
              </Button>
            </div>
          </div>

          <div className="rounded-none border border-border bg-slate-950 p-4 text-slate-100 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-3 text-[10px] uppercase tracking-[0.2em] text-slate-400">
              <TerminalSquare className="h-3.5 w-3.5 text-amber-400" />
              arena://submit
            </div>

            <div className="space-y-2 font-mono text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-amber-400">$</span>
                <span>submit solution</span>
                <span className="ml-auto inline-block h-4 w-2 animate-pulse bg-amber-400" />
              </div>
              <div className="text-emerald-400">✓ Test Case 1</div>
              <div className="text-emerald-400">✓ Test Case 2</div>
              <div className="text-emerald-400">✓ Test Case 3</div>
              <div className="mt-4 border-t border-slate-800 pt-3 text-amber-300">
                ✓ Accepted
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">What is CodeArena?</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            A place to practice, write, and improve.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {practicePillars.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="h-full border-border bg-card/70">
              <CardHeader>
                <div className="flex h-11 w-11 items-center justify-center border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="mt-2 text-base text-foreground">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-6 text-muted-foreground">{description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">How CodeArena works</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            From problem to result.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-6">
          {flowSteps.map((step, index) => (
            <div key={step} className="flex items-center gap-3 md:flex-col md:items-stretch">
              <div className="flex flex-1 items-center gap-3 md:flex-col">
                <div className="flex h-12 w-12 items-center justify-center border border-border bg-card text-sm font-semibold text-foreground">
                  {index + 1}
                </div>
                <div className="flex-1 rounded-none border border-border bg-card px-3 py-3 text-center text-sm font-medium text-foreground md:flex-none md:px-4">
                  {step}
                </div>
              </div>
              {index < flowSteps.length - 1 && (
                <div className="flex items-center justify-center text-muted-foreground md:mt-1 md:h-6">
                  <ArrowRight className="h-4 w-4 rotate-90 md:rotate-0" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Built for problem solvers</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            The tools that matter in practice.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {platformFeatures.map(({ title, description }) => (
            <Card key={title} className="h-full border-border bg-card/70">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted text-foreground">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </div>
                <CardTitle className="mt-2 text-base text-foreground">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-6 text-muted-foreground">{description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-20 rounded-none border border-border bg-card/70 p-5 md:p-8">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">The Judge</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Code goes in. Result comes out.
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-none border border-border bg-background p-4">
            <div className="mb-3 flex items-center justify-between border-b border-border pb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="flex items-center gap-2"><Braces className="h-3.5 w-3.5 text-amber-500" /> your code</span>
              <span className="text-foreground">submit</span>
            </div>

            <div className="space-y-2 font-mono text-sm text-muted-foreground">
              <div>function isPalindrome(s) {'{'}</div>
              <div className="pl-4">return s === s.split('').reverse().join('');</div>
              <div>{'}'}</div>
            </div>
          </div>

          <div className="rounded-none border border-border bg-slate-950 p-4 text-slate-100">
            <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-3 text-[10px] uppercase tracking-[0.2em] text-slate-400">
              <Cpu className="h-3.5 w-3.5 text-amber-400" />
              judge0
            </div>

            <div className="space-y-3 font-mono text-sm">
              <div className="text-slate-300">YOUR CODE</div>
              <div className="text-slate-400">↓</div>
              <div className="text-amber-300">JUDGE0</div>
              <div className="text-slate-400">↓</div>
              <div className="text-emerald-400">Test Case 1 ✓</div>
              <div className="text-emerald-400">Test Case 2 ✓</div>
              <div className="text-emerald-400">Test Case 3 ✓</div>
              <div className="text-slate-400">↓</div>
              <div className="text-amber-300">RESULT</div>
            </div>
          </div>
        </div>

        <p className="mt-6 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
          When a user submits code, the platform sends that solution to the judging environment, executes it against the problem’s test cases, and then reports the result back to the user. CodeArena does not fake individual case-by-case progress in the UI unless the backend provides that information.
        </p>
      </section>

      <section className="mt-20">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Technology</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Built with the tools this platform actually uses.
          </h2>
        </div>

        <div className="flex flex-wrap gap-3">
          {techStack.map((item) => (
            <Badge
              key={item}
              className="border-border bg-card px-3 py-2 text-sm text-foreground"
            >
              {item}
            </Badge>
          ))}
        </div>
      </section>

      <section className="mt-20 rounded-none border border-border bg-card/70 p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Philosophy</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Don’t just solve problems. Learn to solve problems.
            </h2>
          </div>

          <div className="flex items-center gap-3 text-muted-foreground">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            <span className="text-sm uppercase tracking-[0.2em]">CodeArena</span>
          </div>
        </div>
      </section>

      <section className="mt-16 border-t border-border pt-8">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Ready to enter the arena?
          </h2>

          <Button
            render={<Link href="/problems" />}
            nativeButton={false}
            size="lg"
            className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-gray-900 dark:hover:bg-amber-300"
          >
            Explore Problems
          </Button>
        </div>
      </section>
    </div>
  );
}
