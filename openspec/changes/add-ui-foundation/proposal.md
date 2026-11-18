## Why

The owner called the web app unusable. M6b rebuilds the look on Tailwind CSS v4 and a few Radix primitives under the engine's CSP (`style-src 'self'`). Every later unit needs one base: a layered stylesheet entry, colour tokens as utilities, small components, rule tests and two browser helpers. This unit builds it and changes no page's markup.

Observable result: `web/dist` holds one stylesheet with `@layer components`, the kit rules and the token utilities; `h1` is 24 px; a native dialog still opens centred; `/` and `/sign-in` signed out raise no CSP message and pass axe; `web/src` has one stylesheet import (`main.tsx`), no palette utility and no banned package; `watch_csp` and `assert_layout` exist for later browser tests.

Batch `m6b-ui` (U15c, U18b, U15d, U07b, U21b, U07c, U28b, U37b, U37c, U52c in plan order; closing unit `add-visual-review`, journey `e2e/test_m6b_ui.py`) delivers M6b: the web app is restyled on Tailwind CSS v4 and Radix primitives with a grouped sidebar, a home page of recent work, a flow workspace, run inputs built from the flow's input schema, a readable run view and people's names instead of ids, with zero CSP violations. This unit's part: the Tailwind pipeline, the layered stylesheet entry, the new tokens, the `web/src/ui/` primitives, the design-system rule tests and the two e2e helpers. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- New: `web/src/styles/app.css`, `web/src/kit/extra-contrast.ts`, `web/src/ui/{cn,button-classes,tones,format,rules}.ts` and `{button,badge,card,tooltip,collapsible,skeleton}.tsx`, their tests, `web/src/styles/build.test.ts`, `e2e/test_m6b_foundation.py`.
- Edited, each in a named task: `web/vite.config.ts` (one import, one plugin), `web/src/main.tsx` (three CSS imports become one), `web/src/kit/tokens.css` (append; the font stack), `e2e/conftest.py` (two helpers), and 22 `import "./x.css";` lines in 20 files (deleted; later units edit those files after this one).
- Capability `web-design-system` (new): ADDED requirements. Capability `web-runs`: one MODIFIED requirement, "The new components follow the run sources' rules" (design decision 9).
- No markup, API, error code, migration, part, policy action, feature file or CSP change. `web/vite.config.ts` says "owner-maintained" but is not a forbidden path; D23 approves the one-plugin edit (the owner is told once).

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. The scaffold also installs the nine packages of `M6B_PACKAGES` at exact versions (`pnpm add --save-exact`: seven dependencies, two dev dependencies), so tests import them and this unit adds none. Not scaffolded: the `tokens.css` appends and font change, `app.css` (a data file), the edits of `vite.config.ts` and `main.tsx`, the 22 deleted lines, the two Python helpers, `e2e/test_m6b_foundation.py` and the tests. Stubs return empty values (`""`, `[]`, `"neutral"`, empty package maps), so a red test fails by assertion.
- **Depends on** (all merged): `add-supply-chain-gate` (U05: the licence gate re-checks the packages), `add-web-shell` (U07: `main.tsx`, `vite.config.ts`), `add-web-ui-kit` (U15: `tokens.css`, `contrast.ts`), `add-web-data-kit` (U15b: `data.css`), `add-web-sign-in` (U16: `login`), and the owners of the 20 files: `add-web-admin` (U21), `add-web-flow-editor` (U28), `add-web-flow-graph` (U29), `add-web-run-timeline` (U37), `add-web-hooks-view` (U44), `add-web-grants` (U52), `add-web-dry-runs` (U52b).
- Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3daa5c35, checked line by line).

**Interfaces given** (as in design.md § Interfaces)

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

**Interfaces taken:**

- From merged code (shapes in `delivered-shapes.md`): `ContrastPair`, `SourceHit`, `CONTRAST_PAIRS`, `parseTokens`, `checkTokenContrast`, `findRawColours`, `findInlineStyleUse`; in Python `login`, `assert_accessible`. No in-plan unit gives this unit a name.

## Out of scope

Page redesigns, `PageHeader`, `Section`, the sidebar and every other component (U15d and later), dark mode, a webfont (licence allowlist), the reserve Radix packages, any CSP change. Spec: `specs/web-design-system/spec.md`, `specs/web-runs/spec.md`; fixtures: `test-plan.md`, `test-plan-browser.md`; decisions: `design.md`. Each Node test begins with `assert.equal(typeof <function>, "function")` for the names it imports from the file its Interfaces header names (never an `index.ts`), wraps a call that reaches a stub in `assert.doesNotThrow`, uses `node:assert/strict` and has no `.`, `[` or `::` in its name.
