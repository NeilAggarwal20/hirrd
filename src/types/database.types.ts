export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "candidate" | "recruiter";

export type UserRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  onboarding_completed: boolean;
  resume_url: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  experience: any[];
  education: any[];
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
  experience?: any[];
  education?: any[];
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

export type DepartmentRow = {
  id: string;
  recruiter_id: string;
  name: string;
  created_at: string;
};

export type DepartmentInsert = {
  recruiter_id: string;
  name: string;
};

export type DepartmentUpdate = Partial<DepartmentInsert>;

export type EmploymentType =
  | "full-time"
  | "part-time"
  | "contract"
  | "internship";

export type WorkMode = "remote" | "hybrid" | "onsite";

export type ExperienceLevel = "entry" | "mid" | "senior" | "lead";

export type JobStatus = "draft" | "published" | "archived" | "closed";

export type JobRow = {
  id: string;
  recruiter_id: string;
  company_id: string;
  department_id: string | null;
  title: string;
  description: string;
  employment_type: EmploymentType;
  work_mode: WorkMode;
  location: string | null;
  experience_level: ExperienceLevel;
  category: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  benefits: string[];
  skills: string[];
  status: JobStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type JobInsert = {
  recruiter_id: string;
  company_id: string;
  department_id?: string | null;
  title: string;
  description: string;
  employment_type: EmploymentType;
  work_mode: WorkMode;
  location?: string | null;
  experience_level: ExperienceLevel;
  category: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string;
  benefits?: string[];
  skills?: string[];
  status?: JobStatus;
  published_at?: string | null;
};

export type JobUpdate = Partial<JobInsert>;

export type ApplicationStatus =
  | "applied"
  | "under_review"
  | "interview"
  | "accepted"
  | "rejected";

export type ApplicationRow = {
  id: string;
  job_id: string;
  candidate_id: string;
  resume_url: string;
  cover_letter: string | null;
  status: ApplicationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationInsert = {
  job_id: string;
  candidate_id: string;
  resume_url: string;
  cover_letter?: string | null;
  status?: ApplicationStatus;
  notes?: string | null;
};

export type ApplicationUpdate = Partial<ApplicationInsert>;

export type SavedJobRow = {
  id: string;
  candidate_id: string;
  job_id: string;
  created_at: string;
};

export type SavedJobInsert = {
  candidate_id: string;
  job_id: string;
};

export type SavedJobUpdate = Partial<SavedJobInsert>;

export type MockInterviewRow = {
  id: string;
  candidate_id: string;
  job_id: string;
  overall_score: number;
  technical_score: number;
  communication_score: number;
  feedback_json: Record<string, unknown>;
  created_at: string;
};

export type MockInterviewInsert = {
  candidate_id: string;
  job_id: string;
  overall_score: number;
  technical_score: number;
  communication_score: number;
  feedback_json: Record<string, unknown>;
};

export type MockInterviewUpdate = Partial<MockInterviewInsert>;

export type JobApplicationStatsRow = {
  job_id: string;
  recruiter_id: string;
  title: string;
  status: JobStatus;
  created_at: string;
  total_applications: number;
  applied_count: number;
  under_review_count: number;
  interview_count: number;
  accepted_count: number;
  rejected_count: number;
};

export type JobListingRow = JobRow & {
  companies: Pick<CompanyRow, "id" | "name" | "logo_url"> | null;
  departments: Pick<DepartmentRow, "id" | "name"> | null;
  company_name: string;
  company_logo_url: string | null;
  company_industry: string | null;
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
      departments: {
        Row: DepartmentRow;
        Insert: DepartmentInsert;
        Update: DepartmentUpdate;
        Relationships: [
          {
            foreignKeyName: "departments_recruiter_id_fkey";
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
            foreignKeyName: "jobs_recruiter_id_fkey";
            columns: ["recruiter_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
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
      mock_interviews: {
        Row: MockInterviewRow;
        Insert: MockInterviewInsert;
        Update: MockInterviewUpdate;
        Relationships: [
          {
            foreignKeyName: "mock_interviews_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mock_interviews_candidate_id_fkey";
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
        Args: {
          p_job_id: string;
        };
        Returns: number;
      };
    };
    Enums: {
      user_role: UserRole;
      employment_type: EmploymentType;
      work_mode: WorkMode;
      experience_level: ExperienceLevel;
      job_status: JobStatus;
      application_status: ApplicationStatus;
    };
  };
};