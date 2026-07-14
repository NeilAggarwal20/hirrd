import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { companyFormSchema, type CompanyFormValues } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CompanyFormProps {
  defaultValues?: Partial<CompanyFormValues>;
  defaultLogoUrl?: string | null;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: CompanyFormValues, logoFile: File | null) => void;
  onCancel?: () => void;
}

export function CompanyForm({
  defaultValues,
  defaultLogoUrl,
  submitLabel,
  isSubmitting,
  onSubmit,
  onCancel,
}: CompanyFormProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(defaultLogoUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: "",
      industry: "",
      headquarters: "",
      website: "",
      description: "",
      ...defaultValues,
    },
  });

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values, logoFile))} className="space-y-6">
      <div>
        <Label>Logo</Label>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-grid bg-paper-dim">
            {logoPreview ? (
              <img src={logoPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-mono text-xs text-ink-soft">No logo</span>
            )}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Upload logo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleLogoChange}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="name">Company name</Label>
        <Input id="name" {...register("name")} placeholder="Northwind Systems" />
        {errors.name && <p className="mt-1 font-mono text-xs text-signal">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="industry">Industry</Label>
          <Input id="industry" {...register("industry")} placeholder="Enterprise software" />
        </div>
        <div>
          <Label htmlFor="headquarters">Headquarters</Label>
          <Input id="headquarters" {...register("headquarters")} placeholder="Bengaluru, IN" />
        </div>
      </div>

      <div>
        <Label htmlFor="website">Website</Label>
        <Input id="website" {...register("website")} placeholder="https://example.com" />
        {errors.website && <p className="mt-1 font-mono text-xs text-signal">{errors.website.message}</p>}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={4} {...register("description")} placeholder="What does the company do?" />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
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
