# Fixtures for the Node tests

Every value was run in a scratch copy of main@3daa5c35 with the design applied (Node 24.22.2). A hit is `{ line, text }` with `text` the trimmed line. "joined" means the test builds the string from parts (`["bg", "[#ff0000]"].join("-")`), so Tailwind never sees the whole class in a scanned file.

## T1 Tokens (`extra-contrast.test.ts`)

`parseTokens` of the real `tokens.css`; ratios to two decimals (tolerance 0.01), in the order of the nine ids: 7.21, 9.49, 6.08, 14.46, 6.86, 5.87, 3.30, 5.87, 6.08. The test also checks the 12 new values of the spec, that `--ui-color-toast-bg` is still `#1b1f27`, and that each of the 25 `--ui-color-*` values matches `^#[0-9a-f]{6}$`.

| row | input | `checkTokenContrast(…, EXTRA_CONTRAST_PAIRS)` |
|---|---|---|
| F0 | real tokens | `[]`; the frozen `CONTRAST_PAIRS` also `[]` |
| F1 | `--ui-color-quiet-text` `#999999` | one failure: `quiet-text-on-quiet-surface`, min 4.5, ratio below 4.5 (2.59) |
| F2 | no `--ui-color-sidebar` | five failures, ratio 0, in order: `text-on-sidebar`, `text-muted-on-sidebar`, `accent-on-sidebar`, `border-on-sidebar`, `focus-on-sidebar` |
| F3 | `--ui-color-accent-surface` `blue` | `accent-on-accent-surface` and `focus-on-accent-surface`, ratio 0 |

## T2 app.css and the build (`app-css.test.ts`, `build.test.ts`)

`app.css`, read as text: the `@import` lines equal the 13 of design.md § Interfaces, in order. Every non-blank column-0 line is an `@import`, `@theme inline {`, `@layer base {` or `}`. `--color-*: initial;` once; for each `--ui-color-<n>` token of `tokens.css` (25: the 18 of main and the 7 new ones) the trimmed line `--color-<n>: var(--ui-color-<n>);` once; `--font-sans: var(--ui-font-sans);` and `--font-mono: var(--ui-font-mono);` once. The base block, whitespace collapsed to single spaces, contains each of the ten rules of design.md decision 3 as one string (`h1 { font-size: 1.5rem; font-weight: 600; }`, `dialog { margin: auto; }`, and so on). `findRawColours(app.css)` is `[]`. `vite.config.ts` starts with `// Build configuration for the web app (owner-maintained).` and holds `import tailwindcss from "@tailwindcss/vite";` and `plugins: [react(), tailwindcss()]`. `main.tsx` has one `findCssImports` hit and no `kit/tokens.css`.

`build.test.ts`: `build({ root: <web dir>, configFile: <web>/vite.config.ts, logLevel: "silent", build: { outDir: <mkdtemp>, emptyOutDir: true, sourcemap: false } })`, then the one `assets/*.css` and `index.html`; the directory is removed in `finally`. Present: `@layer components`, `.ui-button{`, `.bg-accent{`, `--ui-color-sidebar:`, `.bg-quiet-surface{`, `dialog{margin:auto}`. Absent: `bg-white`, `\[\#`, `\[rgb`, `\[hsl`, `\[oklch`, `\[color`. `index.html` has no `style=`. Probed: one 26.6 KB file.

## T3 Scanners (`rules.test.ts`)

`findPaletteUtilities`: P1 `<p className="bg-white text-red-600">` 1 hit; P2 `className="hover:bg-slate-50 md:text-black/50"` 1; P3 `className="` + joined(`bg`, `[#ff0000]`) + `"` 1; P4 `x ` + joined(`text`, `[rgb(1 2 3)]`) 1; P5 `x ` + joined(`border`, `[color:var(--x)]`) 1; P6 `x border-t-red-500 ring-offset-white` 1; P7 `className="bg-surface text-text-muted border-border bg-quiet-surface text-accent bg-accent/90 border-transparent shadow-(--ui-shadow-sm)"` `[]`; P8 `context-white the bg-whitespace-nowrap text-blacklist` `[]`; P9 `bg-neutral` 1; P10 the three lines `a`, `b bg-green-500`, `c` 1 hit at `line` 2, text `b bg-green-500`; P11 `""` `[]`.

`findCssImports`: C1 `import "./a.css";` hit; C2 `import x from "../b.css?inline";` hit; C3 `const m = import("./c.css");` hit; C4 `import './d.css'` hit; C5 `import "./a.css.ts";` `[]`; C6 `import "./a.cssx";` `[]`; C7 `import { x } from "./styles.ts";` `[]`; C8 `export * from "./e.css";` hit.

`findBannedImports`: B1 `import * as D from "@radix-ui/react-dialog";` hit; B2 `import "radix-ui";` hit; B3 `import { s } from "radix-ui/internal";` hit; B4 `const m = await import("react-remove-scroll");` hit; B5 `import { Slot } from "@radix-ui/react-slot";` `[]`; B6 `import x from "@radix-ui/react-dialog-extra";` `[]`; B7 `import styled from "styled-components";` hit; B8 `import { x } from "@mantine/core/styles.css";` hit; B9 `import {a} from '@emotion/react'` hit; B10 `export { x } from "@radix-ui/react-select";` hit; B11 the line `"@radix-ui/react-dialog",` `[]`.

## T4 The tree and the packages (`rules-tree.test.ts`, `packages.test.ts`)

The walk starts at `web/src` (from `import.meta.url`), takes `.ts` and `.tsx` files that do not end in `.test.ts`. Probed on the scratch tree: 131 files, one hit in all (`main.tsx`, `import "./styles/app.css";`), `ui/rules.ts` alone `[]` for all three. The test also reads the 20 files of task 8.1 and expects `findCssImports` `[]` on each.

`BANNED_PACKAGES`, in order: `@radix-ui/react-dialog`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-select`, `@radix-ui/react-context-menu`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-toast`, `@radix-ui/react-scroll-area`, `radix-ui`, `react-remove-scroll`, `@radix-ui/themes`, `@emotion/react`, `@emotion/styled`, `styled-components`, `@mantine/core`. `M6B_PACKAGES`: dependencies `@radix-ui/react-slot` `1.5.0`, `@radix-ui/react-collapsible` `1.2.1`, `@radix-ui/react-tooltip` `1.4.1`, `class-variance-authority` `0.7.1`, `clsx` `2.1.1`, `tailwind-merge` `3.7.0`, `lucide-react` `1.72.0`; devDependencies `tailwindcss` `4.3.5`, `@tailwindcss/vite` `4.3.5`.

## T5 cn and buttonClasses (`classes.test.ts`)

`cn`: K1 `"text-sm", "text-text-muted"` gives `text-sm text-text-muted`; K2 `"bg-surface", "bg-accent"` `bg-accent`; K3 `"text-accent", "text-danger-text"` `text-danger-text`; K4 `"px-3", "px-2", undefined, false, "py-1"` `px-2 py-1`; K5 `"min-h-8", "min-h-10"` `min-h-10`; K6 `"rounded", "rounded-lg"` `rounded-lg`; K7 `"ui-button", "bg-accent"` `ui-button bg-accent`; K8 `"text-text-muted", "text-sm"` `text-text-muted text-sm`; K9 `"border-border", "border-danger"` `border-danger`; K10 `"bg-quiet-surface", "bg-warning-surface"` `bg-warning-surface`; K11 no argument `""`; K12 `"a", ["b", { c: true, d: false }]` `a b c`.

`buttonClasses`, result split on spaces (membership): B1 `()` has `ui-button`, `border-border`, `bg-surface`, `text-text`, `px-3`, not `bg-accent`; B2 `{ tone: "primary", size: "sm" }` has `bg-accent`, `text-on-accent`, `border-accent`, `min-h-8`, `px-2`, `text-sm`, not `px-3`, `bg-surface`; B3 `{ tone: "danger", className: "w-full" }` has `bg-danger`, `text-on-danger`, `border-danger`, `w-full`, not `bg-surface`; B4 `{ tone: "ghost" }` has `bg-transparent`, `text-accent`, `border-transparent`; B5 `{ className: "bg-accent" }` has `bg-accent`, `text-text`, not `bg-surface`; B6 `{ size: "sm" }` has `bg-surface`, `min-h-8`, `px-2`, `text-sm`, not `px-3`. For the eight tone and size pairs (`primary`, `secondary`, `danger`, `ghost` by `sm`, `md`) the result has `ui-button` and `aria-disabled:cursor-not-allowed`, and `findPaletteUtilities` of it is `[]`.

## T6 Component sources (`components.test.ts`)

Per file, beyond the rules of the spec: `button.tsx` `export { buttonClasses }`, `type = "button"` and `{...props}`, and no match of `/(?<![\w-])disabled(?![\w-])/`; `card.tsx` `data-slot="card"`, `rounded-(--ui-radius-lg)`, `shadow-(--ui-shadow-sm)`; `skeleton.tsx` `data-slot="skeleton"`, `aria-hidden="true"`; `tooltip.tsx` `delayDuration={300}`, `asChild`, `Portal`; `collapsible.tsx` `data-slot="collapsible"`, `data-slot="collapsible-trigger"`, `data-slot="collapsible-content"`.

## T7 Tone mappers (`tones.test.ts`)

`runStateTone`: queued neutral, running info, completed success, failed danger, cancelled neutral. `stepStateTone`: started info, completed success, failed danger, skipped neutral. `versionStateTone`: draft neutral, validated success, tested success, reviewed success, published info, deprecated neutral. `serverStateTone`: pending warning, approved success, drifted warning. `grantStatusTone`: active success, needs_reconfirm warning, revoked neutral. Each also gives `neutral` for `weird`, `""`, `__proto__` and `toString`.

## T8 Formats (`format.test.ts`)

Durations, start `2026-11-17T21:00:00Z`, `end` on the same day: D1 `21:00:00.999Z` `<1 s`; D2 `21:00:02.349Z` `2.3 s`; D3 `21:00:59.999Z` `59.9 s`; D4 `21:04:05Z` `4 min 5 s`; D5 `21:01:00Z` `1 min 0 s`; D6 `23:03:30Z` `2 h 3 min`; D7 `22:00:00Z` `1 h 0 min`; D8 `null` with `nowMs` start plus 1,500 `1.5 s`; D9 `20:59:59Z` `—`; D10 start `nope`, `null` `—`; D11 `21:00:01Z` `1.0 s`; D12 `21:00:00Z` `<1 s`; D13 `21:59:59.999Z` `59 min 59 s`.

Instants: I1 `2026-11-17T21:38:05.123Z` and I2 `2026-11-17T22:38:00+01:00` give `2026-11-17 21:38 UTC`; I3 `yesterday` and I4 `""` stay; I5 `2026-11-17` gives `2026-11-17 00:00 UTC`; I6 `+275760-09-13T00:00:00.000Z` stays.

Ages, `nowMs` `Date.parse("2026-11-18T12:00:00Z")`: A1 `2026-11-18T11:59:30Z` `just now`; A2 `11:55:00Z` `5 min ago`; A3 `09:00:00Z` `3 h ago`; A4 `2026-11-16T11:00:00Z` `2 d ago`; A5 `2026-11-18T12:00:01Z` `2026-11-18 12:00 UTC`; A6 `junk` `junk`; A7 `12:00:00Z` `just now`; A8 `11:59:00Z` `1 min ago`; A9 `11:00:00Z` `1 h ago`; A10 `2026-11-17T12:00:00Z` `1 d ago`.
