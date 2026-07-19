import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/shared/chip";
import { fetchJobMatch } from "@/api/ai-analysis";

interface JobMatchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  jobId: string;
  jobTitle: string;
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink">
            <span className="text-signal">—</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MatchSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-6">
      <div className="h-24 border border-grid bg-paper-dim" />
      <div className="space-y-2">
        <div className="h-3 w-1/4 bg-paper-dim" />
        <div className="h-3 w-3/4 bg-paper-dim" />
        <div className="h-3 w-2/3 bg-paper-dim" />
      </div>
    </div>
  );
}

export function JobMatchDialog({ isOpen, onOpenChange, candidateId, jobId, jobTitle }: JobMatchDialogProps) {
  const query = useQuery({
    queryKey: ["ai-job-match", candidateId, jobId],
    queryFn: () => fetchJobMatch(jobId),
    enabled: isOpen,
    staleTime: Infinity,
    retry: false,
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 transition-all duration-200" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-2xl max-h-[85vh] overflow-y-auto border border-grid bg-paper p-6 shadow-xl z-50 focus:outline-none animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-grid pb-4 mb-6">
            <div>
              <Dialog.Title className="font-display text-lg font-bold uppercase tracking-tight text-ink">
                Resume Match
              </Dialog.Title>
              <Dialog.Description className="font-mono text-xs uppercase tracking-wide text-ink-soft">
                Against {jobTitle}
              </Dialog.Description>
            </div>
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

          {query.isLoading && <MatchSkeleton />}

          {query.isError && (
            <div className="border border-grid p-6 text-center">
              <p className="text-sm text-ink">{(query.error as Error).message}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => query.refetch()}>
                Try again
              </Button>
            </div>
          )}

          {query.data && (
            <div className="space-y-6">
              <div className="border border-grid p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Match Score</p>
                <p className="mt-2 font-display text-4xl font-extrabold text-ink">{query.data.matchScore}%</p>
                <div className="mt-3 h-1.5 w-full bg-paper-dim">
                  <div
                    className="h-1.5 bg-signal transition-all"
                    style={{ width: `${query.data.matchScore}%` }}
                  />
                </div>
              </div>

              {query.data.matchedSkills.length > 0 && (
                <div>
                  <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
                    Matched skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {query.data.matchedSkills.map((skill) => (
                      <Chip key={skill} className="text-meadow border-meadow/40">
                        {skill}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {query.data.missingSkills.length > 0 && (
                <div>
                  <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
                    Missing skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {query.data.missingSkills.map((skill) => (
                      <Chip key={skill} className="text-signal border-signal/40">
                        {skill}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              <ListSection title="Resume weaknesses" items={query.data.resumeWeaknesses} />
              <ListSection title="Recommendations" items={query.data.recommendations} />
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
