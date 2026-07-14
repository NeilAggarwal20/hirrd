import { cn } from "@/lib/utils";

export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border border-grid px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-ink-soft",
        className
      )}
    >
      {children}
    </span>
  );
}
