import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { RootLayout } from "@/layouts/root-layout";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { RouteFallback } from "@/components/shared/route-fallback";
import { NotFoundPage } from "@/pages/not-found-page";
import { ROUTES } from "@/constants/routes";

const LandingPage = lazy(() => import("@/pages/landing-page").then((m) => ({ default: m.LandingPage })));
const JobsBrowsePage = lazy(() => import("@/pages/jobs-browse-page").then((m) => ({ default: m.JobsBrowsePage })));
const JobDetailPage = lazy(() => import("@/pages/job-detail-page").then((m) => ({ default: m.JobDetailPage })));
const CompanyDetailPage = lazy(() =>
  import("@/pages/company-detail-page").then((m) => ({ default: m.CompanyDetailPage }))
);
const SignInPage = lazy(() => import("@/pages/sign-in-page").then((m) => ({ default: m.SignInPage })));
const SignUpPage = lazy(() => import("@/pages/sign-up-page").then((m) => ({ default: m.SignUpPage })));
const OnboardingPage = lazy(() => import("@/pages/onboarding-page").then((m) => ({ default: m.OnboardingPage })));

const RecruiterDashboardPage = lazy(() =>
  import("@/pages/recruiter/recruiter-dashboard-page").then((m) => ({ default: m.RecruiterDashboardPage }))
);
const RecruiterCompanyPage = lazy(() =>
  import("@/pages/recruiter/recruiter-company-page").then((m) => ({ default: m.RecruiterCompanyPage }))
);
const RecruiterJobsPage = lazy(() =>
  import("@/pages/recruiter/recruiter-jobs-page").then((m) => ({ default: m.RecruiterJobsPage }))
);
const RecruiterJobFormPage = lazy(() =>
  import("@/pages/recruiter/recruiter-job-form-page").then((m) => ({ default: m.RecruiterJobFormPage }))
);
const RecruiterApplicantsPage = lazy(() =>
  import("@/pages/recruiter/recruiter-applicants-page").then((m) => ({ default: m.RecruiterApplicantsPage }))
);
const RecruiterProfilePage = lazy(() =>
  import("@/pages/recruiter/recruiter-profile-page").then((m) => ({ default: m.RecruiterProfilePage }))
);

const CandidateDashboardPage = lazy(() =>
  import("@/pages/candidate/candidate-dashboard-page").then((m) => ({ default: m.CandidateDashboardPage }))
);
const CandidateApplicationsPage = lazy(() =>
  import("@/pages/candidate/candidate-applications-page").then((m) => ({ default: m.CandidateApplicationsPage }))
);
const CandidateSavedJobsPage = lazy(() =>
  import("@/pages/candidate/candidate-saved-jobs-page").then((m) => ({ default: m.CandidateSavedJobsPage }))
);
const CandidateProfilePage = lazy(() =>
  import("@/pages/candidate/candidate-profile-page").then((m) => ({ default: m.CandidateProfilePage }))
);

const recruiterNavItems = [
  { label: "Overview", to: ROUTES.recruiterDashboard, end: true },
  { label: "Company", to: ROUTES.recruiterCompany },
  { label: "Jobs", to: ROUTES.recruiterJobs },
  { label: "Profile", to: ROUTES.recruiterProfile },
];

const candidateNavItems = [
  { label: "Overview", to: ROUTES.candidateDashboard, end: true },
  { label: "Applications", to: ROUTES.candidateApplications },
  { label: "Saved roles", to: ROUTES.candidateSaved },
  { label: "Profile", to: ROUTES.candidateProfile },
];

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path={ROUTES.home} element={<LandingPage />} />
          <Route path={ROUTES.jobs} element={<JobsBrowsePage />} />
          <Route path={ROUTES.jobDetail(":id")} element={<JobDetailPage />} />
          <Route path={ROUTES.companyDetail(":id")} element={<CompanyDetailPage />} />
          <Route path={ROUTES.signIn} element={<SignInPage />} />
          <Route path={ROUTES.signUp} element={<SignUpPage />} />

          <Route
            path={ROUTES.onboarding}
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          <Route
            element={
              <ProtectedRoute requireRole="recruiter">
                <DashboardLayout sectionLabel="Recruiter" navItems={recruiterNavItems} />
              </ProtectedRoute>
            }
          >
            <Route path={ROUTES.recruiterDashboard} element={<RecruiterDashboardPage />} />
            <Route path={ROUTES.recruiterCompany} element={<RecruiterCompanyPage />} />
            <Route path={ROUTES.recruiterJobs} element={<RecruiterJobsPage />} />
            <Route path={ROUTES.recruiterJobNew} element={<RecruiterJobFormPage />} />
            <Route path={ROUTES.recruiterJobEdit(":id")} element={<RecruiterJobFormPage />} />
            <Route path={ROUTES.recruiterApplicants(":jobId")} element={<RecruiterApplicantsPage />} />
            <Route path={ROUTES.recruiterProfile} element={<RecruiterProfilePage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute requireRole="candidate">
                <DashboardLayout sectionLabel="Candidate" navItems={candidateNavItems} />
              </ProtectedRoute>
            }
          >
            <Route path={ROUTES.candidateDashboard} element={<CandidateDashboardPage />} />
            <Route path={ROUTES.candidateApplications} element={<CandidateApplicationsPage />} />
            <Route path={ROUTES.candidateSaved} element={<CandidateSavedJobsPage />} />
            <Route path={ROUTES.candidateProfile} element={<CandidateProfilePage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
