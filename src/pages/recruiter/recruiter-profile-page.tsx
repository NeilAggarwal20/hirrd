import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUser } from "@clerk/react";
import { useCurrentUser, CURRENT_USER_QUERY_KEY } from "@/hooks/use-current-user";
import { updateUserProfile } from "@/api/users";
import { recruiterProfileFormSchema, type RecruiterProfileFormValues } from "@/lib/validation";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RecruiterProfilePage() {
  const { profile } = useCurrentUser();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecruiterProfileFormValues>({
    resolver: zodResolver(recruiterProfileFormSchema),
    values: {
      firstName: profile?.first_name ?? "",
      lastName: profile?.last_name ?? "",
      companyRole: profile?.company_role ?? "",
      phone: profile?.phone ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: RecruiterProfileFormValues) => {
      if (!profile) throw new Error("No profile loaded");
      return updateUserProfile(profile.id, {
        first_name: values.firstName || null,
        last_name: values.lastName || null,
        company_role: values.companyRole || null,
        phone: values.phone || null,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([...CURRENT_USER_QUERY_KEY, updated.id], updated);
      toast.success("Profile saved");
    },
    onError: () => toast.error("Couldn't save your profile."),
  });

  function handleRestartTour() {
    if (!profile) return;
    localStorage.removeItem(`hirrd:tour:recruiter:${profile.id}`);
    navigate(ROUTES.recruiterDashboard);
    toast.success("Tour reset — check your dashboard.");
  }

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Recruiter</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight text-ink">
        Profile
      </h1>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleRestartTour}
        className="mt-4"
      >
        Restart product tour
      </Button>

      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="mt-8 max-w-lg space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden border border-grid bg-paper-dim">
            {user?.imageUrl && <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />}
          </div>
          <div>
            <p className="text-sm text-ink">Profile photo</p>
            <p className="font-mono text-xs text-ink-soft">Managed from the account menu (top right).</p>
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
          <Label htmlFor="companyRole">Your role at the company</Label>
          <Input id="companyRole" {...register("companyRole")} placeholder="Talent Acquisition Lead" />
          {errors.companyRole && <p className="mt-1 font-mono text-xs text-signal">{errors.companyRole.message}</p>}
        </div>

        <div>
          <Label htmlFor="phone">Contact phone</Label>
          <Input id="phone" {...register("phone")} placeholder="+91 98765 43210" />
        </div>

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving —" : "Save profile"}
        </Button>
      </form>
    </div>
  );
}
