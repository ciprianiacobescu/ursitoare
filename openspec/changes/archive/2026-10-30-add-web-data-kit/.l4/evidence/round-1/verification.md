# Verification: openspec:add-web-data-kit: NEEDS_HUMAN (round 1)

traceability: 28/28 criteria covered by a discriminating test

- Base: `cd81ff313bff4945e29fa580f4f0b1b69ef3bde8`
- Head: `27a91c372eee177792ed001c9ec89b4c05662593`
- Implementer profiles: glm, deepseek-free
- Judge: claude-judge (claude-opus-5-5), 2 call(s), judged in 2 parts, prompt sha256 `61c090c79b082d63c3698613ebacb88758bded5ec0a2e10d1a155dc63aac32e0`
  - part 1: 20 file(s), 116067 characters, profile claude-judge, reply valid
  - part 2: 5 file(s), 76937 characters, profile claude-judge, reply valid
- Judge replies of claude-judge (this unit, all rounds): valid 2, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), glm zhipu (declared), deepseek-free deepseek (declared)
- Cost: $4.2956

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base merged: main@cd81ff313b as 27a91c372e (1 commit) |
| 1 | integrity | ok | 64.9 | 10 sub-checks; scope: 27 changed file(s) |
| 2 | build | ok | 21.6 |  |
| 3 | tests | ok | 78.2 |  |
| 4 | traceability | ok | 0.1 | 28/28 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | ok | 97.5 | 28 not_testable |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/kit/data/DataTable.tsx, web/src/kit/data/Field.tsx, web/src/kit/data/Form.tsx, web/src/kit/data/SchemaForm.tsx, web/src/kit/data/cursor-list.ts and 8 more |
| 8 | s1 judge | ok | 3.2 | 27/28 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 238.9 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261030T0021Z-b45b/055-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261030T0021Z-b45b/056-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261030T0021Z-b45b/057-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261030T0021Z-b45b/058-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261030T0021Z-b45b/059-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261030T0021Z-b45b/060-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261030T0021Z-b45b/061-e2e.log |

## Files by part

- part 1: web/src/kit/data/cursor-list.test.ts (18662 characters)
- part 1: web/src/kit/data/cursor-list.ts (6216 characters)
- part 1: web/src/kit/data/data.css (2586 characters)
- part 1: web/src/kit/data/data-css.test.ts (5467 characters)
- part 1: web/src/kit/data/data-keyboard.test.ts (3093 characters)
- part 1: web/src/kit/data/data-keyboard.ts (1093 characters)
- part 1: web/src/kit/data/data-table.test.ts (11249 characters)
- part 1: web/src/kit/data/data-table.ts (6323 characters)
- part 1: web/src/kit/data/DataTable.tsx (4888 characters)
- part 1: web/src/kit/data/Field.tsx (1986 characters)
- part 1: web/src/kit/data/field.test.ts (4892 characters)
- part 1: web/src/kit/data/field.ts (2628 characters)
- part 1: web/src/kit/data/Form.tsx (2350 characters)
- part 1: web/src/kit/data/form.test.ts (6550 characters)
- part 1: web/src/kit/data/form.ts (3377 characters)
- part 1: web/src/kit/data/form-errors.test.ts (5927 characters)
- part 1: web/src/kit/data/form-errors.ts (4105 characters)
- part 1: web/src/kit/data/page-fetcher.test.ts (9772 characters)
- part 1: web/src/kit/data/page-fetcher.ts (2941 characters)
- part 1: web/src/kit/data/schema-fields.test.ts (11962 characters)
- part 2: web/src/kit/data/schema-fields.ts (14019 characters)
- part 2: web/src/kit/data/schema-values.test.ts (10769 characters)
- part 2: web/src/kit/data/schema-values.ts (7549 characters)
- part 2: web/src/kit/data/SchemaForm.tsx (7138 characters)
- part 2: openspec/changes/add-web-data-kit/tasks.md (37462 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 10 task(s): red and green compared |
| test path freeze | ok | 10 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/kit/data/DataTable.tsx, web/src/kit/data/Field.tsx, web/src/kit/data/Form.tsx, web/src/kit/data/SchemaForm.tsx, web/src/kit/data/cursor-list.test.ts (+18 more) |
| tdd history | ok | 10 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 861 of 861 base tests pass on the unit's code with its 10 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-4ad6d2b9 | web-data-kit › A cursor list loads one page at a time and appends the next › First page, then load more | covered | web.src.kit.data.cursor-list.test.ts::C-4ad6d2b9 first page then load more (passed, red_assertion) | - | 0.95 | - |
| C-efc9d8f0 | web-data-kit › A cursor list loads one page at a time and appends the next › Nothing to do | covered | web.src.kit.data.cursor-list.test.ts::C-efc9d8f0 nothing to do (passed, red_assertion) | - | 0.88 | - |
| C-98c49746 | web-data-kit › A cursor list loads one page at a time and appends the next › Page size and subscribers | covered | web.src.kit.data.cursor-list.test.ts::C-98c49746 page size and subscribers (passed, red_assertion, inadequate) | - | 0.91 | - |
| C-3d1d3680 | web-data-kit › A failed page keeps the rows and a stale answer is dropped › Failed pages and retry | covered | web.src.kit.data.cursor-list.test.ts::C-3d1d3680 failed pages and retry (passed, red_assertion) | - | 0.92 | - |
| C-79a9fd48 | web-data-kit › A failed page keeps the rows and a stale answer is dropped › A stale answer after reset | covered | web.src.kit.data.cursor-list.test.ts::C-79a9fd48 stale answer after reset (passed, red_assertion) | - | 0.92 | - |
| C-629f74f4 | web-data-kit › A failed page keeps the rows and a stale answer is dropped › A malformed page | covered | web.src.kit.data.cursor-list.test.ts::C-629f74f4 malformed page (passed, red_assertion) | - | 0.85 | - |
| C-d83105ac | web-data-kit › The page fetcher speaks the cursor contract › Parsing and requesting | covered | web.src.kit.data.page-fetcher.test.ts::C-d83105ac parseCursorPage accepts a well shaped page and rejects the rest (passed, red_assertion); web.src.kit.data.page-fetcher.test.ts::C-d83105ac the fetcher asks for limit and cursor and returns the parsed page (passed, red_assertion) | - | 0.95 | - |
| C-bea5ecec | web-data-kit › The page fetcher speaks the cursor contract › Bad body, item, query, client error | covered | web.src.kit.data.page-fetcher.test.ts::C-bea5ecec bad body item query and client error (passed, red_assertion) | - | 0.92 | - |
| C-df0a8688 | web-data-kit › DataTable has a caption, scoped headers and a view for each state › The model | covered | web.src.kit.data.data-table.test.ts::C-df0a8688 dataTableModel throws KIT_PROP_INVALID for a bad spec (passed, red_assertion); web.src.kit.data.data-table.test.ts::C-df0a8688 dataTableModel trims a valid spec and fills the defaults (passed, red_assertion) | - | 0.92 | - |
| C-686289b8 | web-data-kit › DataTable has a caption, scoped headers and a view for each state › The view for every state | covered | web.src.kit.data.data-table.test.ts::C-686289b8 tableView gives every state its view (passed, red_assertion) | - | 0.94 | - |
| C-3bc08473 | web-data-kit › DataTable has a caption, scoped headers and a view for each state › Where focus goes | covered | web.src.kit.data.data-table.test.ts::C-3bc08473 focusAfterChange names where focus moves after a change (passed, red_assertion) | - | 0.93 | - |
| C-56d95a76 | web-data-kit › Envelope errors map to field messages › Field messages and unknown entries | covered | web.src.kit.data.form-errors.test.ts::C-56d95a76 known fields take their message and unknown entries join the form message (passed, red_assertion) | - | 0.95 | - |
| C-8e9e0bb2 | web-data-kit › Envelope errors map to field messages › No usable details and other errors | covered | web.src.kit.data.form-errors.test.ts::C-8e9e0bb2 unusable details and other codes keep the catalogue text (passed, red_assertion) | - | 0.93 | - |
| C-76ec796a | web-data-kit › Envelope errors map to field messages › Hostile and oversized text | covered | web.src.kit.data.form-errors.test.ts::C-76ec796a a proto pseudo field never lands on the result object (passed, red_assertion); web.src.kit.data.form-errors.test.ts::C-76ec796a hostile and oversized messages are shown unchanged or capped (passed, red_assertion); web.src.kit.data.form-errors.test.ts:... | - | 0.91 | - |
| C-d3d35a1c | web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › Field ids | covered | web.src.kit.data.field.test.ts::C-d3d35a1c fieldModel links hint and error ids to the control (passed, red_assertion); web.src.kit.data.field.test.ts::C-d3d35a1c fieldModel trims a blank hint or error away and keeps the inline layout (passed, red_assertion) | - | 0.83 | - |
| C-36608f1a | web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › Invalid fields and forms | covered | web.src.kit.data.field.test.ts::C-36608f1a fieldModel throws KitError for a spec it cannot trust (passed, red_assertion); web.src.kit.data.field.test.ts::C-36608f1a isFieldName admits plain names and rejects every other shape (passed, red_assertion); web.src.kit.data.form.test.ts::C-36608f1a formMod... | - | 0.93 | - |
| C-547ad66e | web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › The form model, focus target and attempts | covered | web.src.kit.data.form.test.ts::C-547ad66e attemptFocus skips a busy attempt and repeats an earlier attempt (passed, red_assertion); web.src.kit.data.form.test.ts::C-547ad66e focusTargetFor names the first invalid field, the form or none (passed, red_assertion); web.src.kit.data.form.test.ts::C-547ad... | - | - | - |
| C-832d250d | web-data-kit › SchemaForm renders the supported JSON Schema subset as typed fields › Every supported kind | covered | web.src.kit.data.schema-fields.test.ts::C-832d250d schemaToFields types every supported kind in order (passed, red_assertion) | - | 0.93 | - |
| C-a36860e0 | web-data-kit › SchemaForm renders the supported JSON Schema subset as typed fields › Labels and hints | covered | web.src.kit.data.schema-fields.test.ts::C-a36860e0 schemaToFields derives labels from names and caps hints (passed, red_assertion) | - | 0.90 | - |
| C-78331251 | web-data-kit › Anything outside the subset is a visible unsupported error › Unsupported properties | covered | web.src.kit.data.schema-fields.test.ts::C-78331251 schemaToFields marks each unsupported property with its reason (passed, red_assertion) | - | 0.91 | - |
| C-69d9392a | web-data-kit › Anything outside the subset is a visible unsupported error › Names, required and bounds | covered | web.src.kit.data.schema-fields.test.ts::C-69d9392a schemaToFields feeds fieldModel and formModel without prototype changes (passed, red_assertion); web.src.kit.data.schema-fields.test.ts::C-69d9392a schemaToFields keeps every property and caps the derived text (passed, red_assertion); web.src.kit.da... | - | 0.94 | - |
| C-9d1fffc7 | web-data-kit › Anything outside the subset is a visible unsupported error › Root problems | covered | web.src.kit.data.schema-fields.test.ts::C-9d1fffc7 schemaToFields accepts an empty object schema and holds 100 properties (passed, red_assertion); web.src.kit.data.schema-fields.test.ts::C-9d1fffc7 schemaToFields reports root problems without dropping fields (passed, red_assertion) | - | 0.85 | - |
| C-412941ac | web-data-kit › Client-side validation mirrors the subset › Required, text and number rules | covered | web.src.kit.data.schema-values.test.ts::C-412941ac validateValues applies the required, text and number rules (passed, red_assertion) | - | 0.90 | - |
| C-0e0cc641 | web-data-kit › Client-side validation mirrors the subset › Enum and list rules | covered | web.src.kit.data.schema-values.test.ts::C-0e0cc641 validateValues checks enum options and string list lines (passed, red_assertion) | - | 0.90 | - |
| C-dc43ef5f | web-data-kit › Client-side validation mirrors the subset › An unsupported part blocks the form | covered | web.src.kit.data.schema-values.test.ts::C-dc43ef5f an unsupported field or root problem blocks the form (passed, red_assertion) | - | 0.90 | - |
| C-08c4c2e4 | web-data-kit › Submitting sends valid values once › Invalid input is not sent, valid input is sent once | covered | web.src.kit.data.schema-values.test.ts::C-08c4c2e4 submitValues sends valid values once and never invalid ones (passed, red_assertion) | - | 0.93 | - |
| C-61a6e3a3 | web-data-kit › Submitting sends valid values once › The server rejects | covered | web.src.kit.data.schema-values.test.ts::C-61a6e3a3 submitValues maps a rejected send to field and form errors (passed, red_assertion) | - | 0.92 | - |
| C-74fd23b0 | web-data-kit › The data components are documented, token-styled and free of inline styles › Styles, documentation and sources | covered | web.src.kit.data.data-css.test.ts::C-74fd23b0 data css colours the parts as the design states (passed, red_assertion); web.src.kit.data.data-css.test.ts::C-74fd23b0 data css holds the 16 classes and the target token (passed, red_assertion); web.src.kit.data.data-css.test.ts::C-74fd23b0 data css size... | - | 0.93 | - |

## Evidence

### Needs attention

- tests are not all green (a failed or errored test, or a new test that did not pass)

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-web-data-kit/.l4/ledger/r-20261029T2151Z-07ed.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/ledger/r-20261030T0021Z-b45b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/kit/data/DataTable.tsx` | web | relevant | named in the spec |
| `web/src/kit/data/Field.tsx` | web | relevant | named in the spec |
| `web/src/kit/data/Form.tsx` | web | relevant | named in the spec |
| `web/src/kit/data/SchemaForm.tsx` | web | relevant | named in the spec |
| `web/src/kit/data/cursor-list.test.ts` |  | relevant | new test file |
| `web/src/kit/data/cursor-list.ts` | web | relevant | named in the spec |
| `web/src/kit/data/data-css.test.ts` |  | relevant | new test file |
| `web/src/kit/data/data-keyboard.test.ts` |  | relevant | new test file |
| `web/src/kit/data/data-keyboard.ts` | web | relevant | named in the spec |
| `web/src/kit/data/data-table.test.ts` |  | relevant | new test file |
| `web/src/kit/data/data-table.ts` | web | relevant | named in the spec |
| `web/src/kit/data/data.css` | web | relevant | named in the spec |
| `web/src/kit/data/field.test.ts` |  | relevant | new test file |
| `web/src/kit/data/field.ts` | web | relevant | named in the spec |
| `web/src/kit/data/form-errors.test.ts` |  | relevant | new test file |
| `web/src/kit/data/form-errors.ts` | web | relevant | named in the spec |
| `web/src/kit/data/form.test.ts` |  | relevant | new test file |
| `web/src/kit/data/form.ts` | web | relevant | named in the spec |
| `web/src/kit/data/page-fetcher.test.ts` |  | relevant | new test file |
| `web/src/kit/data/page-fetcher.ts` | web | relevant | named in the spec |
| `web/src/kit/data/schema-fields.test.ts` |  | relevant | new test file |
| `web/src/kit/data/schema-fields.ts` | web | relevant | named in the spec |
| `web/src/kit/data/schema-values.test.ts` |  | relevant | new test file |
| `web/src/kit/data/schema-values.ts` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/kit/data/DataTable.tsx, web/src/kit/data/Field.tsx, web/src/kit/data/Form.tsx, web/src/kit/data/SchemaForm.tsx, web/src/kit/data/cursor-list.ts and 8 more

### Tests

945 of 946 passed, 1 failed, 0 errored, 0 skipped.
48 of 48 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-4ad6d2b9 | not_testable | - | - | - | 1 | Criterion concerns the createCursorList state machine's internal states and AbortSignal arguments; the page snapshot is an empty SPA shell with no route exposing a list, so it is not observable via browser. | - |
| C-efc9d8f0 | not_testable | - | - | - | 1 | Criterion is about the cursor list's programmatic API (call counts of fetchPage, no-op loadMore/load/retry); the page snapshot is an empty app shell with no route exposing it, so no user-visible UI flow checks it. | - |
| C-98c49746 | not_testable | - | - | - | 1 | Criterion concerns the createCursorList module API (KitError throws, subscriber calls, state identity); no user-visible page behavior in the browser, covered by unit tests. | - |
| C-3d1d3680 | not_testable | - | - | - | 1 | Criterion concerns the createCursorList state machine (ApiRequestError instances, request cursors); the page snapshot is an empty app shell with no route exposing a DataTable, so it is not observable via the browser UI. | - |
| C-79a9fd48 | not_testable | - | - | - | 1 | Criterion concerns the createCursorList module API (abort signals, reset/load ordering); the page snapshot is an empty app shell with no route exposing it, so it can't be checked through the browser UI. | - |
| C-629f74f4 | not_testable | - | - | - | 1 | The criterion concerns createCursorList's internal state and ApiRequestError codes. The page snapshot shows only an empty app shell with no route that renders a DataTable, so a browser test cannot drive it. | - |
| C-d83105ac | not_testable | - | - | - | 1 | Criterion covers pure functions (parseCursorPage, page fetcher over a fake client); no user-visible page behavior, covered by unit tests, not e2e. | - |
| C-bea5ecec | not_testable | - | - | - | 1 | Criterion concerns the cursorPageFetcher function's rejections and thrown KitError, which are internal module behavior with no UI route; the page snapshot is an empty SPA shell, so a browser test can't reach it. | - |
| C-df0a8688 | not_testable | - | - | - | 1 | dataTableModel is a pure function with no page or route in the built app that exercises it; the snapshot is an empty SPA shell, so a browser test can't reach the model's output or its KitError throws. | - |
| C-686289b8 | not_testable | - | - | - | 1 | The criterion specifies the output of the pure `tableView` function. The snapshot is an empty SPA shell, and nothing identifies a page or route that renders DataTable in all eight states, so a browser test can't check it. | - |
| C-3bc08473 | not_testable | - | - | - | 1 | The criterion specifies a pure function (focusAfterChange) with no route or page that renders it; the page snapshot is only the empty app shell, so it can't be checked through the browser. | - |
| C-56d95a76 | not_testable | - | - | - | 1 | mapEnvelopeErrors is a pure internal function with no page or route exposing it; the page snapshot is an empty app shell, so a browser test can't reach it. | - |
| C-8e9e0bb2 | not_testable | - | - | - | 1 | Criterion concerns the pure function mapEnvelopeErrors with error objects; no route or page in the served app exposes it, so a browser test cannot observe it. | - |
| C-76ec796a | not_testable | - | - | - | 1 | Criterion concerns a pure envelope-to-field-error mapping function (result object has no own __proto__); the page snapshot shows only an empty SPA shell with no route exposing it, so it can't be checked through the browser UI. | - |
| C-d3d35a1c | not_testable | - | - | - | 1 | The criterion is about the pure function fieldModel's return values; the page snapshot is an empty app shell with no route that renders Field, so it cannot be checked through a browser. | - |
| C-36608f1a | not_testable | - | - | - | 1 | Criterion covers pure functions (isFieldName, fieldModel, formModel) throwing KitError; they are not reachable through the page UI, which is just an empty app shell, so a browser e2e test cannot check it. | - |
| C-547ad66e | not_testable | - | - | - | 1 | Criterion specifies pure functions (formModel, focusTargetFor, attemptFocus) with no route or UI in the page snapshot to drive; a browser e2e test can't call them. | - |
| C-832d250d | not_testable | - | - | - | 1 | The criterion is about the pure function schemaToFields' return value, and the page snapshot shows no route that renders SchemaForm with this schema, so a browser test can't check it. | - |
| C-a36860e0 | not_testable | - | - | - | 1 | SchemaForm is a kit component and the app snapshot is an empty SPA shell. No route is known that renders it with a chosen schema, so a browser test can't supply the 301-character and `<b>hi</b>` descriptions. | - |
| C-78331251 | not_testable | - | - | - | 1 | The criterion is about the schemaToFields function's output, a pure unit-level behavior. The page snapshot shows only an empty app shell with no route that renders a SchemaForm for this schema, so it can't be checked in a browser. | - |
| C-69d9392a | not_testable | - | - | - | 1 | Criterion concerns pure function outputs (schemaToFields, fieldModel, formModel) with no known routed page that renders a schema; the snapshot shows only an empty SPA shell, so no UI path to exercise it. | - |
| C-9d1fffc7 | not_testable | - | - | - | 1 | The criterion is about the pure function schemaToFields; the page snapshot is only an empty SPA shell with no route that renders SchemaForm, so a browser test cannot call it. | - |
| C-412941ac | not_testable | - | - | - | 1 | The criterion concerns pure validation functions (schema validation with initialValues) with no known page route or UI exposing the "Every supported kind" schema; the page snapshot is just an empty SPA shell, so it cannot be checked end-to-end. | - |
| C-0e0cc641 | not_testable | - | - | - | 1 | No known page or route in the app renders a SchemaForm with the kind/tags schema, so a browser test can't reach this validation. It is only reachable through the library functions. | - |
| C-dc43ef5f | not_testable | - | - | - | 1 | Criterion targets the pure function validateValues (unit-level return values ok/errors.$form); the page snapshot is an empty SPA shell with no route exposing it, so no user-visible browser flow can check it. | - |
| C-08c4c2e4 | not_testable | - | - | - | 1 | The criterion targets the submitValues function with a send spy and a pure schema. The page snapshot is an empty app shell with no route that renders the "Every supported kind" schema form, so a browser test can't exercise it. It is a unit-level check. | - |
| C-61a6e3a3 | not_testable | - | - | - | 1 | The criterion is about a pure submit function's results for mocked rejections; the page snapshot is only an empty SPA shell with no route that exposes this behavior, so no e2e test can check it. | - |
| C-74fd23b0 | not_testable | - | - | - | 1 | Criterion checks source files (CSS, TSX, exported constants) and helper functions, not browser-observable behaviour; the page snapshot is an empty SPA shell with no data-kit route. | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-4ad6d2b9 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-efc9d8f0 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-98c49746 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3d1d3680 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-79a9fd48 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-629f74f4 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d83105ac | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bea5ecec | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-df0a8688 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-686289b8 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3bc08473 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-56d95a76 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8e9e0bb2 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-76ec796a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d3d35a1c | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-36608f1a | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-547ad66e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-832d250d | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a36860e0 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-78331251 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-69d9392a | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9d1fffc7 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-412941ac | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0e0cc641 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dc43ef5f | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-08c4c2e4 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-61a6e3a3 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-74fd23b0 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-4ad6d2b9 | web-data-kit › A cursor list loads one page at a time and appends the next › First page, then load more | pass | pass | the judge passed it and a discriminating test passes |
| C-efc9d8f0 | web-data-kit › A cursor list loads one page at a time and appends the next › Nothing to do | pass | pass | the judge passed it and a discriminating test passes |
| C-98c49746 | web-data-kit › A cursor list loads one page at a time and appends the next › Page size and subscribers | pass | needs_human | uncovered: the tests that trace it are inadequate or did not pass |
| C-3d1d3680 | web-data-kit › A failed page keeps the rows and a stale answer is dropped › Failed pages and retry | pass | pass | the judge passed it and a discriminating test passes |
| C-79a9fd48 | web-data-kit › A failed page keeps the rows and a stale answer is dropped › A stale answer after reset | pass | pass | the judge passed it and a discriminating test passes |
| C-629f74f4 | web-data-kit › A failed page keeps the rows and a stale answer is dropped › A malformed page | pass | pass | the judge passed it and a discriminating test passes |
| C-d83105ac | web-data-kit › The page fetcher speaks the cursor contract › Parsing and requesting | pass | pass | the judge passed it and a discriminating test passes |
| C-bea5ecec | web-data-kit › The page fetcher speaks the cursor contract › Bad body, item, query, client error | pass | pass | the judge passed it and a discriminating test passes |
| C-df0a8688 | web-data-kit › DataTable has a caption, scoped headers and a view for each state › The model | pass | pass | the judge passed it and a discriminating test passes |
| C-686289b8 | web-data-kit › DataTable has a caption, scoped headers and a view for each state › The view for every state | pass | pass | the judge passed it and a discriminating test passes |
| C-3bc08473 | web-data-kit › DataTable has a caption, scoped headers and a view for each state › Where focus goes | pass | pass | the judge passed it and a discriminating test passes |
| C-56d95a76 | web-data-kit › Envelope errors map to field messages › Field messages and unknown entries | pass | pass | the judge passed it and a discriminating test passes |
| C-8e9e0bb2 | web-data-kit › Envelope errors map to field messages › No usable details and other errors | pass | pass | the judge passed it and a discriminating test passes |
| C-76ec796a | web-data-kit › Envelope errors map to field messages › Hostile and oversized text | pass | pass | the judge passed it and a discriminating test passes |
| C-d3d35a1c | web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › Field ids | pass | pass | the judge passed it and a discriminating test passes |
| C-36608f1a | web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › Invalid fields and forms | pass | pass | the judge passed it and a discriminating test passes |
| C-547ad66e | web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › The form model, focus target and attempts | pass | pass | the judge passed it and a discriminating test passes |
| C-832d250d | web-data-kit › SchemaForm renders the supported JSON Schema subset as typed fields › Every supported kind | pass | pass | the judge passed it and a discriminating test passes |
| C-a36860e0 | web-data-kit › SchemaForm renders the supported JSON Schema subset as typed fields › Labels and hints | pass | pass | the judge passed it and a discriminating test passes |
| C-78331251 | web-data-kit › Anything outside the subset is a visible unsupported error › Unsupported properties | pass | pass | the judge passed it and a discriminating test passes |
| C-69d9392a | web-data-kit › Anything outside the subset is a visible unsupported error › Names, required and bounds | pass | pass | the judge passed it and a discriminating test passes |
| C-9d1fffc7 | web-data-kit › Anything outside the subset is a visible unsupported error › Root problems | pass | pass | the judge passed it and a discriminating test passes |
| C-412941ac | web-data-kit › Client-side validation mirrors the subset › Required, text and number rules | pass | pass | the judge passed it and a discriminating test passes |
| C-0e0cc641 | web-data-kit › Client-side validation mirrors the subset › Enum and list rules | pass | pass | the judge passed it and a discriminating test passes |
| C-dc43ef5f | web-data-kit › Client-side validation mirrors the subset › An unsupported part blocks the form | pass | pass | the judge passed it and a discriminating test passes |
| C-08c4c2e4 | web-data-kit › Submitting sends valid values once › Invalid input is not sent, valid input is sent once | pass | pass | the judge passed it and a discriminating test passes |
| C-61a6e3a3 | web-data-kit › Submitting sends valid values once › The server rejects | pass | pass | the judge passed it and a discriminating test passes |
| C-74fd23b0 | web-data-kit › The data components are documented, token-styled and free of inline styles › Styles, documentation and sources | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] UI criterion without an end-to-end test (criterion C-4ad6d2b9): No end-to-end test traces criterion C-4ad6d2b9 (web-data-kit › A cursor list loads one page at a time and appends the next › First page, then load more); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-efc9d8f0): No end-to-end test traces criterion C-efc9d8f0 (web-data-kit › A cursor list loads one page at a time and appends the next › Nothing to do); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-98c49746): No end-to-end test traces criterion C-98c49746 (web-data-kit › A cursor list loads one page at a time and appends the next › Page size and subscribers); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3d1d3680): No end-to-end test traces criterion C-3d1d3680 (web-data-kit › A failed page keeps the rows and a stale answer is dropped › Failed pages and retry); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-79a9fd48): No end-to-end test traces criterion C-79a9fd48 (web-data-kit › A failed page keeps the rows and a stale answer is dropped › A stale answer after reset); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-629f74f4): No end-to-end test traces criterion C-629f74f4 (web-data-kit › A failed page keeps the rows and a stale answer is dropped › A malformed page); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d83105ac): No end-to-end test traces criterion C-d83105ac (web-data-kit › The page fetcher speaks the cursor contract › Parsing and requesting); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-bea5ecec): No end-to-end test traces criterion C-bea5ecec (web-data-kit › The page fetcher speaks the cursor contract › Bad body, item, query, client error); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-df0a8688): No end-to-end test traces criterion C-df0a8688 (web-data-kit › DataTable has a caption, scoped headers and a view for each state › The model); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-686289b8): No end-to-end test traces criterion C-686289b8 (web-data-kit › DataTable has a caption, scoped headers and a view for each state › The view for every state); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3bc08473): No end-to-end test traces criterion C-3bc08473 (web-data-kit › DataTable has a caption, scoped headers and a view for each state › Where focus goes); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-56d95a76): No end-to-end test traces criterion C-56d95a76 (web-data-kit › Envelope errors map to field messages › Field messages and unknown entries); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-8e9e0bb2): No end-to-end test traces criterion C-8e9e0bb2 (web-data-kit › Envelope errors map to field messages › No usable details and other errors); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-76ec796a): No end-to-end test traces criterion C-76ec796a (web-data-kit › Envelope errors map to field messages › Hostile and oversized text); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d3d35a1c): No end-to-end test traces criterion C-d3d35a1c (web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › Field ids); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-36608f1a): No end-to-end test traces criterion C-36608f1a (web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › Invalid fields and forms); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-547ad66e): No end-to-end test traces criterion C-547ad66e (web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › The form model, focus target and attempts); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-832d250d): No end-to-end test traces criterion C-832d250d (web-data-kit › SchemaForm renders the supported JSON Schema subset as typed fields › Every supported kind); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a36860e0): No end-to-end test traces criterion C-a36860e0 (web-data-kit › SchemaForm renders the supported JSON Schema subset as typed fields › Labels and hints); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-78331251): No end-to-end test traces criterion C-78331251 (web-data-kit › Anything outside the subset is a visible unsupported error › Unsupported properties); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-69d9392a): No end-to-end test traces criterion C-69d9392a (web-data-kit › Anything outside the subset is a visible unsupported error › Names, required and bounds); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-9d1fffc7): No end-to-end test traces criterion C-9d1fffc7 (web-data-kit › Anything outside the subset is a visible unsupported error › Root problems); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-412941ac): No end-to-end test traces criterion C-412941ac (web-data-kit › Client-side validation mirrors the subset › Required, text and number rules); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0e0cc641): No end-to-end test traces criterion C-0e0cc641 (web-data-kit › Client-side validation mirrors the subset › Enum and list rules); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-dc43ef5f): No end-to-end test traces criterion C-dc43ef5f (web-data-kit › Client-side validation mirrors the subset › An unsupported part blocks the form); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-08c4c2e4): No end-to-end test traces criterion C-08c4c2e4 (web-data-kit › Submitting sends valid values once › Invalid input is not sent, valid input is sent once); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-61a6e3a3): No end-to-end test traces criterion C-61a6e3a3 (web-data-kit › Submitting sends valid values once › The server rejects); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-74fd23b0): No end-to-end test traces criterion C-74fd23b0 (web-data-kit › The data components are documented, token-styled and free of inline styles › Styles, documentation and sources); step 5 generates one.
- [major, judge] Load more after an empty page unmounts the focused button (spec gap) (criterion C-686289b8): After state (5) (loaded, no items, cursor c1), pressing Load more gives loading with no items. tableView returns body 'loading' and loadMore 'hidden', so the Load more button that has focus unmounts. focusAfterChange(loaded 0 c1, loading 0 c1) returns 'none', so keyboard focus is lost. This contradicts design Decision 4: Load more keeps focus while busy.
- [major, judge] An unsupported property `c` comes back with an empty name (spec gap) (criterion C-78331251): The passing test expects the unsupported fields of properties a..g to be named ["a","b","","d","e","f","g"]. Property `c` ({}), whose reason is 'the property has no type', loses its name. That property can no longer be identified, which goes against 'never drop a property silently'. The test pins this behaviour instead of catching it.
- [major, judge] task 1.1: no-op calls and loads do not settle with the request in flight (criterion C-efc9d8f0): Task 1.1 says any other call is a no-op that settles with the request in flight (if any). load(), loadMore() and retry() always return Promise.resolve() at once, both after starting a request and when doing nothing. Awaiting them does not wait for the page.
- [minor, judge] subscribe calls the listener at sign-up (spec gap) (criterion C-98c49746): subscribe() calls the listener synchronously before registering it, although nothing changed. The C-98c49746 test's expected sequence relies on this. Two reasonable implementations differ here.
- [minor, judge] A fetchPage rejection with null counts as an empty last page (spec gap) (criterion C-3d1d3680): onSettled uses `fault !== null` to tell failure from success. A promise rejected with null therefore commits `loaded` with no new items and nextCursor null, ending the list silently instead of going to error.
- [minor, judge] task 3.3: the submit button has aria-disabled="false" when not busy (criterion C-547ad66e): The task says aria-disabled="true" when busy. The code passes a boolean every time, so an enabled button renders aria-disabled="false".
- [minor, judge] DataTable.tsx keeps the stub comment, and the Load more button has no key (criterion C-686289b8): The scaffold comment 'Signature stub ...' is still the first line of the implemented file. The actions array holds a Load more button without a key next to a keyed retry button, which makes React warn.
- [major, judge] task 4.1: an enum property without type is not rendered as an enum: Task 4.1 says the enum kind is `enum` of texts with `type` absent or "string". parseProperty returns unsupported 'the property has no type' whenever `type` is missing, before it looks at `enum`. So `{ enum: ["a", "b"] }` becomes an unsupported field and the form is blocked.
- [minor, judge] task 4.1: a typeless property loses its name and label: For a property with no `type`, the unsupported field gets name "" and the label 'Field <i+1>', not the label from its title or name that task 4.1 describes. The visible error then does not say which property is faulty.
- [minor, judge] No scenario covers an enum property without type (spec gap) (criterion C-78331251): Nothing in the spec pins `{ enum: [...] }` with no `type`. The task text says it is supported, but the code makes it unsupported.
- [minor, judge] No scenario covers the name of a typeless property (spec gap) (criterion C-78331251): Scenario C-78331251 checks only the reason for `c: {}`. The code also blanks the field's name and replaces its label with 'Field <i+1>'.
- [minor, judge] the judge called a test inadequate (criterion C-98c49746): web.src.kit.data.cursor-list.test.ts::C-98c49746 page size and subscribers

## Needs a human

- UI criterion C-4ad6d2b9 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-efc9d8f0 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-98c49746 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-3d1d3680 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-79a9fd48 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-629f74f4 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-d83105ac has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-bea5ecec has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-df0a8688 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-686289b8 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-3bc08473 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-56d95a76 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-8e9e0bb2 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-76ec796a has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-d3d35a1c has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-36608f1a has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-547ad66e has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-832d250d has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-a36860e0 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-78331251 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-69d9392a has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-9d1fffc7 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-412941ac has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-0e0cc641 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-dc43ef5f has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-08c4c2e4 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-61a6e3a3 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-74fd23b0 has no end-to-end test (not_testable); see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.kit.data.cursor-list.test.ts::C-3d1d3680 failed pages and retry` (task 1.1): passed
- `web.src.kit.data.cursor-list.test.ts::C-4ad6d2b9 first page then load more` (task 1.1): passed
- `web.src.kit.data.cursor-list.test.ts::C-629f74f4 malformed page` (task 1.1): passed
- `web.src.kit.data.cursor-list.test.ts::C-79a9fd48 stale answer after reset` (task 1.1): passed
- `web.src.kit.data.cursor-list.test.ts::C-98c49746 page size and subscribers` (task 1.1): passed
- `web.src.kit.data.cursor-list.test.ts::C-efc9d8f0 nothing to do` (task 1.1): passed
- `web.src.kit.data.data-css.test.ts::C-74fd23b0 data css colours the parts as the design states` (task 2.1): passed
- `web.src.kit.data.data-css.test.ts::C-74fd23b0 data css holds the 16 classes and the target token` (task 2.1): passed
- `web.src.kit.data.data-css.test.ts::C-74fd23b0 data css sizes and spacing use the kit tokens` (task 2.1): passed
- `web.src.kit.data.data-css.test.ts::C-74fd23b0 data css uses only defined kit tokens and no raw colours` (task 2.1): passed
- `web.src.kit.data.data-keyboard.test.ts::C-74fd23b0 data component sources use no inline style and no raw HTML` (task 5.1): passed
- `web.src.kit.data.data-keyboard.test.ts::C-74fd23b0 data keyboard documents exactly the four components` (task 5.1): passed
- `web.src.kit.data.data-keyboard.test.ts::C-74fd23b0 data keyboard states the documented bindings` (task 5.1): passed
- `web.src.kit.data.data-table.test.ts::C-3bc08473 focusAfterChange names where focus moves after a change` (task 2.2): passed
- `web.src.kit.data.data-table.test.ts::C-686289b8 tableView gives every state its view` (task 2.2): passed
- `web.src.kit.data.data-table.test.ts::C-df0a8688 dataTableModel throws KIT_PROP_INVALID for a bad spec` (task 2.2): passed
- `web.src.kit.data.data-table.test.ts::C-df0a8688 dataTableModel trims a valid spec and fills the defaults` (task 2.2): passed
- `web.src.kit.data.field.test.ts::C-36608f1a fieldModel throws KitError for a spec it cannot trust` (task 3.2): passed
- `web.src.kit.data.field.test.ts::C-36608f1a isFieldName admits plain names and rejects every other shape` (task 3.2): passed
- `web.src.kit.data.field.test.ts::C-d3d35a1c fieldModel links hint and error ids to the control` (task 3.2): passed
- `web.src.kit.data.field.test.ts::C-d3d35a1c fieldModel trims a blank hint or error away and keeps the inline layout` (task 3.2): passed
- `web.src.kit.data.form-errors.test.ts::C-56d95a76 known fields take their message and unknown entries join the form message` (task 3.1): passed
- `web.src.kit.data.form-errors.test.ts::C-76ec796a a proto pseudo field never lands on the result object` (task 3.1): passed
- `web.src.kit.data.form-errors.test.ts::C-76ec796a hostile and oversized messages are shown unchanged or capped` (task 3.1): passed
- `web.src.kit.data.form-errors.test.ts::C-76ec796a messages and fields are cleaned and cut to their caps` (task 3.1): passed
- `web.src.kit.data.form-errors.test.ts::C-8e9e0bb2 unusable details and other codes keep the catalogue text` (task 3.1): passed
- `web.src.kit.data.form.test.ts::C-36608f1a formModel throws KitError for a blank label and a duplicate field` (task 3.3): passed
- `web.src.kit.data.form.test.ts::C-36608f1a formModel throws KitError outside the label submitLabel and fields bounds` (task 3.3): passed
- `web.src.kit.data.form.test.ts::C-547ad66e attemptFocus skips a busy attempt and repeats an earlier attempt` (task 3.3): passed
- `web.src.kit.data.form.test.ts::C-547ad66e focusTargetFor names the first invalid field, the form or none` (task 3.3): passed
- `web.src.kit.data.form.test.ts::C-547ad66e formModel builds the model of a valid spec in the enabled and busy states` (task 3.3): passed
- `web.src.kit.data.form.test.ts::C-547ad66e formModel lists the invalid fields in field order and drops a form only message` (task 3.3): passed
- `web.src.kit.data.page-fetcher.test.ts::C-bea5ecec bad body item query and client error` (task 1.2): passed
- `web.src.kit.data.page-fetcher.test.ts::C-d83105ac parseCursorPage accepts a well shaped page and rejects the rest` (task 1.2): passed
- `web.src.kit.data.page-fetcher.test.ts::C-d83105ac the fetcher asks for limit and cursor and returns the parsed page` (task 1.2): passed
- `web.src.kit.data.schema-fields.test.ts::C-69d9392a schemaToFields feeds fieldModel and formModel without prototype changes` (task 4.1): passed
- `web.src.kit.data.schema-fields.test.ts::C-69d9392a schemaToFields keeps every property and caps the derived text` (task 4.1): passed
- `web.src.kit.data.schema-fields.test.ts::C-69d9392a schemaToFields names a required property that has no schema` (task 4.1): passed
- `web.src.kit.data.schema-fields.test.ts::C-78331251 schemaToFields marks each unsupported property with its reason` (task 4.1): passed
- `web.src.kit.data.schema-fields.test.ts::C-832d250d schemaToFields types every supported kind in order` (task 4.1): passed
- `web.src.kit.data.schema-fields.test.ts::C-9d1fffc7 schemaToFields accepts an empty object schema and holds 100 properties` (task 4.1): passed
- `web.src.kit.data.schema-fields.test.ts::C-9d1fffc7 schemaToFields reports root problems without dropping fields` (task 4.1): passed
- `web.src.kit.data.schema-fields.test.ts::C-a36860e0 schemaToFields derives labels from names and caps hints` (task 4.1): passed
- `web.src.kit.data.schema-values.test.ts::C-08c4c2e4 submitValues sends valid values once and never invalid ones` (task 4.2): passed
- `web.src.kit.data.schema-values.test.ts::C-0e0cc641 validateValues checks enum options and string list lines` (task 4.2): passed
- `web.src.kit.data.schema-values.test.ts::C-412941ac validateValues applies the required, text and number rules` (task 4.2): passed
- `web.src.kit.data.schema-values.test.ts::C-61a6e3a3 submitValues maps a rejected send to field and form errors` (task 4.2): passed
- `web.src.kit.data.schema-values.test.ts::C-dc43ef5f an unsupported field or root problem blocks the form` (task 4.2): passed
