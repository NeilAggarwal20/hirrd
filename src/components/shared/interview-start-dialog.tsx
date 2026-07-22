import * as Dialog from "@radix-ui/react-dialog";
import { Sparkles, X, Clock, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InterviewStartDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: () => void;
  isStarting: boolean;
  hasDraft: boolean;
}

export function InterviewStartDialog({
  isOpen,
  onOpenChange,
  onStart,
  isStarting,
  hasDraft,
}: InterviewStartDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 transition-all duration-200" />
        <Dialog.Content className="fixed top-1/2 left-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 border border-grid bg-paper p-6 shadow-xl z-50 focus:outline-none animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-4 border-b border-grid pb-4 mb-5">
            <div>
              <Dialog.Title className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-tight text-ink">
                <Sparkles className="h-4 w-4 text-signal" aria-hidden="true" />
                AI Mock Interview
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-ink-soft">
                Practice a personalized interview generated using:
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 shrink-0 p-0 border-grid hover:border-signal hover:text-signal text-ink-soft cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <ul className="space-y-1.5 font-mono text-xs uppercase tracking-wide text-ink">
            <li className="flex items-center gap-2">
              <span className="text-meadow">✓</span> Your resume
            </li>
            <li className="flex items-center gap-2">
              <span className="text-meadow">✓</span> This job description
            </li>
          </ul>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="border border-grid p-3">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-ink-soft">
                <Clock className="h-3 w-3" aria-hidden="true" />
                Estimated time
              </p>
              <p className="mt-1 font-display text-lg font-bold text-ink">5–7 min</p>
            </div>
            <div className="border border-grid p-3">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-ink-soft">
                <ListChecks className="h-3 w-3" aria-hidden="true" />
                Questions
              </p>
              <p className="mt-1 font-display text-lg font-bold text-ink">5–7 personalized</p>
            </div>
          </div>

          {hasDraft && (
            <p className="mt-4 border border-grid bg-paper-dim px-3 py-2 text-xs text-ink-soft">
              You have an interview in progress for this role — resuming will pick up where you left off.
            </p>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm" className="cursor-pointer">
                Cancel
              </Button>
            </Dialog.Close>
            <Button size="sm" onClick={onStart} disabled={isStarting} className="cursor-pointer">
              {isStarting ? "Generating…" : hasDraft ? "Resume interview" : "Start interview"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}