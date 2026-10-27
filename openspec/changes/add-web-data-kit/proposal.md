## Why

Later screens (the task inbox, the admin pages) would each invent their own way to page through a list, to show a validation error beside the field it belongs to, and to turn a JSON Schema into inputs. The API already has one cursor contract and one error envelope, so the web side needs one matching set of building blocks, with the accessibility rules decided once.

Observable result, in logic a Node test decides (no page uses it yet): `createCursorList` loads a first page and appends each `next_cursor` page, keeps the loaded rows when a page fails and offers a retry, restarts after `CURSOR_INVALID`, and drops the answer of a request that `reset()` overtook. `dataTableModel` and `tableView` give a table with a caption, `scope` on every header, an empty state only when there is no next page, and a loading state while the first page loads. `mapEnvelopeErrors` turns a `VALIDATION_FAILED` envelope into a message per field and one form-level message for the rest, and shows catalogue text, never server text, for every other error. `fieldModel` and `focusTargetFor` link each field to its hint and error and name the first invalid field to focus. `schemaToFields` turns the JSON Schema subset of the card into typed fields, makes every unsupported keyword or type a visible `Unsupported:` error, and `validateValues` and `submitValues` check input client-side and send it only when valid, leaving the server authoritative.

## What Changes

- `web/src/kit/data/`: `cursor-list.ts`, `page-fetcher.ts`, `data-table.ts`, `form-errors.ts`, `field.ts`, `form.ts`, `schema-fields.ts`, `schema-values.ts`, `data-keyboard.ts` (the logic, each with a `*.test.ts`), the thin components `DataTable.tsx`, `Field.tsx`, `Form.tsx`, `SchemaForm.tsx`, and `data.css`.
- Nothing outside that directory changes: no shared file, no dependency, no `main.tsx`, no `theme.css`.

## Impact

- **Depends on:** `add-web-shell` (U07): `ApiRequestError`, `ApiClient.get`, `QueryValue`, `RequestOptions` of `web/src/api/client.ts`. `add-api-conventions` (U14): the wire contract only (list query `limit` and `cursor`, answer `{ items, next_cursor }`, 400 `CURSOR_INVALID`, 400 `VALIDATION_FAILED` with `details.fields`); no code is imported, because the browser cannot import `src/api`. `add-web-ui-kit` (U15): `KitError`, `messageFor`, `FALLBACK_MESSAGE`, `EmptyState`, `LoadingState`, `ErrorPanel`, `KeyBinding`, `parseTokens`, `findRawColours`, `findInlineStyleUse`, `tokens.css` and `theme.css` classes.
- **Files implemented** (stubs from the scaffold): the `.ts` and `.tsx` files listed below. **Files created:** a `*.test.ts` beside each `.ts` file (`data-css.test.ts` for `data.css`), `web/src/kit/data/data.css`. **Files changed:** none.
- **Migrations, tables, endpoints, env vars, dependencies:** none. No kit demo route and no browser journey (design.md § Test plan).
- Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them.

**Interfaces given** (exact members of the named types: design.md § Interfaces)

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

**Interfaces taken**

- From `add-web-shell`: `ApiRequestError(status: number, code: string, message: string, opts?: { details?: unknown; requestId?: string | null; cause?: unknown })` (`status`, `code`, `details`, `requestId`); `ApiClient.get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T>`; `RequestOptions { query?: Readonly<Record<string, QueryValue>>; headers?; signal?: AbortSignal; body? }`; `QueryValue = string | number | boolean | undefined`.
- From `add-web-ui-kit` (under `web/src/kit/`): `KitError(code: KitErrorCode, message: string)` (code `KIT_PROP_INVALID`); `messageFor(code: string): string`; `FALLBACK_MESSAGE: string`; `EmptyState(props: EmptyStateProps & { children?: ReactNode })`; `LoadingState(props: { label?: string })`; `ErrorPanel(props: { error: unknown })`; `KeyBinding { keys: string; effect: string }`; `parseTokens(css: string): StringMap`; `findRawColours(css: string): SourceHit[]`; `findInlineStyleUse(source: string): SourceHit[]`; `tokens.css` (`--ui-*`), `theme.css` (`.ui-button`, `.ui-visually-hidden`).
- From `add-api-conventions` (wire contract, no import): list query `limit` (1 to 200, default 50) and `cursor`; answer `{ items, next_cursor: string | null }`; error codes `CURSOR_INVALID`, `VALIDATION_FAILED` with `details: { fields: [{ field, message }] }`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@fb48c96, checked line by line).

## Out of scope

Sorting, filtering, selection, column resizing and virtual scrolling in `DataTable`; nested objects, arrays of objects, `$ref`, `oneOf`, formats, defaults and dates in `SchemaForm`; a kit demo route and a browser journey (the first consumers, `add-web-task-inbox` and `add-web-admin`, prove the markup with `assert_accessible(page)`); any change to `add-web-ui-kit`'s files (`theme.css`, `keyboard.ts`, `messages.ts`); registering messages or error codes; idempotency keys on submit (the caller's `onSubmit` decides); toasts.
