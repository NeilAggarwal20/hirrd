// Hand-maintained types mirroring supabase/migrations/*.sql.
// If you change the schema, update this file in the same commit —
// there is no drift between the two in this project.
//
// NOTE: every Row/Insert/Update/Database shape below is declared with
// `type`, not `interface`. TypeScript 7's inference through
// postgrest-js's generic query builder does not resolve correctly
// against `interface`-declared table shapes (it collapses Insert to
// `never`) — this is a known friction point between TS7 and deeply
// conditional generic libraries. Keep these as type aliases.

export type UserRole = "recruiter" | "candidate";

export type EmploymentType = "full-time" | "part-time" | "contract" | "internship";
export type ExperienceLevel = "entry" | "mid" | "senior" | "lead";
export type WorkMode = "remote" | "hybrid" | "onsite";
export type JobStatus = "draft" | "published" | "closed";
export type ApplicationStatus =
  | "applied"
  | "under_review"
  | "interview"
  | "accepted"
  | "rejected";

export type ExperienceEntry = {
  title: string;
  company: string;
  start_date: string; // ISO date (year-month is fine, e.g. "2022-04")
  end_date: string | null; // null = present
  description: string;
};

export type EducationEntry = {
  school: string;
  degree: string;
  start_date: string;
  end_date: string | null;
};

export type UserRow = {
  id: string; // Clerk user id
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: UserRole | null;
  onboarding_completed: boolean;
  resume_url: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  portfolio_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  phone: string | null;
  company_role: string | null;
  created_at: string;
  updated_at: string;
};

export type UserInsert = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  role?: UserRole | null;
  onboarding_completed?: boolean;
  resume_url?: string | null;
  headline?: string | null;
  bio?: string | null;
  skills?: string[];
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  portfolio_url?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  phone?: string | null;
  company_role?: string | null;
};

export type UserUpdate = Partial<UserInsert>;

export type CompanyRow = {
  id: string;
  recruiter_id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  headquarters: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyInsert = {
  recruiter_id: string;
  name: string;
  logo_url?: string | null;
  website?: string | null;
  industry?: string | null;
  headquarters?: string | null;
  description?: string | null;
};

export type CompanyUpdate = Partial<CompanyInsert>;

export type JobRow = {
  id: string;
  company_id: string;
  recruiter_id: string;
  title: string;
  description: string;
  location: string | null;
  work_mode: WorkMode;
  employment_type: EmploymentType;
  experience_level: ExperienceLevel;
  category: string;
  salary_min: number | null;
  salary_max: number | null;
  benefits: string[];
  skills: string[];
  status: JobStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type JobInsert = {
  company_id: string;
  recruiter_id: string;
  title: string;
  description: string;
  location?: string | null;
  work_mode?: WorkMode;
  employment_type: EmploymentType;
  experience_level: ExperienceLevel;
  category: string;
  salary_min?: number | null;
  salary_max?: number | null;
  benefits?: string[];
  skills?: string[];
  status?: JobStatus;
};

export type JobUpdate = Partial<JobInsert>;

export type JobListingRow = {
  id: string;
  title: string;
  description: string;
  location: string | null;
  work_mode: WorkMode;
  employment_type: EmploymentType;
  experience_level: ExperienceLevel;
  category: string;
  salary_min: number | null;
  salary_max: number | null;
  benefits: string[];
  skills: string[];
  status: JobStatus;
  published_at: string | null;
  created_at: string;
  recruiter_id: string;
  company_id: string;
  company_name: string;
  company_logo_url: string | null;
  company_industry: string | null;
};

export type ApplicationRow = {
  id: string;
  job_id: string;
  candidate_id: string;
  resume_url: string;
  cover_letter: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
};

export type ApplicationInsert = {
  job_id: string;
  candidate_id: string;
  resume_url: string;
  cover_letter?: string | null;
  status?: ApplicationStatus;
};

export type ApplicationUpdate = Partial<ApplicationInsert>;

export type SavedJobRow = {
  id: string;
  job_id: string;
  candidate_id: string;
  created_at: string;
};

export type SavedJobInsert = {
  job_id: string;
  candidate_id: string;
};

export type SavedJobUpdate = Partial<SavedJobInsert>;

export type JobApplicationStatsRow = {
  job_id: string;
  recruiter_id: string;
  total_applications: number;
  applied_count: number;
  under_review_count: number;
  interview_count: number;
  accepted_count: number;
  rejected_count: number;
};

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: UserInsert;
        Update: UserUpdate;
        Relationships: [];
      };
      companies: {
        Row: CompanyRow;
        Insert: CompanyInsert;
        Update: CompanyUpdate;
        Relationships: [
          {
            foreignKeyName: "companies_recruiter_id_fkey";
            columns: ["recruiter_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: JobRow;
        Insert: JobInsert;
        Update: JobUpdate;
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_recruiter_id_fkey";
            columns: ["recruiter_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      applications: {
        Row: ApplicationRow;
        Insert: ApplicationInsert;
        Update: ApplicationUpdate;
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_jobs: {
        Row: SavedJobRow;
        Insert: SavedJobInsert;
        Update: SavedJobUpdate;
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_jobs_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      job_listings: { Row: JobListingRow; Relationships: [] };
      job_application_stats: { Row: JobApplicationStatsRow; Relationships: [] };
    };
    Functions: {
      job_applicant_count: {
        Args: { p_job_id: string };
        Returns: number;
      };
    };
  };
};
