# web-data-kit Specification

## Purpose
A paged list, per-field form errors and a JSON Schema renderer on the API's cursor contract.

## Requirements

### Requirement: A cursor list loads one page at a time and appends the next
`createCursorList(fetchPage)` SHALL be a state machine (`idle`, `loading`, `loaded`, `error`) whose `load()` fetches the first page and whose `loadMore()` appends the page after `next_cursor`.

#### Scenario: First page, then load more
- **WHEN** a list with `pageSize` 2 gets `load()`, the request is answered `{ items: ["a", "b"], next_cursor: "c1" }`, then `loadMore()` is answered `{ items: ["c"], next_cursor: null }`
- **THEN** the states are `idle` (no items, `nextCursor` null, `error` null), `loading` (none), `loaded` (`a b`, "c1"), `loading` (`a b` kept), `loaded` (`a b c`, null); the requests are `{ cursor: null, limit: 2 }` and `{ cursor: "c1", limit: 2 }`, each with an `AbortSignal`

#### Scenario: Nothing to do
- **WHEN** `loadMore()` runs on an `idle` list; `load()`, `loadMore()` and `load()` run while the first request is unanswered; it is answered `{ items: ["a"], next_cursor: null }`; then `loadMore()`, `load()` and `retry()` run
- **THEN** `fetchPage` was called once in total; the state is `loaded` with `a`

#### Scenario: Page size and subscribers
- **WHEN** `createCursorList` gets `pageSize` 0, 201, 1.5 and 200; a list without `pageSize` loads; a list has two subscribers, the first throwing
- **THEN** the first three sizes throw `KitError` `KIT_PROP_INVALID`, 200 is accepted; the first request has `limit` 50 (`DEFAULT_PAGE_SIZE`); the second subscriber is called for every change; two `getState()` reads without a change are one object

### Requirement: A failed page keeps the rows and a stale answer is dropped
A cursor list SHALL keep its rows when a page fails and offer a retry, restart from the first page when the cursor is rejected, and ignore the answer of a request that `reset()` overtook.

#### Scenario: Failed pages and retry
- **WHEN** the first request rejects with `ApiRequestError(503, "AUTHZ_UNAVAILABLE", "x")` and `retry()` is answered `{ items: ["a"], next_cursor: null }`; on another list `a b` is loaded (`next_cursor` "c1"), `loadMore()` rejects with `ApiRequestError(0, "NETWORK_ERROR", "x")`, and `retry()` is answered `{ items: ["c"], next_cursor: null }`; on a third list `loadMore()` rejects with `ApiRequestError(400, "CURSOR_INVALID", "x")` and `retry()` runs
- **THEN** the first failure is `error` with no items and that same error instance, and the retry request has `cursor` null; the second is `error` with `a b` and `nextCursor` "c1", the retry request has `cursor` "c1", the end state is `loaded` with `a b c`; the third retry request has `cursor` null and its state is `loading` with no items

#### Scenario: A stale answer after reset
- **WHEN** `load()` is unanswered (request 1), `reset()` runs, `load()` runs (request 2), request 2 is answered `["new"]`, then request 1 is answered `["old"]`; on another list `load()` is reset and its request then rejects
- **THEN** request 1's signal is aborted and the items are `["new"]`; the other list stays `idle`

#### Scenario: A malformed page
- **WHEN** a page is answered `{ items: "x", next_cursor: null }`, or holds `next_cursor` "c1" when asked for cursor "c1"
- **THEN** each state is `error` with an `ApiRequestError` of `code` `INVALID_RESPONSE`, and nothing was appended

### Requirement: The page fetcher speaks the cursor contract
`cursorPageFetcher` SHALL ask the API for `limit` and `cursor`, accept only a body `{ items, next_cursor }`, and pass the API's errors through unchanged.

#### Scenario: Parsing and requesting
- **WHEN** `parseCursorPage` gets `{ items: [1], next_cursor: "x", extra: true }`, and `null`, `{ items: {}, next_cursor: null }`, `{ items: [], next_cursor: "" }`; a fetcher over a fake client with path `"/flows"`, `query: { status: "open" }` and a `parseItem` that accepts text runs with `{ cursor: null, limit: 25, signal }`, then with `cursor` "c1", the client answering `{ items: ["a"], next_cursor: null }`
- **THEN** the first parses to `{ items: [1], next_cursor: "x" }`, the rest to `null`; `client.get` got `"/flows"` with `{ query: { status: "open", limit: 25 }, signal }`, then the query with `cursor: "c1"` added; the result is `{ items: ["a"], next_cursor: null }`

#### Scenario: Bad body, item, query, client error
- **WHEN** the client answers `{}`, or `{ items: [5], next_cursor: null }` (`parseItem` gives `null`), or rejects with `ApiRequestError(500, "INTERNAL", "x")`; `cursorPageFetcher` gets `query: { limit: 5 }`
- **THEN** the first two reject with `ApiRequestError` code `INVALID_RESPONSE`; the third rejects with that same instance; the creation throws `KitError` `KIT_PROP_INVALID`

### Requirement: DataTable has a caption, scoped headers and a view for each state
`dataTableModel`, `tableView` and `focusAfterChange` SHALL describe a table with a caption, headers with `scope`, an empty state when there are no rows and no next page, and a loading state while the first page loads.

#### Scenario: The model
- **WHEN** `dataTableModel` gets `{ caption: " Flows ", columns: [{ key: "name", header: " Name ", rowHeader: true }, { key: "state", header: "State" }] }`, and an empty caption, a 73-character caption, no columns, a duplicate key
- **THEN** the first has `caption` "Flows", `loadingLabel` "Loading Flows", `emptyTitle` "Nothing to show" and the columns `{ key: "name", header: "Name", scope: "col", cellTag: "th", cellScope: "row" }` and `{ key: "state", header: "State", scope: "col", cellTag: "td", cellScope: null }`; each bad spec throws `KitError` `KIT_PROP_INVALID`

#### Scenario: The view for every state
- **WHEN** `tableView` gets (1) `idle`; (2) `loading`, no items; (3) `loading`, 2 items; (4) `loaded`, none, no cursor; (5) `loaded`, none, cursor "c1"; (6) `loaded`, 3 items, cursor "c1"; (7) `error` (503 `ApiRequestError`), none; (8) `error` (`CURSOR_INVALID`), 2 items
- **THEN** (`body`, `rowCount`, `loadMore`, `retry`, `showError`) are (1) `none`, 0, `hidden`, `hidden`, false; (2) `loading`, 0, `hidden`, `hidden`, false; (3) `rows`, 2, `busy`, `hidden`, false; (4) `empty`, 0, `hidden`, `hidden`, false; (5) `rows`, 0, `enabled`, `hidden`, false; (6) `rows`, 3, `enabled`, `hidden`, false; (7) `none`, 0, `hidden`, `again`, true; (8) `rows`, 2, `hidden`, `restart`, true; `load` is true for (1) only; `announcement` is "Loading more rows" for (3), "No rows on this page. Load more to continue." for (5), "3 rows shown" for (6), else ""; `loadMoreLabel` is "Load more"; `retryLabel` is "Try again" for (7), "Start over" for (8), else null

#### Scenario: Where focus goes
- **WHEN** `focusAfterChange` gets, as (previous, next), (`loading` 2 items, `loaded` 3 items no cursor), (`loading` 2 items, `error`), (`error` 2 items, `loading` 2 items), (`error` none, `loading` none), (`loading` none, `loaded` 2 items cursor "c1"), (`loading` 2 items, `loaded` 4 items cursor "c2")
- **THEN** `table`, `retry`, `table`, `table`, `none`, `none`

### Requirement: Envelope errors map to field messages
`mapEnvelopeErrors` SHALL map `VALIDATION_FAILED` `details.fields` to a message per form field, put entries for unknown fields or other contexts into one form-level message, and never show the server's text for another error.

#### Scenario: Field messages and unknown entries
- **WHEN** `mapEnvelopeErrors` gets, for fields `["name", "tags", "due"]`, entries `body/name` "too short", `body/tags/0` "must be string", `body/name` "second"; and, for fields `["name"]`, entries `body/zzz` "extra", `querystring/limit` "bad", `body` "malformed JSON", `body/name` "required"
- **THEN** the results are `{ name: "too short", tags: "must be string" }` (`FORM_ERROR_KEY` is `"$form"`, absent here) and `{ name: "required", $form: "Some of the information is not valid. Check it and try again. body/zzz: extra; querystring/limit: bad; body: malformed JSON" }`

#### Scenario: No usable details and other errors
- **WHEN** a `VALIDATION_FAILED` error has `details` `undefined`, `{ fields: "x" }`, `{ fields: [] }` or `{ fields: [5, null, { field: 1, message: "x" }] }`; and `mapEnvelopeErrors` gets `ApiRequestError(403, "FORBIDDEN", "SELECT * FROM t")`, `ApiRequestError(409, "FLOW_LOCKED", "raw")`, `new Error("boom")`
- **THEN** the first four give `{ $form: "Some of the information is not valid. Check it and try again." }`; the others give `{ $form: messageFor("FORBIDDEN") }` then `{ $form: FALLBACK_MESSAGE }` twice, none containing `SELECT`, `raw` or `boom`

#### Scenario: Hostile and oversized text
- **WHEN** a field message is `<img src=x onerror=alert(1)>` or 300 characters; and an entry has the field `body/__proto__`
- **THEN** the field texts are the `<img ...>` text unchanged and 199 characters then `…`; the `__proto__` entry goes to `$form`, and the result has no own `__proto__`

### Requirement: Fields link their hint and error, and focus goes to the first invalid field
`fieldModel` SHALL give a field a label, a control id, hint and error ids and an `aria-describedby` value, and `focusTargetFor` SHALL name the first invalid field as the focus target on submit.

#### Scenario: Field ids
- **WHEN** `fieldModel`, with prefix `f1`, gets `{ name: "title", label: " Title ", hint: "Short name", error: "Required", required: true }`, then `{ name: "title", label: "Title", error: "Required" }`, then `{ name: "title", label: "Title" }`
- **THEN** the first has `label` "Title", `layout` "stacked", `controlId` "f1-title", `hintId` "f1-title-hint", `errorId` "f1-title-error", `describedBy` "f1-title-hint f1-title-error" and `invalid` true; the second has `describedBy` "f1-title-error"; the third has `describedBy` null

#### Scenario: Invalid fields and forms
- **WHEN** `isFieldName` gets `"title"`, `"due_date"`, `"1x"`, `"a-b"`, `"__proto__"`, `5`; `fieldModel` gets a bad name, a blank label, prefix `"a b"`; `formModel` gets a blank label, a duplicate field
- **THEN** `isFieldName` is true for the first two, false for the rest; every `fieldModel` and `formModel` call throws `KitError` `KIT_PROP_INVALID`

#### Scenario: The form model, focus target and attempts
- **WHEN** `formModel` gets `{ label: " New task ", submitLabel: "Save", fields: ["title", "due"], errors: { due: "Required", $form: "Not saved" } }` and the same with `busy: true`; `focusTargetFor` gets (`["title", "due", "tags"]`, `{ due: "Required", tags: "x" }`), (`["title"]`, `{ $form: "x" }`), (`["title"]`, `{ other: "x" }`); `attemptFocus` gets, as (attempt, focused, submit, fields, errors), (2, 1, `"busy"`, `["title", "due"]`, `{ due: "Required" }`), (2, 1, `"enabled"`, `["title", "due"]`, `{ title: "Required" }`), (0, 0, `"enabled"`, `["title"]`, `{ title: "Required" }`)
- **THEN** the models are `{ label: "New task", submitLabel: "Save", submit: "enabled", formError: "Not saved", invalidFields: ["due"] }` and the same with `submit` "busy"; the targets are the field `due`, the form, none; the attempt results are `{ target: { kind: "none" }, focused: 1 }` (the errors of attempt 1 are not used), `{ target: { kind: "field", name: "title" }, focused: 2 }`, `{ target: { kind: "none" }, focused: 0 }`

### Requirement: SchemaForm renders the supported JSON Schema subset as typed fields
`schemaToFields` SHALL turn an object schema of string, number, integer, boolean, enum and array-of-string properties (`required`, `minLength`, `maxLength`, `minimum`, `maximum`, `pattern`, `description` as hint) into typed fields.

#### Scenario: Every supported kind
- **WHEN** `schemaToFields` gets `{ type: "object", required: ["title", "count"], properties: { title: { type: "string", minLength: 3, maxLength: 40, pattern: "^[A-Z]", description: "Short name" }, count: { type: "integer", minimum: 1, maximum: 9 }, ratio: { type: "number" }, urgent: { type: "boolean", title: "Rush it", description: "Escalate it" }, kind: { type: "string", enum: ["bug", "task"] }, tags: { type: "array", items: { type: "string", minLength: 2 } }, due_date: { type: "string" } } }`
- **THEN** `problems` is empty and the fields are, in order: `string` Title (required, `minLength` 3, `maxLength` 40, `pattern` "^[A-Z]", hint "Short name"), `integer` Count (required, `minimum` 1, `maximum` 9), `number` Ratio, `boolean` Rush it (hint "Escalate it"), `enum` Kind (options `bug`, `task`), `string-list` Tags (`itemMinLength` 2), `string` Due date; only title and count are required

#### Scenario: Labels and hints
- **WHEN** properties `dueDate` and `url` have no title; descriptions of 301 characters and `<b>hi</b>` are given
- **THEN** the labels are "Due date" and "Url"; the hints are 299 characters then `…`, and `<b>hi</b>` unchanged

### Requirement: Anything outside the subset is a visible unsupported error
`schemaToFields` SHALL turn every property it cannot render into an `unsupported` field with a visible error, report root faults as problems, and never drop a property silently.

#### Scenario: Unsupported properties
- **WHEN** `schemaToFields` gets an object schema with properties `a` `{ type: "string", format: "email" }`, `b` `{ type: "object" }`, `c` `{}`, `d` `{ type: "string", pattern: "(" }`, `e` `true`, `f` `{ type: "array", items: { type: "number" } }`, `g` `{ type: "string", enum: [1, 2] }`
- **THEN** seven `unsupported` fields in that order, with reasons `keyword "format" is not supported`, `type "object" is not supported`, `the property has no type`, `pattern is not a valid expression`, `the property schema must be an object`, `array items must be strings`, `enum must hold 1 to 100 distinct text values of 1 to 200 characters`; each `error` is `Unsupported: ` and its reason

#### Scenario: Names, required and bounds
- **WHEN** `schemaToFields` gets `{ type: "object", required: ["ghost"] }`, and the object parsed from JSON with `required` `["ghost","ghost"]` and the properties `__proto__`, `a-b` and `""`, each `{"type":"string"}`, `N` `{"type":"string","title":"  "}` and `k` `{"type":"string","K":1}`, where `N` is `aBcD` repeated 16 times and `K` is 600 `x`
- **THEN** the first gives one `unsupported` field `ghost` (`a required property has no schema`); the second no problems and six fields in that order: `__proto__`, `a-b` and `""` are `unsupported` with `the property name is not supported` (the third labelled "Field 3"); `N` is a `string` field whose `label` has 80 characters, starts `A bc da bc d` and ends `bc da…`; `k` is `unsupported` with `keyword "` + 39 `x` + `…` + `" is not supported`; one `unsupported` `ghost`; every `error` has at most 500 characters; `fieldModel` (prefix `f1`) and `formModel` accept the fields that are not `unsupported`; no prototype changes

#### Scenario: Root problems
- **WHEN** `schemaToFields` gets `null`, `{ type: "array" }`, `{ type: "object", allOf: [], properties: { a: { type: "boolean" } } }`, `{ type: "object", additionalProperties: {} }`, an object schema with 101 properties, and `{ type: "object" }`
- **THEN** the last gives no fields and no problems; the problems are `the schema must be an object`, `the schema must have type "object"` (no fields), `keyword "allOf" is not supported at the top level` (field `a` still returned), `additionalProperties must be true or false`, and `more than 100 properties` with no fields (`MAX_SCHEMA_PROPERTIES` is 100)

### Requirement: Client-side validation mirrors the subset
`validateValues` SHALL check typed values with the rules of the subset, and nothing SHALL be sent while they or the schema are invalid; the server stays authoritative.

#### Scenario: Required, text and number rules
- **WHEN** the schema of "Every supported kind" is validated with `initialValues(parsed)`; then `title` is `"ab"`, a 41-character text, `"abc"`, `"Abc"`, a 10,001-character text; `count` is `"0"`, `"10"`, `"1.5"`, `" 5 "`; `ratio` is `"1,5"`
- **THEN** the first gives `ok` false, `errors` `{ title: "Required", count: "Required" }` and `value` `{ urgent: false }`; the title errors are `Enter at least 3 characters`, `Enter at most 40 characters`, `Use the expected format`, none (`value.title` "Abc"), `Enter at most 10000 characters`; the count errors are `Enter a whole number of at least 1`, `Enter a whole number of at most 9`, `Enter a whole number`, none (`value.count` the number 5); `ratio` gives `Enter a number`

#### Scenario: Enum and list rules
- **WHEN** `kind` is `"bug"`, `"other"`; `tags` is `"ab\n\n  cd  \nx"`, `"ab\ncd"`, 101 non-blank lines
- **THEN** `kind` gives `value.kind` "bug", then `Choose one of the listed values`; `tags` gives `Line 4: Enter at least 2 characters`, `["ab", "cd"]`, `Enter at most 100 lines`

#### Scenario: An unsupported part blocks the form
- **WHEN** `validateValues` runs on a schema with one valid string property and one `unsupported` property, and on a schema with a root problem, each with a valid value typed
- **THEN** `ok` is false for both, `errors.$form` is `UNSUPPORTED_FORM_ERROR`, and `errors` has no entry for the unsupported property

### Requirement: Submitting sends valid values once
`submitValues` SHALL call the caller's `send` once, only with valid values and only the schema's property names, and turn a rejection into field and form messages.

#### Scenario: Invalid input is not sent, valid input is sent once
- **WHEN** `submitValues` runs on the schema of "Every supported kind" with blank values, then with `title` "Abc", `count` "3" and an extra raw key `evil`, with a `send` spy that resolves
- **THEN** the first result is `{ kind: "invalid", errors }` with `Required` for title and count and no call; the second calls `send` once with `{ title: "Abc", count: 3, urgent: false }` and gives `{ kind: "submitted" }`

#### Scenario: The server rejects
- **WHEN** `send` rejects with a `VALIDATION_FAILED` error holding `{ field: "body/title", message: "must match pattern" }`, then with `ApiRequestError(409, "FLOW_LOCKED", "raw")`
- **THEN** the results are `{ kind: "rejected", errors: { title: "must match pattern" } }` and `{ kind: "rejected", errors: { $form: FALLBACK_MESSAGE } }`

### Requirement: The data components are documented, token-styled and free of inline styles
The data components SHALL document their keyboard behaviour in `DATA_KEYBOARD`, be styled by `data.css` with kit tokens only, and contain no inline style and no raw HTML insertion.

#### Scenario: Styles, documentation and sources
- **WHEN** `data.css`, `tokens.css`, `DATA_KEYBOARD` and the `.tsx` files of `web/src/kit/data` are read
- **THEN** `findRawColours(data.css)` is `[]`; every `var(--ui-...)` in `data.css` is defined by `parseTokens(tokens.css)`; `data.css` holds the 16 classes of the design and `var(--ui-target-min)`; the sorted keys of `DATA_KEYBOARD` are `DataTable`, `Field`, `Form`, `SchemaForm`, each with a binding whose `keys` and `effect` are non-blank; `findInlineStyleUse` finds nothing in the four `.tsx` files and none holds `dangerouslySetInnerHTML` or `innerHTML`

### Requirement: DataTable has a caption, scoped headers and a view for each state — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Load more after an empty page unmounts the focused button
- **WHEN** tableView gets loading with no items and nextCursor "c1" (Load more pressed after an empty page) and focusAfterChange gets (loading none cursor "c1", loaded none no cursor)
- **THEN** the view's body, rowCount, loadMore, retry and showError are rows, 0,

### Requirement: Anything outside the subset is a visible unsupported error — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: An unsupported property `c` comes back with an empty name
- **WHEN** schemaToFields gets the schema of scenario "Unsupported properties"
- **THEN** the field of c has the label "C" and the reason "the property has no type", and the other six fields keep their names, labels and reasons.

### Requirement: A cursor list loads one page at a time and appends the next — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: task 1.1: no-op calls and loads do not settle with the request in flight
- **WHEN** load() from idle, loadMore() from loaded with a nextCursor and retry() from error each start a request
- **THEN** the promise each returns resolves only once that request's page or error is committed, or once reset() drops it, never rejec

### Requirement: task 4.1: an enum property without type is not rendered as an enum — finding F-d49cb373
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: task 4.1: an enum property without type is not rendered as an enum
- **WHEN** schemaToFields gets an object schema whose only property kind is { enum: ["bug", "task"] } with no type
- **THEN** problems is empty and the one field is the same enum field Kind with options bug and task that { type: "string", enum: ["bug", "task"] } gives.
