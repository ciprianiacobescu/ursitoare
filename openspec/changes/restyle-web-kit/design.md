## Context

After U15c the kit's CSS sits in `@layer components` and utilities in `@layer utilities` beat it. Every page uses the kit, so restyling its CSS changes every page at once, while the e2e journeys and 19 source-reading tests pin its roles, names, texts and rule shapes. Rulings D9, D10, D20.

Tokens used (U15c's spec "The new tokens" has the values; restated because a dependent's judge sees that file cut): `--ui-color-divider` `#d0d5dd` (decorative lines only), `--ui-color-accent-surface` `#eff4ff`, `--ui-radius-lg` `0.5rem`, `--ui-shadow-sm` `0 1px 2px #1b1f2714`, `--ui-font-mono`. From main: `--ui-color-surface` `#f4f5f7`, `-text-muted` `#4b5262`, `-border` `#7b8494`, `-accent` `#1d4ed8`, `-on-accent` `#ffffff`, `-danger` `#b42318`, `-on-danger` `#ffffff`, `-toast-bg` `#1b1f27`, `--ui-focus-width` `3px`, `--ui-target-min` `2.5rem`. This unit adds no token.

## Decisions

1. **The look stays in kit CSS; kit `.tsx` takes no colour utility and does not use `buttonClasses`.** The card lists `buttonClasses` as taken and also says colours stay in `.ui-*` rules [D10]; both cannot hold. A colour utility on a kit button beats `.ui-toast button` (utilities win by layer), so the toast Dismiss button, pinned transparent on a `rgb(27, 31, 39)` toast, would turn light. Kit `.tsx` carries `data-tone` and the CSS paints it. `Section` takes only `cn`, so a caller's utility can override `.ui-section`. Seam deviation: `buttonClasses` is not taken.
2. **Button tones.** `.ui-button` stays quiet (surface, border, text) and gains `font-weight: 500`. Primary is `--ui-color-accent` with `--ui-color-on-accent` (6.70); danger is `--ui-color-danger` with `--ui-color-on-danger` (6.57). Hover keeps the background and adds `filter: brightness(0.9)` (no token for a darker tone; the label becomes `#e6e6e6`, 6.23 and 6.11 by arithmetic). `aria-disabled="true"` gets the muted label and `cursor: not-allowed`; a toned disabled button gets `opacity: 0.6` and no filter. The tone rules come after the disabled rule: equal specificity, so order decides. Primary: the `Form` submit and the `ConfirmDialog` confirm; danger: that confirm when `destructive` is true (`TeamsPage.tsx:207`, `MappingsPage.tsx:309`).
3. **`data-tone` is an attribute, not a markup change.** D20 freezes roles, names, texts, order and counts; one attribute on two buttons changes none. `ConfirmDialog.tsx` computes it inline from `destructive`, which `confirmDialogModel` already reads; a source test and the browser test pin it.
4. **Tables are cards.** `.ui-table-wrap` (the pinned `region`, `overflow-x: auto`) gets a divider border, `--ui-radius-lg`, the page background and `--ui-shadow-sm`. `.ui-table thead th` keeps its pinned text colour on `--ui-color-surface`, weight 600, divider lines; row lines use the divider colour; the last row has none; `.ui-table tbody tr:hover` is `--ui-color-accent-surface` (text 14.98, muted 7.10, danger 5.97, accent links 6.08). `.ui-table-caption` shows the caption inside the card.
5. **Captions.** `captionClass` is the only logic. `DataTable` writes it on `<caption>`; the group and region keep `aria-label={model.caption}`, so a hidden caption is still the table's name (probed: "Flows" hidden, found by name, axe clean). `captionDisplayFor` is case-sensitive on trimmed text (D9). No page uses either yet; U21b, U28b and U37c do.
6. **Fields and forms.** `.ui-field` and `.ui-field-inline` get `max-width: 40rem` inside their existing rules; `.ui-input` keeps every pinned declaration (the odd `border: var(--ui-color-border)` shorthand is the frozen value) and adds a shadow. **The stacked `Field` now renders label, control, hint, error** (it rendered label, hint, error, control) because the card puts hint and error below. Only the DOM order changes: `aria-describedby` is order-independent, no `e2e/` locator uses `.ui-field-*`, `Form` finds controls by `[name=...]`, and the "Error: " span stays first in the error paragraph. The inline layout keeps its order and wraps. `.ui-form-actions` aligns left so the button sits under the 40 rem fields; form-error panels are bounded to 40 rem.
7. **States, dialog, toast.** `.ui-empty`, `.ui-loading` and `.ui-error` become calm panels (divider border, `--ui-radius-lg`; the error keeps its 3 px left bar, code in `--ui-font-mono`, and a compact "Copy decision id" button, `min-height: 2rem`). `.ui-dialog` is `width: 32rem; max-width: calc(100vw - 2rem)`, divider border, radius and shadow; U15c's `dialog { margin: auto }` centres it; the backdrop stays `--ui-color-text` at 0.5. The toast keeps its token background, takes the radius and shadow, and `.ui-toast button` resets `box-shadow` and `font-weight` so nothing added to `.ui-button` leaks into it; its hover and focus rules are byte-identical.
8. **Four of the card's edit targets need no edit.** `EmptyState.tsx`, `ErrorPanel.tsx`, `LoadingState.tsx` and `ToastRegion.tsx` change through `theme.css` alone; their markup is pinned. A source test guards their roles and texts and the absence of `data-tone` and colour utilities.
9. **`PageHeader` and `Section`.** `PageHeader` renders `<div className="ui-page-header">`, the `h1` (`tabIndex={-1}`, `headingRef`), then a `<p>` for the description and a `<div>` each for `meta` and `actions`, only when given, as a CSS grid (title and description left, actions right, meta below); the title and the description wrap anywhere (`overflow-wrap: anywhere`), so an unbroken name or id never widens the page (U07b's 60-character-name test renders U07c's greeting at 900 px). It adds no landmark, role, link, `status` or `alert`; the `h1` text is exactly `title`. `Section` renders `<section aria-labelledby={headingId} className={cn("ui-section", className)}>` (with `id` when given), the heading (`h2`, or `h3`), an `actions` wrapper and the children, as a two-column grid. `headingId` is `useId()`: two sections may share a title. **A `Section` is a `region` named `title`:** a page must not give it a title equal to a pinned page-wide heading or region name on that page (the `h1`, "Users", "Runs", "Timeline", "Input", "Output", "Hooks", "Step details", "Diagnostics", "Graph", "Test run", "Dry run", `Flow <id>`, `Graph of <id>`, `Run <id>`).
10. **`PAGE_WIDTHS`** holds three class strings as literals in a `.ts` file Tailwind scans (probed: `max-w-6xl{max-width:var(--container-6xl)}` and `--container-6xl:72rem` are emitted; a utility beats `.flow-page`'s and `.admin-page`'s `max-width: 64rem` in `components`).
11. **No responsive rule on a pinned selector.** `data-css.test.ts` needs exactly one rule per pinned selector, and a rule in `@media` counts. Narrowing relies on the table card's scroll and the dialog's `calc(100vw - 2rem)`.
12. **Tests.** Node tests use the frozen splitter, so rules stay flat and selectors compare with whitespace collapsed. A Node test cannot import a `.tsx`, so components are checked by source; the browser tests mock `/me` (exactly `capabilities, csrfToken, tenant, user`) and never sign in.

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists what is not scaffolded. Seam deviations from the card: decision 1 and decision 8.

```ts
// web/src/kit/data/DataTable.tsx — one optional prop added; DataTableSpec and every model function unchanged
export interface DataTableProps<T> extends DataTableSpec {
  columns: readonly (DataColumn & { cell: (row: T) => ReactNode })[];
  list: CursorList<T>;
  rowKey: (row: T) => string;
  captionDisplay?: "visible" | "hidden";  // default "visible"; "hidden" keeps the caption as the table's name (and the region labels) but visually hidden
}
// web/src/kit/data/data-table.ts (new export)
export function captionClass(display: "visible" | "hidden" | undefined): string;
  // "ui-table-caption" for visible or undefined, "ui-table-caption ui-visually-hidden" for hidden
// web/src/kit/layout/layout.ts
export function sectionHeadingId(prefix: string, title: string): string;  // `${prefix}-` + title lower-cased, non [a-z0-9] runs as "-", trimmed of "-"
export function captionDisplayFor(caption: string, heading: string): "visible" | "hidden"; // "hidden" iff caption === heading (both trimmed)
export const PAGE_WIDTHS: Readonly<{ form: "max-w-3xl"; list: "max-w-6xl"; wide: "max-w-none" }>;
// web/src/kit/layout/PageHeader.tsx
export interface PageHeaderProps { title: string; description?: string; meta?: ReactNode; actions?: ReactNode; headingRef?: Ref<HTMLHeadingElement> }
export function PageHeader(props: PageHeaderProps): ReactNode;
  // <div className="ui-page-header"> with <h1 tabIndex={-1} ref={headingRef}>{title}</h1>, then description <p>, meta, actions;
  // no landmark element, no role, no link, no status or alert of its own; the h1 text is exactly `title`
// web/src/kit/layout/Section.tsx
export interface SectionProps { title: string; headingLevel?: 2 | 3; actions?: ReactNode; className?: string; id?: string; children?: ReactNode }
export function Section(props: SectionProps): ReactNode;
  // <section aria-labelledby={headingId} className="ui-section …" id={id}> <h2|h3 id={headingId}>{title}</h2|h3> actions children
  // a `region` named exactly `title`; headingId from useId (never sectionHeadingId when two sections share a title)
```

## Failure cases

`captionDisplayFor("", "")` is `"hidden"` (`dataTableModel` rejects an empty caption first). `sectionHeadingId` of a title with no `[a-z0-9]` is `${prefix}-`. `Section` without `className` has the class `ui-section` alone. `DataTable` without `captionDisplay` renders as before apart from the caption class.

## Security

No endpoint, policy action, secret, package or CSP change; no inline style or `<style>`. The dialog stays the native `<dialog>`: zero CSP messages in every probed page and state.

## Frozen pins checked

| Pin | How it holds |
|---|---|
| Toast: `.ui-toasts > .ui-toast > p + button.ui-button` "Dismiss", background exactly `rgb(27, 31, 39)`, outline contrast at least 3, hover label at least 4.5 (tf, th, l4461674d2) | `ToastRegion.tsx` unchanged; the four toast rules keep their values; `.ui-toast button` only adds a reset |
| `ConfirmDialog` native `dialog > form[method=dialog] > h2, p, cancel, confirm`; page-wide `dialog`; one heading (m2:114-116, :152; tp:276-383, :290) | one attribute added; order kept |
| `ErrorPanel` `section[role=alert]` with its texts and "Copy decision id"; 2 alerts on grants, 0 on the run page | file unchanged |
| `LoadingState` `role="status"`; one `status` on Policies while loading (tp:607) | file unchanged |
| `Field` error with the hidden "Error: " (tp:488; binding rule 3) | the span stays first (probed `textContent` `Error: Enter a flow name.`) |
| `.ui-input` literals, `.ui-checkbox` 1.5 rem, `overflow-x: auto`, thead text on surface, hint, error and form-error colours; one rule per pinned selector (C-74fd23b0) | edits sit inside existing rules; new rules use new selectors; no `@media` |
| `theme.css` needles, no raw colour (C-92d9ac35); toast focus and hover (C-461674d2, C-817bfc8a) | token-only; `findRawColours` `[]` on both files (probed) |
| `KEYBOARD` keys equal the direct-child `kit/*.tsx` (C-d9604877); `DATA_KEYBOARD` is four entries | new files are in `kit/layout/` |
| No inline style in any `.tsx` (C-d365d748) | none added; no attribute name ending `style` |
| Tables found by name (m2:32, :49, :81, :105, :141-142; m3:152; m4:151; tp:261-262) | the caption stays in the DOM; hidden uses `.ui-visually-hidden` |
| `aria-disabled`, never `disabled` (m0:165; tp:244-629) | `Form` keeps `aria-disabled={model.submit === "busy"}`; CSS styles `[aria-disabled="true"]` |
| Focus outline at least 2 px (m1:22-27) | `:focus-visible` untouched (probed on the toned "Create flow") |
| Singletons (lesson ab); `h1` focus after a dialog (m2:118, :128) | `PageHeader` and `Section` add no `status`, `alert`, `dialog`; `h1` text is `title` |
| U15c's rules: no CSS import, no palette utility | new `.tsx` import no stylesheet and hold no colour utility |

## Verification

**Ran** (Node 24.22.2; scratch copy of main@3daa5c35 with U15c's design applied, the nine packages installed, built with Vite and served by the engine with its CSP on ports 39180 and 39181; Playwright 1.63.0 at 1366 by 860):
- the full e2e suite: 70 passed with this design and a scratch `FlowsPage` using `PageHeader`, `Section`, the hidden caption "Flows" and `PAGE_WIDTHS` (the table was found by name, axe clean); 72 with a scratch `UsersPage` too and two browser tests; 73 with both pages restored and the three tests of `test-plan-browser.md`;
- `tsc` clean; 401 web Node tests and `test/arch/web-routes.test.ts` passed; every fixture of `test-plan.md` against prototypes;
- screenshots of the Users table, the Flows create form with and without errors, the approval and Disable dialogs, an error state with a toast, the loading and empty states: zero CSP messages, and axe stays clean with the toned "Create flow" set to `aria-disabled="true"` (opacity 0.6); at 390 px the page does not scroll sideways, the table scrolls inside its card (scroll width 627, client width 340) and the dialog is 358 wide at x 16.

**UNVERIFIED:** Firefox and Safari (`:is()`, `filter`, an absolute caption); the hover colour of a toned button (arithmetic only); a real page using `PageHeader`, `Section` or `captionDisplay` (scratch edits, reverted); a `Section` beside a region of the same name; dark mode and forced colours.

## Decisions made while writing

Beyond the card: 1 (no `buttonClasses`), 3 (the confirm tone from `destructive`), 6 (the `Field` order, left-aligned actions), 8 (four files untouched), 9 (wrapper `div`s, the grid, the region rule), 2 (hover by `filter`).
