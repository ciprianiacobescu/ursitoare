# Fixtures for the Node tests

Every value was run in a scratch copy of main@3daa5c35 with U15c's design and this design applied (Node 24.22.2). Each test begins with `assert.equal(typeof <function>, "function")` for the names it imports and checks `existsSync` before `readFileSync`.

**CSS reading** (both CSS tests): the splitter of `data-css.test.ts` and `toast-hover.test.ts`: strip `/* … */`, match `([^{}]+)\{([^{}]*)\}`, collapse whitespace in the selector, split the body on `;` and the first `:`. A selector "is one rule" when exactly one rule has that string. "n decl" means the rule has exactly n declarations.

## T1 theme.css (`web/src/kit/theme-restyle.test.ts`)

| row | selector | declarations |
|---|---|---|
| R1 | `.ui-button` | `font-weight: 500`, `background: var(--ui-color-surface)`, `color: var(--ui-color-text)` |
| R2 | `.ui-button:disabled, .ui-button[aria-disabled="true"]` | `color: var(--ui-color-text-muted)`, `cursor: not-allowed` |
| R3 | `.ui-button[data-tone="primary"]` | `border-color` and `background: var(--ui-color-accent)`, `color: var(--ui-color-on-accent)` |
| R4 | `.ui-button[data-tone="primary"]:hover` | `background: var(--ui-color-accent)`, `filter: brightness(0.9)` |
| R5 | `.ui-button[data-tone="danger"]` | `border-color` and `background: var(--ui-color-danger)`, `color: var(--ui-color-on-danger)` |
| R6 | `.ui-button[data-tone="danger"]:hover` | `background: var(--ui-color-danger)`, `filter: brightness(0.9)` |
| R7 | `.ui-button[data-tone][aria-disabled="true"]` | `filter: none`, `opacity: 0.6` |
| R8 | `.ui-toast` | `background: var(--ui-color-toast-bg)`, `color: var(--ui-color-toast-text)`, `border-radius: var(--ui-radius-lg)` |
| R9 | `.ui-toast button` | `background: transparent`, `box-shadow: none`, `color: var(--ui-color-toast-text)`, `font-weight: inherit` |
| R10 | `.ui-toast button:hover, .ui-toast .ui-button:hover` | 2 decl: `background: transparent`, `color: var(--ui-color-toast-text)` |
| R11 | `.ui-toast button:focus-visible, .ui-toast .ui-button:focus-visible` | 1 decl: `outline-color: var(--ui-color-toast-text)` |
| R12 | `.ui-dialog` | `width: 32rem`, `max-width: calc(100vw - 2rem)`, `border: 1px solid var(--ui-color-divider)`, `border-radius: var(--ui-radius-lg)` |
| R13 | `.ui-dialog::backdrop` | `background: var(--ui-color-text)`, `opacity: 0.5` |
| R14 | `.ui-error` | `border: 1px solid var(--ui-color-danger)`, `background: var(--ui-color-danger-surface)`, `color: var(--ui-color-danger-text)` |
| R15 | `.ui-error .ui-button` | `min-height: 2rem` |
| R16 | `.ui-empty` | `border: 1px dashed var(--ui-color-divider)`, `border-radius: var(--ui-radius-lg)` |
| R17 | `.ui-loading` | `background: var(--ui-color-surface)`, `color: var(--ui-color-text-muted)` |
| R18 | `.ui-page-header` | `display: grid` |
| R18b | `.ui-page-header-title` | `overflow-wrap: anywhere` |
| R18c | `.ui-page-header-description` | `overflow-wrap: anywhere` |
| R19 | `.ui-section` | `display: grid`, `border: 1px solid var(--ui-color-divider)`, `border-radius: var(--ui-radius-lg)` |
| R20 | `.ui-visually-hidden` | `position: absolute`, `clip: rect(0, 0, 0, 0)` |

Also: R3's rule comes after R2's; `findRawColours(theme)` is `[]` and no `var(--ui-…)` is missing from `parseTokens(tokens.css)` (both probed); the needles of C-92d9ac35 are present; `tokens.css` has 25 `--ui-color-*` values and `--ui-color-toast-bg: #1b1f27`. The test also feeds the row checker three altered texts (R8 with `background: red`, R10 with `background: var(--ui-color-bg)`, R3 deleted) and expects each to fail by assertion; these checks sit in the one test function of the real rows (alone they pass at red, which L4 refuses).

## T1b data.css (`web/src/kit/data/data-restyle.test.ts`)

Exactly one rule for each of 22 selectors: the 16 of `data-css.test.ts` plus `.ui-table thead th`, `.ui-table tbody th, .ui-table tbody td`, `.ui-input[aria-invalid="true"]`, `.ui-table-caption`, `.ui-table tbody tr:hover`, `.ui-table tbody tr:last-child > *` (probed: all count 1).

| row | selector | declarations |
|---|---|---|
| D1 | `.ui-table-wrap` | `overflow-x: auto`, `border: 1px solid var(--ui-color-divider)`, `border-radius: var(--ui-radius-lg)`, `box-shadow: var(--ui-shadow-sm)`; 5 decl with `background: var(--ui-color-bg)` |
| D2 | `.ui-table-caption` | `text-align: left`, `font-weight: 600` |
| D3 | `.ui-table thead th` | `color: var(--ui-color-text)`, `background: var(--ui-color-surface)`, `font-weight: 600`, `border-bottom: 1px solid var(--ui-color-divider)` |
| D4 | `.ui-table tbody th, .ui-table tbody td` | `border-bottom: 1px solid var(--ui-color-divider)`, `vertical-align: top` |
| D5 | `.ui-table tbody tr:hover` | `background: var(--ui-color-accent-surface)` |
| D6 | `.ui-field` | `max-width: 40rem` |
| D7 | `.ui-field-inline` | `max-width: 40rem`, `flex-wrap: wrap` |
| D8 | `.ui-field-hint` | `color: var(--ui-color-text-muted)`, `font-size: 0.875rem` |
| D9 | `.ui-field-error` | `color: var(--ui-color-danger)`, `font-size: 0.875rem` |
| D10 | `.ui-input` | `border: var(--ui-color-border)`, `width: 100%`, `min-height: var(--ui-target-min)`, `box-shadow: var(--ui-shadow-sm)` |
| D11 | `.ui-form-actions` | `justify-content: flex-start` |
| D12 | `.ui-form-error`, `.ui-form-problems` | `max-width: 40rem` each |
| D13 | `.ui-checkbox` | `width: 1.5rem`, `height: 1.5rem` |
| D14 | `.ui-input[aria-invalid="true"]` | `border: var(--ui-color-danger)` |
| D15 | `.ui-table-region` | `max-width: 100%` |
| D16 | `.ui-table tbody tr:last-child > *` | `border-bottom: 0` |

Also: `findRawColours(data)` `[]`, no undefined token, the text `@media` absent.

## T2 Kit sources (`kit-markup.test.ts`, `layout-sources.test.ts`)

Eleven files: `ConfirmDialog`, `EmptyState`, `ErrorPanel`, `LoadingState`, `ToastRegion` (in `kit/`), `DataTable`, `Field`, `Form`, `SchemaForm` (in `kit/data/`), `PageHeader`, `Section` (in `kit/layout/`).

| file | must contain | counts and order |
|---|---|---|
| `ConfirmDialog.tsx` | `<dialog`, `<form method="dialog">`, `className="ui-dialog"`, `showModal()`, `data-tone={props.destructive === true ? "danger" : "primary"}` | `data-tone` 1; `value="cancel"` before `value="confirm"` |
| `Form.tsx` | `aria-disabled={model.submit === "busy"}`, `noValidate`, `className="ui-form-actions"` | `data-tone="primary"` 1, `data-tone` 1, `role="alert"` 1 |
| `ErrorPanel.tsx` | `role="alert"`, `<h2>{model.title}</h2>`, `Error code: <code>{model.code}</code>`, `Decision id: <code>{model.decisionId}</code>`, `Copy decision id` | `data-tone` 0 |
| `LoadingState.tsx` | `role="status" aria-busy="true"`, `ui-spinner` | `data-tone` 0 |
| `EmptyState.tsx` | `className="ui-empty"`, `createElement(model.headingTag` | `data-tone` 0 |
| `ToastRegion.tsx` | `className="ui-toasts" aria-live="polite" aria-atomic="false"`, `className="ui-toast"`, `Dismiss` | `data-tone` 0 |
| the other five | nothing beyond T3 to T5 | `data-tone` 0 |

For all eleven: `findInlineStyleUse`, `findCssImports`, `findBannedImports` and `findPaletteUtilities` (U15c's `ui/rules.ts`) give `[]`, and the text has neither `buttonClasses` nor `ui/button` (probed: no hit).

`layout-sources.test.ts`: `PageHeader.tsx` and `Section.tsx` contain none of `role=`, `aria-live`, `<header`, `<nav`, `<a `, `.css`; `PageHeader.tsx` contains `<h1 className="ui-page-header-title" tabIndex={-1} ref={props.headingRef}>`; `Section.tsx` contains `aria-labelledby={headingId}`, `useId()`, `cn("ui-section", props.className)` and `import { cn } from "../../ui/cn.ts";`. The `.tsx` files of `kit/` are `ConfirmDialog.tsx`, `EmptyState.tsx`, `ErrorPanel.tsx`, `LoadingState.tsx`, `ToastRegion.tsx`; the non-test files of `kit/layout/` are `PageHeader.tsx`, `Section.tsx`, `layout.ts`.

## T3 Layout helpers (`web/src/kit/layout/layout.test.ts`)

`sectionHeadingId`: V1 `("flow", "Test run")` `flow-test-run`; V2 `("flow", "  Hello, World!  ")` `flow-hello-world`; V3 `("runs", "Step 2 / Input")` `runs-step-2-input`; V4 `("a", "Résumé")` `a-r-sum`; V5 `("a", "!!!")` `a-`; V6 `("a", "")` `a-`; V7 `("x", "---Already-Slugged---")` `x-already-slugged`; V8 `("p", "AAA  b")` `p-aaa-b`. `captionDisplayFor`: W1 `("Flows", "Flows")` `hidden`; W2 `(" Flows ", "Flows")` `hidden`; W3 `("Flows", "flows")` `visible`; W4 `("Versions", "Flows")` `visible`; W5 `("", "")` `hidden`. `PAGE_WIDTHS` deep-equals `{ form: "max-w-3xl", list: "max-w-6xl", wide: "max-w-none" }`.

## T4 Captions (`web/src/kit/data/caption-class.test.ts`)

`captionClass(undefined)` and `captionClass("visible")` give `ui-table-caption`; `captionClass("hidden")` gives `ui-table-caption ui-visually-hidden`. `DataTable.tsx` contains `import { captionClass, dataTableModel, focusAfterChange, tableView } from "./data-table.ts";`, `captionDisplay?: "visible" | "hidden";` and `<caption className={captionClass(props.captionDisplay)}>{model.caption}</caption>`, and `aria-label={model.caption}` occurs 2 times. The stub returns `""`, so each row fails by assertion.

## T5 Field and Form (`web/src/kit/data/field-order.test.ts`)

Stacked: from the last `<div className="ui-field">`, `indexOf("{label}")` < `indexOf("{props.children(control)}")` < `indexOf("{described}")`. Inline: from `<div className="ui-field-inline">` to that block, `{props.children(control)}` < `{label}` < `{described}`. The regex `/className="ui-field-error">\s*<span className="ui-visually-hidden">Error: <\/span>/` matches. `Form.tsx` holds `data-tone="primary"` once. All probed true. Frozen `field.test.ts` (model only) stays green.
