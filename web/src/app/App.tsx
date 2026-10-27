import { useEffect } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router";

import { listFeatures, type Feature } from "./features.ts";
import { pageTitle, routeTable } from "./routes.ts";
import { Shell } from "./Shell.tsx";

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
      <h1>Page not found</h1>
      <p>
        <Link to="/">Go to the landing page</Link>
      </p>
    </>
  );
}

function featureById(features: readonly Feature[], id: string): Feature | undefined {
  return features.find((feature) => feature.id === id);
}

export function App() {
  const features = listFeatures();
  const entries = routeTable(features);

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
                    {featureById(features, entry.id)?.element}
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
