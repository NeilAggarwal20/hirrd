import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/types/database.types";

const statusStyles: Record<ApplicationStatus, string> = {
  applied: "text-ink-soft",
  under_review: "text-amber",
  interview: "text-amber",
  accepted: "text-meadow",
  rejected: "text-signal",
};

const statusLabels: Record<ApplicationStatus, string> = {
  applied: "Applied",
  under_review: "Under review",
  interview: "Interview",
  accepted: "Accepted",
  rejected: "Rejected",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={cn("font-mono text-xs uppercase tracking-wide", statusStyles[status])}>
      {statusLabels[status]}
    </span>
  );
}
