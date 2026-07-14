import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { createCompany, deleteCompany, fetchMyCompanies, updateCompany } from "@/api/companies";
import { uploadCompanyLogo, deleteCompanyLogo } from "@/api/storage";
import { CompanyForm } from "@/features/recruiter/company-form";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { CompanyFormValues } from "@/lib/validation";
import type { CompanyRow } from "@/types/database.types";

export function RecruiterCompanyPage() {
  const { profile } = useCurrentUser();
  const recruiterId = profile?.id ?? "";
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const companiesQuery = useQuery({
    queryKey: ["companies", recruiterId],
    queryFn: () => fetchMyCompanies(recruiterId),
    enabled: !!recruiterId,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["companies", recruiterId] });
  }

  const createMutation = useMutation({
    mutationFn: async ({ values, logoFile }: { values: CompanyFormValues; logoFile: File | null }) => {
      const logoUrl = logoFile ? await uploadCompanyLogo(recruiterId, logoFile) : undefined;
      return createCompany({
        recruiterId,
        name: values.name,
        industry: values.industry || undefined,
        headquarters: values.headquarters || undefined,
        website: values.website || undefined,
        description: values.description || undefined,
        logoUrl,
      });
    },
    onSuccess: () => {
      invalidate();
      setIsCreating(false);
      toast.success("Company created");
    },
    onError: () => toast.error("Couldn't create the company. Try a different name?"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
      logoFile,
      previousLogoUrl,
    }: {
      id: string;
      values: CompanyFormValues;
      logoFile: File | null;
      previousLogoUrl: string | null;
    }) => {
      const logoUrl = logoFile ? await uploadCompanyLogo(recruiterId, logoFile) : undefined;
      if (logoFile && previousLogoUrl) {
        deleteCompanyLogo(previousLogoUrl).catch(() => undefined);
      }
      return updateCompany(id, {
        name: values.name,
        industry: values.industry || null,
        headquarters: values.headquarters || null,
        website: values.website || null,
        description: values.description || null,
        ...(logoUrl ? { logo_url: logoUrl } : {}),
      });
    },
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      toast.success("Company updated");
    },
    onError: () => toast.error("Couldn't save changes."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => {
      invalidate();
      toast.success("Company deleted");
    },
    onError: (error: Error) => {
      if (error.message.includes("Close every published job")) {
        toast.error("Close every published job under this company before deleting it.");
      } else {
        toast.error("Couldn't delete this company.");
      }
    },
  });

  const companies = companiesQuery.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Recruiter</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight text-ink">
            Company
          </h1>
        </div>
        {!isCreating && (
          <Button size="sm" onClick={() => setIsCreating(true)}>
            + New company
          </Button>
        )}
      </div>

      {isCreating && (
        <div className="mt-8 border border-grid p-6">
          <p className="mb-6 font-display text-lg font-bold uppercase tracking-tight text-ink">
            New company
          </p>
          <CompanyForm
            submitLabel="Create company"
            isSubmitting={createMutation.isPending}
            onSubmit={(values, logoFile) => createMutation.mutate({ values, logoFile })}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      )}

      <ul className="mt-8">
        {companies.map((company: CompanyRow) => (
          <li key={company.id} className="border-b border-grid py-6">
            {editingId === company.id ? (
              <div className="border border-grid p-6">
                <p className="mb-6 font-display text-lg font-bold uppercase tracking-tight text-ink">
                  Edit {company.name}
                </p>
                <CompanyForm
                  submitLabel="Save changes"
                  isSubmitting={updateMutation.isPending}
                  defaultLogoUrl={company.logo_url}
                  defaultValues={{
                    name: company.name,
                    industry: company.industry ?? "",
                    headquarters: company.headquarters ?? "",
                    website: company.website ?? "",
                    description: company.description ?? "",
                  }}
                  onSubmit={(values, logoFile) =>
                    updateMutation.mutate({
                      id: company.id,
                      values,
                      logoFile,
                      previousLogoUrl: company.logo_url,
                    })
                  }
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-grid bg-paper-dim">
                    {company.logo_url ? (
                      <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-mono text-[10px] text-ink-soft">No logo</span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-ink">{company.name}</p>
                    <p className="mt-1 font-mono text-xs uppercase tracking-wide text-ink-soft">
                      {[company.industry, company.headquarters].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingId(company.id)}>
                    Edit
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="destructive" disabled={deleteMutation.isPending}>
                        Delete
                      </Button>
                    }
                    title={`Delete ${company.name}?`}
                    description="This can't be undone. You'll need to close every published job under this company first."
                    confirmLabel="Delete company"
                    onConfirm={() => deleteMutation.mutate(company.id)}
                  />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {!companiesQuery.isLoading && companies.length === 0 && !isCreating && (
        <p className="mt-8 border-b border-grid py-8 text-sm text-ink-soft">
          No companies yet. Create one to start posting jobs.
        </p>
      )}
    </div>
  );
}
