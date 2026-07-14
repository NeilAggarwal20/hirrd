import { z } from "zod";

const optionalUrl = (label: string) =>
  z
    .string()
    .max(200)
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || /^https?:\/\/.+/.test(val), {
      message: `${label} must include http:// or https://`,
    });

export const companyFormSchema = z.object({
  name: z.string().min(2, "Company name is too short").max(120),
  industry: z.string().max(80).optional().or(z.literal("")),
  headquarters: z.string().max(120).optional().or(z.literal("")),
  website: optionalUrl("Website"),
  description: z.string().max(2000).optional().or(z.literal("")),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;

export const jobFormSchema = z
  .object({
    title: z.string().min(3, "Title is too short").max(160),
    description: z.string().min(20, "Add a bit more detail to the description"),
    location: z.string().max(120).optional().or(z.literal("")),
    workMode: z.enum(["remote", "hybrid", "onsite"]),
    employmentType: z.enum(["full-time", "part-time", "contract", "internship"]),
    experienceLevel: z.enum(["entry", "mid", "senior", "lead"]),
    category: z.string().min(2, "Pick a category").max(80),
    salaryMin: z.number().int().nonnegative().optional(),
    salaryMax: z.number().int().nonnegative().optional(),
    // Comma-separated in the UI; split into arrays before hitting the API.
    skills: z.string().max(500).optional().or(z.literal("")),
    benefits: z.string().max(1000).optional().or(z.literal("")),
  })
  .refine((data) => !data.salaryMin || !data.salaryMax || data.salaryMax >= data.salaryMin, {
    message: "Maximum salary must be at least the minimum",
    path: ["salaryMax"],
  });

export type JobFormValues = z.infer<typeof jobFormSchema>;

export function parseCommaList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const experienceEntrySchema = z.object({
  title: z.string().min(1, "Required").max(120),
  company: z.string().min(1, "Required").max(120),
  start_date: z.string().min(1, "Required").max(20),
  end_date: z.string().max(20).optional().or(z.literal("")),
  description: z.string().max(600).optional().or(z.literal("")),
});

export const educationEntrySchema = z.object({
  school: z.string().min(1, "Required").max(160),
  degree: z.string().min(1, "Required").max(160),
  start_date: z.string().min(1, "Required").max(20),
  end_date: z.string().max(20).optional().or(z.literal("")),
});

export const profileFormSchema = z.object({
  firstName: z.string().max(80).optional().or(z.literal("")),
  lastName: z.string().max(80).optional().or(z.literal("")),
  headline: z.string().max(140).optional().or(z.literal("")),
  bio: z.string().max(1000).optional().or(z.literal("")),
  skills: z.string().max(500).optional().or(z.literal("")),
  portfolioUrl: optionalUrl("Portfolio link"),
  githubUrl: optionalUrl("GitHub link"),
  linkedinUrl: optionalUrl("LinkedIn link"),
  phone: z.string().max(30).optional().or(z.literal("")),
  experience: z.array(experienceEntrySchema).max(15),
  education: z.array(educationEntrySchema).max(10),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const recruiterProfileFormSchema = z.object({
  firstName: z.string().max(80).optional().or(z.literal("")),
  lastName: z.string().max(80).optional().or(z.literal("")),
  companyRole: z.string().max(120).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
});

export type RecruiterProfileFormValues = z.infer<typeof recruiterProfileFormSchema>;
