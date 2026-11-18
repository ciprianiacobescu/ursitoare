## ADDED Requirements

### Requirement: The input form is built from the flow's inputs when they fit the kit subset
`inputFormModel(canonical)` SHALL give `{ kind: "form", fields }` when `canonical.inputs` passes `schemaToFields` with no problem and no unsupported field and holds 1 to 20 fields, none named `input`, `mocks` or `fakes`, with the `required` names first in the order of `required` and then the others as given. Otherwise it SHALL give `{ kind: "json", reason }`: `This flow declares no inputs.` when there is no `inputs` record or it has no properties, and `The input schema uses features the form cannot show, so enter the input as JSON.` in every other case.

#### Scenario: demo-pay's inputs give a form, and each other shape gives JSON only
- **WHEN** `inputFormModel` gets the rows M1 to M10 of test-plan.md T1
- **THEN** each row gives the result of T1: M1 a form of `vendor_name` then `amount` (though `properties` lists `amount` first), M2 to M4 the "no inputs" reason, M5 to M8 the "cannot show" reason, M9 a form of 20 fields, M10 the order `b`, `a`, `c`, `d`

### Requirement: A form's values become the input JSON and an input JSON becomes form values, by fixed rules
`inputJsonFromForm(model, raw)` SHALL give `{ ok: true, text }` with `text = JSON.stringify(value, null, 2)` of `validateValues`' value when it has no error, and `{ ok: false, errors }` otherwise. `formFromInputJson(model, text)` SHALL give the raw values (blank, or `false`, for an absent key; a number as `String(n)`; a list joined by line feeds) when the text is a JSON object whose every key is a field and every value fits the field's type, and `null` otherwise, without throwing.

#### Scenario: The form writes with two-space indent and the text reads field by field
- **WHEN** `inputJsonFromForm` gets W1 to W4 and `formFromInputJson` gets R1 to R14 of test-plan.md T2
- **THEN** each row gives the result of T2: W1 `{ ok: true, text }` with the indented text of `{ vendor_name: "ACME", amount: 12.5 }`, W2 `{ ok: false, errors: { amount: "Required" } }`, W3 `{ ok: false, errors: { amount: "Enter a number" } }`, R1 `{ vendor_name: "ACME", amount: "12.5" }`, and `null` for R3 to R8 and R10 to R13

### Requirement: One text is the truth, so a form edit rewrites it, a text edit refills the form, and the form never blocks a text it cannot show
`inputSyncStart`, `inputSyncStep` and `inputSyncView` SHALL keep the text, a buffer of raw values, the touched names, `attempted` and `source`. A `field` event SHALL set the buffer, mark the name touched, rewrite the text from the buffer's valid fields and set `source` to `form`; a `text` event SHALL keep the text as typed, refill the buffer only when `formFromInputJson` fits, clear `touched` and `attempted` and set `source` to `json`; an `attempt` event SHALL set `attempted`. The view SHALL give `validateValues`' errors only for touched names (all after an attempt), `jsonError` from `parseTestInputs`, `hint` `The JSON no longer matches the form; it is used as written.` for an object that does not fit and `Kept in step with the fields above.` otherwise, and `blocked` exactly when `source` is `form` and the buffer has an error. For a model that is not a form the view is empty and a `field` event changes nothing. `inputSyncStart(model, text)` SHALL derive the buffer from the text it is given and keep that text byte for byte, so the arrival of the document (or a re-read after "Validate" or "Save version") never changes what was typed: the fields fill when the text fits, and otherwise stay empty with the mismatch hint.

#### Scenario: A form edit writes, a text edit refills, and a bad text leaves the form alone
- **WHEN** the steps S1 to S9, the sequence T3b, the arrival cases T3c and the non-form cases of test-plan.md T3 run on the model of D
- **THEN** each step gives the text, buffer, `source`, `fieldErrors`, `jsonError`, `hint` and `blocked` of T3: S2 writes `{\n  "vendor_name": "ACME"\n}` with `blocked` true and no shown error, S3 (`12.`) keeps the text and shows `Enter a number`, S5 writes both fields, S6 keeps its bytes and refills the buffer, S7 and S8 give `This is not valid JSON.` and the mismatch hint and leave the buffer; in T3c the text typed before the model arrives is unchanged and the fields read `ACME` and `12.5`, or stay empty with the mismatch hint; in T3b `fieldErrors` is `{}` before the attempt and `{ amount: "Required" }` after it, `blocked` is true again when `amount` is blanked, and for `{ kind: "json", reason: "x" }` and `null` the view is empty


### Requirement: The panels read a version's document when the editor has none
`runDocumentWanted(version, canonical)` SHALL be true exactly when `version` is not `null` and `canonical` is `null` or `undefined`. `loadRunDocument` SHALL give the `canonical` of `loadVersion`. `inputFormModelFor(document)` SHALL give `null` for `none` and `loading`, `inputFormModel`'s answer for `ready`, and `{ kind: "json", reason: "The inputs of this version could not be read, so enter the input as JSON." }` for `failed`.

#### Scenario: Wanted, loaded and failed
- **WHEN** the rows of test-plan.md T4 run
- **THEN** `runDocumentWanted` gives false, true, false, true; the load records one `get` of `/flows/demo-pay/versions/sha256%3A` plus 64 `a` and resolves V's `canonical`; a malformed answer rejects with `ApiRequestError` (status 200, `INVALID_RESPONSE`); the flow id `"Bad_Id"` rejects with `RangeError` before any call; the four phases give the models of T4

### Requirement: Answer rows list the block nodes and read and write the answers
`mockableNodes(canonical)` SHALL list the nodes of kind `block` with their `uses` (empty when not a string) in the order of `layoutFlow(canonical).layout.nodes`, or, when that status is not `ok`, sorted by code unit, and `[]` without a `nodes` record. `mockRowsFromText(text, nodes)` SHALL give one row per node, each answer the `JSON.stringify(output, null, 2)` of one `{ output }` entry, and `null` for text that is not a JSON object, names an unknown node, holds a non-list or an entry other than `{ output }`. `mockTextFromRows(rows)` SHALL leave out rows without answers and blank answers, give `{ ok: false, nodeId, index, message: "This is not valid JSON." }` for the first non-blank answer that does not parse, and otherwise `{ ok: true, text }`, the indented `{ <nodeId>: [{ output }, …] }` in row order. `answerLabel` SHALL give `Output ${index + 1} for ${nodeId}`.

#### Scenario: Block nodes, labels and the text of the answers
- **WHEN** the nodes, labels, A1 to A8 and B1 to B4 of test-plan.md T5 run
- **THEN** the nodes of D are `lookup` then `pay` (the `switch` and `end` nodes skipped), and O1 to O5 of T5 give their orders (an unreachable block last, ties by id, sorted ids for 201 nodes); the labels are `Output 1 for pay` and `Output 3 for pay`; A1 and A2 give the rows of T5 and `mockTextFromRows` of A2's rows parses to A2's map; A3 to A8 give `null`; B1 to B4 give the results of T5, among them `{ ok: false, nodeId: "pay", index: 1, message: "This is not valid JSON." }`

### Requirement: Answer rows and the mocks or fakes text stay in step by the same rules
`rowSyncStart`, `rowSyncStep` and `rowSyncView` SHALL follow the rules of the input form, including that `rowSyncStart` keeps the text it is given: an `answer`, `add` or `remove` event rewrites the text from the answers that parse and sets `source` to `rows` (`add` on a row with no answer makes two blank answers, as the one blank textarea shown counts); a `text` event keeps the text and refills the rows only when `mockRowsFromText` fits. The view SHALL give `answerErrors` keyed by `answerLabel` for non-blank answers that do not parse (while `source` is `rows`), `jsonError`, a `hint` (`The JSON no longer matches the answer rows; it is used as written.` or `Kept in step with the answers above.`), `blocked` with an answer error, and `formError` `Fix the answers that are not valid JSON before you start.` when blocked after an attempt; with no nodes the view is empty.

#### Scenario: Add, answer, remove, a bad answer and a text edit
- **WHEN** the steps R1 to R8 and the arrival cases of test-plan.md T6 run on the nodes of D
- **THEN** each step gives the text, `source`, `answerErrors`, `jsonError`, `hint`, `formError` and `blocked` of T6: the add keeps `{}`, the answer `{` keeps the previous text and blocks, the attempt adds the `formError`, the removal clears both, the `{ error }` text keeps the rows and gives the mismatch hint, the broken text gives `jsonError`

### Requirement: The form and row components follow the source rules
`InputForm.tsx`, `MockRows.tsx` and `use-run-document.ts` SHALL hold no inline style, `dangerouslySetInnerHTML`, stylesheet import, palette utility, link, `<code`, `role="status"` or `role="alert"`; `InputForm.tsx` SHALL render a `fieldset` with the `legend` `Inputs`; `MockRows.tsx` SHALL use `Collapsible` and `Button`; both panels SHALL keep `Form`, the three labels and, in `DryRunPanel.tsx`, the seven dry-run strings, and call `useRunDocument(`, `inputSyncStep(` and `rowSyncStep(`.

#### Scenario: The input sources read as the rules say
- **WHEN** `input-sources.test.ts` reads the five files of test-plan.md T7
- **THEN** every check of T7 holds, among them `findInlineStyleUse` and `findPaletteUtilities` `[]`, one `<Link` and one `role="status"` in `TestRunPanel.tsx`, and the seven strings and one `<code>` in `DryRunPanel.tsx`

### Requirement: The panels show the form and the rows in a browser
The Test run and Dry run panels SHALL show the group "Inputs" above "Input (JSON)" and one row "Answers for <nodeId>" per block node above "Mocks (JSON)" / "Fakes (JSON)", keep the texts visible and submitted, start no request while the last edit was in a form or row that does not validate, and not scroll sideways; after a refused dry run, each row the "Fakes (JSON)" error names SHALL open and show its part of the error.

#### Scenario: Form and JSON stay in step and the text is used as written
- **WHEN** `test_the_form_and_the_input_json_stay_in_step` of test-plan-browser.md runs
- **THEN** typing `ACME` and `12.5` makes "Input (JSON)" hold `{\n  "vendor_name": "ACME",\n  "amount": 12.5\n}`; a compact fill refills the fields; a broken text and `{"foo":1}` show the error and the mismatch hint once each; the one POST body is `{ input: { foo: 1 }, mocks: {} }`

#### Scenario: A missing required field holds the start and names the field
- **WHEN** `test_a_missing_required_field_blocks_the_start` runs
- **THEN** no POST follows the first start, "Amount (required)" is focused with the description `Error: Required`, and after `12.5` the one POST has `input` `{ vendor_name: "ACME", amount: 12.5 }`

#### Scenario: Answer rows write the mocks and the fakes
- **WHEN** `test_answer_rows_write_the_mocks_and_the_fakes` runs
- **THEN** the rows read "Answers for lookup" then "Answers for pay"; a typed output writes "Mocks (JSON)"; a bad second answer blocks the start with the one alert of T6 R5; an `{ error }` mock is posted as written; the Dry run panel posts `fakes` `{ pay: [{ output: { payment_id: "P-1" } }] }`; a dry run refused for `lookup` (`not_an_effect`) opens "Answers for lookup" with that text

#### Scenario: Validate reads the document, and an unsupported schema shows only the JSON
- **WHEN** `test_validate_makes_the_panels_read_the_document` runs
- **THEN** "Amount (required)" appears only after "Validate" (the editor's `canonical` is `null` then); with a `oneOf` property each region shows the "cannot show" note once and no group "Inputs"

#### Scenario: The panels fit the screen and the journeys fill the JSON as before
- **WHEN** `test_the_panels_fit_the_screen` runs at 1366 by 860 (the workspace, panels 531 px wide), 1024 by 860 (one column) and 390 by 800, and the journeys `test_m4_runs.py`, `test_m5_code_hooks.py` and `test_m6_grants.py` run unchanged
- **THEN** at 1366 and 390 the fields are stacked (left edges equal within 1 px, group at most 260 px tall); at 1024 they share a row (tops equal within 1 px, group at most 160 px tall); `scrollWidth <= innerWidth` and `assert_accessible` pass at each; the journeys pass (green on arrival)
