interface InterviewProgressProps {
  currentIndex: number;
  total: number;
}

export function InterviewProgress({ currentIndex, total }: InterviewProgressProps) {
  const percent = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
        Question {currentIndex + 1} of {total}
      </p>
      <div
        className="mt-2 h-1 w-full bg-paper-dim"
        role="progressbar"
        aria-label="Interview progress"
        aria-valuenow={currentIndex + 1}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        <div className="h-1 bg-signal transition-all duration-300 ease-out" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}