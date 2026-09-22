import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { frFR } from "@clerk/localizations";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ThemeProvider } from "next-themes";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import { MissingConfig } from "./components/missing-config";
import "@fontsource-variable/inter";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const root = createRoot(document.getElementById("root")!);
const missing: string[] = [];

if (!convexUrl) missing.push("VITE_CONVEX_URL");
if (!clerkKey || clerkKey.includes("REMPLACER")) missing.push("VITE_CLERK_PUBLISHABLE_KEY");

if (missing.length > 0) {
  root.render(
    <StrictMode>
      <MissingConfig missing={missing} />
    </StrictMode>,
  );
} else {
  const convex = new ConvexReactClient(convexUrl);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <ClerkProvider
          publishableKey={clerkKey}
          localization={frFR}
          appearance={{ variables: { colorPrimary: "#4f46e5", borderRadius: "10px" } }}
          signInUrl="/connexion"
          signUpUrl="/inscription"
        >
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="mestodo-theme">
              <App />
            </ThemeProvider>
          </ConvexProviderWithClerk>
        </ClerkProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
