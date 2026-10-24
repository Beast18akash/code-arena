"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Clock3,
  Pause,
  Play,
  RotateCcw,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type TimerStatus = "idle" | "running" | "paused" | "completed";
type TimerMode = "countdown" | "stopwatch";

type CountdownState = {
  durationMs: number;
  remainingMs: number;
  status: TimerStatus;
  startedAtMs: number | null;
};

type StopwatchState = {
  elapsedMs: number;
  status: Exclude<TimerStatus, "completed">;
  startedAtMs: number | null;
};

type SavedTimerState = {
  countdown: CountdownState;
  stopwatch: StopwatchState;
};

const DEFAULT_DURATION_MS = 15 * 60 * 1000;
const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 24 * 60;
const PRESET_MINUTES = [15, 30, 45, 60];

function remainingTime(state: CountdownState, now: number) {
  if (state.status !== "running" || state.startedAtMs === null) {
    return state.remainingMs;
  }

  return Math.max(0, state.remainingMs - (now - state.startedAtMs));
}

function elapsedTime(state: StopwatchState, now: number) {
  if (state.status !== "running" || state.startedAtMs === null) {
    return state.elapsedMs;
  }

  return state.elapsedMs + Math.max(0, now - state.startedAtMs);
}

function formatDuration(milliseconds: number, roundUpSeconds = false) {
  const rawSeconds = milliseconds / 1000;
  const totalSeconds = Math.max(0, roundUpSeconds ? Math.ceil(rawSeconds) : Math.floor(rawSeconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTimerStatus(value: unknown): value is TimerStatus {
  return value === "idle" || value === "running" || value === "paused" || value === "completed";
}

function isNullableTimestamp(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function readSavedState(value: unknown, now: number): SavedTimerState | null {
  if (!isRecord(value) || !isRecord(value.countdown) || !isRecord(value.stopwatch)) {
    return null;
  }

  const countdown = value.countdown;
  const stopwatch = value.stopwatch;
  const countdownStartedAt = countdown.startedAtMs;
  const stopwatchStartedAt = stopwatch.startedAtMs;

  if (
    typeof countdown.durationMs !== "number" ||
    !Number.isFinite(countdown.durationMs) ||
    countdown.durationMs < MIN_DURATION_MINUTES * 60 * 1000 ||
    countdown.durationMs > MAX_DURATION_MINUTES * 60 * 1000 ||
    typeof countdown.remainingMs !== "number" ||
    !Number.isFinite(countdown.remainingMs) ||
    countdown.remainingMs < 0 ||
    countdown.remainingMs > countdown.durationMs ||
    !isTimerStatus(countdown.status) ||
    !isNullableTimestamp(countdownStartedAt) ||
    (countdown.status === "running") !== (countdownStartedAt !== null) ||
    typeof stopwatch.elapsedMs !== "number" ||
    !Number.isFinite(stopwatch.elapsedMs) ||
    stopwatch.elapsedMs < 0 ||
    (stopwatch.status !== "idle" && stopwatch.status !== "running" && stopwatch.status !== "paused") ||
    !isNullableTimestamp(stopwatchStartedAt) ||
    (stopwatch.status === "running") !== (stopwatchStartedAt !== null)
  ) {
    return null;
  }

  const restoredCountdown: CountdownState = {
    durationMs: countdown.durationMs,
    remainingMs: countdown.remainingMs,
    status: countdown.status,
    startedAtMs: countdownStartedAt,
  };
  const restoredStopwatch: StopwatchState = {
    elapsedMs: stopwatch.elapsedMs,
    status: stopwatch.status,
    startedAtMs: stopwatchStartedAt,
  };

  if (restoredCountdown.status === "running" && remainingTime(restoredCountdown, now) === 0) {
    restoredCountdown.remainingMs = 0;
    restoredCountdown.status = "completed";
    restoredCountdown.startedAtMs = null;
  }

  return { countdown: restoredCountdown, stopwatch: restoredStopwatch };
}

function initialCountdown(): CountdownState {
  return {
    durationMs: DEFAULT_DURATION_MS,
    remainingMs: DEFAULT_DURATION_MS,
    status: "idle",
    startedAtMs: null,
  };
}

function initialStopwatch(): StopwatchState {
  return { elapsedMs: 0, status: "idle", startedAtMs: null };
}

export function ProblemTimer({ problemId }: { problemId: string }) {
  const [countdown, setCountdown] = useState(initialCountdown);
  const [stopwatch, setStopwatch] = useState(initialStopwatch);
  const [mode, setMode] = useState<TimerMode>("countdown");
  const [customMinutes, setCustomMinutes] = useState("15");
  const [customDurationError, setCustomDurationError] = useState("");
  const [now, setNow] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const previousCountdownStatus = useRef(countdown.status);

  const storageKey = `code-arena:problem-timer:${problemId}`;
  const isRunning = countdown.status === "running" || stopwatch.status === "running";
  const displayedCountdown = remainingTime(countdown, now);
  const displayedStopwatch = elapsedTime(stopwatch, now);
  const currentTime = mode === "countdown" ? displayedCountdown : displayedStopwatch;
  const currentStatus = mode === "countdown" ? countdown.status : stopwatch.status;
  const isAlmostComplete =
    mode === "countdown" &&
    countdown.status === "running" &&
    displayedCountdown > 0 &&
    displayedCountdown <= 60_000;

  useEffect(() => {
    const restoreTimeout = window.setTimeout(() => {
      const currentNow = Date.now();

      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          const restored = readSavedState(parsed, currentNow);

          if (restored) {
            setCountdown(restored.countdown);
            setStopwatch(restored.stopwatch);
            setCustomMinutes(String(restored.countdown.durationMs / 60_000));
          } else {
            console.error("Invalid saved problem timer state; clearing saved state.");
            sessionStorage.removeItem(storageKey);
          }
        }
      } catch (error) {
        console.error("Unable to read saved problem timer state:", error);
      }

      setNow(currentNow);
      setIsHydrated(true);
    }, 0);

    return () => window.clearTimeout(restoreTimeout);
  }, [storageKey]);

  useEffect(() => {
    if (!isHydrated) return;

    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ countdown, stopwatch }));
    } catch (error) {
      console.error("Unable to save problem timer state:", error);
    }
  }, [countdown, isHydrated, storageKey, stopwatch]);

  useEffect(() => {
    if (previousCountdownStatus.current === "running" && countdown.status === "completed") {
      toast.success("Countdown complete", {
        description: "Your problem-solving time is up.",
      });
    }

    previousCountdownStatus.current = countdown.status;
  }, [countdown.status]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);

      setCountdown((current) => {
        if (current.status !== "running" || remainingTime(current, currentNow) > 0) {
          return current;
        }

        return { ...current, remainingMs: 0, status: "completed", startedAtMs: null };
      });
    }, 250);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  function startCountdown() {
    const startedAtMs = Date.now();
    setNow(startedAtMs);
    setCountdown((current) => {
      if (current.status === "running") return current;
      if (current.remainingMs <= 0) {
        return { ...current, remainingMs: 0, status: "completed", startedAtMs: null };
      }

      return { ...current, status: "running", startedAtMs };
    });
  }

  function pauseCountdown() {
    const pausedAtMs = Date.now();
    setNow(pausedAtMs);
    setCountdown((current) => {
      if (current.status !== "running") return current;
      const remainingMs = remainingTime(current, pausedAtMs);

      return {
        ...current,
        remainingMs,
        status: remainingMs === 0 ? "completed" : "paused",
        startedAtMs: null,
      };
    });
  }

  function resetCountdown() {
    setCountdown((current) => ({
      ...current,
      remainingMs: current.durationMs,
      status: "idle",
      startedAtMs: null,
    }));
  }

  function applyDuration(minutes: number) {
    if (!Number.isInteger(minutes) || minutes < MIN_DURATION_MINUTES || minutes > MAX_DURATION_MINUTES) {
      setCustomDurationError(`Enter a whole number from ${MIN_DURATION_MINUTES} to ${MAX_DURATION_MINUTES} minutes.`);
      return;
    }

    const durationMs = minutes * 60 * 1000;
    setCountdown({
      durationMs,
      remainingMs: durationMs,
      status: "idle",
      startedAtMs: null,
    });
    setCustomMinutes(String(minutes));
    setCustomDurationError("");
  }

  function startStopwatch() {
    const startedAtMs = Date.now();
    setNow(startedAtMs);
    setStopwatch((current) => ({
      ...current,
      status: "running",
      startedAtMs,
    }));
  }

  function pauseStopwatch() {
    const pausedAtMs = Date.now();
    setNow(pausedAtMs);
    setStopwatch((current) => {
      if (current.status !== "running") return current;

      return {
        elapsedMs: elapsedTime(current, pausedAtMs),
        status: "paused",
        startedAtMs: null,
      };
    });
  }

  function resetStopwatch() {
    setStopwatch(initialStopwatch());
  }

  return (
    <Popover>
      <PopoverTrigger
        disabled={!isHydrated}
        aria-label="Open problem timer and stopwatch"
        title="Timer and stopwatch"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <Timer aria-hidden="true" />
        <span className="hidden sm:inline">Timer</span>
        {isRunning && <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(20rem,calc(100vw-2rem))] gap-4 border border-border p-4"
        aria-label="Problem timer controls"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Focus tools</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Track time on this problem</p>
          </div>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              Running
            </span>
          )}
        </div>

        <div role="group" aria-label="Timer mode" className="grid grid-cols-2 border-b border-border">
          <button
            type="button"
            aria-pressed={mode === "countdown"}
            onClick={() => setMode("countdown")}
            className={`flex h-9 items-center justify-center gap-2 border-b-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === "countdown" ? "border-amber-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Timer aria-hidden="true" className="size-4" />
            Countdown
          </button>
          <button
            type="button"
            aria-pressed={mode === "stopwatch"}
            onClick={() => setMode("stopwatch")}
            className={`flex h-9 items-center justify-center gap-2 border-b-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === "stopwatch" ? "border-amber-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Clock3 aria-hidden="true" className="size-4" />
            Stopwatch
          </button>
        </div>

        <div className="text-center">
          <p
            aria-live="off"
            aria-label={`${mode === "countdown" ? "Time remaining" : "Elapsed time"} ${formatDuration(currentTime, mode === "countdown")}`}
            className={`font-mono text-4xl font-semibold tabular-nums tracking-tight ${isAlmostComplete || (mode === "countdown" && currentStatus === "completed") ? "text-destructive" : ""}`}
          >
            {formatDuration(currentTime, mode === "countdown")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "countdown"
              ? currentStatus === "completed"
                ? "Completed"
                : currentStatus === "paused"
                  ? "Paused"
                  : currentStatus === "running"
                    ? "Time remaining"
                    : "Ready when you are"
              : currentStatus === "running"
                ? "Elapsed time"
                : currentStatus === "paused"
                  ? "Paused"
                  : "Ready when you are"}
          </p>
        </div>

        {mode === "countdown" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {PRESET_MINUTES.map((minutes) => (
                <Button
                  key={minutes}
                  type="button"
                  size="sm"
                  variant={countdown.durationMs === minutes * 60 * 1000 ? "secondary" : "outline"}
                  aria-pressed={countdown.durationMs === minutes * 60 * 1000}
                  onClick={() => applyDuration(minutes)}
                >
                  {minutes}m
                </Button>
              ))}
            </div>
            <form
              className="flex items-end gap-2"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                applyDuration(Number(customMinutes));
              }}
            >
              <label className="min-w-0 flex-1 text-xs font-medium">
                Custom duration (minutes)
                <input
                  type="number"
                  min={MIN_DURATION_MINUTES}
                  max={MAX_DURATION_MINUTES}
                  step={1}
                  inputMode="numeric"
                  value={customMinutes}
                  aria-invalid={Boolean(customDurationError)}
                  aria-describedby={customDurationError ? "custom-duration-error" : undefined}
                  onChange={(event) => {
                    setCustomMinutes(event.target.value);
                    setCustomDurationError("");
                  }}
                  className="mt-1 h-8 w-full border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <Button type="submit" size="sm" variant="outline">Set</Button>
            </form>
            {customDurationError && (
              <p id="custom-duration-error" role="alert" className="text-xs text-destructive">
                {customDurationError}
              </p>
            )}
          </div>
        ) : null}

        {isAlmostComplete && (
          <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <TriangleAlert aria-hidden="true" className="size-4" />
            One minute remaining
          </p>
        )}

        {mode === "countdown" && currentStatus === "completed" && (
          <p role="status" aria-live="polite" className="text-center text-xs font-medium text-destructive">
            Time is up. Reset the timer to start again.
          </p>
        )}

        <div className="flex items-center justify-center gap-2">
          {currentStatus === "running" ? (
            <Button
              type="button"
              variant="outline"
              onClick={mode === "countdown" ? pauseCountdown : pauseStopwatch}
            >
              <Pause aria-hidden="true" />
              Pause
            </Button>
          ) : (
            <Button
              type="button"
              onClick={mode === "countdown" ? startCountdown : startStopwatch}
              disabled={mode === "countdown" && currentStatus === "completed"}
            >
              <Play aria-hidden="true" />
              {currentStatus === "paused" ? "Resume" : "Start"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            aria-label={`Reset ${mode === "countdown" ? "countdown timer" : "stopwatch"}`}
            onClick={mode === "countdown" ? resetCountdown : resetStopwatch}
          >
            <RotateCcw aria-hidden="true" />
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
