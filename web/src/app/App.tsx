import { useEffect } from "react";
import type { ReactNode } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router";

import { ApiRequestError } from "../api/client.ts";
import { useSession } from "../auth/use-session.ts";
import { ErrorPanel } from "../kit/ErrorPanel.tsx";
import { LoadingState } from "../kit/LoadingState.tsx";
import type { CapabilityState } from "../kit/capabilities.ts";
import { Button } from "../ui/button.tsx";
import { listFeatures } from "./features.ts";
import type { Feature } from "./features.ts";
import { pageTitle, routeTable } from "./routes.ts";
import { Shell } from "./Shell.tsx";

const SERVER_GATED_FEATURES: ReadonlySet<string> = new Set(["admin-users"]);
const NOT_ALLOWED: ApiRequestError = new ApiRequestError(403, "FORBIDDEN", "Not allowed");

function DocumentTitle({ routeId }: { readonly routeId: string }) {
  useEffect(() => {
    document.title = pageTitle(routeId);
  }, [routeId]);
  return null;
}

function NotFoundPage() {
  return (
    <>
      <DocumentTitle routeId="not-found" />
      <div className="mx-auto mt-12 flex max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface p-6 text-center">
        <h1>Page not found</h1>
        <p>The page you asked for does not exist.</p>
        <Button asChild tone="primary">
          <Link to="/">Go to the landing page</Link>
        </Button>
      </div>
    </>
  );
}

function featureById(features: readonly Feature[], id: string): Feature | undefined {
  return features.find((feature) => feature.id === id);
}

function FeaturePage({
  feature,
  session,
}: {
  readonly feature: Feature | undefined;
  readonly session: CapabilityState | null;
}): ReactNode {
  if (feature === undefined) {
    return null;
  }
  if (feature.capability === undefined || SERVER_GATED_FEATURES.has(feature.id)) {
    return feature.element;
  }
  if (session === null) {
    return <LoadingState label="Checking your session" />;
  }
  if (session.status !== "ready") {
    return feature.element;
  }
  if (!session.me.capabilities.has(feature.capability)) {
    return <ErrorPanel error={NOT_ALLOWED} />;
  }
  return feature.element;
}

export function App() {
  const features = listFeatures();
  const entries = routeTable(features);
  const session = useSession();

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          {entries.map((entry) =>
            entry.id === "not-found" ? (
              <Route key={entry.id} path={entry.path} element={<NotFoundPage />} />
            ) : (
              <Route
                key={entry.id}
                path={entry.path}
                element={
                  <>
                    <DocumentTitle routeId={entry.id} />
                    <FeaturePage feature={featureById(features, entry.id)} session={session} />
                  </>
                }
              />
            ),
          )}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
