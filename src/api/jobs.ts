import { supabase } from "@/lib/supabase";
import type { ExperienceLevel, JobListingRow, WorkMode } from "@/types/database.types";

export type JobSort = "newest" | "oldest" | "salary_high" | "salary_low";

export interface JobFilters {
  search?: string;
  location?: string;
  workMode?: WorkMode;
  category?: string;
  companyId?: string;
  experienceLevel?: ExperienceLevel;
  salaryMin?: number;
  sort?: JobSort;
  limit?: number;
}

export async function fetchPublishedJobs(filters: JobFilters = {}): Promise<JobListingRow[]> {
  let query = supabase.from("job_listings").select("*").eq("status", "published");

  if (filters.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }
  if (filters.location) {
    query = query.ilike("location", `%${filters.location}%`);
  }
  if (filters.workMode) {
    query = query.eq("work_mode", filters.workMode);
  }
  if (filters.category) {
    query = query.eq("category", filters.category);
  }
  if (filters.companyId) {
    query = query.eq("company_id", filters.companyId);
  }
  if (filters.experienceLevel) {
    query = query.eq("experience_level", filters.experienceLevel);
  }
  if (filters.salaryMin) {
    query = query.gte("salary_max", filters.salaryMin);
  }

  switch (filters.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "salary_high":
      query = query.order("salary_max", { ascending: false, nullsFirst: false });
      break;
    case "salary_low":
      query = query.order("salary_min", { ascending: true, nullsFirst: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(filters.limit ?? 20);
  if (error) throw error;
  return data;
}

export async function fetchJobById(id: string): Promise<JobListingRow | null> {
  const { data, error } = await supabase
    .from("job_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchRelatedJobs(job: JobListingRow, limit = 4): Promise<JobListingRow[]> {
  const { data, error } = await supabase
    .from("job_listings")
    .select("*")
    .eq("status", "published")
    .eq("category", job.category)
    .neq("id", job.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/** Distinct category/company lists for building filter dropdowns. */
export async function fetchJobFacets(): Promise<{
  categories: string[];
  companies: { id: string; name: string }[];
}> {
  const { data, error } = await supabase
    .from("job_listings")
    .select("category, company_id, company_name")
    .eq("status", "published");

  if (error) throw error;

  const categories = Array.from(new Set(data.map((row) => row.category))).sort();
  const companyMap = new Map<string, string>();
  for (const row of data) companyMap.set(row.company_id, row.company_name);
  const companies = Array.from(companyMap, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return { categories, companies };
}

/**
 * Public applicant count. Backed by a SECURITY DEFINER function so it
 * works for anonymous visitors and candidates without exposing any
 * individual application row (RLS still fully hides those).
 */
export async function fetchJobApplicantCount(jobId: string): Promise<number> {
  const { data, error } = await supabase.rpc("job_applicant_count", { p_job_id: jobId });
  if (error) throw error;
  return data ?? 0;
}
