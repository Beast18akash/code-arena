import {
  AlertCircle,
  CheckCircle2,
  Info,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

export function notifyApiError(status?: number, message?: string) {
  if (!status) {
    toast.error("Connection problem", {
      description: "Check your connection and try again.",
      icon: <AlertCircle aria-hidden="true" />,
      duration: 5000,
    });
    return;
  }

  if (status === 401) {
    toast.error("Sign-in required", {
      description: "Sign in, then try again.",
      icon: <ShieldAlert aria-hidden="true" />,
      duration: 5000,
    });
    return;
  }

  if (status === 403) {
    toast.error("Access denied", {
      description: "You do not have permission to do that.",
      icon: <ShieldAlert aria-hidden="true" />,
      duration: 5000,
    });
    return;
  }

  if (status === 409) {
    toast.warning("Already exists", {
      description: message || "Choose a different problem title.",
      icon: <TriangleAlert aria-hidden="true" />,
      duration: 5000,
    });
    return;
  }

  if (status === 502) {
    toast.error("Execution service unavailable", {
      description: "Check the Judge0 tunnel and try again.",
      icon: <AlertCircle aria-hidden="true" />,
      duration: 5000,
    });
    return;
  }

  if (status >= 500) {
    toast.error("Server error", {
      description: "Please try again shortly.",
      icon: <AlertCircle aria-hidden="true" />,
      duration: 5000,
    });
    return;
  }

  toast.error("Could not complete request", {
    description: message || "Check the details and try again.",
    icon: <Info aria-hidden="true" />,
    duration: 5000,
  });
}

export function notifyProblemSaved(isEditing: boolean) {
  toast.success(isEditing ? "Problem updated" : "Problem created", {
    description: isEditing
      ? "Your changes have been saved."
      : "The problem is ready to solve.",
    icon: <CheckCircle2 aria-hidden="true" />,
    duration: 3500,
  });
}

export function notifySubmissionResult(
  verdict: string,
  passedCases: number,
  totalCases: number,
) {
  if (verdict === "ACCEPTED") {
    toast.success("Solution accepted", {
      description: `${passedCases} of ${totalCases} test cases passed.`,
      icon: <CheckCircle2 aria-hidden="true" />,
      duration: 3500,
    });
    return;
  }

  toast.error("Submission failed", {
    description: `${formatVerdict(verdict)} · ${passedCases} of ${totalCases} test cases passed.`,
    icon: <AlertCircle aria-hidden="true" />,
    duration: 5000,
  });
}

export function formatVerdict(verdict: string) {
  return verdict
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}