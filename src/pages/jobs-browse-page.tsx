import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchJobFacets, fetchPublishedJobs, type JobSort } from "@/api/jobs";
import { ROUTES } from "@/constants/routes";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { formatEmploymentType, formatRelativeDate, formatSalaryRange, formatWorkMode } from "@/utils/format";
import type { ExperienceLevel, WorkMode } from "@/types/database.types";

const experienceLevels: { value: ExperienceLevel; label: string }[] = [
  { value: "entry", label: "Entry level" },
  { value: "mid", label: "Mid level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
];

const workModes: { value: WorkMode; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

const sortOptions: { value: JobSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "salary_high", label: "Highest salary" },
  { value: "salary_low", label: "Lowest salary" },
];

export function JobsBrowsePage() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState<WorkMode | "">("");
  const [category, setCategory] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | "">("");
  const [salaryMin, setSalaryMin] = useState("");
  const [sort, setSort] = useState<JobSort>("newest");

  const facetsQuery = useQuery({ queryKey: ["job-facets"], queryFn: fetchJobFacets });

  const jobsQuery = useQuery({
    queryKey: ["jobs", "browse", search, location, workMode, category, companyId, experienceLevel, salaryMin, sort],
    queryFn: () =>
      fetchPublishedJobs({
        search: search || undefined,
        location: location || undefined,
        workMode: workMode || undefined,
        category: category || undefined,
        companyId: companyId || undefined,
        experienceLevel: experienceLevel || undefined,
        salaryMin: salaryMin ? Number(salaryMin) : undefined,
        sort,
        limit: 50,
      }),
  });

  const hasFilters = useMemo(
    () => !!(search || location || workMode || category || companyId || experienceLevel || salaryMin),
    [search, location, workMode, category, companyId, experienceLevel, salaryMin]
  );

  function resetFilters() {
    setSearch("");
    setLocation("");
    setWorkMode("");
    setCategory("");
    setCompanyId("");
    setExperienceLevel("");
    setSalaryMin("");
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-12 sm:px-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Index</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold uppercase tracking-tight text-ink">
        Open roles
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-4 border-b border-grid pb-8 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by title —"
        />
        <Input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Location —"
        />

        <Select value={category || "any"} onValueChange={(v) => setCategory(v === "any" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any category</SelectItem>
            {facetsQuery.data?.categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={companyId || "any"} onValueChange={(v) => setCompanyId(v === "any" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any company</SelectItem>
            {facetsQuery.data?.companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={workMode || "any"}
          onValueChange={(v) => setWorkMode(v === "any" ? "" : (v as WorkMode))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Work mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any work mode</SelectItem>
            {workModes.map((mode) => (
              <SelectItem key={mode.value} value={mode.value}>
                {mode.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={experienceLevel || "any"}
          onValueChange={(value) => setExperienceLevel(value === "any" ? "" : (value as ExperienceLevel))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Experience level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any experience</SelectItem>
            {experienceLevels.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          value={salaryMin}
          onChange={(event) => setSalaryMin(event.target.value)}
          placeholder="Min salary (₹/yr) —"
        />

        <Select value={sort} onValueChange={(v) => setSort(v as JobSort)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wide text-ink-soft">
          {jobsQuery.data?.length ?? 0} role{jobsQuery.data?.length === 1 ? "" : "s"}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-signal"
          >
            Clear filters ×
          </button>
        )}
      </div>

      {jobsQuery.isLoading && <ListSkeleton rows={6} />}

      <ul className="mt-4">
        {jobsQuery.data?.map((job, index) => (
          <li key={job.id} className="border-b border-grid">
            <Link to={ROUTES.jobDetail(job.id)} className="group flex items-start gap-6 py-6">
              <span className="index-figure pt-1 text-sm text-signal">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-medium text-ink group-hover:text-signal">
                  {job.title}
                </span>
                <span className="mt-1 flex flex-wrap gap-x-3 font-mono text-xs uppercase tracking-wide text-ink-soft">
                  <span>{job.company_name}</span>
                  <span>·</span>
                  <span>{job.work_mode === "remote" ? "Remote" : job.location ?? formatWorkMode(job.work_mode)}</span>
                  <span>·</span>
                  <span>{formatEmploymentType(job.employment_type)}</span>
                  <span>·</span>
                  <span>{formatSalaryRange(job.salary_min, job.salary_max)}</span>
                </span>
              </span>
              <span className="hidden shrink-0 font-mono text-xs text-ink-soft sm:block">
                {formatRelativeDate(job.created_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {!jobsQuery.isLoading && jobsQuery.data?.length === 0 && (
        <p className="border-b border-grid py-8 text-sm text-ink-soft">No roles match these filters.</p>
      )}
    </div>
  );
}
