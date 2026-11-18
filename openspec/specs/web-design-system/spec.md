# web-design-system Specification

## Purpose
The web app is styled by one Tailwind CSS v4 stylesheet entry with cascade layers, colours that come only from checked tokens, a few shared components, and source rules that keep later units inside the engine's CSP and token palette.

## Requirements

### Requirement: The new tokens are hex colours whose contrast pairs pass
`web/src/kit/tokens.css` SHALL gain `--ui-color-warning-surface` `#fffaeb`, `--ui-color-warning-text` `#93370d`, `--ui-color-quiet-surface` `#f2f4f7`, `--ui-color-quiet-text` `#344054`, `--ui-color-accent-surface` `#eff4ff`, `--ui-color-sidebar` `#eef0f3`, `--ui-color-divider` `#d0d5dd`, `--ui-font-mono` `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`, `--ui-radius-lg` `0.5rem`, `--ui-shadow-sm` `0 1px 2px #1b1f2714`, `--ui-sidebar-width` `15rem` and `--ui-banner-height` `3.5rem`, change `--ui-font-sans` to `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`, and keep every other value. `EXTRA_CONTRAST_PAIRS` SHALL be nine pairs in this order, ids `<fg>-on-<bg>`: `warning-text-on-warning-surface` 4.5, `quiet-text-on-quiet-surface` 4.5, `accent-on-accent-surface` 4.5, `text-on-sidebar` 4.5, `text-muted-on-sidebar` 4.5, `accent-on-sidebar` 4.5, `border-on-sidebar` 3, `focus-on-sidebar` 3, `focus-on-accent-surface` 3; `checkTokenContrast(parseTokens(tokens.css), EXTRA_CONTRAST_PAIRS)` SHALL be `[]`.

#### Scenario: The new tokens are hex and their contrast pairs pass
- **WHEN** the real `tokens.css` is read and the rows F0 to F3 of test-plan.md T1 run
- **THEN** F0 gives `[]` for the nine pairs (ratios 7.21 to 3.30 as listed) and the frozen sixteen, and all 25 `--ui-color-*` values are six-digit hex; F1 gives only `quiet-text-on-quiet-surface` with a ratio below 4.5; F2 gives the five `sidebar` ids with ratio 0; F3 gives two failures with ratio 0

### Requirement: One stylesheet entry layers the kit under the utilities
`web/src/styles/app.css` SHALL start with the 13 `@import` lines of design.md § Interfaces and hold at top level only one `@theme inline` block (`--color-*: initial;`, one `--color-<name>: var(--ui-color-<name>);` per `--ui-color-*` token, `--font-sans`, `--font-mono`) and one `@layer base` block of the ten rules of design.md decision 3, with no raw colour. `web/src/main.tsx` SHALL import `./styles/app.css` and no other stylesheet; `web/vite.config.ts` SHALL keep its first comment line and use `plugins: [react(), tailwindcss()]`.

#### Scenario: app.css keeps its imports, bridge and base layer in order
- **WHEN** a test reads `app.css`, `tokens.css`, `main.tsx` and `vite.config.ts` (test-plan.md T2)
- **THEN** the `@import` lines are the 13 in order; every non-blank column-0 line is an `@import`, `@theme inline {`, `@layer base {` or `}`; `--color-*: initial;` is present once and each of the 25 names has its bridge line once; the base block holds each rule of decision 3 (`h1 { font-size: 1.5rem; font-weight: 600; }`, `dialog { margin: auto; }`); `findRawColours` gives `[]`; `main.tsx` has one `findCssImports` hit, `import "./styles/app.css";`; `vite.config.ts` holds `plugins: [react(), tailwindcss()]`

### Requirement: The build emits the layers, the kit rules and the token utilities
Vite's `build()` on `web/` with its own config SHALL emit one CSS file holding `@layer components`, `.ui-button{`, `.bg-accent{`, `--ui-color-sidebar:`, `.bg-quiet-surface{` (a new token bridged by `@theme inline`) and `dialog{margin:auto}`, no `bg-white` and no arbitrary-colour class, and an `index.html` with no `style=`. One test file under `web/src` imports Vite and calls `build()`.

#### Scenario: The build emits layers, kit rules and token utilities
- **WHEN** `build.test.ts` builds into a temporary `outDir` (test-plan.md T2) and reads the one `.css` file and `index.html`
- **THEN** the CSS contains the six strings above and none of `bg-white`, `\[\#`, `\[rgb`, `\[hsl`, `\[oklch`, `\[color`; `index.html` has no `style=`; both files were read from the temporary `outDir`; no other `*.test.ts` under `web/src` imports `vite` (today none does)

### Requirement: Unstyled elements stay readable and the signed-out pages stay clean
The base layer SHALL keep headings, links, bare buttons, list markers and the native dialog readable, so the `h1` is at least 24 px; `/` and `/sign-in` signed out SHALL raise no Content Security Policy message, not scroll sideways and pass `assert_accessible`.

#### Scenario: Signed-out pages are styled, clean and accessible
- **WHEN** `test_signed_out_pages_are_styled_clean_and_accessible` opens `/` and `/sign-in` at 1366 by 860 after `watch_csp(page)` (test-plan-browser.md)
- **THEN** `assert_layout(page, max_banner_px=300)` passes, the `h1` `font-size` is at least 24 px, `assert_accessible(page)` passes and the `watch_csp` list is `[]`; the test is green on arrival at main (its `h1` is 32 px), so it guards the base layer rather than proving it

### Requirement: Source rules hold over `web/src` and `web/package.json`
The three scanners SHALL give one `{ line, text }` per matching line (design.md decision 6). Over every `.ts` and `.tsx` under `web/src` except `*.test.ts`, `findCssImports` SHALL be `[]` except `main.tsx`, whose only hit is `import "./styles/app.css";`, and `findBannedImports` and `findPaletteUtilities` SHALL be `[]`, `ui/rules.ts` included, and no `.tsx` SHALL hold `outline-none`, `focus:ring` or `focus-visible:ring`. `web/package.json` SHALL hold none of the 14 `BANNED_PACKAGES` in its four dependency sections and every `M6B_PACKAGES` entry at its exact version in its section.

#### Scenario: Palette utilities, stylesheet imports and banned imports: hits and misses
- **WHEN** the scanners run on the rows P1 to P11, C1 to C8 and B1 to B11 of test-plan.md T3 (arbitrary-colour rows joined from parts)
- **THEN** each row gives its T3 result: P1 to P6 and P9 one hit each (`bg-white text-red-600`, three joined arbitrary colours, `border-t-red-500 ring-offset-white`, `bg-neutral`), P7, P8 and P11 `[]`, P10 one hit at `line` 2; C1 to C4 and C8 hit (`import "./a.css";`) while C5 to C7 (`import "./a.css.ts";`) give `[]`; B1 to B4 and B7 to B10 hit (`@radix-ui/react-dialog`, `radix-ui/internal`) while B5, B6 and B11 (`@radix-ui/react-slot`, `@radix-ui/react-dialog-extra`, a bare string line) give `[]`

#### Scenario: The real tree holds the rules, and the scanners scan themselves clean
- **WHEN** a test runs the three scanners over every `.ts` and `.tsx` under `web/src` except `*.test.ts`, then over `ui/rules.ts` alone (test-plan.md T4)
- **THEN** the walk finds at least 100 files, the only css-import hit is `main.tsx` with `import "./styles/app.css";`, there is no banned-import and no palette hit, `ui/rules.ts` gives `[]` for all three, and none of the 20 files of task 8.1 has an `import "./x.css";` line

#### Scenario: The packages: no banned name, nine exact versions
- **WHEN** a test reads `web/package.json` and compares it with `BANNED_PACKAGES` and `M6B_PACKAGES` (test-plan.md T4)
- **THEN** `BANNED_PACKAGES` deep-equals the 14 names of T4 in order, `M6B_PACKAGES` the nine entries (seven in `dependencies`, two in `devDependencies`), and the manifest holds none of the 14 and each of the nine at its exact version

### Requirement: cn and buttonClasses merge classes by Tailwind's rules
`cn(...inputs)` SHALL equal `twMerge(clsx(inputs))`. `buttonClasses(opts)` SHALL always contain `ui-button`, default to tone `secondary` and size `md`, give each tone its token utilities, merge `opts.className` last and contain no palette utility;

#### Scenario: cn and buttonClasses merge and order their classes
- **WHEN** `cn` runs on K1 to K12 and `buttonClasses` on B1 to B6 and the eight tone and size pairs of test-plan.md T5
- **THEN** `cn("text-sm", "text-text-muted")` is `text-sm text-text-muted`, `cn("bg-surface", "bg-accent")` is `bg-accent`, `cn("px-3", "px-2", undefined, false, "py-1")` is `px-2 py-1`, K4 to K12 give their strings; `buttonClasses({ tone: "primary", size: "sm" })` has `bg-accent`, `text-on-accent`, `min-h-8`, `px-2`, `text-sm` and not `px-3`; `{ className: "bg-accent" }` has `bg-accent` and not `bg-surface`; B1 to B6 have their T5 members; each of the eight has `ui-button` and `aria-disabled:cursor-not-allowed` and `findPaletteUtilities` gives `[]` on it

### Requirement: The components keep the markup, role and class rules
`button.tsx`, `badge.tsx`, `card.tsx`, `skeleton.tsx`, `tooltip.tsx` and `collapsible.tsx` SHALL hold no inline style, `outline-none`, ring-only focus class, `role=` or native `disabled`, and SHALL carry the `data-slot` and tone attributes of design.md § Interfaces; `Button` SHALL default `type` to `button` (`type = "button"`), pass the rest of its props, `aria-disabled` included, through `{...props}`, and never set the native `disabled`.

#### Scenario: The components' sources keep the markup rules
- **WHEN** a test reads the six sources (test-plan.md T6)
- **THEN** `findInlineStyleUse` is `[]` on each and none contains `outline-none`, `focus:ring` or `role=`; `button.tsx` has no standalone word `disabled` and contains `data-slot="button"`, `Slot`, `buttonClasses(`, `type = "button"` and `{...props}`; `badge.tsx` contains `data-slot="badge"`, `data-tone` and the five pairs `bg-quiet-surface text-quiet-text`, `bg-info-surface text-info-text`, `bg-success-surface text-success-text`, `bg-warning-surface text-warning-text`, `bg-danger-surface text-danger-text`; the other files hold the tokens of T6

### Requirement: The tone mappers map known states and fall back to neutral
The five mappers SHALL return the `Tone` of test-plan.md T7 for each known state and `neutral` for any other string.

#### Scenario: Tone mappers
- **WHEN** each mapper runs on the rows of test-plan.md T7
- **THEN** `runStateTone("failed")` is `danger`, `versionStateTone("published")` `info`, `versionStateTone("tested")` `success`, `serverStateTone("drifted")` `warning`, `grantStatusTone("needs_reconfirm")` `warning`, every other row is its T7 value, and `weird`, `""`, `__proto__` and `toString` give `neutral` for all five

### Requirement: Durations, instants and ages read as fixed texts
`formatDuration(startIso, endIso, nowMs)` SHALL measure `endIso` (or `nowMs` for null) minus the start and answer `—` for an unparsable or negative span, `<1 s` below 1000 ms, one truncated decimal (`2.3 s`) below 60 s, `4 min 5 s` below 3600 s and `2 h 3 min` otherwise. `formatInstant(iso)` SHALL answer `YYYY-MM-DD HH:mm UTC` in UTC, or the input when `Date.parse` rejects it or the year is outside 0000 to 9999. `formatAgo(iso, nowMs)` SHALL answer `just now` below 60 s, then `N min ago`, `N h ago`, `N d ago` (truncated), and `formatInstant(iso)` for a future or unparsable time.

#### Scenario: Durations, instants and ages
- **WHEN** the functions run on D1 to D13, I1 to I6 and A1 to A10 of test-plan.md T8
- **THEN** each row gives its T8 text: 999 ms `<1 s`, 2,349 ms `2.3 s`, 59,999 ms `59.9 s`, 245 s `4 min 5 s`, 7,410 s `2 h 3 min`, a reversed range `—`; `2026-11-17T22:38:00+01:00` gives `2026-11-17 21:38 UTC`, `yesterday` and `+275760-09-13T00:00:00.000Z` stay; 5 min ago is `5 min ago`, 49 h `2 d ago`, one second ahead and `junk` give `formatInstant` of the input

### Requirement: Two browser helpers watch the CSP and measure the layout
`e2e/conftest.py` SHALL gain `watch_csp(page)` and `assert_layout(page, max_banner_px=72)` and change nothing else. `watch_csp` SHALL be called before the first `goto`, collect every console message containing "Content Security Policy" and every `securitypolicyviolation` event as `Content Security Policy violation: <directive> <blockedURI>`, and return the live list. `assert_layout` SHALL raise `AssertionError("layout: " + problems joined by "; ")` unless the banner is at most `max_banner_px` tall and `scrollWidth` is at most `innerWidth`.

#### Scenario: watch_csp sees a violation and assert_layout reports numbers
- **WHEN** `test_watch_csp_reports_a_violation` loads a routed page with the header `Content-Security-Policy: default-src 'self'; style-src 'self'` and a `<style>` element, and `test_assert_layout_reports_the_numbers` runs the pages of test-plan-browser.md
- **THEN** the list holds an entry starting `Content Security Policy violation: style-src` (Chrome gives `style-src-elem inline`); a 100 px banner above a 1,500 px body in a 1,000 px window raises a message holding `banner 100px is taller than 72px` and `scrollWidth 1500 exceeds innerWidth 1000`; the 100 px banner passes at `max_banner_px=100` and raises exactly `layout: banner 100px is taller than 99px` at 99; a Node test finds both definitions and the violation text in `e2e/conftest.py`, with `login` and `assert_accessible` still defined
