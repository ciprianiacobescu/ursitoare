## Why

The owner called the web app unusable. The shell is the first thing every page shows, and on the live stack it is a bulleted header list of ten links: the banner is 129 px tall for alice and 297 px for carol at 1366 px wide, and the sign-in and not-found pages are bare text. This unit replaces it with a left sidebar of grouped links, a one-line banner, a "Menu" button below 1024 px and two card-style pages, on the Tailwind pipeline of `add-ui-foundation`, under the engine's CSP.

Observable result: at 1366 by 860 carol's banner is 56 px tall and the single navigation "Main" is a 240 px sidebar with "Home", then "Build" (Flows, Runs) and "Admin" (Users, Roles and teams, Group mappings, Audit log, Tool servers, Grants, Policies), the current page marked `aria-current="page"`; alice sees Home and Build only. When nobody is signed in there is no sidebar column: the same navigation "Main" holds the one link "Home" inline in the banner next to the brand, and `main` starts at x 0. For a signed-in user below 1024 px the navigation is hidden behind a button "Menu" (`aria-expanded`). `/sign-in` is a 384 px card centred on the page (`main` is then full width), `/no-such-page` an empty-state card with a primary link "Go to the landing page". A 60-character display name truncates with an ellipsis and the banner stays 56 px. `shell.css` declares `color-scheme: light`, and an element that only receives focus from script (`main` after a dismissed toast, a page `h1`) draws no frame while interactive stops keep their 3 px ring.

Batch `m6b-ui` (U15c, U18b, U15d, U07b, U21b, U07c, U28b, U37b, U37c, U52c in plan order; closing unit `add-visual-review`, journey `e2e/test_m6b_ui.py`) delivers M6b: the web app is restyled on Tailwind CSS v4 and Radix primitives with a grouped sidebar, a home page of recent work, a flow workspace, run inputs built from the flow's input schema, a readable run view and people's names instead of ids, with zero CSP violations. This unit's part: the grouped sidebar, the compact banner, the narrow-screen menu and the sign-in and not-found pages in the new shell. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- New: `web/src/app/nav-groups.ts`, its four tests (`nav-group-map.test.ts`, `nav-groups.test.ts`, `shell-layout.test.ts`, `nav-placement.test.ts`), `web/src/app/shell-sources.test.ts`, `web/src/app/shell-css.test.ts`, `web/src/auth/auth-sources.test.ts`, `e2e/test_m6b_shell.py`.
- Edited, each in a named task: `web/src/app/Shell.tsx`, `web/src/app/App.tsx` (`NotFoundPage`), `web/src/app/shell.css`, `web/src/auth/AccountMenu.tsx`, `web/src/auth/SignInPage.tsx`, `web/src/auth/auth.css`.
- Capability `web-shell`: ADDED requirements only; no MODIFIED requirement, no frozen test change (`auth-css.test.ts` C-53df20c1 stays green). Nav labels, the feature files and the routes are unchanged.
- No API, error code, migration, part, policy action, feature file, dependency, token or CSP change. `Shell.tsx` mounts the `TooltipProvider` of `add-ui-foundation`, which renders no element.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded: the edits of the six existing files above, the seven new test files, `e2e/test_m6b_shell.py`. Stubs return empty values (`{}`, `[]`, `"collapsed"`, `null` labels), so a red test fails by assertion.
- **Depends on** (merged): `add-web-shell` (U07: `Shell.tsx`, `App.tsx`, `shell.css`, `NavItem`), `add-web-ui-kit` (U15: `useVisibleNav`, `ToastRegion`, `parseTokens`), `add-web-sign-in` (U16: `AccountMenu`, `SignInPage`, `auth.css`), and the owners of the four page tables the coverage test reads: `add-web-admin` (U21), `add-web-grants` (U52), `add-web-flow-editor` (U28), `add-web-run-timeline` (U37). In plan: `add-ui-foundation` (U15c: `ui/button.tsx`, `ui/tooltip.tsx`, the scanners, the tokens `--ui-color-sidebar`, `--ui-color-divider`, `--ui-banner-height`, `--ui-sidebar-width`, `--ui-radius-lg`, `--ui-shadow-sm`, and `watch_csp` and `assert_layout` in `e2e/conftest.py`).
- Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3daa5c35, checked line by line).

**Interfaces given** (as in design.md § Interfaces)

```ts
// web/src/app/nav-groups.ts
import type { CapabilityState } from "../kit/capabilities.ts";
import type { NavItem } from "./features.ts";
export type NavGroupId = "home" | "build" | "admin" | "more";
export interface NavGroup { id: NavGroupId; label: string | null; items: NavItem[] }
export const NAV_GROUP_OF: Readonly<Record<string, NavGroupId>>;
  // exactly: home → "home"; flows, runs → "build"; admin-users, admin-roles-teams, admin-group-mappings, admin-audit,
  // admin-tool-servers, admin-grants, admin-policies → "admin"
export const NAV_GROUP_LABELS: Readonly<Record<NavGroupId, string | null>>; // { home: null, build: "Build", admin: "Admin", more: "More" }
export function navGroups(items: readonly NavItem[]): NavGroup[];
  // groups in the order home, build, admin, more; an id missing from NAV_GROUP_OF goes to "more"; items keep input order;
  // empty groups are left out; every item exactly once; the input is not mutated; NavItem objects are passed through unchanged
export function shellLayout(widthPx: number): "sidebar" | "collapsed"; // "sidebar" when widthPx >= 1024
export function navPlacement(state: CapabilityState | null): "sidebar" | "inline";
  // "inline" when state.status is "signed_out" or "failed"; "sidebar" for "ready" and for null (still loading)
```

**Interfaces taken:**

- From merged code (shapes in `delivered-shapes.md`): `NavItem`, `CapabilityState`, `useSession`, `useVisibleNav`, `accountView`, `AccountView`, `browserSession`, `ToastRegion`, `ADMIN_PAGES`, `TOOL_PAGES`, `FLOW_PAGES`, `RUN_PAGES`, `parseTokens`, `findRawColours`, `findInlineStyleUse`; in Python `assert_accessible`.
- From `add-ui-foundation`: `Button` (props `tone`, `size`, `asChild`; type `button`; forwards `aria-disabled`), `cn`, `TooltipProvider`, `findPaletteUtilities`, `findCssImports`, `findBannedImports`, and in `e2e/conftest.py` `watch_csp` and `assert_layout`.

## Out of scope

The home page content (U07c), the pages' own styles (U15d, U21b and later), nav icons, a sticky or fixed banner, a dark theme, a collapsible sidebar at 1024 px and wider, a sidebar for signed-out visitors, any change to a nav label, route or feature file. Spec: `specs/web-shell/spec.md`; fixtures: `test-plan.md`, `test-plan-browser.md`; decisions: `design.md`. Each Node test begins with `assert.equal(typeof <function>, "function")` for the names it imports from the file its Interfaces header names (never an `index.ts`), wraps a call that reaches a stub in `assert.doesNotThrow`, uses `node:assert/strict` and has no `.`, `[` or `::` in its name.
