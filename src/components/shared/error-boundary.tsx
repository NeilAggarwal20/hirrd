import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In a real deployment this would report to an error-tracking
    // service. Logging keeps the failure visible during development.
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
          <span className="index-figure text-signal">Error</span>
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">
            Something broke
          </h1>
          <p className="max-w-sm text-sm text-ink-soft">
            That's on us. Reloading the page usually fixes it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 border border-ink bg-ink px-6 py-3 font-mono text-sm uppercase tracking-wide text-paper hover:bg-signal hover:border-signal"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
