export const ROUTES = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  signInRoute: "/sign-in/*",
  signUpRoute: "/sign-up/*",
  onboarding: "/onboarding",

  jobs: "/jobs",
  jobDetail: (id: string) => `/jobs/${id}`,
  companyDetail: (id: string) => `/companies/${id}`,

  recruiterDashboard: "/recruiter",
  recruiterProfile: "/recruiter/profile",
  recruiterCompany: "/recruiter/company",
  recruiterJobs: "/recruiter/jobs",
  recruiterJobNew: "/recruiter/jobs/new",
  recruiterJobEdit: (id: string) => `/recruiter/jobs/${id}/edit`,
  recruiterApplicants: (jobId: string) =>
    `/recruiter/jobs/${jobId}/applicants`,

  candidateDashboard: "/candidate",
  candidateApplications: "/candidate/applications",
  candidateSaved: "/candidate/saved",

  // 👇 Ye do hi naye routes add karne hain
  candidateInterviews: "/candidate/interviews",
  candidateInterviewResults: (id: string) =>
    `/candidate/interviews/${id}`,

  candidateProfile: "/candidate/profile",
} as const;