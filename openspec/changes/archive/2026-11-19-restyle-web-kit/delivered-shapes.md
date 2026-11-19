Declarations this change takes or edits (`export` omitted), copied from main@3daa5c35 and checked line by line. U15c deletes the `import "./data.css";` line of the four `data/*.tsx` files, so their later lines are one lower when this unit starts.

```ts
// web/src/kit/data/data-table.ts:5-16
interface DataColumn { key: string; header: string; rowHeader?: boolean }
interface DataTableSpec { caption: string; columns: readonly DataColumn[]; emptyTitle?: string; emptyDescription?: string }
// web/src/kit/data/DataTable.tsx:13-17 (:61 caption line; :59 and :128 aria-label={model.caption})
interface DataTableProps<T> extends DataTableSpec { columns: readonly (DataColumn & { cell: (row: T) => ReactNode })[]; list: CursorList<T>; rowKey: (row: T) => string }
function DataTable<T>(props: DataTableProps<T>): ReactNode   // :61 <caption>{model.caption}</caption>
// web/src/kit/data/cursor-list.ts:38
interface CursorList<T> { /* unchanged */ }
// web/src/kit/data/Field.tsx:8-19, :55-59
interface FieldProps extends FieldSpec { idPrefix: string; children: (control: { id: string; name: string; "aria-describedby"?: string; "aria-invalid"?: true; "aria-required"?: true }) => ReactNode }
function Field(props: FieldProps): ReactNode   // stacked today: {label} {described} {props.children(control)}; inline: children, label, described
// web/src/kit/data/field.ts:3-10
interface FieldSpec { name: string; label: string; hint?: string | null; error?: string | null; required?: boolean; layout?: "stacked" | "inline" }
// web/src/kit/data/Form.tsx:9-14, :49
interface FormProps extends FormSpec { onSubmit: () => void; children?: ReactNode }
function Form(props: FormProps): ReactNode   // :49 <button type="submit" className="ui-button" aria-disabled={model.submit === "busy"}>
// web/src/kit/data/form.ts:6-12
interface FormSpec { label: string; submitLabel: string; fields: readonly string[]; errors: FormErrors; busy?: boolean }
// web/src/kit/confirm.ts:3-11
interface ConfirmDialogProps { open: boolean; title: string; description?: string; action: string; destructive?: boolean; onConfirm: () => void; onCancel: () => void }
// web/src/kit/ConfirmDialog.tsx:5, :60-62, :73
function ConfirmDialog(props: ConfirmDialogProps): ReactNode   // :73 <button ref={confirmRef} type="submit" value="confirm" className="ui-button">
// not edited: EmptyState.tsx:5, ErrorPanel.tsx:6 (:19 section.ui-error role="alert"), LoadingState.tsx:8 (role="status" aria-busy="true"), ToastRegion.tsx:35-37
// web/src/kit/contrast.ts:18-21, :97, :146, :166
interface SourceHit { line: number; text: string }
function parseTokens(css: string): StringMap
function findRawColours(css: string): SourceHit[]      // a 3-8 digit hex, a colour function or a colour word outside a custom-property line
function findInlineStyleUse(source: string): SourceHit[]   // `style=`, `<style` or setAttribute("style" on a line, comments included
```

CSS as on main: `theme.css` has `.ui-button` at :10 and :16, `:disabled` at :29, `.ui-toast` at :131, the hover pair at :151-152 and the focus pair at :157-158; `data/data.css` has the 16 selectors of `data-css.test.ts`, the row rule at :24-25. The frozen splitter (`([^{}]+)\{([^{}]*)\}`) counts a rule inside `@media` and cannot read a nested one.
