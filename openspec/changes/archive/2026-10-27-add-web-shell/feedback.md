# Feedback — add-web-shell

<!-- l4:feedback v1
Ask for changes here while the unit's branch is open. The easy way is `l4 feedback add` (see `l4 feedback --help`).
An item is read only when its **Status** is `submitted`; `draft` items wait and `withdrawn` items are ignored.
Kinds: refactor · duplication · tests · config · behaviour (see docs/feedback.md).
Do not change item IDs. Commit and push to the l4/… branch: the harness takes submitted items at its next
verification round, turns them into a fix unit and checks that each one was addressed. -->

<!-- l4:feedback-index:start -->
| ID | Status | Kind | Where | Feedback |
|----|--------|------|-------|----------|
| FB-001 | taken | behaviour | web/src/app/features.ts:178 | A feature's page opens for a user without the feature's capability |
<!-- l4:feedback-index:end -->

---

## FB-001: A feature's page opens for a user without the feature's capability

- **Status:** taken
- **Kind:** behaviour
- **Where:** `web/src/app/features.ts:178-190`
- **Where:** `web/src/app/App.tsx:41-58`
- **Where:** `web/src/features/65-admin-grants.tsx:5-12`
- **Lesson:** no
- **By:** CiprianSpot, 2026-11-25T13:35:32Z

### Code
`web/src/app/features.ts:178-190`
```typescript
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
```
`web/src/app/App.tsx:41-58`
```
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
```
`web/src/features/65-admin-grants.tsx:5-12`
```
registerToolMessages();

export const feature: FeatureSpec = {
  id: "admin-grants",
  path: "/admin/grants",
  navLabel: "Grants",
  capability: "deploy_policy",
  element: <GrantsPage />,
```

### Feedback
The capability of a feature is read only to hide its menu link; the route table renders every feature for every user, so an author who opens /admin/grants sees a usable-looking New grant form and the tool list before the server refuses the grants list with FORBIDDEN. The server refuses every grant route (action deploy_policy), so this is about the page, not access. Seen in the crypto smoke through the UI, 2026-11-25.

### When / Then
- **When:** a signed-in user whose capabilities from /me do not include a feature's capability opens that feature's path directly, for example an author opening /admin/grants
- **Then:** the page shows only a not-allowed panel inside the shell, renders none of the feature's forms, tables or lists and sends none of the feature's API requests; a user who has the capability sees the page as today

### Outcome
<!-- written by the harness -->
Taken into add-web-shell-followup-1
