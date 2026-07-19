import { useLocation } from "react-router-dom";
import { SignIn } from "@clerk/react";
import { buildPostAuthRedirect, getIntendedPath } from "@/lib/auth-redirect";

export function SignInPage() {
  const location = useLocation();
  const redirectUrl = buildPostAuthRedirect(getIntendedPath(location.state));

  return (
    <div className="mx-auto flex max-w-[1400px] justify-center px-6 py-16 sm:px-10">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl={redirectUrl}
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "border border-[--color-grid] shadow-none bg-transparent",
            headerTitle: "font-display uppercase tracking-tight",
            formButtonPrimary:
              "bg-[--color-ink] hover:bg-[--color-signal] text-[--color-paper] font-mono uppercase text-sm tracking-wide rounded-none",
            footerActionLink: "text-[--color-signal]",
            formFieldInput: "rounded-none border-[--color-grid]",
          },
        }}
      />
    </div>
  );
}
