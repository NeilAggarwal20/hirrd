import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useUser } from "@clerk/react";
import { useCurrentUser, CURRENT_USER_QUERY_KEY } from "@/hooks/use-current-user";
import { updateUserProfile } from "@/api/users";
import { deleteResume, getResumeSignedUrl, uploadResume } from "@/api/storage";
import { parseCommaList, profileFormSchema, type ProfileFormValues } from "@/lib/validation";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatResumeCompletion } from "@/utils/format";
import { ResumeDialog } from "@/components/shared/resume-dialog";
import { ResumeReviewDialog } from "@/components/shared/resume-review-dialog";

export function CandidateProfilePage() {
  const { profile } = useCurrentUser();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isOpeningResume, setIsOpeningResume] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: {
      firstName: profile?.first_name ?? "",
      lastName: profile?.last_name ?? "",
      headline: profile?.headline ?? "",
      bio: profile?.bio ?? "",
      skills: profile?.skills.join(", ") ?? "",
      portfolioUrl: profile?.portfolio_url ?? "",
      githubUrl: profile?.github_url ?? "",
      linkedinUrl: profile?.linkedin_url ?? "",
      phone: profile?.phone ?? "",
      experience: profile?.experience.map((e) => ({ ...e, end_date: e.end_date ?? "" })) ?? [],
      education: profile?.education.map((e) => ({ ...e, end_date: e.end_date ?? "" })) ?? [],
    },
  });

  const experienceArray = useFieldArray({ control, name: "experience" });
  const educationArray = useFieldArray({ control, name: "education" });

  const mutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      if (!profile) throw new Error("No profile loaded");

      let resumeUrl = profile.resume_url;
      if (resumeFile) {
        resumeUrl = await uploadResume(profile.id, resumeFile);
        if (profile.resume_url) {
          deleteResume(profile.resume_url).catch(() => undefined);
        }
      }

      return updateUserProfile(profile.id, {
        first_name: values.firstName || null,
        last_name: values.lastName || null,
        headline: values.headline || null,
        bio: values.bio || null,
        resume_url: resumeUrl,
        skills: parseCommaList(values.skills),
        portfolio_url: values.portfolioUrl || null,
        github_url: values.githubUrl || null,
        linkedin_url: values.linkedinUrl || null,
        phone: values.phone || null,
        experience: values.experience.map((e) => ({ ...e, end_date: e.end_date || null, description: e.description || "" })),
        education: values.education.map((e) => ({ ...e, end_date: e.end_date || null })),
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([...CURRENT_USER_QUERY_KEY, updated.id], updated);
      setResumeFile(null);
      toast.success("Profile saved");
    },
    onError: () => toast.error("Couldn't save your profile."),
  });

  async function openResume() {
    if (!profile?.resume_url) return;
    setIsOpeningResume(true);
    try {
      const url = await getResumeSignedUrl(profile.resume_url);
      setPreviewUrl(url);
      setIsPreviewOpen(true);
    } catch {
      toast.error("Couldn't open your resume.");
    } finally {
      setIsOpeningResume(false);
    }
  }

  const completion = profile
    ? formatResumeCompletion({
        headline: profile.headline,
        bio: profile.bio,
        resume_url: profile.resume_url,
        skills: profile.skills,
        experience: profile.experience,
        education: profile.education,
      })
    : 0;

  function handleRestartTour() {
    if (!profile) return;
    localStorage.removeItem(`hirrd:tour:candidate:${profile.id}`);
    navigate(ROUTES.candidateDashboard);
    toast.success("Tour reset — check your dashboard.");
  }

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Candidate</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight text-ink">
        Profile
      </h1>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 max-w-xs bg-paper-dim">
          <div className="h-2 bg-signal transition-all" style={{ width: `${completion}%` }} />
        </div>
        <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
          {completion}% complete
        </span>
        <Button type="button" variant="outline" size="sm" onClick={handleRestartTour} className="ml-auto">
          Restart product tour
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="mt-8 max-w-xl space-y-8">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden border border-grid bg-paper-dim">
            {user?.imageUrl && <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />}
          </div>
          <div>
            <p className="text-sm text-ink">Profile photo</p>
            <p className="font-mono text-xs text-ink-soft">
              Managed from the account menu (top right) — synced automatically from there.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...register("firstName")} />
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...register("lastName")} />
          </div>
        </div>

        <div>
          <Label htmlFor="headline">Headline</Label>
          <Input id="headline" {...register("headline")} placeholder="Frontend engineer, 4 years" />
          {errors.headline && <p className="mt-1 font-mono text-xs text-signal">{errors.headline.message}</p>}
        </div>

        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" rows={5} {...register("bio")} placeholder="A short summary recruiters will see." />
        </div>

        <div>
          <Label htmlFor="skills">Skills</Label>
          <Input id="skills" {...register("skills")} placeholder="React, TypeScript, SQL (comma-separated)" />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} placeholder="+91 98765 43210" />
          </div>
          <div>
            <Label htmlFor="portfolioUrl">Portfolio</Label>
            <Input id="portfolioUrl" {...register("portfolioUrl")} placeholder="https://…" />
            {errors.portfolioUrl && (
              <p className="mt-1 font-mono text-xs text-signal">{errors.portfolioUrl.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="githubUrl">GitHub</Label>
            <Input id="githubUrl" {...register("githubUrl")} placeholder="https://github.com/…" />
            {errors.githubUrl && <p className="mt-1 font-mono text-xs text-signal">{errors.githubUrl.message}</p>}
          </div>
          <div>
            <Label htmlFor="linkedinUrl">LinkedIn</Label>
            <Input id="linkedinUrl" {...register("linkedinUrl")} placeholder="https://linkedin.com/in/…" />
            {errors.linkedinUrl && (
              <p className="mt-1 font-mono text-xs text-signal">{errors.linkedinUrl.message}</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label className="mb-0">Experience</Label>
            <button
              type="button"
              onClick={() =>
                experienceArray.append({ title: "", company: "", start_date: "", end_date: "", description: "" })
              }
              className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-signal hover:underline cursor-pointer"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <div className="mt-3 space-y-4">
            {experienceArray.fields.map((field, index) => (
              <div key={field.id} className="border border-grid p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input {...register(`experience.${index}.title`)} placeholder="Title" />
                  <Input {...register(`experience.${index}.company`)} placeholder="Company" />
                  <Input {...register(`experience.${index}.start_date`)} placeholder="Start (e.g. 2022-04)" />
                  <Input {...register(`experience.${index}.end_date`)} placeholder="End (blank = present)" />
                </div>
                <Textarea
                  {...register(`experience.${index}.description`)}
                  rows={2}
                  placeholder="What you did"
                  className="mt-3"
                />
                <button
                  type="button"
                  onClick={() => experienceArray.remove(index)}
                  className="mt-2 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-signal cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
            ))}
            {experienceArray.fields.length === 0 && (
              <p className="font-mono text-xs text-ink-soft">No experience added yet.</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label className="mb-0">Education</Label>
            <button
              type="button"
              onClick={() => educationArray.append({ school: "", degree: "", start_date: "", end_date: "" })}
              className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-signal hover:underline cursor-pointer"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <div className="mt-3 space-y-4">
            {educationArray.fields.map((field, index) => (
              <div key={field.id} className="border border-grid p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input {...register(`education.${index}.school`)} placeholder="School" />
                  <Input {...register(`education.${index}.degree`)} placeholder="Degree" />
                  <Input {...register(`education.${index}.start_date`)} placeholder="Start (e.g. 2018)" />
                  <Input {...register(`education.${index}.end_date`)} placeholder="End (blank = present)" />
                </div>
                <button
                  type="button"
                  onClick={() => educationArray.remove(index)}
                  className="mt-2 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-signal cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
            ))}
            {educationArray.fields.length === 0 && (
              <p className="font-mono text-xs text-ink-soft">No education added yet.</p>
            )}
          </div>
        </div>

        <div>
          <Label>Resume (PDF)</Label>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs text-ink-soft">
              {resumeFile ? resumeFile.name : profile?.resume_url ? "Resume on file" : "No resume uploaded"}
            </span>
            {profile?.resume_url && !resumeFile && (
              <Button type="button" variant="outline" size="sm" onClick={openResume} disabled={isOpeningResume}>
                {isOpeningResume ? "Opening —" : "Preview / Download"}
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              {profile?.resume_url ? "Replace" : "Upload"}
            </Button>
            {profile?.resume_url && !resumeFile && (
              <div className="flex flex-col gap-1.5 items-start">
                <Button type="button" variant="outline" size="sm" disabled className="opacity-50 cursor-not-allowed">
                  Coming Soon
                </Button>
                <span className="font-mono text-[10px] uppercase tracking-wide text-ink-soft">
                  AI Resume Review will be available soon.
                </span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving —" : "Save profile"}
        </Button>
      </form>

      {/* Resume Preview Modal */}
      {profile?.resume_url && (
        <ResumeDialog
          isOpen={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          resumeUrl={previewUrl}
          candidateName={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`}
        />
      )}

      {profile?.resume_url && profile?.id && (
        <ResumeReviewDialog isOpen={isReviewOpen} onOpenChange={setIsReviewOpen} candidateId={profile.id} />
      )}
    </div>
  );
}
