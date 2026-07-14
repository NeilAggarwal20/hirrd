import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/react";

interface ClerkProviderWithRouterProps {
  publishableKey: string;
  children: ReactNode;
}

/**
 * Clerk recommends wiring routerPush/routerReplace to your SPA router
 * (see https://clerk.com/docs/react/reference/components/clerk-provider)
 * so Clerk's own internal navigations go through React Router rather
 * than Clerk's internal default. This must render inside <BrowserRouter>,
 * since useNavigate() requires router context.
 */
export function ClerkProviderWithRouter({ publishableKey, children }: ClerkProviderWithRouterProps) {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      afterSignOutUrl="/"
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
    >
      {children}
    </ClerkProvider>
  );
}
