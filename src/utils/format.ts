const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatSalaryRange(min: number | null, max: number | null): string {
  if (!min && !max) return "Salary not disclosed";
  if (min && max) return `${inrFormatter.format(min)} – ${inrFormatter.format(max)}`;
  return inrFormatter.format((min ?? max) as number);
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

export function formatEmploymentType(type: string): string {
  return type
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join("-");
}

export function formatExperienceLevel(level: string): string {
  const labels: Record<string, string> = {
    entry: "Entry level",
    mid: "Mid level",
    senior: "Senior",
    lead: "Lead",
  };
  return labels[level] ?? level;
}

export function formatWorkMode(mode: string): string {
  const labels: Record<string, string> = {
    remote: "Remote",
    hybrid: "Hybrid",
    onsite: "On-site",
  };
  return labels[mode] ?? mode;
}

export function formatResumeCompletion(profile: {
  headline: string | null;
  bio: string | null;
  resume_url: string | null;
skills?: string[] | null;
experience?: unknown[] | null;
education?: unknown[] | null;
}): number {
const checks = [
  !!profile.headline,
  !!profile.bio,
  !!profile.resume_url,
  (profile.skills ?? []).length > 0,
  (profile.experience ?? []).length > 0,
  (profile.education ?? []).length > 0,
];
  const complete = checks.filter(Boolean).length;
  return Math.round((complete / checks.length) * 100);
}
