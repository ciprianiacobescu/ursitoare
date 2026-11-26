# Proposal: follow-up 1 for add-web-shell

## Why
Requested by CiprianSpot, 2026-11-25T13:35:32Z in FB-001 (behaviour, web/src/app/features.ts:178-190, web/src/app/App.tsx:41-58, web/src/features/65-admin-grants.tsx:5-12): The capability of a feature is read only to hide its menu link; the route table renders every feature for every user, so an author who opens /admin/grants sees a usable-looking New grant form and the tool list before the server refuses the grants list with FORBIDDEN. The server refuses every grant route (action deploy_policy), so this is about the page, not access. Seen in the crypto smoke through the UI, 2026-11-25.

        nav(capabilities: ReadonlySet<string> = new Set()): NavItem[] {
          const items: NavItem[] = [];
          for (const feature of features) {
            if (feature.navLabel === undefined) {
              continue;
            }
            if (feature.capability !== undefined && !capabilities.has(feature.capability)) {
              continue;
            }
            items.push({ id: feature.id, path: feature.path, label: feature.navLabel });
          }
          return items;
        },
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
    registerToolMessages();

    export const feature: FeatureSpec = {
      id: "admin-grants",
      path: "/admin/grants",
      navLabel: "Grants",
      capability: "deploy_policy",
      element: <GrantsPage />,

`add-web-shell` was merged, and a person asked for the changes above in its `feedback.md`. This change carries them out; each task names the finding it answers.

## What Changes
- F-ccfd5159: Feedback FB-001 (behaviour): A feature's page opens for a user without the feature's capability

## Impact
The code and the tests of `add-web-shell`.
