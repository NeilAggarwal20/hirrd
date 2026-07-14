import * as Dialog from "@radix-ui/react-dialog";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResumeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  resumeUrl: string;
  candidateName?: string;
}

export function ResumeDialog({ isOpen, onOpenChange, resumeUrl, candidateName }: ResumeDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 transition-all duration-200" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-4xl h-[85vh] border border-grid bg-paper p-6 shadow-xl z-50 flex flex-col focus:outline-none animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-grid pb-4 mb-4">
            <div>
              <Dialog.Title className="font-display text-lg font-bold uppercase tracking-tight text-ink">
                Resume Preview
              </Dialog.Title>
              {candidateName && (
                <Dialog.Description className="font-mono text-xs uppercase tracking-wide text-ink-soft">
                  Candidate: {candidateName}
                </Dialog.Description>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-8 gap-1.5 font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-ink cursor-pointer"
              >
                <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Fullscreen
                </a>
              </Button>
              <Dialog.Close asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-grid hover:border-signal hover:text-signal text-ink-soft cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
          </div>

          <div className="flex-1 w-full overflow-hidden border border-grid bg-paper-dim relative">
            <iframe
              src={`${resumeUrl}#toolbar=0`}
              title="Resume PDF Viewer"
              className="w-full h-full border-none"
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
