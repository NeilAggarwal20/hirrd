import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { jobFormSchema, type JobFormValues } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import type { CompanyRow, EmploymentType, ExperienceLevel, WorkMode } from "@/types/database.types";

const workModes: { value: WorkMode; label: string }[] = [
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
];

const employmentTypes: { value: EmploymentType; label: string }[] = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

const experienceLevels: { value: ExperienceLevel; label: string }[] = [
  { value: "entry", label: "Entry level" },
  { value: "mid", label: "Mid level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
];

interface JobFormProps {
  companies: CompanyRow[];
  companyId: string;
  onCompanyChange: (id: string) => void;
  defaultValues?: Partial<JobFormValues>;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: JobFormValues) => void;
  onCancel?: () => void;
}

export function JobForm({
  companies,
  companyId,
  onCompanyChange,
  defaultValues,
  submitLabel,
  isSubmitting,
  onSubmit,
  onCancel,
}: JobFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      workMode: "onsite",
      employmentType: "full-time",
      experienceLevel: "mid",
      category: "",
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="job-company">Company</Label>
        <Select value={companyId} onValueChange={onCompanyChange}>
          <SelectTrigger id="job-company">
            <SelectValue placeholder="Choose a company" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="title">Job title</Label>
        <Input id="title" {...register("title")} placeholder="Frontend Engineer" />
        {errors.title && <p className="mt-1 font-mono text-xs text-signal">{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <RichTextEditor value={field.value} onChange={field.onChange} placeholder="Role responsibilities, requirements, benefits…" />
          )}
        />
        {errors.description && (
          <p className="mt-1 font-mono text-xs text-signal">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="category">Category</Label>
          <Input id="category" {...register("category")} placeholder="Engineering" />
          {errors.category && <p className="mt-1 font-mono text-xs text-signal">{errors.category.message}</p>}
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...register("location")} placeholder="Bengaluru, IN" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <Label htmlFor="employmentType">Employment type</Label>
          <Controller
            control={control}
            name="employmentType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="employmentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {employmentTypes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="experienceLevel">Experience level</Label>
          <Controller
            control={control}
            name="experienceLevel"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="experienceLevel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {experienceLevels.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="workMode">Work mode</Label>
          <Controller
            control={control}
            name="workMode"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="workMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workModes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="salaryMin">Salary min (₹/year)</Label>
          <Input id="salaryMin" type="number" {...register("salaryMin", { valueAsNumber: true })} placeholder="1800000" />
        </div>
        <div>
          <Label htmlFor="salaryMax">Salary max (₹/year)</Label>
          <Input id="salaryMax" type="number" {...register("salaryMax", { valueAsNumber: true })} placeholder="2600000" />
          {errors.salaryMax && <p className="mt-1 font-mono text-xs text-signal">{errors.salaryMax.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="skills">Skills required</Label>
        <Input id="skills" {...register("skills")} placeholder="React, TypeScript, PostgreSQL (comma-separated)" />
      </div>

      <div>
        <Label htmlFor="benefits">Benefits</Label>
        <Textarea
          id="benefits"
          rows={2}
          {...register("benefits")}
          placeholder="Health insurance, Equity, Remote stipend (comma-separated)"
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting || !companyId}>
          {isSubmitting ? "Saving —" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
