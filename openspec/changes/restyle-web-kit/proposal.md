## Why

The owner called the web app unusable. U15c gave M6b its Tailwind pipeline and tokens but changed no page. Every page is built from the kit (`web/src/kit/`), so restyling its own rules changes all of them at once: tables become cards, fields stop stretching to full width, the main action is accent blue and a destructive one red, dialogs and states become calm panels. `PageHeader`, `Section` and a hidden-caption option give later units one pattern for a page heading, a titled block and a table whose caption repeats the heading. The kit's API, roles, names and texts stay as the frozen tests pin them.

Observable result, with no page edited: the "Flow name" field is at most 640 px wide at 1366; "Create flow" is `rgb(29, 78, 216)` with white text; hints and errors sit below the control; a table is an 8 px card with a `#f4f5f7` header row and an `rgb(239, 244, 255)` hover row; the "Disable user" confirm opens centred, 512 px wide, its confirm button in the tone of its `data-tone` (accent, or danger when destructive); the toast background is still exactly `rgb(27, 31, 39)` (design.md Verification).

Batch `m6b-ui` (U15c, U18b, U15d, U07b, U21b, U07c, U28b, U37b, U37c, U52c in plan order; closing unit `add-visual-review`, journey `e2e/test_m6b_ui.py`) delivers M6b: the web app is restyled on Tailwind CSS v4 and Radix primitives with a grouped sidebar, a home page of recent work, a flow workspace, run inputs built from the flow's input schema, a readable run view and people's names instead of ids, with zero CSP violations. This unit's part: the kit's own restyle with its API kept, the `captionDisplay` option, and `PageHeader`, `Section` and the page-width table. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- Edited, each in a named task: `web/src/kit/theme.css` and `web/src/kit/data/data.css` (token-only rules), `data/data-table.ts` (new `captionClass`), `data/DataTable.tsx` (the prop, the caption class), `data/Field.tsx` (the control now comes before hint and error), `data/Form.tsx` and `ConfirmDialog.tsx` (one `data-tone` attribute each).
- New: `web/src/kit/layout/{layout.ts,PageHeader.tsx,Section.tsx}`, seven Node test files, `e2e/test_m6b_kit.py`.
- Not edited, although the card lists them: `EmptyState.tsx`, `ErrorPanel.tsx`, `LoadingState.tsx`, `ToastRegion.tsx`; their look is `theme.css` only and their markup is pinned [D20] (design decision 8).
- Capabilities `web-kit` and `web-data-kit`: ADDED requirements only; no MODIFIED one, since kit colours, borders and type stay in `.ui-*` rules [D10] and `web-kit` "The tokens and theme are CSS files that meet WCAG AA contrast" still holds.
- No token, role, accessible name, text, API route, error code, migration, e2e part, policy action, feature file or CSP change.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Stubs: `captionClass` returns `""`, `sectionHeadingId` returns `""`, `captionDisplayFor` returns `"visible"`, `PAGE_WIDTHS` holds empty strings cast to its type, `PageHeader` and `Section` return `null`, so a red test fails by assertion. Not scaffolded: the member `captionDisplay` of the existing `DataTableProps`, the edits of `theme.css`, `data.css`, `DataTable.tsx` (beyond that member), `Field.tsx`, `Form.tsx` and `ConfirmDialog.tsx`, the tests and `e2e/test_m6b_kit.py`.
- **Depends on:** `add-web-ui-kit` (U15: kit files, `theme.css`, `KEYBOARD`) and `add-web-data-kit` (U15b: `data.css`, `DataTable`, `Field`, `Form`), both merged; in plan, `add-ui-foundation` (U15c: `cn`, the new tokens, `app.css` with the kit in `@layer components`, the rule tests).
- Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3daa5c35, checked line by line).

**Interfaces given** (as in design.md § Interfaces)

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

**Interfaces taken:**

- From `add-ui-foundation`: `cn` (`web/src/ui/cn.ts`, merges the caller's classes in the section component) and the tokens `--ui-color-divider`, `--ui-color-accent-surface`, `--ui-radius-lg`, `--ui-shadow-sm`, `--ui-font-mono`, restated with values in design.md.
- From merged code (shapes in `delivered-shapes.md`): `DataTableSpec`, `DataColumn`, `CursorList`, `ConfirmDialogProps`, `FormSpec`, `FieldSpec`, `findRawColours`, `findInlineStyleUse`, `parseTokens`.

## Out of scope

Page markup (U07b, U21b and later units place `PageHeader`, `Section` and `captionDisplay`), the sidebar and banner, new tokens (U15c), dark mode, any use of `ui/button.tsx` inside the kit (design decision 1), any CSP change. Spec: `specs/web-kit/spec.md`, `specs/web-data-kit/spec.md`; fixtures: `test-plan.md`, `test-plan-browser.md`; decisions: `design.md`. Each Node test begins with `assert.equal(typeof <function>, "function")` for the names it imports from the file its Interfaces header names (never an `index.ts`), wraps a call that reaches a stub in `assert.doesNotThrow`, uses `node:assert/strict` and has no `.`, `[` or `::` in its name.
