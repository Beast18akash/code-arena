"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "./create-problem-form/code-editor";
import {
  formatVerdict,
  notifyApiError,
  notifySubmissionResult,
} from "@/lib/notifications";

type Language = "JAVASCRIPT" | "PYTHON" | "JAVA";
type EditorLanguage = "javascript" | "python" | "java";
type Example = { input: string; output: string; explanation: string } | null;
type SubmissionResult = {
  id: string;
  verdict: string;
  status: string;
  score: number | null;
  passedCases: number;
  totalCases: number;
  language: string;
  message: string;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
};

const LANGUAGE_OPTIONS: { value: Language; label: string; editorLanguage: EditorLanguage }[] = [
  { value: "JAVASCRIPT", label: "JavaScript", editorLanguage: "javascript" },
  { value: "PYTHON", label: "Python", editorLanguage: "python" },
  { value: "JAVA", label: "Java", editorLanguage: "java" },
];

export function ProblemSolver({
  problemId,
  starterCodeByLanguage,
  examplesByLanguage,
}: {
  problemId: string;
  starterCodeByLanguage: Record<Language, string>;
  examplesByLanguage: Record<string, Example>;
}) {
  const [language, setLanguage] = useState<Language>("JAVASCRIPT");
  const [sourceByLanguage, setSourceByLanguage] = useState(starterCodeByLanguage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const example = examplesByLanguage[language];
  const editorLanguage = LANGUAGE_OPTIONS.find((option) => option.value === language)?.editorLanguage ?? "javascript";

  async function submitSolution() {
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId,
          language,
          sourceCode: sourceByLanguage[language],
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        notifyApiError(response.status, payload.error);
        return;
      }

      const submission = payload.submission as SubmissionResult;
      setResult(submission);
      notifySubmissionResult(
        submission.verdict,
        submission.passedCases,
        submission.totalCases,
      );
    } catch (error) {
      console.error("Error submitting solution:", error);
      notifyApiError();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="min-w-0 border border-border bg-background" aria-label="Solution editor">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <label className="flex items-center gap-3 text-sm font-medium">
          Language
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
            className="h-9 min-w-36 border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {LANGUAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <Button onClick={submitSolution} disabled={isSubmitting || !sourceByLanguage[language].trim()}>
          {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
          {isSubmitting ? "Submitting..." : "Submit"}
        </Button>
      </div>

      <div className="p-3">
        <CodeEditor
          value={sourceByLanguage[language]}
          onChange={(value?: string) => setSourceByLanguage((current) => ({ ...current, [language]: value ?? "" }))}
          language={editorLanguage}
          height="min(68vh, 720px)"
        />
      </div>

      {example && (
        <div className="mx-3 mb-3 border-t border-border pt-3 text-sm">
          <h2 className="font-semibold">Example</h2>
          <p className="mt-2 text-muted-foreground">Input: <code className="font-mono text-foreground">{example.input}</code></p>
          <p className="mt-1 text-muted-foreground">Output: <code className="font-mono text-foreground">{example.output}</code></p>
        </div>
      )}

      {result && (
        <div aria-live="polite" className="mx-3 mb-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className={`flex items-center gap-2 text-lg font-semibold ${result.verdict === "ACCEPTED" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
              {result.verdict === "ACCEPTED" ? <CheckCircle2 aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
              {formatVerdict(result.verdict)}
            </div>
            <p className="text-sm text-muted-foreground">{result.passedCases} / {result.totalCases} test cases passed</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{result.message}</p>
          {(result.compileOutput || result.stderr || result.stdout) && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">
                {result.compileOutput ? "Compiler output" : result.stderr ? "Execution details" : "Your program output"}
              </p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap border border-border bg-muted/40 p-3 font-mono text-xs">
                {result.compileOutput || result.stderr || result.stdout}
              </pre>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

