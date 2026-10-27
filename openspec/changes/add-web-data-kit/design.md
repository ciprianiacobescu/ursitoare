## Context

Shapes used from the dependencies, as their changes define them:

```ts
// add-web-shell: web/src/api/client.ts
class ApiRequestError extends Error { readonly status: number; readonly code: string; readonly details: unknown; readonly requestId: string | null;
  constructor(status: number, code: string, message: string, opts?: { details?: unknown; requestId?: string | null; cause?: unknown }) }
type QueryValue = string | number | boolean | undefined;  interface RequestOptions { query?: Readonly<Record<string, QueryValue>>; headers?: Readonly<Record<string, string>>; signal?: AbortSignal; body?: unknown }
interface ApiClient { get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> /* and request, post, put, patch, delete */ }
// add-web-ui-kit: web/src/kit
class KitError extends Error { readonly code: KitErrorCode; constructor(code: KitErrorCode, message: string) }   // used here: "KIT_PROP_INVALID"
messageFor(code: string): string; FALLBACK_MESSAGE: string   // VALIDATION_FAILED reads "Some of the information is not valid. Check it and try again."
interface EmptyStateProps { title: string; description?: string; headingLevel?: 1 | 2 | 3 | 4 }   // EmptyState(props: EmptyStateProps & { children?: ReactNode }), LoadingState(props: { label?: string }), ErrorPanel(props: { error: unknown })
interface KeyBinding { keys: string; effect: string }  parseTokens(css: string): StringMap  findRawColours(css: string): SourceHit[]  findInlineStyleUse(source: string): SourceHit[]   // StringMap = Readonly<Record<string, string>>
// theme.css classes .ui-button, .ui-visually-hidden; tokens.css --ui-color-* (bg surface text text-muted border danger danger-text danger-surface), --ui-space-1..4, --ui-radius, --ui-target-min, --ui-font-size
// add-api-conventions (wire contract, no import): list endpoints take query limit (integer 1 to 200, default 50) and cursor (opaque, at most 1,024 characters) and answer { items: T[], next_cursor: string | null };
//   400 CURSOR_INVALID for a bad cursor; 400 VALIDATION_FAILED with details: { fields: [{ field, message }] }, field = validation context + instance path ("body/title", "body/tags/0", "querystring/limit", "body" for malformed JSON)
```

`src/api/pagination.ts` pulls `node:crypto`, so the browser cannot import `Page<T>`; this change declares `CursorPage<T>`. Architecture §7: `human.form` nodes take a JSON Schema; `SchemaForm` is what `add-web-task-inbox` renders them with.

## Decisions

1. **Place.** Every file is new, in `web/src/kit/data/` (Decisions made while writing 1). `.ts` files hold the logic and import no `.tsx`, `.css` or React; `.tsx` files are thin, use `import type` (`verbatimModuleSyntax`) and relative `.ts` imports. No barrel file. The per-function rules (limits, patterns, message texts, markup) are stated in the task that implements the function and bind like this section.
2. **Cursor list.** `getState()` returns one object until a change. `load()` works from `idle`, `loadMore()` from `loaded` with a `nextCursor`, `retry()` from `error` (it repeats the failed request, but `CURSOR_INVALID` restarts at the first page); any other call is a no-op. A failed page keeps `items` and `nextCursor`. Each request has an `AbortController`, and a generation counter makes the answer of a request that `reset()` overtook change nothing. A page of the wrong shape is an `INVALID_RESPONSE` error, and `next_cursor` equal to the cursor just asked for is too.
3. **Wire contract on the web side.** `CursorPage<T>` and the query names `limit` and `cursor` are declared here, restated from `add-api-conventions`; `cursorPageFetcher` is the only place that knows them.
4. **Table.** The empty state shows only when there is no next page: an item filter can shorten a page, so clients follow `next_cursor`, not the item count. When Load more disappears (last page) or a page fails, `focusAfterChange` moves focus to the table region or the retry button, so keyboard focus is never lost.
5. **Envelope mapping.** `details.fields[].field` is `body/<name>`; only a name in the form's field list becomes a field message, everything else is one form-level message under the key `"$form"`. Server text is shown only for `VALIDATION_FAILED` field entries, cleaned and capped; any other code shows `messageFor(code)`.
6. **Schema subset.** `schemaToFields` never throws and never drops a property: what it cannot render becomes an `unsupported` field with a visible `Unsupported: <reason>` error, root faults become `problems`, and either blocks submission. The subset is exactly the card's; `title` is the label and `$schema`, `title`, `description` and a boolean `additionalProperties` are accepted at the root.
7. **Validation.** A blank value is absent. The client check mirrors the subset and the server stays authoritative: a rejection comes back through `mapEnvelopeErrors`.
8. **CSS.** `data.css`, imported by the components, uses only kit tokens and colour pairs that `CONTRAST_PAIRS` covers; its 16 classes are `.ui-table-region .ui-table-wrap .ui-table .ui-table-actions .ui-form .ui-form-error .ui-form-problems .ui-form-actions .ui-field .ui-field-inline .ui-field-label .ui-field-required .ui-field-hint .ui-field-error .ui-input .ui-checkbox`.

## Interfaces

Paths below are under `web/src/kit/data/`.

- `cursor-list.ts`: `DEFAULT_PAGE_SIZE: number`; `CursorPage<T>`; `PageRequest`; `FetchPage<T>`; `CursorListStatus`; `CursorListState<T>`; `CursorListOptions`; `CursorList<T>`; `createCursorList<T>(fetchPage: FetchPage<T>, opts?: CursorListOptions): CursorList<T>`
- `page-fetcher.ts`: `parseCursorPage(body: unknown): CursorPage<unknown> | null`; `cursorPageFetcher<T>(client: Pick<ApiClient, "get">, path: string, opts: { parseItem: (raw: unknown) => T | null; query?: Readonly<Record<string, QueryValue>> }): FetchPage<T>`
- `data-table.ts`: `DataColumn`; `DataTableSpec`; `DataTableModel`; `TableView`; `TableFocus`; `dataTableModel(spec: DataTableSpec): DataTableModel`; `tableView(state: CursorListState<unknown>): TableView`; `focusAfterChange(prev: CursorListState<unknown>, next: CursorListState<unknown>): TableFocus`
- `form-errors.ts`: `FORM_ERROR_KEY: string`; `FormErrors`; `mapEnvelopeErrors(error: unknown, fields: readonly string[]): FormErrors`
- `field.ts`: `FieldSpec`; `FieldModel`; `isFieldName(name: unknown): name is string`; `fieldModel(spec: FieldSpec, idPrefix: string): FieldModel`
- `form.ts`: `FormSpec`; `FormModel`; `FocusTarget`; `formModel(spec: FormSpec): FormModel`; `focusTargetFor(fields: readonly string[], errors: FormErrors): FocusTarget`
- `schema-fields.ts`: `MAX_SCHEMA_PROPERTIES: number`; `SchemaField`; `SchemaFields`; `schemaToFields(schema: unknown): SchemaFields`
- `schema-values.ts`: `UNSUPPORTED_FORM_ERROR: string`; `RawValues`; `ValidatedValues`; `SubmitResult`; `initialValues(parsed: SchemaFields): RawValues`; `validateValues(parsed: SchemaFields, raw: RawValues): ValidatedValues`; `submitValues(parsed: SchemaFields, raw: RawValues, send: (value: Record<string, unknown>) => Promise<void>): Promise<SubmitResult>`
- `data-keyboard.ts`: `DATA_KEYBOARD: Readonly<Record<string, readonly KeyBinding[]>>`
- `DataTable.tsx`, `Field.tsx`, `Form.tsx`, `SchemaForm.tsx`: `DataTableProps<T>`; `FieldProps`; `FormProps`; `SchemaFormProps`; `DataTable<T>(props: DataTableProps<T>)`; `Field(props: FieldProps)`; `Form(props: FormProps)`; `SchemaForm(props: SchemaFormProps)`
- `data.css`: the classes of design.md Decision 8

Types (all exported; the four `*Props` types are exported by their `.tsx` file, the only files that import `ReactNode`, `import type { ReactNode } from "react"`):

```ts
interface CursorPage<T> { items: readonly T[]; next_cursor: string | null }  interface PageRequest { cursor: string | null; limit: number; signal: AbortSignal }
type FetchPage<T> = (request: PageRequest) => Promise<CursorPage<T>>  type CursorListStatus = "idle" | "loading" | "loaded" | "error"
interface CursorListState<T> { status: CursorListStatus; items: readonly T[]; nextCursor: string | null; error: unknown }  // error is null unless status is "error"
interface CursorListOptions { pageSize?: number }
interface CursorList<T> { getState(): CursorListState<T>; subscribe(listener: () => void): () => void; load(): Promise<void>; loadMore(): Promise<void>; retry(): Promise<void>; reset(): void }
interface DataColumn { key: string; header: string; rowHeader?: boolean }  interface DataTableSpec { caption: string; columns: readonly DataColumn[]; emptyTitle?: string; emptyDescription?: string }
interface DataTableModel { caption: string; columns: readonly { key: string; header: string; scope: "col"; cellTag: "th" | "td"; cellScope: "row" | null }[]; emptyTitle: string; emptyDescription: string | null; loadingLabel: string }
interface TableView { body: "none" | "loading" | "empty" | "rows"; rowCount: number; loadMore: "hidden" | "enabled" | "busy"; loadMoreLabel: string; retry: "hidden" | "again" | "restart"; retryLabel: string | null; showError: boolean; announcement: string }
type TableFocus = "table" | "retry" | "none"  interface DataTableProps<T> extends DataTableSpec { columns: readonly (DataColumn & { cell: (row: T) => ReactNode })[]; list: CursorList<T>; rowKey: (row: T) => string }
type FormErrors = Readonly<Record<string, string>>   // field name to message; FORM_ERROR_KEY ("$form") to the form-level message
interface FieldSpec { name: string; label: string; hint?: string | null; error?: string | null; required?: boolean; layout?: "stacked" | "inline" }
interface FieldModel { name: string; label: string; hint: string | null; error: string | null; required: boolean; layout: "stacked" | "inline"; controlId: string; hintId: string | null; errorId: string | null; describedBy: string | null; invalid: boolean }
interface FieldProps extends FieldSpec { idPrefix: string; children: (control: { id: string; name: string; "aria-describedby"?: string; "aria-invalid"?: true; "aria-required"?: true }) => ReactNode }
interface FormSpec { label: string; submitLabel: string; fields: readonly string[]; errors: FormErrors; busy?: boolean }  interface FormModel { label: string; submitLabel: string; submit: "enabled" | "busy"; formError: string | null; invalidFields: readonly string[] }
type FocusTarget = { kind: "field"; name: string } | { kind: "form" } | { kind: "none" }  interface FormProps extends FormSpec { onSubmit: () => void; children?: ReactNode }
interface SchemaFieldBase { name: string; label: string; hint: string | null; required: boolean }
type SchemaField = (SchemaFieldBase & { kind: "string"; minLength: number | null; maxLength: number | null; pattern: string | null }) | (SchemaFieldBase & { kind: "integer" | "number"; minimum: number | null; maximum: number | null })
  | (SchemaFieldBase & { kind: "boolean" }) | (SchemaFieldBase & { kind: "enum"; options: readonly string[] }) | (SchemaFieldBase & { kind: "string-list"; itemMinLength: number | null; itemMaxLength: number | null; itemPattern: string | null })
  | (SchemaFieldBase & { kind: "unsupported"; reason: string; error: string })
interface SchemaFields { fields: readonly SchemaField[]; problems: readonly string[] }  type RawValues = Readonly<Record<string, string | boolean>>
interface ValidatedValues { ok: boolean; value: Record<string, unknown>; errors: FormErrors }  type SubmitResult = { kind: "invalid"; errors: FormErrors } | { kind: "submitted" } | { kind: "rejected"; errors: FormErrors }
interface SchemaFormProps { schema: unknown; label: string; submitLabel: string; onSubmit: (value: Record<string, unknown>) => Promise<void> }
```

Stubs: constants hold a value of their type (`0`, `""`, `{}`); functions throw `new Error("not implemented")`.

## Failure cases

| Situation | Behaviour |
|---|---|
| A page fails, or has a bad shape or item | `error`; rows stay; `ErrorPanel` and "Try again" repeat that request |
| `CURSOR_INVALID` | "Start over" clears the rows, loads the first page |
| Answer after `reset()`; load more while loading or without cursor | dropped; no-op |
| Server error for an unknown field, other context, or another code | one form-level message from the catalogue, never the server's text |
| Unsupported keyword, type, name, pattern; root problem | visible text; submit blocked by `UNSUPPORTED_FORM_ERROR` |
| Double submit; `send` rejects | ignored while busy; `rejected`, values stay in the form |

## Security

1. **Authentication and PEP.** No endpoint is added. A consumer passes its own list endpoint (own `session` auth and PEP action); the kit only calls `ApiClient.get`. Hiding a control is cosmetic; the API decides.
2. **Tenant isolation.** No table or query, so no two-tenant database test. A list holds only what the API returned to the signed-in session, in memory, never in web storage; the server issues and checks cursors (tenant and list bound), the kit passes them back verbatim and restarts on `CURSOR_INVALID`; a page that ends a session calls `reset()`.
3. **Input validation.** `parseCursorPage` checks every page. `schemaToFields` treats the schema as untrusted (flow authors write it): caps of 100 properties, 100 options, 200-character patterns, 10,000-character inputs, `Object.hasOwn` access. The client check mirrors the subset; the server stays authoritative. Schema text, hints, options and server field messages are rendered as React text only: no `dangerouslySetInnerHTML`, `innerHTML` or `href` from data. The data is displayed, never sent to a prompt or the policy: no taint label.
4. **Secrets.** None. Typed values go only to the caller's `onSubmit`; they are not logged, stored, put in a URL, a toast or an error. `mapEnvelopeErrors` returns the server's constraint text, never a typed value.
5. **Abuse cases** (each a scenario): a field message with markup; a schema with a `__proto__` property, a bad pattern, 101 properties; a stale answer after `reset()`; an unknown-field error; a repeated `next_cursor`; a later inline style or `innerHTML`. A pattern runs only in the viewer's tab on at most 10,000 characters; the server still decides.

## Test plan

Node test runner, `*.test.ts` beside the code, no network, no sleeps. Each web test file starts with `/// <reference types="node" />` and `assert.equal(typeof <function it tests>, "function")`. List tests script `fetchPage` with deferred promises the test settles, one per request, recording each `PageRequest`; errors are real `ApiRequestError`s. Fetcher tests use a fake client `{ get }`. CSS, keyboard and source scans read files with `node:fs`, each read after `assert.ok(existsSync(...))` so red fails by assertion. Test names have no `.`, `[` or `::`.

**Browser coverage, stated plainly.** No page uses these components and `add-web-ui-kit` rules out a kit demo route, so there is no journey. What decides the DOM (`scope`, ids, `aria-describedby`, focus targets, the view of each state) is in `.ts` and proved in Node; the `.tsx` only apply it and are compiled by `pnpm run typecheck`. The first consumers (`add-web-task-inbox` for `SchemaForm`, `add-web-admin` for `DataTable`) prove the markup with `assert_accessible(page)`.

## Decisions made while writing

1. **Subdirectory `web/src/kit/data/`, not `web/src/kit/`.** `add-web-ui-kit`'s frozen scenario "Documentation matches the component files" lists exactly five `.tsx` files in `web/src/kit`; four more there fail it. The data kit has its own `DATA_KEYBOARD` and check. If that scenario recurses into subdirectories, the orchestrator must change it.
2. **Web-side `CursorPage<T>`** and restated query names: the browser cannot import `src/api`.
3. **`mapEnvelopeErrors(error, fields)` has a second parameter** (the card shows one): "unknown field" needs the known names. The form-level key is `"$form"`.
4. **Server field messages are shown** (the card requires it) though `ErrorPanel` never shows server text: only for `VALIDATION_FAILED`, cleaned, at most 200 characters.
5. **Blank means absent;** numbers are text inputs; lists are one item per line. **An unsupported field or root problem blocks submit,** so nobody sends a form missing part of its schema. `title` is the label; `$schema`, `title`, `description`, boolean `additionalProperties` are accepted at the root; `default`, `format` and the rest stay unsupported.
6. **`KIT_PROP_INVALID` is reused** (`KitErrorCode` is `add-web-ui-kit`'s closed union). **No demo route, no journey;** `data.css` is imported by the components. Control choice per kind lives in `SchemaForm.tsx` (task 4.2).
7. **`CURSOR_INVALID` restarts** on retry, since repeating a rejected cursor cannot succeed. No sorting, filtering, selection or virtual scrolling.
