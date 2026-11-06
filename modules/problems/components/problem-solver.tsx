"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeArenaExecutionIndicator } from "@/components/ui/codearena-loading";
import { CodeEditor } from "./create-problem-form/code-editor";
import { ProblemTimer } from "./problem-timer";
import {
  formatVerdict,
  notifyApiError,
} from "@/lib/notifications";
import { toast } from "sonner";

type Language = "JAVASCRIPT" | "PYTHON" | "JAVA";
type EditorLanguage = "javascript" | "python" | "java";
type Example = { input: string; output: string; explanation: string } | null;
type SubmissionResult = {
  id: string;
  verdict: string | null;
  status: string;
  score: number | null;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  createdAt: string;
  updatedAt: string;
};
type SubmissionStatusResponse = { submission: SubmissionResult };

const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_DURATION_MS = 2 * 60 * 1_000;

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
  const [executionStage, setExecutionStage] = useState<"Preparing submission" | "Waiting for execution" | "Checking result" | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const submissionInProgressRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const example = examplesByLanguage[language];
  const editorLanguage = LANGUAGE_OPTIONS.find((option) => option.value === language)?.editorLanguage ?? "javascript";

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  async function submitSolution() {
    if (submissionInProgressRef.current) return;

    submissionInProgressRef.current = true;
    setIsSubmitting(true);
    setResult(null);
    setExecutionStage("Preparing submission");
    const controller = new AbortController();
    controllerRef.current = controller;
    let timedOut = false;
    let timeoutId: number | undefined;

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId,
          language,
          sourceCode: sourceByLanguage[language],
        }),
        signal: controller.signal,
      });

      const payload = await response.json();

      if (!response.ok) {
        notifyApiError(response.status, payload.error);
        return;
      }

      if (!isRecord(payload) || typeof payload.submissionId !== "string" || !payload.submissionId) {
        notifyApiError(502, "The server returned an invalid submission response.");
        return;
      }

      setExecutionStage("Waiting for execution");
      const deadline = Date.now() + MAX_POLL_DURATION_MS;
      timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, MAX_POLL_DURATION_MS);

      while (!controller.signal.aborted && Date.now() < deadline) {
        const remainingTime = deadline - Date.now();
        const shouldPoll = await waitForPollInterval(
          Math.min(POLL_INTERVAL_MS, remainingTime),
          controller.signal,
        );
        if (!shouldPoll || controller.signal.aborted) break;
        if (Date.now() >= deadline) {
          timedOut = true;
          controller.abort();
          break;
        }

        setExecutionStage("Checking result");
        const statusResponse = await fetch(
          `/api/submissions?submissionId=${encodeURIComponent(payload.submissionId)}`,
          { signal: controller.signal, cache: "no-store" },
        );

        if (!statusResponse.ok) {
          let errorMessage: string | undefined;
          try {
            const errorPayload: unknown = await statusResponse.json();
            if (isRecord(errorPayload) && typeof errorPayload.error === "string") {
              errorMessage = errorPayload.error;
            }
          } catch {
            errorMessage = undefined;
          }
          notifyApiError(statusResponse.status, errorMessage);
          break;
        }

        let statusPayload: unknown;
        try {
          statusPayload = await statusResponse.json();
        } catch {
          notifyApiError(502, "The server returned an invalid submission status response.");
          break;
        }

        if (!isSubmissionStatusResponse(statusPayload)) {
          notifyApiError(502, "The server returned an invalid submission status response.");
          break;
        }

        const submission = statusPayload.submission;
        if (submission.status === "PENDING") {
          setExecutionStage("Waiting for execution");
          continue;
        }

        if (submission.status !== "COMPLETED" && submission.status !== "FAILED") {
          notifyApiError(502, "The submission returned an unexpected status.");
          break;
        }

        setResult(submission);
        if (submission.verdict) {
          const description = formatVerdict(submission.verdict);
          if (submission.verdict === "ACCEPTED") {
            toast.success("Solution accepted", { description });
          } else {
            toast.error("Submission finished", { description });
          }
        }
        break;
      }

      if (timedOut && isMountedRef.current) {
        notifyApiError(408, "Execution is taking longer than expected. Check your submission history for updates.");
      }
    } catch (error) {
      if (controller.signal.aborted) {
        if (timedOut && isMountedRef.current) {
          notifyApiError(408, "Execution is taking longer than expected. Check your submission history for updates.");
        }
        return;
      }
      console.error("Error submitting solution:", error);
      notifyApiError();
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (controllerRef.current === controller) controllerRef.current = null;
      submissionInProgressRef.current = false;
      if (isMountedRef.current) {
        setIsSubmitting(false);
        setExecutionStage(null);
      }
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
        <div className="flex items-center gap-3">
          <ProblemTimer key={problemId} problemId={problemId} />
          {isSubmitting && executionStage && (
            <CodeArenaExecutionIndicator label={executionStage} />
          )}
          <Button onClick={submitSolution} disabled={isSubmitting || !sourceByLanguage[language].trim()}>
            {isSubmitting ? <Send aria-hidden="true" className="opacity-80" /> : <Send aria-hidden="true" />}
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
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
              {formatVerdict(result.verdict ?? result.status)}
            </div>
          </div>
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSubmissionStatusResponse(value: unknown): value is SubmissionStatusResponse {
  if (!isRecord(value) || !isRecord(value.submission)) return false;

  const submission = value.submission;
  return (
    typeof submission.id === "string" &&
    typeof submission.status === "string" &&
    (submission.verdict === null || typeof submission.verdict === "string") &&
    (submission.score === null || typeof submission.score === "number") &&
    (submission.stdout === null || typeof submission.stdout === "string") &&
    (submission.stderr === null || typeof submission.stderr === "string") &&
    (submission.compileOutput === null || typeof submission.compileOutput === "string") &&
    typeof submission.createdAt === "string" &&
    typeof submission.updatedAt === "string"
  );
}

function waitForPollInterval(duration: number, signal: AbortSignal) {
  return new Promise<boolean>((resolve) => {
    if (signal.aborted) {
      resolve(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve(true);
    }, duration);

    function handleAbort() {
      window.clearTimeout(timeoutId);
      signal.removeEventListener("abort", handleAbort);
      resolve(false);
    }

    signal.addEventListener("abort", handleAbort, { once: true });
  });
}
