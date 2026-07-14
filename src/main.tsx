import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkLoaded, ClerkLoading } from "@clerk/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "@/App";
import { ClerkProviderWithRouter } from "@/providers/clerk-provider-with-router";
import { SupabaseProvider } from "@/providers/supabase-provider";
import { queryClient } from "@/lib/query-client";
import { SplashScreen } from "@/components/shared/splash-screen";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import "@/styles/index.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error(
    "Missing VITE_CLERK_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill it in."
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      {/*
        BrowserRouter now wraps ClerkProvider (previously the reverse).
        ClerkProviderWithRouter calls useNavigate() and wires it to
        Clerk's routerPush/routerReplace props, which requires Router
        context to already exist above it.
      */}
      <BrowserRouter>
        <ClerkProviderWithRouter publishableKey={clerkPublishableKey}>
          {/*
            Clerk's session check happens before we know whether the visitor
            is signed in. Rendering nothing (or the real app mid-hydration)
            during that window is exactly what causes the flash/black-screen/
            white-screen sequence. Showing one deliberate splash here — and
            only swapping to the real app once Clerk has fully resolved —
            replaces that with a single, controlled transition.
          */}
          <ClerkLoading>
            <SplashScreen />
          </ClerkLoading>
          <ClerkLoaded>
            <SupabaseProvider>
              <QueryClientProvider client={queryClient}>
                <App />
                <Toaster position="top-right" theme="light" toastOptions={{ style: { borderRadius: 0 } }} />
              </QueryClientProvider>
            </SupabaseProvider>
          </ClerkLoaded>
        </ClerkProviderWithRouter>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
