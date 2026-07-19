import type { JobSuggestion } from "@/api/jobs";

const typeLabels: Record<JobSuggestion["type"], string> = {
  title: "Role",
  company: "Company",
  skill: "Skill",
  location: "Location",
};

interface SearchSuggestionsProps {
  suggestions: JobSuggestion[];
  onSelect: (suggestion: JobSuggestion) => void;
}

/**
 * Rendered by the caller only while open — this component is just
 * the list. Selection fires on mousedown (not click) so it commits
 * before the input's onBlur closes the panel.
 */
export function SearchSuggestions({ suggestions, onSelect }: SearchSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto border border-grid bg-paper shadow-lg">
      {suggestions.map((suggestion) => (
        <button
          key={`${suggestion.type}-${suggestion.value}`}
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(suggestion);
          }}
          className="flex w-full items-center justify-between gap-3 border-b border-grid px-3 py-2 text-left last:border-b-0 hover:bg-paper-dim"
        >
          <span className="truncate text-sm text-ink">{suggestion.value}</span>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-ink-soft">
            {typeLabels[suggestion.type]}
          </span>
        </button>
      ))}
    </div>
  );
}
