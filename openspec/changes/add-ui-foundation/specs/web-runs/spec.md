## MODIFIED Requirements

### Requirement: The new components follow the run sources' rules
`DryRunPanel.tsx` and `RunPage.tsx` SHALL hold no inline style and no `dangerouslySetInnerHTML`; `80-runs.tsx` SHALL register `DRY_RUN_PANEL` with a second `registerEditorPanel(` call and keep one `registerRunMessages();` and its feature literals, and add no feature file.

#### Scenario: Sources read as the rules say
- **WHEN** `dry-run-sources.test.ts` reads `DryRunPanel.tsx`, `RunPage.tsx` and `80-runs.tsx`
- **THEN** `findInlineStyleUse` is `[]` for the first two and neither contains `dangerouslySetInnerHTML`; `80-runs.tsx` contains `DRY_RUN_PANEL`, two `registerEditorPanel(` and one `registerRunMessages();`, and `flowFeatureLiterals` gives `{ id: "runs", path: "/runs", navLabel: "Runs", capability: "read_run" }`; the panel file contains `Dry run inputs`, `Start dry run`, `Input (JSON)`, `Fakes (JSON)`, `Started dry run `, `Read steps call the real tools through the broker.` and a `<code>` element; `RunPage.tsx` contains `aria-label="Policy decisions"` and `Try again`

#### Scenario: The run sources import no stylesheet and the feature files stay
- **WHEN** `ui-foundation-sources.test.ts` reads `DryRunPanel.tsx`, `RunPage.tsx` and `80-runs.tsx`, runs `findCssImports` on each, and lists `web/src/features`
- **THEN** `findCssImports` gives `[]` for all three (the lines `import "./runs.css";` and `import "./hooks.css";` are gone, and `app.css` imports both files); the directory holds each of `10-home.tsx`, `15-sign-in.tsx`, `60-admin-users.tsx`, `61-admin-roles-teams.tsx`, `62-admin-group-mappings.tsx`, `63-admin-audit.tsx`, `64-admin-tool-servers.tsx`, `65-admin-grants.tsx`, `66-admin-policies.tsx`, `70-flows.tsx`, `71-flow-editor.tsx`, `75-flow-graph.tsx`, `80-runs.tsx`, `81-run.tsx` and `index.ts`, and no `.css` file
