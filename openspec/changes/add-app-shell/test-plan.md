# Fixtures for the Node tests

Every value was run in a scratch copy of main@3daa5c35 with `add-ui-foundation`'s design and this design applied (Node 24.22.2). Each source test reads its files with `readFileSync` after `assert.ok(existsSync(url))`; "contains" is `String.prototype.includes`, "count" is `split(needle).length - 1`.

## T1 The map (`nav-group-map.test.ts`)

`NAV_GROUP_OF` has exactly these keys, sorted by `Object.keys(...).sort()` on both sides:

| id | group | table that owns the id |
|---|---|---|
| `home` | `home` | the literal in `features/10-home.tsx` |
| `flows`, `runs` | `build` | `FLOW_PAGES`, `RUN_PAGES` |
| `admin-users`, `admin-roles-teams`, `admin-group-mappings`, `admin-audit` | `admin` | `ADMIN_PAGES` |
| `admin-tool-servers`, `admin-grants`, `admin-policies` | `admin` | `TOOL_PAGES` |

The coverage half gathers `page.id` for every row with `navLabel !== null` in the four tables, adds `home`, and expects the same 10 ids (probed: `["home","admin-users","admin-roles-teams","admin-group-mappings","admin-audit","admin-tool-servers","admin-grants","admin-policies","flows","runs"]`). `flow-editor` and `run` have `navLabel: null` and are not keys. `NAV_GROUP_LABELS` deep-equals `{ home: null, build: "Build", admin: "Admin", more: "More" }`; `Object.hasOwn(NAV_GROUP_OF, "constructor")` is `false`.

## T2 `navGroups` (`nav-groups.test.ts`)

`item(id)` is `{ id, path: "/" + id, label: id }`. Results are listed as `group [ids]` with the group's `label`; `carol` is the ten ids in registration order (`home`, the seven admin ids, `flows`, `runs`).

| row | input ids | result |
|---|---|---|
| G1 | `carol` | `home` (null) `[home]`; `build` ("Build") `[flows, runs]`; `admin` ("Admin") `[admin-users, admin-roles-teams, admin-group-mappings, admin-audit, admin-tool-servers, admin-grants, admin-policies]` |
| G2 | `home, flows, runs` | `home [home]`; `build [flows, runs]` |
| G3 | `home` | `home [home]` only |
| G4 | none | `[]` |
| G5 | `home, zz-new, flows` | `home [home]`; `build [flows]`; `more` ("More") `[zz-new]` |
| G6 | `constructor, toString, __proto__, hasOwnProperty` | one group, `more` ("More"), the four ids in input order |
| G7 | `Object.freeze` of `carol`, each item frozen | no throw; 3 groups; `out[1].items[0] === input[8]` (`flows`); the input still has 10 items; the groups hold 10 items in all |
| G8 | `admin-grants, admin-users, runs, flows` | `build [runs, flows]`; `admin [admin-grants, admin-users]` (input order, not registration order) |
| G9 | `b-new, a-new, home` | `home [home]`; `more [b-new, a-new]` |

## T2b `navPlacement` (`nav-placement.test.ts`)

| row | state | result |
|---|---|---|
| P1 | `null` | `"sidebar"` |
| P2 | `{ status: "signed_out" }` | `"inline"` |
| P3 | `{ status: "failed", code: "UNKNOWN_ERROR" }` | `"inline"` |
| P4 | `{ status: "ready", me }` with `me` a cast of `{}` (only `status` is read) | `"sidebar"` |

## T3 Source needles (`shell-sources.test.ts`, `auth-sources.test.ts`)

`Shell.tsx`:
- contains `navGroups(`, `navPlacement(`, `useSession()`, `aria-labelledby`, `<p id={`, `aria-expanded`, `aria-controls`, `TooltipProvider`, `lg:hidden`, `lg:block`, `useState(`, `<Outlet />`, `<ToastRegion />`, `<AccountMenu />`, `href="#main"`, `<main id="main" tabIndex={-1}` and `Ursitoare workflow engine`;
- counts: `<nav` 2 and `aria-label="Main"` 2 (one per placement, one rendered at a time), `<header` 1, `<footer` 1, `<main` 1, `Ursitoare` 2 (the brand and the footer);
- order of the first index of `Skip to content`, `<header`, `{inline ? null : nav}`, `<main`, `<footer`: strictly ascending (probed 3101, 3138, 3837, 3867, 3981);
- contains none of `role="status"`, `role="alert"`, `aria-live`, `app-nav`, `app-banner`, `app-shell`, `Collapsible`, `@radix-ui`, `DropdownMenu`, `style=`, `outline-none`, `disabled`, and `/<h[1-6]\b/` does not match;
- `findInlineStyleUse`, `findPaletteUtilities`, `findCssImports`, `findBannedImports`: `[]`.

At main@3daa5c35 `Shell.tsx` lacks every "contains" needle above except the last six and holds `app-nav`, `app-banner` and `app-shell`, so the test is red until the edit.

`AccountMenu.tsx`, `SignInPage.tsx`, `App.tsx` (each):
- contains `<Button` and `from "../ui/button.tsx"`; contains none of `className="ui-button"`, `style=`; `/(?<!aria-)disabled=/` does not match;
- `AccountMenu.tsx` also contains `role="group"`, `aria-label="Account"`, `Signed in as`, `Tenant:`, `Sign out`, `aria-disabled` and `asChild`;
- `SignInPage.tsx` also contains `tone="primary"`, `ErrorPanel`, `Checking your session`, `Use your organization account to open Ursitoare.` and exactly 2 `<h1>Sign in</h1>`;
- `App.tsx` also contains `Page not found`, `Go to the landing page`, `asChild`, `tone="primary"` and `DocumentTitle routeId="not-found"`;
- `findInlineStyleUse` and `findPaletteUtilities` are `[]` on each.

At main the three files contain no `<Button`, and the first two contain `className="ui-button"`.

## T4 Stylesheets (`shell-css.test.ts`)

`shell.css` contains `color-scheme: light;`, `.skip-link:focus`, `[tabindex="-1"]:focus`, `outline: none;` and `var(--ui-focus-width)`; it does not contain `main:focus`, `light dark`, `Canvas`, `currentColor`, `.app-shell`, `.app-banner`, `.app-nav`, `.app-brand` or `.app-footer`. `auth.css` contains `.auth-account`, `.auth-page`, `text-overflow: ellipsis`, `max-width: 24rem`, `var(--ui-color-divider)`, `var(--ui-radius-lg)` and `var(--ui-shadow-sm)`; it does not contain `max-width: 32rem`. For both, `findRawColours(css)` is `[]` and every `var(--name)` (regex `var\((--[a-z0-9-]+)\)`) is a key of `parseTokens(tokens.css)`, which holds the tokens `add-ui-foundation` appends (`--ui-color-divider`, `--ui-radius-lg`, `--ui-shadow-sm`). At main `shell.css` holds `light dark` and `.app-*` and `auth.css` holds `max-width: 32rem`, so the test is red. `auth-css.test.ts` (C-53df20c1) stays green unchanged.
