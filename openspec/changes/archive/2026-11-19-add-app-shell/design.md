## Context

Today `Shell.tsx` renders one `header.app-banner` that holds the brand, `nav` > `ul.app-nav` (ten links for carol) and the account group, so the banner is 129 px (alice) and 297 px (carol) tall at 1366 px (the planner's baseline; `add-ui-foundation`'s probe measured 97 and 265 after its base layer). `shell.css` still says `color-scheme: light dark`. This unit rebuilds the shell on the Tailwind pipeline of `add-ui-foundation` (U15c): the same landmarks and names, a different layout. Later ruling (coordinator): with nobody signed in there is no sidebar column. Rulings D4, D13, D14, D17.

## Decisions

1. **Utilities lay out, CSS holds what selectors need.** A rule in `@layer components` (every CSS file) loses to a utility on the same element, so the grid, banner, sidebar, link states and the 1024 px switch are utilities in `Shell.tsx`. `shell.css` keeps `:root`, `.skip-link` and `main:focus`; `auth.css` keeps `.auth-account` and `.auth-page`, whose paragraph rules (`min-width: 0`, `text-overflow: ellipsis`) have no utility twin on the same element.
2. **Grid (sidebar placement).** The root is `flex min-h-screen flex-col`, and for a signed-in user (decision 11) from `lg` (64rem) a grid of `var(--ui-sidebar-width)` (15rem, 240 px) and `minmax(0,1fr)` with rows `auto 1fr auto`. The banner and footer span both columns; the nav takes column 1 and stretches, so its grey runs to the footer. DOM order stays skip link, `header`, `nav`, `main`, `footer`, so the tab order is skip link, brand, account, nav links, then the page content.
3. **Navigation markup** (exact names below). Each group is a `p#nav-group-<id>` label, not a heading, then a `ul[aria-labelledby]` of `NavLink`s. The "home" group has no label, so its `ul` has no `aria-labelledby`. The label is not a heading because pinned headings ("Users", "Runs", "Sign in") are matched by exact name page-wide (lesson ab), and the brief's "visible group headings" is met by the visible labels. `NavLink` sets `aria-current="page"`; the current link is `aria-[current=page]:` styled: `bg-bg`, `text-accent`, `font-semibold`, a 3 px `border-accent` left edge (`border-transparent` otherwise). Colours are token utilities; the pairs used are `text` and `text-muted` on `sidebar` (U15c's `EXTRA_CONTRAST_PAIRS`) and, for the current link on its white `bg-bg`, `accent` on `bg` (frozen). Hover uses `bg-bg`, so no new token or pair is needed.
4. **Banner.** `min-h-(--ui-banner-height)` (3.5rem, 56 px), one flex row that never wraps, `border-b border-divider bg-bg`, not sticky. `min-height`, not `height`, so text zoom grows it instead of clipping. The brand and the buttons do not shrink; the two account paragraphs have `min-width: 0` and truncate with an ellipsis (no `title`: the full text stays in the DOM). Below `sm` (40rem) the words "Signed in as " and the tenant paragraph are `max-sm:sr-only`, so a 390 px banner shows the name, not "Signe…" and "Ten…". `AccountMenu` renders what `accountView` gives, unchanged; its buttons are `Button size="sm"`.
5. **Menu** (sidebar placement only). `menuOpen` is `useState`, closed on every `location.pathname` change. On a pathname change after the first render the shell focuses `#main h1` (every `PageHeader` `h1` has `tabIndex={-1}`), else `#main`: a link in the closing menu would otherwise leave focus on `<body>`, and a screen reader would hear nothing of the new page. The `Button` "Menu" has `lg:hidden`, `aria-expanded={menuOpen}` and `aria-controls="main-nav"`; the nav is `block` when open, `hidden` when not, and `lg:block` always. Not Radix: `CollapsibleContent`'s `hidden` cannot be overridden at 1024 px and wider under preflight (card), and a modal menu injects styles (decision memo). `display: none` drops the nav from the accessibility tree, so a collapsed `get_by_role("navigation")` count is 0. There is no resize listener: from `lg` the classes show the nav whatever `menuOpen` holds (a widened then narrowed window keeps an open menu open). `shellLayout` has no runtime caller; it states the threshold that the `lg` variant implements, and scenario "The menu folds below 1024 px" checks 1023 and 1024 in a browser.
6. **Sticky sidebar.** The nav's inner `div` is `lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto`, so the links stay in view on a long page (probe, `/admin/audit` scrolled 1,200 px: inner top 0). Below `lg` the open menu is an ordinary block under the banner that pushes `main` down; there is no overlay and no focus trap.
7. **Pages.** The sign-in card is `.auth-page` (signed out, `main` is full width, so it is centred on the page): `max-width: 24rem`, `margin: var(--ui-space-4) auto 0`, `--ui-color-divider` border, `--ui-radius-lg`, `--ui-shadow-sm`, a flex column, so its `Button tone="primary"` stretches. The not-found page is one `div` of utilities (dashed `border-border`, `bg-surface`, `max-w-md`, centred text) with the `h1`, one sentence and `Button asChild tone="primary"` around the link. The banner's "Sign in" is `Button asChild tone="secondary" size="sm"` around the `Link`: role, name and `href` unchanged. These are styling choices, not seam changes.
8. **Stylesheets.** `shell.css` drops the `.app-*` rules (the classes are gone), sets `color-scheme: light` (D4; `light dark` made native controls dark on a light page under a dark OS, and `shell.css` in `components` beats U15c's base layer, which already says `light`), and takes the skip link's colours from tokens instead of `Canvas`. `main:focus` is replaced by `[tabindex="-1"]:focus { outline: none; }` (ruling): the elements with `tabindex="-1"` (`main`, the page `h1`s, the form error, the home `status`) only receive focus from script, and a 3 px frame around the whole `main` after a toast is dismissed (`ToastRegion` focuses `#main`) or around a page `h1` is noise. Specificity (0,2,0) beats the kit's `:focus-visible` (0,1,0) in the same layer; every `tabIndex={-1}` in `web/src` is a script-focus target, none is a roving item, and interactive elements, the skip link and the scrollable table region (`tabIndex={0}`) keep their ring.
9. **`TooltipProvider`** wraps the shell (U15c decision 4: U07b mounts it). It renders no element and no role.
10. **Unchanged on purpose:** every nav label (the card says "Audit"; the registered label is "Audit log" and the journeys click it by exact name), `NavItem`, `visibleNav`, `accountView`, the feature files, `ToastRegion`, `index.html`.
11. **Placement.** `navPlacement(useSession())` is `"inline"` for `signed_out` and `failed`, `"sidebar"` for `ready` and for `null`. Inline, the same single `nav#main-nav[aria-label=Main]` is rendered inside the `header` after the brand: one flat `ul` of every entry `useVisibleNav` gives (today only "Home"), no group labels, `INLINE_LINK_CLASSES` (the current page `font-semibold text-accent`, hover `bg-surface`), no "Menu" button, no grid, so `main` is full width and starts at x 0. Sidebar placement is decisions 2 to 6. `null` (loading) is sidebar so that every signed-in full load keeps its column and only a signed-out load changes layout once, when `/api/v1/me` answers 401 (the shift is not probed on screen, see UNVERIFIED). `useSession` shares the loader's one in-flight request with `useVisibleNav` and `AccountMenu` (`capabilities.ts:75-`), so the page still makes one `/api/v1/me` request (the e2e suite pins it).

## Roles and names (exact, in DOM order)

1. link "Skip to content" (`href="#main"`), the first focusable element.
2. `<header>` (`banner`): the link "Ursitoare" to `/` (the only link or heading containing "Ursitoare"); inline placement only, the `nav` of item 3; sidebar placement only, the button "Menu" (`aria-expanded`, `aria-controls="main-nav"`; hidden from 1024 px); `AccountMenu`: the group "Account" with "Signed in as <strong>name</strong>", "Tenant: <strong>name</strong>" and the button "Sign out", or the link "Sign in", or nothing.
3. `<nav id="main-nav" aria-label="Main">`, the only `<nav>`. Inline placement: inside the banner, one `ul` with the link "Home". Sidebar placement: after the banner, the link "Home" first (its own list), then per group `p#nav-group-<id>` "Build", "Admin" or "More" and `ul[aria-labelledby]`. Visible from 1024 px; at 1280 by 720 every link of carol's ten is visible without scrolling the nav.
4. `<main id="main" tabIndex={-1}>`, no `max-width` of its own.
5. `<footer>` (`contentinfo`) "Ursitoare workflow engine".
6. `ToastRegion`, unchanged. The shell renders no `role="status"`, `role="alert"` or `aria-live` of its own.

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists what is not scaffolded. No seam deviation.

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

## Failure cases

`navGroups([])` is `[]`; an id that is missing from the map, including `constructor` and `__proto__`, goes to "More" (`Object.hasOwn`); `shellLayout(NaN)` is `"collapsed"`. A signed-out visitor or a failed capability load gives only "Home" (`visibleNav` falls back to the public entries) inline in the banner, and no account area for a failed load. A page with no nav entry (sign-in, not found) has no `aria-current`. A 60-character name is cut by CSS only: the DOM text is whole. `watch_csp` called after the first `goto` misses earlier violations.

## Security

No endpoint, policy action, table, secret or CSP change. The shell adds no `<style>` element and no `style=`: zero CSP messages on every probed page. Tooltip's provider and `Button`'s `Slot` add no element.

## Frozen pins checked

- Signed out: still one `navigation` named "Main" with "Home", visible at 1280 by 720 (m0:195, 212; l4 2b18a36e:13), now in the banner; "Sign in" is still the banner link with its `href`, and the failed-load banner has none (l4e3de8f9e:52-60); tab order skip link, brand, "Home", "Sign in".
- Banner holds the display name, "Signed in as Alice Example", "Tenant: E2E tenant", the group "Account" and "Sign out"; "Sign in" in 401 mode keeps its `href` (m1:54-57, 75-84; l4e3de8f9e:52-60).
- Brand: one link "Ursitoare" in the banner (m0:232; l42b18a36e:12); the footer text is the only other "Ursitoare" in the shell.
- One `navigation` "Main" with "Home" (l496e3a4f2:14-15; m0:195, 212); nav links clickable by exact name at 1280 by 720 (probe: last link bottom 514 of 720); alice has no "Users" link (m2:69).
- Skip link first Tab, in the viewport, with an outline; Enter focuses `main` (m0:201-211, which asserts only `to_be_focused`; l460599e6f:31-39, `outline-style` not `none` on the skip link, which is not a `tabindex="-1"` element); "Sign out" reached in 3 tabs (m1:13-19); outline at least 2 px (m1:22-27; probe 3 px on all six first stops).
- One `/api/v1/me` request per load (kit:61, 97, 122); one `[aria-live="polite"]` (kit:88-89); toast markup untouched.
- Titles: `/` "Ursitoare", not found "Page not found · Ursitoare" (m0:234-235; l4acc8eaf4:16); heading "Page not found" and "Go to the landing page" kept; sign-in heading, one "Sign in" button, `[role="alert"]`, `html[lang="en"]` (m1:37-40; l4ee431615:12-22).
- No inline style anywhere (C-d365d748, over the six edited `.tsx`); `auth.css` token-only (C-53df20c1); no CSS import in a `.tsx` and no banned import (U15c's scanners give `[]` on the edited files).
- No page gains a `status`, `alert`, `dialog`, heading or region.

## Verification

**Ran** (Node 24.22.2; scratch copy of main@3daa5c35 with U15c's design and nine packages, plus this design; the e2e stack on ports 39380, 39382 and 39384, never 39080; Playwright 1.63.0, Chromium):
- Banner 56 px for a mocked carol with short names and with 60-character names at 1366, 1280, 1024, 900 and 375 px wide, and for the real alice, carol and a signed-out visitor at 1366 and 800 px; `assert_layout(page, 72)` passed for the mocked ones. Sidebar x 0, width 240; `main` x 240, width 1,126; footer 33 px.
- Carol's ten links at y 68 to 478 (last bottom 514 of 720 at 1280 by 720). Axe (serious and critical) clean for carol at five widths, the open menu at 900, and four signed-out pages. `watch_csp` list `[]` on every page.
- Focus (probe, before and after the CSS change): `main` after Enter on the skip link, after a dismissed toast, and a page `h1` focused by script (as carol on `/admin/users`) were `solid 3px` before and `none` after; the skip link, the nav link "Home" and the table region keep `solid 3px`; axe clean and CSP `[]`. Screenshots `shots-focus/before-toast-dismiss.png` (blue frame around `main`) and `shots-focus/after-toast-dismiss.png` (none) under the scratch folder.
- Menu: 1023 px shows the button and no navigation, 1024 px the reverse; at 900 a click gives `aria-expanded="true"`, the first Tab after Enter reaches "Sign out", and a click on "Home" from `/no-such-page` closes it.
- Signed out (after the ruling, 1366 and 800 wide, sign-in, sign-in with an error, not found and `/`): `main` at x 0, full width; the nav at (108, 10), 62 by 36, inside the 56 px banner; scroll width equals the viewport; axe clean and CSP list `[]` on the three 1366 pages the draft test visits. Cards: sign-in 384 by 208 at (491, 104), centre 683 (356 tall with an error), not found 448 by 216 at (459, 128); a dark OS still computes `color-scheme: light` and a white body.
- The full e2e suite (70 tests twice, then 78 with the draft tests after the placement change, and again after the focus change) and 401 web and architecture Node tests passed with this design; `tsc` and `eslint` were clean on the edited files. A draft of the six browser tests of test-plan-browser.md (8 runs) passed against the scratch stack.
- Screenshots (read by eye) are in `…/scratchpad/m6b-add-app-shell/shots-final/` and `shots-signedout/` (the signed-out set after the placement ruling).

**Not run (UNVERIFIED):** Firefox and Safari; a root font size other than 16 px (`lg` is 64rem, `shellLayout` says 1024 px); a rendered "More" group (all ten ids are mapped, so only the Node rows show it); screen-reader output; forced-colours mode; phones under about 480 px (the names shrink to a few letters); the one-time layout shift of a signed-out load (sidebar while `/api/v1/me` loads, inline after); a tenant name with spaces or right-to-left text.

## Decisions made while writing

Beyond the card: 3 (the home group has no label; the current-link look), 5 (`id="main-nav"`, no resize listener, close on navigation), 6 (the sticky inner div), 7 (the card sizes and the not-found sentence), 8 (the skip link's tokens, the inward `main:focus` offset) and 9 (`TooltipProvider`) and 11 (placement, from the coordinator's ruling; `null` counts as sidebar).
