## Purpose

The flow editor offers a flow list, a CodeMirror 6 editor under the engine's Content-Security-Policy, saved versions and diagnostics linked to the guide.

## ADDED Requirements

### Requirement: Flow pages are registered by file and listed by capability
The web app SHALL register the pages `/flows` (navigation entry "Flows", capability `read_flow`) and `/flows/:flowId` (no navigation entry) through the feature files `70-flows.tsx` and `71-flow-editor.tsx`, with the tables of `FLOW_TABLES`.

#### Scenario: The page table, the navigation and the tables
- **WHEN** `FLOW_PAGES` and `FLOW_TABLES` are read; both pages are registered in `createFeatureRegistry()` with `element: null` and `nav` is asked with `new Set(["read_flow"])` and with `new Set()`; `flowFeatureLiterals` reads the two feature files and the text `"const x = 1"`
- **THEN** `FLOW_PAGES` deep-equals `[{ id: "flows", file: "70-flows.tsx", path: "/flows", navLabel: "Flows", capability: "read_flow" }, { id: "flow-editor", file: "71-flow-editor.tsx", path: "/flows/:flowId", navLabel: null, capability: null }]`; `nav` gives `[{ id: "flows", path: "/flows", label: "Flows" }]` and `[]`; the literals of each file equal its page, the last read gives `null`; `FLOW_TABLES` equals reference.md § Tables

### Requirement: The flow list shows what the registry returns
The list SHALL page `GET /api/v1/flows` through the kit's cursor list, parse every item strictly and show it as a row.

#### Scenario: Parsing, cells and paging
- **WHEN** `parseFlow` gets `{ flowId: "rf-1-core", ownerTeam: "finance", createdBy: "u1", createdAt: "2026-10-25T09:00:00.000000Z", versionCount: 2, latest: V }` (`V`, `H`, `R`: reference.md § Test data), the same with `latest: null` and `versionCount: 0`, an extra property `x`, and variants with flowId "Bad_Name", ownerTeam "Bad Team", versionCount -1, `latest` state "weird" or hash "sha256:zz"; `flowCells` gets the first two and a third with `V` in state "draft" and validationOk false; `flowListFetcher(client)` is called with `{ cursor: null, limit: 50, signal }` and with cursor "c1" and against an answer whose item is `{ flowId: 1 }`
- **THEN** the first three parse to their input (without `x`) and every variant gives `null`; the cells are `{ flow: "rf-1-core", ownerTeam: "finance", versions: "2", latest: "Version 2, validated" }`, the same with `versions` "0" and `latest` "Not saved yet", and `latest` "Version 2, draft, validation found errors" for the third; the client got exactly `{ path: "/flows", opts: { query: { limit: 50 }, signal } }`, then the same with `cursor: "c1"` in the query; the bad item rejects with an `ApiRequestError` of code `INVALID_RESPONSE`

### Requirement: Creating a flow checks the form and sends one idempotent request
The create form SHALL check the flow name and the owner team before sending, and `postFlow` SHALL send `POST /api/v1/flows` with an `Idempotency-Key`.

#### Scenario: Checks and the request
- **WHEN** `checkFlowName` gets "", "Bad_Name", "a--b", "rf-1-", 65 times "a" and " rf-1-core "; `checkOwnerTeam` gets "", "Fin ance" and "finance"; `postFlow(client, { name: "rf-1-core", ownerTeam: "finance" }, "k1")` runs against a recording client that answers a flow, with key "", with name "../x", and against the answer `{ flowId: 1 }`
- **THEN** the name checks give `{ ok: false, message: "Enter a flow name." }`, four times `{ ok: false, message: FLOW_NAME_MESSAGE }` and `{ ok: true, value: "rf-1-core" }`; the team checks give `{ ok: false, message: "Enter the owner team." }`, `{ ok: false, message: TEAM_MESSAGE }` (both texts: reference.md § Texts) and `{ ok: true, value: "finance" }`; the call is `{ path: "/flows", body: { name: "rf-1-core", ownerTeam: "finance" }, opts: { headers: { "Idempotency-Key": "k1" } } }` and `postFlow` resolves to the parsed flow; the two bad inputs reject with `RangeError` and send nothing; the last answer rejects with an `ApiRequestError` of code `INVALID_RESPONSE`

### Requirement: Saving a version sends the text and reports what happened
`saveVersion` SHALL send `POST /api/v1/flows/{flowId}/versions` with the detected format and an `Idempotency-Key`, the editor SHALL say whether a new version was made, and a new flow SHALL start from `starterText(flowId)`, a small document the engine's validator accepts.

#### Scenario: Save, read and list calls
- **WHEN** `saveVersion(client, { flowId: "rf-1-core", text: "flow: rf-1-core\n" }, "k1")` runs against `{ version: V, created: true }` and `{ version: V, created: false }`, with the JSON text `'{"flow":"rf-1-core"}'`, flowId "../x", text "", 1,048,577 characters, and against `{ version: V, created: "yes" }`; `loadVersion(client, "rf-1-core", H, signal)`, without a signal and with hash "sha256:zz"; `saveMessage` gets both answers
- **THEN** the calls are `{ path: "/flows/rf-1-core/versions", body: { format: "yaml", text: "flow: rf-1-core\n" }, opts: { headers: { "Idempotency-Key": "k1" } } }` and the same with `format: "json"` for the JSON text; the answers resolve to `{ version: <parsed V>, created: true }` and `created: false`; the three bad inputs and the bad hash send nothing and reject with `RangeError`, the `"yes"` answer with `INVALID_RESPONSE`; the get calls are `{ path: "/flows/rf-1-core/versions/" + encodeURIComponent(H), opts: { signal } }` and the same with `opts: undefined`; `saveMessage` gives "Saved version 2." and "Nothing to save: this text is already version 2."

#### Scenario: The server refuses the text
- **WHEN** `textProblemRow(error, "rf-1-core")` gets `ApiRequestError(422, "FLOW_TEXT_INVALID", "m", { details })` with details `{ reason: "parse", code: "FORMAT_YAML_SYNTAX", message: "Unexpected end", line: 3, column: 2 }`, `{ reason: "parse", code: "FORMAT_JSON_SYNTAX", message: "Bad token" }`, `{ reason: "parse", code: "FORMAT_NOT_JSON" }`, `{ reason: "not_object" }`, `{ reason: "name_mismatch" }` and `{ reason: "other" }`, one with a 400-character message, an `ApiRequestError(409, "ALREADY_EXISTS", "m")` and a plain `Error`
- **THEN** the first row is `{ key: "text:0", severity: "error", code: "FORMAT_YAML_SYNTAX", message: "Unexpected end", where: "Line 3, column 2", href: null, linkText: null, path: null, position: { line: 3, column: 2 } }`; the JSON one has code "FORMAT_JSON_SYNTAX", `where` "Whole text" and `position: null`; the `FORMAT_NOT_JSON` one has code "FORMAT_NOT_JSON" and the message of reference.md § Texts for a parse without message; the next three have code "FLOW_TEXT_INVALID" and the messages of reference.md § Texts for `not_object`, `name_mismatch` (naming "rf-1-core") and an unknown reason; the long message is cut to 300 characters ending with "…"; the last two inputs give `null`

#### Scenario: The starter text is valid for the engine
- **WHEN** the test calls `starterText("demo-flow")` and `starterText("Bad_Name")`, and `detectFormat` with `'  {"flow": "x"}'`, `"flow: x"` and `""`, and parses the starter text with `parseFlowText` and validates it with `validateFlow(doc, emptyCatalogue)` from `src/authoring/index.ts`
- **THEN** the first equals the text of reference.md § Starter text exactly and the second throws `RangeError`; the formats are "json", "yaml" and "yaml"; the parse is ok with `flow` "demo-flow" and `ok` is true

### Requirement: Validation shows diagnostics that link to the guide
`validateVersion` SHALL send `POST /api/v1/flows/{flowId}/versions/{hash}/validate` without a body, and each diagnostic SHALL show its code, place and message and a link to `docs/authoring/diagnostics.md#<code in lower case>`.

#### Scenario: Validate, rows, links and summary
- **WHEN** `validateVersion(client, "rf-1-core", H)` runs against `{ version: V, result: R }` and then with `layers_run: ["L9"]`; `parseValidation` gets `ok: "yes"`, an issue with code "bad code", `node: 5` and no `path`; `diagnosticRows(R)`; `diagnosticHref` gets "L1_PARSE", "W_LETHAL_TRIFECTA", "INTERNAL_ERROR", "FORMAT_YAML_SYNTAX", "l2_lower" and "L2_X\nY"; `diagnosticsSummary(R, "2026-10-25T09:00:00.000000Z")` and, for a result with no issues and layers L1 to L3, with `null`
- **THEN** the call is `{ path: "/flows/rf-1-core/versions/" + encodeURIComponent(H) + "/validate", body: undefined, opts: undefined }`; the first answer resolves to `{ version: <parsed V>, result: R }`, the second rejects with `INVALID_RESPONSE`; the three bad shapes parse to `null`; the rows are `{ key: "error:0", severity: "error", code: "L2_UNKNOWN_BLOCK", message: R's error message, where: "Node fetch · /nodes/fetch/uses", href: REPO_DOCS_BASE + "docs/authoring/diagnostics.md#l2_unknown_block", linkText: "Guide for L2_UNKNOWN_BLOCK (opens in a new tab)", path: "/nodes/fetch/uses", position: null }`, then `warning:0` with `where` "/nodes" and `warning:1` with `where` "Whole flow"; the hrefs are the base plus `docs/authoring/diagnostics.md#l1_parse`, `#w_lethal_trifecta`, `#internal_error`, then three times `null`; the summaries are "Not valid. 1 error, 2 warnings. Layers run: L1, L2, L3. Checked 2026-10-25 09:00:00 UTC." and "Valid. 0 errors, 0 warnings. Layers run: L1, L2, L3."

#### Scenario: The web rules agree with the engine's
- **WHEN** the test imports the web rules and `src/authoring/index.ts` and checks every code of `FLOW_ERROR_CODES`, `FLOW_WARNING_CODES` and `FLOW_RESERVED_CODES`, and `REPO_DOCS_BASE`
- **THEN** for each code `diagnosticHref(code)` equals `REPO_DOCS_BASE + diagnosticLink(code)`; `REPO_DOCS_BASE` is "https://github.com/ciprianiacobescu/ursitoare/blob/main/"

### Requirement: Diagnostics are marked in the editor text
`lineColumnOffset` and `pointerRange` SHALL find the place of a diagnostic in the text and `lintItems` SHALL turn diagnostic rows into editor marks.

#### Scenario: Offsets, pointers and marks
- **WHEN** `lineColumnOffset("ab\ncde\n", line, column)` gets (1,1), (2,2), (2,99), (3,1), (9,1) and (1.5,1); `pointerRange(T, p)` on `T` (reference.md § Test data) for "/flow", "/nodes/a/uses", "/nodes/a/tools/0", "/nodes/a", "/nodes/a/missing", "/nodes", "", "/ghost/deeper" and "x", on `TJ` for "/nodes/a/uses", on `"a/b: 1\n"` for "/a~1b" and on "" for "/a"; `lintItems(T, rows)` gets a text-problem row with position (2, 1), the rows of "/nodes/a/uses" (error) and "/nodes" (warning), and a row with neither position nor path
- **THEN** the offsets are 0, 4, 6, 7, 7, 0; the slices `T.slice(from, to)` are "x", `"k.b@1"`, "z", "a", "a", "nodes", "flow: x", "flow: x" and "flow: x"; the JSON slice is `"k"`, the "/a~1b" slice "1" and the empty text gives `{ from: 0, to: 0 }`; the items come in row order, the position row is `{ from: 8, to: 14 }` and the last `{ from: 0, to: 7 }`, each with `severity` of its row, `message` `${code}: ${message}` and `source` the code

### Requirement: The editor runs under the engine's Content-Security-Policy
The editor SHALL mount CodeMirror in an open shadow root, so that its styles are adopted style sheets (no `style` element, inline style, `eval` or nonce, and no change to the engine's policy), SHALL name the text box "Flow text" and SHALL bind no key that traps focus.

#### Scenario: Editor configuration
- **WHEN** `createEditorState("a: 1\n", onChange)` is built; `web/src/flows/editor-mount.ts`, `flows.css`, the `.tsx` files of `web/src/flows/` and the two feature files are read
- **THEN** the document is "a: 1\n"; `EDITOR_LABEL` is "Flow text" and the content attributes include `{ "aria-label": "Flow text" }` and `{ "aria-multiline": "true" }`; no key binding has a `key`, `mac`, `win` or `linux` containing "Tab"; `findRawColours` of the theme and of `flows.css` is `[]` and each `var(--…)` it uses is a token of `web/src/kit/tokens.css`; the mount source contains `attachShadow({ mode: "open" })` and passes `root` to `new EditorView`; `findInlineStyleUse` is `[]` for every file read and none contains `cspNonce`, `unsafe-inline`, `eval(` or `dangerouslySetInnerHTML`; `FlowEditorPage.tsx` contains `rel="noopener noreferrer"`

### Requirement: The editor page explains its state and its errors
The page SHALL say what is saved, plan a validation and turn errors into actionable text.

#### Scenario: Status, plan and error text
- **WHEN** `editorStatus(baseline, text)` gets `null`, a baseline of version 3 (text "a", validationOk null) with text "a", with validationOk false, with validationOk true, and with text "b"; `planValidate` gets `null`, the baseline with text "a" and with text "b"; `flowErrorMessage` gets `ApiRequestError(409, "ALREADY_EXISTS", "m")`, `ApiRequestError(403, "FORBIDDEN", "m", { details: { decisionId: "d-1" } })`, `ApiRequestError(422, "FLOW_TEXT_INVALID", "m")`, `new RangeError("Enter the flow text first.")` and `new Error("x")`
- **THEN** the statuses are "Not saved yet.", "Version 3 saved. Not validated yet.", "Version 3 saved. Validation found errors.", "Version 3 saved and validated." and "Unsaved changes since version 3."; the plans are "save-first", "validate" and "save-first"; the messages are the three texts of reference.md § Texts (the 403 one ends with "Decision id: d-1"), "Enter the flow text first." and, for the plain `Error`, the kit's `FALLBACK_MESSAGE`

### Requirement: Other units can add panels to the editor page
The editor page SHALL render every panel registered through `registerEditorPanel` below the editor, in registration order, with the saved version and its canonical document; a panel id SHALL match `^[a-z][a-z0-9-]{0,39}$` and a title be 1 to 60 characters.

#### Scenario: The panel registry
- **WHEN** a registry from `createEditorPanelRegistry()` gets `{ id: "graph", title: "Graph", render }` (valid), then the same id, ids "Bad Id" and "", titles "" and of 61 characters, and a `render` that is no function; `list()` is read, mutated and read again
- **THEN** the first registration succeeds and `list()` equals `[panel]`; the duplicate throws an `EditorPanelError` with `code` "EDITOR_PANEL_DUPLICATE" and each other input one with `code` "EDITOR_PANEL_INVALID"; mutating the returned array does not change the next `list()`; in `FlowEditorPage.tsx` each `listEditorPanels(` follows `function FlowEditorPage(`

### Requirement: The e2e stack seeds the test blocks
The stack part `catalogue` SHALL import `readCatalogueDocument().blocks` with `importCatalogue` into every tenant the fake identity provider serves, and a repeat SHALL change nothing.

#### Scenario: Seed, re-seed, skip
- **WHEN** the database, oidc and rbac parts are seeded, tenant B is provisioned for the fake issuer and tenant C is not, `cataloguePart.start` and `seed` run, `seed` runs again, and `discoverParts()` is read
- **THEN** for the default tenant and tenant B the sorted refs of `listBlockVersions` equal the sorted keys of `readCatalogueDocument().blocks` and the `def` of `docs.fetch@1` deep-equals the document's with `untrusted_result` and `unsafe_to_retry` `false` added; each has one `registry.block_imported` event per ref after the first seed and as many after the second; tenant C has none; the handle's `env` is `{}`; `discoverParts()` lists `catalogue` after `rbac`

### Requirement: The editor works against the real engine, in logic and in a browser
The logic functions SHALL create, save, validate and read flows through the e2e stack's engine as the seed users, a refusal SHALL reach the person as text with its decision id, and the pages SHALL work in a browser with every control named, the editor styled and no policy or accessibility violation.

#### Scenario: Alice, bob, carol and mallory
- **WHEN** `m3-flow-editor.test.ts` starts the stack and signs in alice, bob, carol and mallory; alice creates `demo-intake` for `finance`, saves `GOOD` (reference.md § Journey texts) twice, validates it, saves `BAD`, validates it, saves "a: [1" and a text whose `flow` is "other"; bob lists, loads and saves `GOOD`; `versionListFetcher` pages alice's versions with a page size of 1; mallory loads `demo-intake`; carol and mallory list
- **THEN** alice's create resolves to `ownerTeam` "finance", `versionCount` 0, `latest` null; the first save is `created: true`, number 1, state "draft", surface "yaml", the second `created: false` with the same hash; validating gives state "validated", `result.ok` true and no row, and `loadVersion` returns that `result` and `GOOD`; the pages of versions give numbers [2], then [1]; `BAD` is number 2, its validation has `ok` false and one row with code "L2_UNKNOWN_BLOCK" and where "Node fetch · /nodes/fetch/uses", and `pointerRange` slices `BAD` to "nope.missing@1"; "a: [1" gives the code "FORMAT_YAML_SYNTAX" with a position, the other name the `name_mismatch` row; bob's list is `["demo-intake"]` and his save rejects with 403, its `flowErrorMessage` starting "You are not allowed to do this." and containing "Decision id: "; mallory's load rejects with status 404 and code `NOT_FOUND`; carol's and mallory's lists are `[]`

#### Scenario: Alice creates, edits, saves and validates
- **WHEN** `e2e/test_m3_flow_editor.py` signs in alice with `login(page, users["alice"])`, collects console messages, opens "Flows" from the navigation, creates `demo-intake` for `finance` with the labels "Flow name" and "Owner team", fills the text box "Flow text" with `BAD`, presses "Save version", presses "Validate", then fills `GOOD` and presses "Validate"
- **THEN** the title is "Flow demo-intake · Ursitoare"; the region "Diagnostics" has a status containing "Not valid. 1 error" and a link "Guide for L2_UNKNOWN_BLOCK (opens in a new tab)" whose `href` ends with "docs/authoring/diagnostics.md#l2_unknown_block"; `.cm-lintRange-error` exists; after `GOOD` the status contains "Valid. 0 errors"; `.cm-scroller` has `overflow-x` "auto"; no console message mentions "Content Security Policy"; Tab leaves the text box for "Save version"; `assert_accessible(page)` passes on both pages
