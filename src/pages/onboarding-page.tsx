import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUser, CURRENT_USER_QUERY_KEY } from "@/hooks/use-current-user";
import { completeOnboarding } from "@/api/users";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { resolvePostOnboardingPath } from "@/lib/auth-redirect";
import type { UserRole } from "@/types/database.types";

const roleOptions: { role: UserRole; label: string; body: string }[] = [
  {
    role: "recruiter",
    label: "I'm hiring",
    body: "Create a company profile, publish roles, and review applicants.",
  },
  {
    role: "candidate",
    label: "I'm job-hunting",
    body: "Browse roles, apply with your resume, and track every application.",
  },
];

export function OnboardingPage() {
  const { profile, isLoading } = useCurrentUser();
  const [selected, setSelected] = useState<UserRole | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const mutation = useMutation({
    mutationFn: (role: UserRole) => {
      if (!profile) throw new Error("No profile loaded yet.");
      return completeOnboarding(profile.id, role);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([...CURRENT_USER_QUERY_KEY, updated.id], updated);
      const dashboard = updated.role === "recruiter" ? ROUTES.recruiterDashboard : ROUTES.candidateDashboard;
      navigate(resolvePostOnboardingPath(redirectParam, dashboard), { replace: true });
    },
    onError: () => {
      toast.error("Couldn't save your role. Try again.");
    },
  });

  if (!isLoading && profile?.onboarding_completed) {
    const dashboard = profile.role === "recruiter" ? ROUTES.recruiterDashboard : ROUTES.candidateDashboard;
    return <Navigate to={resolvePostOnboardingPath(redirectParam, dashboard)} replace />;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:px-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Step 01 of 01</p>
      <h1 className="mt-4 font-display text-4xl font-extrabold uppercase tracking-tight text-ink">
        What brings you here?
      </h1>
      <p className="mt-3 text-ink-soft">One choice. It sets up everything else.</p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {roleOptions.map((option) => (
          <button
            key={option.role}
            type="button"
            onClick={() => setSelected(option.role)}
            className={cn(
              "border p-6 text-left transition-colors",
              selected === option.role
                ? "border-signal bg-paper"
                : "border-grid hover:border-ink"
            )}
          >
            <span className="font-display text-lg font-bold uppercase tracking-tight text-ink">
              {option.label}
            </span>
            <span className="mt-2 block text-sm text-ink-soft">{option.body}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!selected || mutation.isPending}
        onClick={() => selected && mutation.mutate(selected)}
        className="mt-10 border border-ink bg-ink px-6 py-3 font-mono text-sm uppercase tracking-wide text-paper transition-colors hover:bg-signal hover:border-signal disabled:cursor-not-allowed disabled:opacity-40"
      >
        {mutation.isPending ? "Saving —" : "Continue"}
      </button>
    </div>
  );
}
