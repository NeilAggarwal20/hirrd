import { useEffect, useState } from "react";
import { Joyride, STATUS, type EventData, type Step, type Styles } from "react-joyride";

export interface ProductTourStep {
  /** CSS selector matching a `data-tour="…"` attribute elsewhere on the page. */
  target: string;
  title: string;
  content: string;
  placement?: Step["placement"];
}

interface ProductTourProps {
  steps: ProductTourStep[];
  /** localStorage key this tour's completion is recorded under. Include the user id and role. */
  storageKey: string;
  /** Only arms the tour once this is true (e.g. profile loaded + onboarding complete). */
  enabled: boolean;
}

const tourStyles: Partial<Styles> = {
  tooltip: {
    border: "1px solid var(--color-grid)",
    fontFamily: "var(--font-sans)",
    padding: 20,
  },
  tooltipTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 16,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "-0.01em",
    marginBottom: 8,
  },
  tooltipContent: {
    fontSize: 13,
    lineHeight: 1.6,
    padding: 0,
    color: "var(--color-ink-soft)",
  },
  buttonPrimary: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    backgroundColor: "var(--color-ink)",
    color: "var(--color-paper)",
    padding: "8px 16px",
    outline: "none",
  },
  buttonBack: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--color-ink-soft)",
  },
  buttonSkip: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--color-ink-soft)",
  },
};

/**
 * A guided, spotlight-style first-run tour. Runs once (recorded in
 * localStorage under `storageKey`), is skippable at any point, and
 * can be re-triggered from a "Restart tour" action by clearing that
 * key and remounting this component (e.g. by navigating back to the
 * dashboard route).
 */
export function ProductTour({ steps, storageKey, enabled }: ProductTourProps) {
  const [run, setRun] = useState(false);
  const [activeSteps, setActiveSteps] = useState<Step[]>([]);

  useEffect(() => {
    if (!enabled) return;
    if (localStorage.getItem(storageKey) === "done") return;

    // Give the page a moment to finish its own data-driven renders
    // (recommended jobs, stat cards, etc.) before checking which
    // step targets actually exist in the DOM.
    const timer = setTimeout(() => {
      const available: Step[] = steps
        .filter((step) => document.querySelector(step.target))
        .map((step) => ({
          target: step.target,
          title: step.title,
          content: step.content,
          placement: step.placement ?? "bottom",
          skipBeacon: true,
        }));

      if (available.length > 0) {
        setActiveSteps(available);
        setRun(true);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [enabled, storageKey, steps]);

  function handleEvent(data: EventData) {
    const finished: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finished.includes(data.status)) {
      setRun(false);
      localStorage.setItem(storageKey, "done");
    }
  }

  if (activeSteps.length === 0) return null;

  return (
    <Joyride
      steps={activeSteps}
      run={run}
      continuous
      scrollToFirstStep
      locale={{ back: "Back", close: "Close", last: "Done", next: "Next", skip: "Skip tour" }}
      options={{
        arrowColor: "var(--color-paper)",
        backgroundColor: "var(--color-paper)",
        overlayColor: "rgba(21, 22, 26, 0.55)",
        primaryColor: "var(--color-signal)",
        textColor: "var(--color-ink)",
        zIndex: 10000,
        width: 340,
        showProgress: true,
        buttons: ["back", "skip", "primary"],
        spotlightRadius: 0,
      }}
      styles={tourStyles}
      onEvent={handleEvent}
    />
  );
}
