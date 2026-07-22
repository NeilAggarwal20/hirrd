import { Button } from "@/components/ui/button";
import { formatRelativeDate } from "@/utils/format";
import type { MockInterviewHistoryItem } from "@/api/mock-interview";

interface InterviewHistoryCardProps {
  interview: MockInterviewHistoryItem;
  onView: () => void;
}

export function InterviewHistoryCard({ interview, onView }: InterviewHistoryCardProps) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 border-b border-grid py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{interview.jobTitle}</p>
        <p className="mt-1 flex flex-wrap gap-x-3 font-mono text-xs uppercase tracking-wide text-ink-soft">
          <span>{interview.companyName}</span>
          <span>·</span>
          <span>{formatRelativeDate(interview.createdAt)}</span>
        </p>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
          Overall <span className="font-display text-base font-bold text-ink">{interview.overallScore}%</span>
        </span>
        <Button variant="outline" size="sm" onClick={onView} className="cursor-pointer">
          View feedback
        </Button>
      </div>
    </li>
  );
}