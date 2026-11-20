Paths are in `web/src/admin/` or `web/src/tools/`. Each task is one red-green cycle: the test comes first and fails by assertion on the unedited pages, then the edit makes it pass. The seven pages arrive without their stylesheet import line (U15c). No task edits a logic `.ts` file, a table spec or a feature file, adds a package, token or stylesheet import, or changes a row string, role or accessible name. Page texts and class strings are those of design.md and test-plan.md.

## 1. Captions

- [x] 1.1 Write `admin/captions-by-page.test.ts` (scenario "Exactly four captions are hidden", test-plan.md T2) first: it is one test function: its `captionDisplayFor` rows hold on arrival (U15d's function) and its page-source rows fail by assertion (L4 refuses a new test that passes at red, and a criterion with a failing test is not pre-satisfied). Then in `UsersPage.tsx`, `MappingsPage.tsx`, `ServersPage.tsx` and `GrantsPage.tsx` add `const PAGE_HEADING = "<h1 text>";` and `captionDisplay={captionDisplayFor(<SPEC>.<table>.caption, PAGE_HEADING)}` on the main `DataTable`, implementing requirement "A table caption that repeats its page heading is hidden, and only four are". Run `pnpm run test web/src/admin/captions-by-page.test.ts`

## 2. Admin pages

- [x] 2.1 Write `admin/admin-pages-restyle.test.ts` (scenario "The admin sources use the layout parts and keep their pins", T1 with its mutations) first, then edit the four pages and `admin.css` (design decisions 2 to 8):
  - all four: `PageHeader` with the `h1` text, its description and `headingRef={headingRef}`; root `cn("admin-page", PAGE_WIDTHS.list)`; outer `<section aria-label>` wrappers removed;
  - `UsersPage.tsx`: the state cell as a `Badge` (`success` for active, else `neutral`), `destructive` on the `ConfirmDialog`;
  - `TeamsPage.tsx`: `<Section title="Create team">` and the two tables in `grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)] xl:items-start`;
  - `MappingsPage.tsx`: `<Section title="Map a group" className="max-w-xl">` above the table, the Group, Grants and "Reviewed by" cells in `<span className="whitespace-nowrap">`, the Issuer in `<span className="break-all">`, the "Remove …" button `ui-button whitespace-nowrap`, a `reviewers` state from `list.subscribe`, `useDisplayNames(reviewers)` and the cell `clip(personLabel(names, mapping.reviewedBy))`;
  - `AuditPage.tsx`: two `Section`s in `grid gap-4 lg:grid-cols-2 lg:items-start`, the Time cell `whitespace-nowrap`, the Type and Target cells `[overflow-wrap:anywhere]`, the Details cell `block min-w-48 max-w-sm break-all`;
  - `admin.css`: delete `max-width` from `.admin-page` and the `.admin-section`, `.admin-section h2` and `.admin-form` rules.

  Implements requirements "The four admin pages are built from PageHeader, Section and the list width", "A destructive confirm is red and a state is a badge" and "Reviewer names replace ids only when a person is found". Run `pnpm run test web/src/admin/admin-pages-restyle.test.ts`; `admin/admin-css.test.ts` stays green unchanged

## 3. Tool pages

- [x] 3.1 Write `web/src/tools/tools-pages-restyle.test.ts` (scenario "The tool sources use the layout parts and keep their pins", T3 with its mutations) and, in the same task, `e2e/test_m6b_admin.py` (the eight tests of test-plan-browser.md, the browser scenarios of both specs; `page` and `base_url` only; L4 refuses a red step that adds no Node test, a red step cannot run `e2e/`, their criteria stay out of `criteria_ids` and the verifier checks them) first, then edit the three pages and `tools.css`:
  - all three: `PageHeader`, root `cn("tools-page", PAGE_WIDTHS.list)` (Policies `PAGE_WIDTHS.form`), `className="tools-feedback"` on the message `<p>`;
  - `ServersPage.tsx`: `summaryWithBadge(server)` for the list cell and the Surface line (the text of `serverRowText` with its last `state.length` characters in `<Badge tone={serverStateTone(state)}>`, plain text if it does not end with the state), `useDisplayNames` and the line `Registered by {personLabel(names, view.registeredBy)}` before the Surface section, `<Section title={TOOL_NAMES["surfaceHeading"] ?? "Surface"}>`, `data-tone="primary"` on "Approve surface", `useId` removed;
  - `GrantsPage.tsx`: `description={label("deployHint")}`, the message under the header, `xl:grid-cols-[20rem_minmax(0,1fr)]` with `<Section title={label("grantForm")}>` and the table in `div className="min-w-0"`, the grant `span` through `grantTextWithBadge(grant)` (same split, `grantStatusTone`);
  - `PoliciesPage.tsx`: `meta` holding the two status sentences once loaded, the editor, buttons and states in `<Card className="flex flex-col gap-3 p-4">`, `data-tone="primary"` on "Deploy";
  - `tools.css`: delete `max-width` from `.tools-page` and the `.tools-section`, `.tools-section h2` and `.tools-form` rules; `.tools-textarea` gets `width: 100%` and `var(--ui-font-mono)`; add `.tools-feedback` with its `[role="status"]` and `[role="alert"]` token rules.

  Implements the four requirements of `web-tools`. Run `pnpm run test web/src/tools/tools-pages-restyle.test.ts`; `web/src/tools/pages.test.ts`, `web/src/tools/servers.test.ts` and `web/src/tools/states.test.ts` stay green unchanged
