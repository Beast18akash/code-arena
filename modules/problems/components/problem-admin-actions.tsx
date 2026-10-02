"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { notifyApiError } from "@/lib/notifications";

export function ProblemAdminActions({
  problemId,
  problemTitle,
}: {
  problemId: string;
  problemTitle: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function deleteProblem() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/problems/${problemId}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        notifyApiError(response.status, payload.error);
        return;
      }

      toast.success("Problem deleted", {
        description: `${problemTitle} and its submission history were permanently deleted.`,
        icon: <CheckCircle2 aria-hidden="true" />,
        duration: 3500,
      });
      router.refresh();
    } catch (error) {
      console.error("Error deleting problem:", error);
      notifyApiError();
    } finally {
      setIsDeleting(false);
    }
  }

  function confirmDelete() {
    toast.warning("Delete problem permanently?", {
      description: `${problemTitle} and its submission history will be deleted.`,
      icon: <TriangleAlert aria-hidden="true" />,
      duration: 6000,
      action: {
        label: "Delete",
        onClick: () => void deleteProblem(),
        actionButtonStyle: {
          backgroundColor: "var(--destructive)",
          color: "white",
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => undefined,
      },
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/problems/${problemId}/edit`}
        aria-label={`Edit ${problemTitle}`}
        title="Edit problem"
        className={buttonVariants({ variant: "outline", size: "icon" })}
      >
        <Pencil aria-hidden="true" />
      </Link>
      <Button
        type="button"
        variant="destructive"
        size="icon"
        aria-label={`Delete ${problemTitle}`}
        title="Delete problem"
        disabled={isDeleting}
        onClick={confirmDelete}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
}