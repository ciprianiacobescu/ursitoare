## Context

The web app has 12 stylesheets (17,130 bytes) imported by 25 `import "./x.css"` lines (22 in 20 component files, 3 in `main.tsx`). The owner chose Tailwind CSS v4 plus allowlisted Radix primitives (the only candidate with zero CSP violations under `style-src 'self'`, by probe); dialogs and selects stay native, disabled actions use `aria-disabled`. This unit adds the pipeline and the shared base; no page changes its markup. Rulings D1, D3, D10, D18, D21, D22, D23.

## Decisions

1. **One entry, in layers.** `app.css` imports `tailwindcss` (it declares `theme, base, components, utilities`), `tokens.css` unlayered (only `:root` custom properties, since an unlayered rule beats every layer), then the 12 existing files as `layer(components)`. Utilities beat every kit `.ui-*` rule; a kit rule that must win is edited, never un-layered. Deleting the 22 import lines stops Vite emitting unlayered copies. The order is today's first-import order; UNVERIFIED that no tie between equal selectors flips (U52c's screenshots decide).
2. **Token bridge.** `--color-*: initial` removes Tailwind's palette: `bg-white` and `text-red-600` produce no CSS (probed). Arbitrary values still compile (`bg-[#ff0000]` gave `background-color:red`), so the build guard is palette-only and the scanner of decision 6 blocks arbitrary colours. `Card` uses `rounded-(--ui-radius-lg)` and `shadow-(--ui-shadow-sm)` (probed: `var(--ui-radius-lg)`), so no extra `@theme` line is needed.
3. **Base layer.** Preflight resets margins, headings, links, list markers and button chrome. These rules restore what every page needs, in `@layer base` so kit and feature rules still win:
   ```css
   @layer base {
     :root { color-scheme: light; }
     body { background: var(--ui-color-bg); color: var(--ui-color-text); font-family: var(--ui-font-sans); }
     h1 { font-size: 1.5rem; font-weight: 600; }
     h2 { font-size: 1.25rem; font-weight: 600; }
     h3 { font-size: 1.0625rem; font-weight: 600; }
     a:not([class]) { color: var(--ui-color-accent); text-decoration: underline; }
     button:not([class]) { min-height: var(--ui-target-min); padding: var(--ui-space-2) var(--ui-space-3); border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius); background: var(--ui-color-surface); color: var(--ui-color-text); cursor: pointer; }
     dialog { margin: auto; }
     ul:not([class]) { list-style: disc; padding-left: 1.5rem; }
     ol:not([class]) { list-style: decimal; padding-left: 1.5rem; }
   }
   ```
   `dialog { margin: auto; }` is not in the card: without it preflight's `margin: 0` put the native `ConfirmDialog` at x 0, y 0 (512 by 218 at 1366 by 860); with it x 427, y 321 (m2:114 and tp:276 pin the native dialog). Paragraph margins are not restored: pages stay readable and shorter; later units set spacing.
4. **Components.** shadcn-style, adapted: no `forwardRef`, `data-slot`, no `style=` (C-d365d748), no `outline-none` or ring-only focus (focus stays the `:focus-visible` outline, m1:22-27), colours only as token utilities. `Button` keeps the kit class `ui-button` and adds token utilities (utilities win); `aria-disabled:cursor-not-allowed aria-disabled:opacity-60` style the disabled state the app uses (m0:165). `Badge` tones are the `*-surface`/`*-text` token pairs (`neutral` is the new `quiet` pair). `Tooltip` needs a `TooltipProvider` above it (U07b mounts it); Radix also renders a hidden `role="tooltip"` copy (UNVERIFIED in a page). `CollapsibleTrigger` passes props through: an empty `class=""` would defeat `button:not([class])`.
5. **Seam deviations.** The card puts `buttonClasses` and `ButtonTone` in `button.tsx`; a Node test cannot import a `.tsx` (no JSX in type stripping), so the recipe lives in `button-classes.ts` and `button.tsx` re-exports both names, leaving importers of `ui/button.tsx` unaffected. For the same reason the card's collapsible re-export line is three wrapper functions with the same names (they add `data-slot` and `overflow-hidden` on the content).
6. **Scanners.** `rules.ts` is a `.ts` under `web/src` and scans itself, so its patterns are `new RegExp` alternations of strings, its package names plain strings, and it holds no utility class and no banned `import`. A hit is `{ line, text: line.trim() }`. `findPaletteUtilities`: a prefix (`bg text border` with an optional side letter, `ring` with an optional `-offset`, `outline fill stroke from via to divide decoration accent caret placeholder shadow`), `-`, a palette name (`slate gray zinc neutral stone red orange amber yellow lime green emerald teal cyan sky blue indigo violet purple fuchsia pink rose white black`), not preceded by a word character or `-` and not followed by a letter; and any `-[` followed by `#`, `rgb(`, `hsl(`, `oklch(` or `color:`. `findCssImports` and `findBannedImports` match a quoted specifier after `from`, `import` or `import(`; a banned name matches exactly or with a `/subpath`. Tailwind scans every `.ts` and `.tsx` under `web/src`, tests included: a test holding `bg-[#ff0000]` put `background-color:red` into the production CSS (probed), so tests join arbitrary-colour samples from parts.
7. **Build test.** One test file imports Vite and calls `build()`: `web/src/styles/build.test.ts` (Vite writes a temporary bundled copy of the config, so concurrent builds could collide). Root `web/`, the real config, a temporary `outDir`, never `web/dist`. Probed from the repository root: green in 0.18 s (the Tailwind plugin prints a SOURCEMAP_BROKEN warning, nothing more).
8. **e2e helpers.** `watch_csp` adds an init script that logs each `securitypolicyviolation` as a console message and listens on `console`: Chrome's own message and ours are both kept, so one violation gives two entries and "empty" is the assertion. `assert_layout` reads the banner height by role (a page without a banner fails by timeout).
9. **The MODIFIED requirement.** `web-runs` "The new components follow the run sources' rules" ended "; no feature file, CSS file or token is added". M6b adds `styles/app.css` and tokens, so the clause becomes "and add no feature file" (D18); the rest and the scenario "Sources read as the rules say" stay. `dry-run-sources.test.ts` never asserted the dropped clause, so no frozen test changes. A new scenario, with a new test under this unit's C-id, proves the change: the three sources import no stylesheet and `web/src/features` keeps its 14 files.
10. **Packages**: the memo's nine (test-plan.md T4), installed by the scaffold under the repo's `minimumReleaseAge` and licence gate; this unit only tests the manifest. `lucide-react` is for later units.
11. **Probe** in a scratch build of the real app (main@3daa5c35 plus this design, the nine packages added with `pnpm add`, served by the engine with its CSP; main's live stack as baseline; Playwright 1.63.0 at 1366 by 860). Before, after: banner (alice) 129, 97 px; (carol) 297, 265; (signed out) 81, 55; `h1` 32 px, 24 px; `p` margin 16 px, 0; `/flows/demo-pay` 4,634 px, 4,454 px; bare link `rgb(0, 0, 238)`, accent. The nav lost its bullets (preflight beats the browser default and `.app-nav ul` never matched `ul.app-nav`); no other list loses a marker. `color-scheme` stays `light dark` until U07b (`shell.css` is in `components` and beats the base layer). No page has a bare `ul`, so `ul:not([class])` is UNVERIFIED in the app (emitted as `list-style:outside`, the minifier's form of `disc`, inferred). Axe and the CSP list were clean on 11 pages before and after.

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists what is not scaffolded. Seam deviations from the card: decision 5.

```ts
// web/src/kit/extra-contrast.ts
import type { ContrastPair } from "./contrast.ts";
export const EXTRA_CONTRAST_PAIRS: readonly ContrastPair[];   // nine pairs: spec "The new tokens"
// web/src/ui/cn.ts
import type { ClassValue } from "clsx";
export function cn(...inputs: ClassValue[]): string;
// web/src/ui/button-classes.ts
export type ButtonTone = "primary" | "secondary" | "danger" | "ghost";
export function buttonClasses(opts?: { tone?: ButtonTone; size?: "sm" | "md"; className?: string }): string;   // contains "ui-button"; default tone "secondary", size "md"
// web/src/ui/button.tsx
export { buttonClasses } from "./button-classes.ts";
export type { ButtonTone } from "./button-classes.ts";
export function Button(props: ComponentProps<"button"> & { tone?: ButtonTone; size?: "sm" | "md"; asChild?: boolean }): ReactNode;   // type "button"; forwards aria-disabled; never sets `disabled`; asChild via @radix-ui/react-slot
// web/src/ui/badge.tsx
export function Badge(props: { tone: Tone; children: ReactNode; className?: string }): ReactNode;   // <span data-slot="badge" data-tone>
// web/src/ui/card.tsx
export function Card(props: ComponentProps<"div">): ReactNode;   // <div data-slot="card">
// web/src/ui/tooltip.tsx
export function TooltipProvider(props: { children: ReactNode }): ReactNode;   // delayDuration 300
export function Tooltip(props: { content: string; children: ReactElement }): ReactNode;   // Radix Root, Trigger asChild, Portal, Content
// web/src/ui/collapsible.tsx   (CollapsiblePrimitive: `import * as` of @radix-ui/react-collapsible)
export function Collapsible(props: ComponentProps<typeof CollapsiblePrimitive.Root>): ReactNode;
export function CollapsibleTrigger(props: ComponentProps<typeof CollapsiblePrimitive.Trigger>): ReactNode;
export function CollapsibleContent(props: ComponentProps<typeof CollapsiblePrimitive.Content>): ReactNode;
// web/src/ui/skeleton.tsx
export function Skeleton(props: { className?: string }): ReactNode;   // <div aria-hidden="true">
// web/src/ui/tones.ts
export type Tone = "neutral" | "info" | "success" | "warning" | "danger";
export function runStateTone(state: string): Tone;
export function stepStateTone(state: string): Tone;
export function versionStateTone(state: string): Tone;
export function serverStateTone(state: string): Tone;
export function grantStatusTone(status: string): Tone;   // tables: spec "The tone mappers"
// web/src/ui/format.ts
export function formatDuration(startIso: string, endIso: string | null, nowMs: number): string;
export function formatInstant(iso: string): string;
export function formatAgo(iso: string, nowMs: number): string;
// web/src/ui/rules.ts (pure scanners; the rule tests walk web/src with them)
import type { SourceHit } from "../kit/contrast.ts";
export const BANNED_PACKAGES: readonly string[];
export const M6B_PACKAGES: Readonly<{ dependencies: Readonly<Record<string, string>>; devDependencies: Readonly<Record<string, string>> }>;
export function findPaletteUtilities(source: string): SourceHit[];   // design decision 6
export function findCssImports(source: string): SourceHit[];
export function findBannedImports(source: string): SourceHit[];
```

```css
/* web/src/styles/app.css: exactly this order, nothing above the first line */
@import "tailwindcss" source("../");
@import "../kit/tokens.css";
@import "../kit/theme.css" layer(components);
@import "../kit/data/data.css" layer(components);
@import "../app/shell.css" layer(components);
@import "../auth/auth.css" layer(components);
@import "../admin/admin.css" layer(components);
@import "../tools/tools.css" layer(components);
@import "../flows/flows.css" layer(components);
@import "../flow-graph/flow-graph.css" layer(components);
@import "../flow-graph/hook-overlay.css" layer(components);
@import "../runs/runs.css" layer(components);
@import "../runs/hooks.css" layer(components);
@theme inline {
  --color-*: initial;
  /* one line per --ui-color-* token of tokens.css: --color-<name>: var(--ui-color-<name>); e.g. */
  --color-bg: var(--ui-color-bg);
  --font-sans: var(--ui-font-sans);
  --font-mono: var(--ui-font-mono);
}
@layer base { /* design decision 3 */ }
/* web/src/kit/tokens.css appends the tokens of spec "The new tokens" and changes --ui-font-sans */
```

```python
# e2e/conftest.py (two helpers appended; nothing else changes)
def watch_csp(page) -> list[str]: ...   # before the first goto; console messages containing "Content Security Policy" and each securitypolicyviolation event as "Content Security Policy violation: <directive> <blockedURI>"; the live list
def assert_layout(page, max_banner_px: int = 72) -> None: ...   # fails with the numbers unless the banner is at most max_banner_px tall and scrollWidth <= innerWidth
```

## Failure cases

A missing or non-hex token gives ratio 0 in `checkTokenContrast` (T1). A scanner given an empty string or no match returns `[]`; a match in a comment or a string is a hit (like C-d365d748). `formatDuration` of an unparsable or reversed range is `—`; `formatInstant` and `formatAgo` keep text `Date.parse` rejects. A failed Tailwind pass fails `build.test.ts` with Vite's error; a package missing from `node_modules` fails at link time in the scaffold gate. `watch_csp` after the first `goto` misses earlier violations.

## Security

No endpoint, policy action, table, secret or CSP change. Tailwind and the three Radix primitives add no `<style>` element and no inline style attribute (probed: zero CSP messages on 11 pages). The packages are exact-pinned, run no install script and pass the licence gate (scratch: `C-9d08ccc3` and `C-05d0c7f9` of `test/arch/licences.test.ts` green with the nine installed). A banned package, a raw colour class or a stylesheet import added by a later unit fails the package and tree tests.

## Frozen pins checked

`tokens.css` colours stay six-digit hex and the 16 `CONTRAST_PAIRS` pass (C-16a71639; tokens are appended); `--ui-color-toast-bg` stays `#1b1f27`; `theme.css`, `data.css` and `features/index.ts` are untouched; no inline style (C-d365d748 scans the new `.tsx`); no nav, skip-link, `/me`, focus, toast, title, dialog, select or `aria-disabled` pin has a markup change; no page gains a `status`, `alert`, `dialog` or region. In the scratch build 514 of 516 web and architecture Node tests passed and 1 was skipped (the repository-tree test needs a git directory and passed once the scratch had one), and the 66 e2e tests passed; `tsc` and `eslint` were clean on the new files.

## Verification

**Ran** (Node 24.22.2, scratch copy): the vectors of test-plan.md T1, T3, T5, T7, T8 against prototypes; the tree scan (131 files); a prototype `build.test.ts`; the helpers and the three browser tests against the scratch stack and main's live stack; screenshots and styles of 9 pages. **Not run:** a real `Tooltip` or `Collapsible` in a page, Firefox and Safari (Tailwind v4 needs Chrome 111, Safari 16.4, Firefox 128), `ul:not([class])` in the app, the tie order of decision 1.

## Decisions made while writing

Beyond the card: decisions 2 (`rounded-(--ui-radius-lg)`), 3 (the `dialog` rule), 5 (two seam deviations), 6 (scanner coverage of side and offset forms) and 9 (the new scenario).
