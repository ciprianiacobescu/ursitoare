# Fixtures for the Node tests

Every row was run in a scratch copy of main@3daa5c35 with U15c, U15d, U07b and U18b applied and this design implemented (Node 24.22.2): 407 web tests pass. The tests are source-reading tests in the frozen style (C-ba990588, C-52c26a32): `existsSync` before `readFileSync`, `new URL(name, import.meta.url)`, `assert.equal(typeof <function>, "function")` at the top for each imported function, `node:assert/strict`. A page is a `.tsx`, which a Node test cannot import, so the pages are read as text. `count(text, needle)` is `text.split(needle).length - 1`. Each file holds a checker (`checkAdminPage`, `checkToolsPage`) that returns the list of problems; the mutations run inside the test of the real pages (alone they pass at red, which L4 refuses).

## T1 Admin sources (`web/src/admin/admin-pages-restyle.test.ts`)

Imports `findInlineStyleUse`, `findRawColours`, `parseTokens` from `../kit/contrast.ts` and `findCssImports` from `../ui/rules.ts` (U15c).

For every page: `count("<PageHeader") === 1`, `count("headingRef={headingRef}") === 1`, `count('cn("admin-page", PAGE_WIDTHS.list)') === 1`, no `<h1`, no `admin-section`, `findInlineStyleUse` and `findCssImports` give `[]`, `count("<ConfirmDialog")` and `count("destructive")` both equal the row's `confirms`.

| file | confirms | must contain | must not contain |
|---|---|---|---|
| `UsersPage.tsx` | 1 | `captionDisplay={captionDisplayFor(ADMIN_TABLES.users.caption, PAGE_HEADING)}` | `people/` |
| `TeamsPage.tsx` | 1 | `<Section title="Create team">`, `xl:grid-cols-[20rem_minmax(0,1fr)]` | `people/`, `captionDisplay` |
| `MappingsPage.tsx` | 1 | `<Section title="Map a group"`, `useDisplayNames(`, `personLabel(`, `<span className="break-all">{cells.issuer}</span>`, `className="ui-button whitespace-nowrap"`, `captionDisplay={captionDisplayFor(ADMIN_TABLES.mappings.caption, PAGE_HEADING)}` | `xl:grid-cols` |
| `AuditPage.tsx` | 0 | `<Section title="Chain verification">`, `<Section title="Filter the audit log">`, `lg:grid-cols-2`, `whitespace-nowrap`, `[overflow-wrap:anywhere]`, `block min-w-48 max-w-sm break-all` | `people/`, `captionDisplay`, `destructive` |

`admin.css`: `findRawColours` `[]`; no `max-width`, `.admin-section` or `.admin-form`; every `var(--…)` is in `parseTokens(tokens.css)`; the four selectors `.admin-status--ok {`, `--broken {`, `--unavailable {`, `--checking {` are present (their pairs stay checked by C-52c26a32, which runs unchanged).

Mutations of `UsersPage.tsx`, each giving at least one problem: `<h1>x</h1>` appended; the line `          destructive` removed; `<p style="x"/>` appended.

## T2 Captions (`web/src/admin/captions-by-page.test.ts`)

Imports `captionDisplayFor` from `../kit/layout/layout.ts`, `TOOL_TABLES` from `../tools/pages.ts` and `ADMIN_TABLES` from `./pages.ts`. Pairs (caption from the spec, page `h1`), in this order:

1 Users/Users, 2 Roles/Roles and teams, 3 Teams/Roles and teams, 4 Group mappings/Group mappings, 5 Audit events/Audit log, 6 Tool servers/Tool servers, 7 Tools/Tool servers, 8 Grants/Grants: results hidden for 1, 4, 6 and 8, visible for the others.

So the hidden captions are `["Users", "Group mappings", "Tool servers", "Grants"]` and the visible ones `["Roles", "Teams", "Audit events", "Tools"]`. Each call is wrapped in `assert.doesNotThrow`. The same test then reads the seven page sources: the pages containing `captionDisplay={captionDisplayFor(` are exactly `["users", "mappings", "servers", "grants"]` (in that order), and those four hold `const PAGE_HEADING = "Users";`, `"Group mappings"`, `"Tool servers"` and `"Grants"`. On main the function rows hold and the source rows fail, so the test is red.

## T3 Tool sources (`web/src/tools/tools-pages-restyle.test.ts`)

Same imports as T1. For every page: `count("<PageHeader") === 1`, `count(root) === 1`, no `<h1`, `findRawColours`, `findInlineStyleUse` and `findCssImports` give `[]`, the five substrings `regionState(`, `actionState(`, `LoadingState`, `aria-disabled`, `browserSession.api`, `count('className="tools-feedback"') === 1`, and the row's counts.

| file | root | `data-tone="primary"` | `<ConfirmDialog` | must contain | must not contain |
|---|---|---|---|---|---|
| `ServersPage.tsx` | `cn("tools-page", PAGE_WIDTHS.list)` | 1 | 1 | `<Section title={TOOL_NAMES["surfaceHeading"] ?? "Surface"}>`, `useDisplayNames(`, `personLabel(` | `destructive`, `xl:grid-cols` |
| `GrantsPage.tsx` | `cn("tools-page", PAGE_WIDTHS.list)` | 0 | 0 | `<Section title={label("grantForm")}>`, `description={label("deployHint")}`, `xl:grid-cols-[20rem_minmax(0,1fr)]` | `people/`, `ConfirmDialog`, `destructive` |
| `PoliciesPage.tsx` | `cn("tools-page", PAGE_WIDTHS.form)` | 1 | 0 | `<Card ` | `people/`, `ConfirmDialog`, `<Section` |

`tools.css`: `findRawColours` `[]`; no `max-width`, `.tools-section` or `.tools-form`; every `var(--…)` is a token; the rule `.tools-feedback[role="status"] {` holds `var(--ui-color-success-text)` and `var(--ui-color-success-surface)`, the rule `.tools-feedback[role="alert"] {` holds `var(--ui-color-danger-text)` and `var(--ui-color-danger-surface)`.

Mutations of `ServersPage.tsx`, each giving at least one problem: `const c = "#ffffff";` appended; `<p style="x"/>` appended; `<ConfirmDialog` replaced by `<ConfirmDialog destructive`.

Frozen tests that stay green unchanged: `admin/admin-css.test.ts` (C-52c26a32), `web/src/tools/pages.test.ts` (C-ba990588, C-2c3410e3, C-a7f551fc), `admin/pages.test.ts`, the `web/src/tools/*.test.ts` model tests, `test/arch/web-routes.test.ts`.
