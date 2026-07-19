import type { ProductTourStep } from "@/components/shared/product-tour";

export const candidateTourSteps: ProductTourStep[] = [
  {
    target: '[data-tour="candidate-dashboard-welcome"]',
    title: "Welcome to your dashboard",
    content: "This is home base — a quick view of your applications, saved roles, and profile status.",
    placement: "bottom",
  },
  {
    target: '[data-tour="candidate-resume-card"]',
    title: "Upload your resume",
    content: "Add a resume here so you're one click away from applying to any role.",
    placement: "bottom",
  },
  {
    target: '[data-tour="candidate-nav-profile"]',
    title: "Complete your profile",
    content: "Fill in your skills, experience, and education — recruiters see this before they see your resume.",
    placement: "right",
  },
  {
    target: '[data-tour="nav-browse-jobs"]',
    title: "Browse jobs",
    content: "Search and filter open roles by title, skill, location, and more.",
    placement: "bottom",
  },
  {
    target: '[data-tour="candidate-recommended"]',
    title: "Apply in a click",
    content: "Roles matched to your profile show up here — apply directly from your dashboard.",
    placement: "top",
  },
  {
    target: '[data-tour="candidate-nav-saved"]',
    title: "Saved roles",
    content: "Bookmark roles you're considering and come back to them any time.",
    placement: "right",
  },
];

export const recruiterTourSteps: ProductTourStep[] = [
  {
    target: '[data-tour="recruiter-dashboard-welcome"]',
    title: "Welcome to your dashboard",
    content: "Track hiring activity across every open role from here.",
    placement: "bottom",
  },
  {
    target: '[data-tour="recruiter-nav-company"]',
    title: "Set up your company profile",
    content: "Candidates see this before they apply — add a logo, description, and details.",
    placement: "right",
  },
  {
    target: '[data-tour="recruiter-new-role"]',
    title: "Post a job",
    content: "Create a new listing in a few steps and publish it when you're ready.",
    placement: "bottom",
  },
  {
    target: '[data-tour="recruiter-nav-jobs"]',
    title: "Manage your jobs",
    content: "Edit, publish, or close roles, and see applicant counts at a glance.",
    placement: "right",
  },
  {
    target: '[data-tour="recruiter-recent-applications"]',
    title: "View applicants",
    content: "New applications land here first — open any role to review candidates.",
    placement: "top",
  },
  {
    target: '[data-tour="recruiter-stats"]',
    title: "Analytics",
    content: "Keep an eye on published, draft, and closed roles across your pipeline.",
    placement: "bottom",
  },
];
