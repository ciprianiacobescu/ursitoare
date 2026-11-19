## ADDED Requirements

### Requirement: Navigation entries are grouped by a fixed map
`NAV_GROUP_OF` SHALL map `home` to `"home"`, `flows` and `runs` to `"build"`, and `admin-users`, `admin-roles-teams`, `admin-group-mappings`, `admin-audit`, `admin-tool-servers`, `admin-grants` and `admin-policies` to `"admin"`, and nothing else; `NAV_GROUP_LABELS` SHALL be `{ home: null, build: "Build", admin: "Admin", more: "More" }`. `navGroups(items)` SHALL return the groups in the order home, build, admin, more, leave out empty groups, send an id that is not an own key of `NAV_GROUP_OF` to `"more"`, keep the input order inside a group, give every item exactly once and unchanged, and not mutate its input.

#### Scenario: The map covers every navigation id and nothing else
- **WHEN** `nav-group-map.test.ts` reads `NAV_GROUP_OF`, `NAV_GROUP_LABELS`, and the ids with a `navLabel` in `ADMIN_PAGES`, `TOOL_PAGES`, `FLOW_PAGES` and `RUN_PAGES` plus the literal `home` (test-plan.md T1)
- **THEN** `NAV_GROUP_OF` has exactly the 10 keys of T1 with the values of T1 (`Object.keys` sorted), the ten ids gathered from the four tables are exactly those keys, `NAV_GROUP_LABELS` deep-equals `{ home: null, build: "Build", admin: "Admin", more: "More" }`, and `flow-editor` and `run` (`navLabel: null`) are not keys

#### Scenario: Entries are grouped, ordered and passed through
- **WHEN** `navGroups` gets the inputs G1 to G9 of test-plan.md T2, among them carol's ten entries, alice's three, `home` alone, `[]`, an unknown id, the ids `constructor`, `toString` and `__proto__`, and a frozen array of frozen items
- **THEN** G1 gives `home [home]`, `build [flows, runs]`, `admin [admin-users, admin-roles-teams, admin-group-mappings, admin-audit, admin-tool-servers, admin-grants, admin-policies]` with labels `null`, `"Build"`, `"Admin"`; G2 gives home and build only; G3 home only; G4 `[]`; G5 puts `zz-new` in `more` labelled `"More"` after `build`; G6 puts all four prototype-style ids in `more`; G7 returns the same item objects (`===`), ten in all, with the input still 10 long and no throw; G8 and G9 keep input order inside a group

### Requirement: The layout is a sidebar from 1024 px and collapsed below
`shellLayout(widthPx)` SHALL answer `"sidebar"` when `widthPx >= 1024` and `"collapsed"` otherwise, including for `NaN` and negative numbers.

#### Scenario: The width decides the layout
- **WHEN** `shellLayout` gets 0, 1023, 1023.9, 1024, 1280, 1366, `NaN`, `Infinity` and -1
- **THEN** the answers are `"collapsed"`, `"collapsed"`, `"collapsed"`, `"sidebar"`, `"sidebar"`, `"sidebar"`, `"collapsed"`, `"sidebar"` and `"collapsed"`

### Requirement: The shell holds one banner, one navigation, one main and one footer
`Shell.tsx` SHALL render, in this order, the skip link "Skip to content" (`href="#main"`), one `header`, `main#main` with `tabIndex={-1}` around `<Outlet />`, one `footer` "Ursitoare workflow engine" and `<ToastRegion />`, inside a `TooltipProvider`, and exactly one `nav` with `aria-label="Main"` and `id="main-nav"`: after the `header` (sidebar placement, built from `navGroups(`) or inside it (inline placement). Each sidebar group SHALL be a `p` label (never a heading) followed by a `ul` named by it through `aria-labelledby`; the current page SHALL carry `aria-current="page"`. The shell SHALL render no `role="status"`, `role="alert"` or `aria-live`, no heading, no inline style and no palette utility, and SHALL NOT use `@radix-ui` or the classes `app-shell`, `app-banner` and `app-nav`.

#### Scenario: The shell source holds the landmark, group and menu markup
- **WHEN** `shell-sources.test.ts` reads `Shell.tsx` (test-plan.md T3)
- **THEN** it contains `navGroups(`, `aria-labelledby`, `<p id={`, `aria-expanded`, `aria-controls`, `TooltipProvider`, `lg:hidden`, `lg:block`, `useState(` and `<main id="main" tabIndex={-1}`; it also contains `navPlacement(` and `useSession()`; it holds two `<nav` and two `aria-label="Main"` (one per placement, one rendered at a time), one `<header`, one `<footer`, one `<main` and the word "Ursitoare" twice; "Skip to content", `<header`, `{inline ? null : nav}`, `<main` and `<footer` occur in that order; it contains none of `role="status"`, `role="alert"`, `aria-live`, `app-nav`, `app-banner`, `app-shell`, `Collapsible`, `@radix-ui`, `DropdownMenu`, `style=`, `outline-none` and `disabled`, no `<h1` to `<h6`; and `findInlineStyleUse`, `findPaletteUtilities`, `findCssImports` and `findBannedImports` are `[]` on it

#### Scenario: Carol's navigation is grouped and the banner is compact
- **WHEN** `test_carols_navigation_is_grouped_and_the_banner_is_compact` mocks `/api/v1/me` with carol's seven capabilities and opens `/` at 1366 by 860, then at 1280 by 720 (test-plan-browser.md)
- **THEN** the page has one `navigation` named "Main" whose links read, in order, Home, Flows, Runs, Users, Roles and teams, Group mappings, Audit log, Tool servers, Grants, Policies; the visible labels "Build" and "Admin" head the lists "Build" (Flows, Runs) and "Admin" (7 links); one link has `aria-current="page"`, "Home"; the nav is 240 px wide with `main` starting at x 240; `assert_layout(page, 72)` passes with a measured banner of 56 px at both sizes; the last link ends above y 720 at 1280 by 720 (measured 514); `assert_accessible(page)` passes and the `watch_csp` list is `[]`

#### Scenario: Alice and a signed-out visitor see fewer groups
- **WHEN** `test_alice_and_a_signed_out_visitor_see_fewer_groups` opens `/` at 1366 by 860 with `/api/v1/me` mocked for alice's capabilities `read_self`, `read_flow`, `read_run`, and then with it answered 401
- **THEN** alice's links read Home, Flows, Runs under the label "Build" and no label "Admin" or "More" exists; with the 401 there is still one `navigation` named "Main", inside the banner, whose links read Home alone, with one list, no group label, no button "Menu", `main` at x 0 and the nav's bottom edge at most 56 px from the page top; both pages pass `assert_layout(page, 72)` and `assert_accessible(page)` and the `watch_csp` list is `[]`

#### Scenario: Key stops keep their ring and script focus draws none
- **WHEN** `test_key_stops_keep_their_ring_and_script_focus_draws_none` opens `/` at 1280 by 720 with a mocked ready session, presses Tab four times, reloads, presses Tab and Enter, focuses the home `status` from script, then answers `/api/v1/me` with an aborted request and clicks "Dismiss" on the toast
- **THEN** the four Tab stops are the link "Skip to content", the link "Ursitoare", the button "Sign out" and the link "Home", each with a computed `outlineStyle` other than `none` and an `outlineWidth` of at least 2 px (measured 3); after Enter on the skip link `main` is focused with `outlineStyle` `none`; the focused `status` (`tabindex="-1"`) has `outlineStyle` `none`; after "Dismiss" `main` is focused again with `outlineStyle` `none`; the `watch_csp` list is `[]`

### Requirement: With nobody signed in the navigation sits in the banner and there is no sidebar
`navPlacement(state)` SHALL answer `"inline"` when `state.status` is `"signed_out"` or `"failed"` and `"sidebar"` for `"ready"` and for `null`. Inline, `Shell.tsx` SHALL render the one `nav` "Main" inside the `header` after the brand as a single flat list, without group labels, a "Menu" button or a grid, so `main` is full width.

#### Scenario: The placement follows the session state
- **WHEN** `nav-placement.test.ts` calls `navPlacement` with `null`, `{ status: "signed_out" }`, `{ status: "failed", code: "UNKNOWN_ERROR" }` and a ready state (test-plan.md T2b)
- **THEN** the answers are `"sidebar"`, `"inline"`, `"inline"` and `"sidebar"`

### Requirement: The banner stays at most 72 px tall
The banner SHALL be one non-wrapping row of at least `--ui-banner-height` (56 px); the brand and the buttons SHALL NOT shrink, and the "Signed in as" and "Tenant:" paragraphs SHALL truncate with `text-overflow: ellipsis`, so the banner stays at most 72 px at every width.

#### Scenario: Names of 60 characters truncate and never grow the banner
- **WHEN** `test_long_names_truncate_and_never_grow_the_banner` mocks a display name of 60 "W" and a tenant name of 60 "M" and opens `/` at 1366 by 860 and at 900 by 800
- **THEN** the banner text contains both whole names; `assert_layout(page, 72)` passes with a banner of 56 px; both paragraphs compute `text-overflow: ellipsis` and are cut (`scrollWidth` greater than `clientWidth`; font-dependent, measured on macOS 921 against 607 and 804 against 530 at 1366, 921 against 323 and 804 against 282 at 900); the right edge of "Sign out" is at most the viewport width (measured 1350 and 884)

### Requirement: Below 1024 px a Menu button folds the navigation
For a signed-in user (sidebar placement), below 1024 px wide the button "Menu" SHALL be visible with `aria-expanded="false"` and `aria-controls="main-nav"`, and the navigation SHALL be hidden (not in the accessibility tree); a click SHALL show it (`aria-expanded="true"`), a second click hide it, and a change of route SHALL close it. From 1024 px the button SHALL be hidden and the navigation shown. The toggle SHALL be React state, not a Radix primitive.

#### Scenario: The menu folds below 1024 px
- **WHEN** `test_the_menu_folds_below_1024_px` mocks a ready session and opens `/` at 1023 by 800 and at 1024 by 800, then at 900 by 800 clicks "Menu" twice and opens `/no-such-page`, clicks "Menu" and then the link "Home"
- **THEN** at 1023 the button "Menu" is visible with `aria-expanded="false"` and there are 0 `navigation` elements; at 1024 the button is hidden and there is 1, whose `id` is `main-nav`; at 900 the first click gives `aria-expanded="true"` with the navigation visible and `assert_layout(page, 72)` and `assert_accessible(page)` passing, the second `"false"` and 0 navigations; after the click on "Home" the URL path is `/`, `aria-expanded` is `"false"` and there are 0 navigations; the `watch_csp` list is `[]`

### Requirement: Shell and auth stylesheets hold tokens only and a light colour scheme
`shell.css` SHALL declare `color-scheme: light` and not `light dark`, keep `.skip-link` and `.skip-link:focus` with `var(--ui-focus-width)`, replace `main:focus` by `[tabindex="-1"]:focus { outline: none; }` so that an element which only receives focus from script (`main`, a page `h1`, the home `status`) draws no frame while every interactive stop keeps the kit's `:focus-visible` outline, and hold none of the old `.app-*` selectors, `Canvas` or `currentColor`. `auth.css` SHALL keep `.auth-account` and `.auth-page`, with `text-overflow: ellipsis`, `max-width: 24rem`, `var(--ui-color-divider)`, `var(--ui-radius-lg)` and `var(--ui-shadow-sm)`. Both files SHALL hold no raw colour and use only tokens of `tokens.css`.

#### Scenario: The stylesheets use tokens and a light scheme
- **WHEN** `shell-css.test.ts` reads `shell.css`, `auth.css` and `tokens.css` (test-plan.md T4)
- **THEN** `shell.css` contains `color-scheme: light;`, `.skip-link:focus`, `[tabindex="-1"]:focus`, `outline: none;` and `var(--ui-focus-width)` and none of `main:focus`, `light dark`, `Canvas`, `currentColor` and `.app-shell`; `auth.css` contains `text-overflow: ellipsis`, `max-width: 24rem`, `var(--ui-color-divider)`, `var(--ui-radius-lg)` and `var(--ui-shadow-sm)` and not `max-width: 32rem`; `findRawColours` is `[]` for both and every `var(--…)` name they use is a key of `parseTokens(tokens.css)`

### Requirement: The sign-in and not-found pages are cards in the shell
`AccountMenu.tsx`, `SignInPage.tsx` and `App.tsx` SHALL use `Button` for "Sign out", "Sign in" and "Go to the landing page" (a link through `asChild`) and no `className="ui-button"`, keep their roles, names, texts and `aria-disabled`, and hold no native `disabled` and no inline style. The sign-in page SHALL be a card at most 24rem wide and the not-found page a card with the heading "Page not found", each centred in `main`, which is the full page width when nobody is signed in.

#### Scenario: The account, sign-in and not-found sources use the shared Button
- **WHEN** `auth-sources.test.ts` reads `AccountMenu.tsx`, `SignInPage.tsx` and `App.tsx` (test-plan.md T3)
- **THEN** each contains `<Button` and `from "../ui/button.tsx"` and none contains `className="ui-button"`, `style=` or a native `disabled=`; `AccountMenu.tsx` also contains `role="group"`, `aria-label="Account"`, `Signed in as`, `Tenant:`, `Sign out`, `aria-disabled` and `asChild`; `SignInPage.tsx` contains `tone="primary"`, `<h1>Sign in</h1>` twice, `ErrorPanel` and `Checking your session`; `App.tsx` contains `Page not found`, `Go to the landing page`, `asChild` and `DocumentTitle routeId="not-found"`; `findInlineStyleUse` and `findPaletteUtilities` are `[]` on all three

#### Scenario: Sign-in and not-found render as centred cards
- **WHEN** `test_sign_in_and_not_found_render_as_centred_cards` opens `/sign-in`, `/sign-in?error=OIDC_USER_DISABLED` and `/no-such-page` signed out at 1366 by 860
- **THEN** on both sign-in pages `main` starts at x 0, the card `main > div` is 384 px wide, at y 104 and centred on the page (centre x 683), and the button "Sign in" is 334 px wide (one such button); with the error the card holds the one `alert`; on the not-found page `main` starts at x 0, the card is 448 px wide, at y 128, centred on the page, the heading "Page not found" is visible, the link "Go to the landing page" has `href` `/`, and the title is `Page not found · Ursitoare`; every page passes `assert_layout(page, 72)` and `assert_accessible(page)` and the `watch_csp` list is `[]`
