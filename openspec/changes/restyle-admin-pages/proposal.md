## Why

The seven admin and tool pages (Users, Roles and teams, Group mappings, Audit log, Tool servers, Grants, Policies) are the part of the app a tenant admin uses most, and on main they are a bare `h1` over full-width forms and tables, with raw user ids where a name exists. After U15c (Tailwind, tokens, `Card`, `Badge`) and U15d (kit restyle, `PageHeader`, `Section`, hidden captions) they only need their markup moved onto those parts, with no logic change.

Observable result at 1366 by 860, carol, with U07b's shell: every page has a `PageHeader`, is bounded in width and raises no CSP message. The Users table has no visible caption and a green "Active" badge; "Disable user" opens with a red confirm (`rgb(180, 35, 24)`) and the focus on "Cancel". Roles and teams and Grants show their form as a 20 rem card left of the tables; Group mappings shows its form above the table; the Audit log shows its times on one line. "Reviewed by" shows "Carol Example" and the tool server detail "Registered by Carol Example" outside the region "Surface"; grant subjects and audit actors stay ids.

Batch `m6b-ui` (U15c, U18b, U15d, U07b, U21b, U07c, U28b, U37b, U37c, U52c in plan order; closing unit `add-visual-review`, journey `e2e/test_m6b_ui.py`) delivers M6b: the web app is restyled on Tailwind CSS v4 and Radix primitives with a grouped sidebar, a home page of recent work, a flow workspace, run inputs built from the flow's input schema, a readable run view and people's names instead of ids, with zero CSP violations. This unit's part: the seven admin and tool pages restyled through the kit, with names where no test pins the id. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- Edited, each in a named task: `web/src/admin/{UsersPage,TeamsPage,MappingsPage,AuditPage}.tsx`, `web/src/tools/{ServersPage,GrantsPage,PoliciesPage}.tsx`, `web/src/admin/admin.css` and `web/src/tools/tools.css` (token-only rules).
- New: three Node test files, `e2e/test_m6b_admin.py`. No new `.ts`, `.tsx` or `.css` file.
- Logic files (`users.ts`, `teams.ts`, `mappings.ts`, `audit.ts`, `servers.ts`, `grants.ts`, `policies.ts`, `pages.ts`, `messages.ts`) do not change, and neither do `ADMIN_TABLES`, `TOOL_TABLES` or `TOOL_NAMES`.
- Capabilities `web-admin` and `web-tools`: ADDED requirements only; no MODIFIED base requirement.
- No token, role, accessible name, text, API route, error code, migration, e2e part, policy action, feature file or CSP change.

## Impact

- **Scaffold:** this unit declares no new name, so the scaffold stubs nothing for it. Not scaffolded: every edit above, the tests and `e2e/test_m6b_admin.py`.
- **Depends on:** `add-web-admin` (U21: the four admin pages), `add-web-grants` (U52: the grants and policies pages), `add-web-dry-runs` (U52b); all merged. In plan: `add-ui-foundation` (U15c: `Card`, `Badge`, the tone mappers, `cn`, `watch_csp`, `assert_layout`), `restyle-web-kit` (U15d: `PageHeader`, `Section`, `captionDisplay`, `captionDisplayFor`, `PAGE_WIDTHS`, the `data-tone` rules), `add-people-lookup` (U18b: `useDisplayNames`, `personLabel`), and `add-app-shell` (U07b), an edge the card does not list: the browser tests measure a 1126 px wide `main` and a 56 px banner, which only U07b's shell gives (design decision 10).
- Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3daa5c35, checked line by line).

**Interfaces given** (as in design.md § Interfaces)

```ts
// No new export. Pages call captionDisplayFor(<table spec>.caption, <their h1 text>) from web/src/kit/layout/layout.ts (U15d);
// there is no exported list of hidden captions. U21b's test asserts the result set over ADMIN_TABLES and TOOL_TABLES is
// exactly ["Users", "Group mappings", "Tool servers", "Grants"]. U28b ("Flows"; "Versions" under its section heading) and
// U37c ("Runs") call the same function.
```

**Interfaces taken:**

- From `restyle-web-kit`: `PageHeader`, `Section`, `PAGE_WIDTHS`, `captionDisplay`, `captionDisplayFor`.
- From `add-ui-foundation`: `Card`, `Badge`, `cn`, `serverStateTone`, `grantStatusTone`.
- From `add-people-lookup`: `useDisplayNames`, `personLabel`.
- From merged code (shapes in `delivered-shapes.md`): `ADMIN_TABLES`, `TOOL_TABLES`, `TOOL_NAMES`, `accountCells`, `mappingCells`, `serverRowText`, `grantRowText`, `clip`, `findRawColours`, `findInlineStyleUse`; in Python `assert_accessible`.

## Out of scope

The sidebar and banner (U07b), new tokens (U15c), a confirm dialog for "Revoke" (none exists and the journeys pin its absence), names in grant subjects and audit actors, dark mode, any CSP change, the M7 pages that edit `ServersPage.tsx` and `GrantsPage.tsx` after this unit. Spec: `specs/web-admin/spec.md`, `specs/web-tools/spec.md`; fixtures: `test-plan.md`, `test-plan-browser.md`; decisions: `design.md`. Each Node test begins with `assert.equal(typeof <function>, "function")` for the names it imports, uses `node:assert/strict` and has no `.`, `[` or `::` in its name.
