# Verification: openspec:add-web-data-kit: FAIL (round 2)

traceability: 28/28 criteria covered by a discriminating test

- Base: `ad020030cede9a1d1713e60f512d9cc976b64ccb`
- Head: `716d664987f86783c25987624e6ca22e9d9b8508`
- Implementer profiles: glm, deepseek-free
- Judge: claude-judge (claude-opus-5-5), 2 call(s), judged in 2 parts, prompt sha256 `8dc7d434cf0da9067e399f9682b1e6c43f00d973e68c85bf71b4dd7e928c915e`
  - part 1: 20 file(s), 116067 characters, profile claude-judge, reply valid
  - part 2: 5 file(s), 76937 characters, profile claude-judge, reply valid
- Judge replies of claude-judge (this unit, all rounds): valid 4, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), glm zhipu (declared), deepseek-free deepseek (declared)
- Cost: $2.7130

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base merged: main@ad020030ce as 716d664987 (1 commit) |
| 1 | integrity | ok | 70.4 | 10 sub-checks; scope: 34 changed file(s) |
| 2 | build | ok | 23.7 |  |
| 3 | tests | ok | 84.6 |  |
| 4 | traceability | ok | 0.1 | 28/28 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | ok | 95.8 | 28 not_testable |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/kit/data/DataTable.tsx, web/src/kit/data/Field.tsx, web/src/kit/data/Form.tsx, web/src/kit/data/SchemaForm.tsx, web/src/kit/data/cursor-list.ts and 8 more |
| 8 | s1 judge | ok | 2.6 | 27/28 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 209.8 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | FAIL |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261030T0126Z-8768/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261030T0126Z-8768/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261030T0126Z-8768/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261030T0126Z-8768/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261030T0126Z-8768/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261030T0126Z-8768/009-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261030T0126Z-8768/010-e2e.log |

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
| C-efc9d8f0 | web-data-kit › A cursor list loads one page at a time and appends the next › Nothing to do | covered | web.src.kit.data.cursor-list.test.ts::C-efc9d8f0 nothing to do (passed, red_assertion) | - | 0.87 | - |
| C-98c49746 | web-data-kit › A cursor list loads one page at a time and appends the next › Page size and subscribers | covered | web.src.kit.data.cursor-list.test.ts::C-98c49746 page size and subscribers (passed, red_assertion, inadequate) | - | 0.92 | - |
| C-3d1d3680 | web-data-kit › A failed page keeps the rows and a stale answer is dropped › Failed pages and retry | covered | web.src.kit.data.cursor-list.test.ts::C-3d1d3680 failed pages and retry (passed, red_assertion) | - | 0.92 | - |
| C-79a9fd48 | web-data-kit › A failed page keeps the rows and a stale answer is dropped › A stale answer after reset | covered | web.src.kit.data.cursor-list.test.ts::C-79a9fd48 stale answer after reset (passed, red_assertion) | - | 0.92 | - |
| C-629f74f4 | web-data-kit › A failed page keeps the rows and a stale answer is dropped › A malformed page | covered | web.src.kit.data.cursor-list.test.ts::C-629f74f4 malformed page (passed, red_assertion) | - | 0.86 | - |
| C-d83105ac | web-data-kit › The page fetcher speaks the cursor contract › Parsing and requesting | covered | web.src.kit.data.page-fetcher.test.ts::C-d83105ac parseCursorPage accepts a well shaped page and rejects the rest (passed, red_assertion); web.src.kit.data.page-fetcher.test.ts::C-d83105ac the fetcher asks for limit and cursor and returns the parsed page (passed, red_assertion) | - | 0.95 | - |
| C-bea5ecec | web-data-kit › The page fetcher speaks the cursor contract › Bad body, item, query, client error | covered | web.src.kit.data.page-fetcher.test.ts::C-bea5ecec bad body item query and client error (passed, red_assertion) | - | 0.92 | - |
| C-df0a8688 | web-data-kit › DataTable has a caption, scoped headers and a view for each state › The model | covered | web.src.kit.data.data-table.test.ts::C-df0a8688 dataTableModel throws KIT_PROP_INVALID for a bad spec (passed, red_assertion); web.src.kit.data.data-table.test.ts::C-df0a8688 dataTableModel trims a valid spec and fills the defaults (passed, red_assertion) | - | 0.93 | - |
| C-686289b8 | web-data-kit › DataTable has a caption, scoped headers and a view for each state › The view for every state | covered | web.src.kit.data.data-table.test.ts::C-686289b8 tableView gives every state its view (passed, red_assertion) | - | 0.94 | - |
| C-3bc08473 | web-data-kit › DataTable has a caption, scoped headers and a view for each state › Where focus goes | covered | web.src.kit.data.data-table.test.ts::C-3bc08473 focusAfterChange names where focus moves after a change (passed, red_assertion) | - | 0.93 | - |
| C-56d95a76 | web-data-kit › Envelope errors map to field messages › Field messages and unknown entries | covered | web.src.kit.data.form-errors.test.ts::C-56d95a76 known fields take their message and unknown entries join the form message (passed, red_assertion) | - | 0.95 | - |
| C-8e9e0bb2 | web-data-kit › Envelope errors map to field messages › No usable details and other errors | covered | web.src.kit.data.form-errors.test.ts::C-8e9e0bb2 unusable details and other codes keep the catalogue text (passed, red_assertion) | - | 0.93 | - |
| C-76ec796a | web-data-kit › Envelope errors map to field messages › Hostile and oversized text | covered | web.src.kit.data.form-errors.test.ts::C-76ec796a a proto pseudo field never lands on the result object (passed, red_assertion); web.src.kit.data.form-errors.test.ts::C-76ec796a hostile and oversized messages are shown unchanged or capped (passed, red_assertion); web.src.kit.data.form-errors.test.ts:... | - | 0.91 | - |
| C-d3d35a1c | web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › Field ids | covered | web.src.kit.data.field.test.ts::C-d3d35a1c fieldModel links hint and error ids to the control (passed, red_assertion); web.src.kit.data.field.test.ts::C-d3d35a1c fieldModel trims a blank hint or error away and keeps the inline layout (passed, red_assertion) | - | 0.85 | - |
| C-36608f1a | web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › Invalid fields and forms | covered | web.src.kit.data.field.test.ts::C-36608f1a fieldModel throws KitError for a spec it cannot trust (passed, red_assertion); web.src.kit.data.field.test.ts::C-36608f1a isFieldName admits plain names and rejects every other shape (passed, red_assertion); web.src.kit.data.form.test.ts::C-36608f1a formMod... | - | 0.93 | - |
| C-547ad66e | web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › The form model, focus target and attempts | covered | web.src.kit.data.form.test.ts::C-547ad66e attemptFocus skips a busy attempt and repeats an earlier attempt (passed, red_assertion); web.src.kit.data.form.test.ts::C-547ad66e focusTargetFor names the first invalid field, the form or none (passed, red_assertion); web.src.kit.data.form.test.ts::C-547ad... | - | - | - |
| C-832d250d | web-data-kit › SchemaForm renders the supported JSON Schema subset as typed fields › Every supported kind | covered | web.src.kit.data.schema-fields.test.ts::C-832d250d schemaToFields types every supported kind in order (passed, red_assertion) | - | 0.92 | - |
| C-a36860e0 | web-data-kit › SchemaForm renders the supported JSON Schema subset as typed fields › Labels and hints | covered | web.src.kit.data.schema-fields.test.ts::C-a36860e0 schemaToFields derives labels from names and caps hints (passed, red_assertion) | - | 0.91 | - |
| C-78331251 | web-data-kit › Anything outside the subset is a visible unsupported error › Unsupported properties | covered | web.src.kit.data.schema-fields.test.ts::C-78331251 schemaToFields marks each unsupported property with its reason (passed, red_assertion) | - | 0.91 | - |
| C-69d9392a | web-data-kit › Anything outside the subset is a visible unsupported error › Names, required and bounds | covered | web.src.kit.data.schema-fields.test.ts::C-69d9392a schemaToFields feeds fieldModel and formModel without prototype changes (passed, red_assertion); web.src.kit.data.schema-fields.test.ts::C-69d9392a schemaToFields keeps every property and caps the derived text (passed, red_assertion); web.src.kit.da... | - | 0.93 | - |
| C-9d1fffc7 | web-data-kit › Anything outside the subset is a visible unsupported error › Root problems | covered | web.src.kit.data.schema-fields.test.ts::C-9d1fffc7 schemaToFields accepts an empty object schema and holds 100 properties (passed, red_assertion); web.src.kit.data.schema-fields.test.ts::C-9d1fffc7 schemaToFields reports root problems without dropping fields (passed, red_assertion) | - | 0.84 | - |
| C-412941ac | web-data-kit › Client-side validation mirrors the subset › Required, text and number rules | covered | web.src.kit.data.schema-values.test.ts::C-412941ac validateValues applies the required, text and number rules (passed, red_assertion) | - | 0.89 | - |
| C-0e0cc641 | web-data-kit › Client-side validation mirrors the subset › Enum and list rules | covered | web.src.kit.data.schema-values.test.ts::C-0e0cc641 validateValues checks enum options and string list lines (passed, red_assertion) | - | 0.89 | - |
| C-dc43ef5f | web-data-kit › Client-side validation mirrors the subset › An unsupported part blocks the form | covered | web.src.kit.data.schema-values.test.ts::C-dc43ef5f an unsupported field or root problem blocks the form (passed, red_assertion) | - | 0.90 | - |
| C-08c4c2e4 | web-data-kit › Submitting sends valid values once › Invalid input is not sent, valid input is sent once | covered | web.src.kit.data.schema-values.test.ts::C-08c4c2e4 submitValues sends valid values once and never invalid ones (passed, red_assertion) | - | 0.93 | - |
| C-61a6e3a3 | web-data-kit › Submitting sends valid values once › The server rejects | covered | web.src.kit.data.schema-values.test.ts::C-61a6e3a3 submitValues maps a rejected send to field and form errors (passed, red_assertion) | - | 0.92 | - |
| C-74fd23b0 | web-data-kit › The data components are documented, token-styled and free of inline styles › Styles, documentation and sources | covered | web.src.kit.data.data-css.test.ts::C-74fd23b0 data css colours the parts as the design states (passed, red_assertion); web.src.kit.data.data-css.test.ts::C-74fd23b0 data css holds the 16 classes and the target token (passed, red_assertion); web.src.kit.data.data-css.test.ts::C-74fd23b0 data css size... | - | 0.93 | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-web-data-kit/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/ledger/r-20261029T2151Z-07ed.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/ledger/r-20261030T0021Z-b45b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/ledger/r-20261030T0116Z-3bb9.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/ledger/r-20261030T0121Z-07ef.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/verification.md` |  | none | exempt: harness, spec or documentation path |
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

946 of 946 passed, 0 failed, 0 errored, 0 skipped.
48 of 48 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-4ad6d2b9 | not_testable | - | - | - | 1 | The criterion covers a cursor-list state machine (createCursorList states and AbortSignal requests). The page snapshot shows no route that exposes it, so a browser test can't observe it. | - |
| C-efc9d8f0 | not_testable | - | - | - | 1 | The criterion is about the cursor list's programmatic API (loadMore/load/retry call counts on an idle list). The page snapshot is only an empty SPA shell with no route that exposes it, so a browser test can't drive or observe it. | - |
| C-98c49746 | not_testable | - | - | - | 1 | Criterion concerns the createCursorList module API (throws KitError, subscribers, getState identity); no user-visible page or route exposes it, so a browser e2e test cannot check it. | - |
| C-3d1d3680 | not_testable | - | - | - | 1 | Criterion concerns the createCursorList state machine (ApiRequestError instances, request cursors); the page snapshot is an empty app shell with no route exposing a DataTable, so it can't be checked through a browser. | - |
| C-79a9fd48 | not_testable | - | - | - | 1 | Criterion concerns the createCursorList module's abort signals and state transitions; the page snapshot is an empty SPA shell with no route exposing it, so a browser test can't drive it. | - |
| C-629f74f4 | not_testable | - | - | - | 1 | The criterion is about createCursorList state and ApiRequestError codes, which are internal API values. The page snapshot shows no route that renders a DataTable, so no user-visible outcome can be checked end to end. | - |
| C-d83105ac | not_testable | - | - | - | 1 | Criterion covers pure functions (parseCursorPage, page fetcher over a fake client) with no UI surface in the page; it is checked by unit tests, not a browser. | - |
| C-bea5ecec | not_testable | - | - | - | 1 | Criterion concerns the cursorPageFetcher function's promise rejections and thrown KitError, a non-UI module API; the page snapshot is an empty SPA shell with no route exposing it, so no browser-observable behavior exists. | - |
| C-df0a8688 | not_testable | - | - | - | 1 | dataTableModel is a pure function in the web bundle with no route or page exposing it. The page snapshot is an empty SPA shell, so a browser test can't reach it. A unit test covers this criterion. | - |
| C-686289b8 | not_testable | - | - | - | 1 | The criterion specifies a pure function (tableView) over state inputs; the page snapshot is an empty SPA shell with no known route that renders DataTable in all eight states, so it cannot be checked through the browser. | - |
| C-3bc08473 | not_testable | - | - | - | 1 | focusAfterChange is a pure internal function with no route or UI in the page snapshot (empty app shell); it can't be exercised through a browser. | - |
| C-56d95a76 | not_testable | - | - | - | 1 | mapEnvelopeErrors is a pure internal function with no page or route exposing it; the page snapshot is an empty SPA shell, so a browser test can't reach the criterion. | - |
| C-8e9e0bb2 | not_testable | - | - | - | 1 | The criterion covers mapEnvelopeErrors, a pure TypeScript function. The page snapshot shows only an empty app shell, and no UI route exposes the function, so a browser test cannot reach it. | - |
| C-76ec796a | not_testable | - | - | - | 1 | The criterion concerns a pure envelope-to-field-message mapping function (result object, $form, no own __proto__). The page snapshot shows only an empty SPA shell with no route exposing this, so a browser user cannot observe it. | - |
| C-d3d35a1c | not_testable | - | - | - | 1 | Criterion targets the pure fieldModel function's return values; the page snapshot is only the bare app shell with no route that renders a Field, so there's no user-visible surface to check. | - |
| C-36608f1a | not_testable | - | - | - | 1 | Criterion is about pure functions (isFieldName, fieldModel, formModel) throwing KitError; no page-visible behavior or exposed browser entry point, so a Playwright e2e cannot check it. | - |
| C-547ad66e | not_testable | - | - | - | 1 | Criterion specifies pure functions (formModel, focusTargetFor, attemptFocus) with no route or UI in the page snapshot; unit-level, not checkable end-to-end in a browser. | - |
| C-832d250d | not_testable | - | - | - | 1 | The criterion is about the pure function schemaToFields's return value. The page snapshot is an empty SPA shell with no known route that renders SchemaForm with this schema, so a browser test can't check it. | - |
| C-a36860e0 | not_testable | - | - | - | 1 | SchemaForm is a library component. The snapshot shows only an empty SPA shell, and no known route renders it with a chosen schema, so a browser test can't supply the dueDate/url schema. | - |
| C-78331251 | not_testable | - | - | - | 1 | The criterion is about the pure function schemaToFields; the page snapshot shows no route that renders a schema form, so no browser-visible path to it is known. | - |
| C-69d9392a | not_testable | - | - | - | 1 | Criterion is about pure functions (schemaToFields, fieldModel, formModel) outputs and prototype integrity; the page snapshot is a bare SPA shell with no route that renders SchemaForm, so no user-visible flow can be driven. | - |
| C-9d1fffc7 | not_testable | - | - | - | 1 | Criterion specifies the pure function schemaToFields; the page snapshot is an empty SPA shell with no route that renders SchemaForm with these schemas, so it can't be checked through the UI. | - |
| C-412941ac | not_testable | - | - | - | 1 | Criterion targets pure functions (schema validation with initialValues(parsed)); the page snapshot is an empty SPA shell with no known route rendering the "Every supported kind" schema form, so no browser-observable path exists. | - |
| C-0e0cc641 | not_testable | - | - | - | 1 | No known route renders a SchemaForm with kind/tags fields; the snapshot is an empty SPA shell, so no page can be driven. This is a unit-level validation contract. | - |
| C-dc43ef5f | not_testable | - | - | - | 1 | The criterion is about the pure function validateValues returning ok/errors.$form. The page snapshot is only an empty SPA shell with no known route that renders a SchemaForm, so a browser test can't reach it. | - |
| C-08c4c2e4 | not_testable | - | - | - | 1 | Criterion targets the pure function submitValues with a send spy; the page snapshot is an empty SPA shell with no known route rendering the "Every supported kind" schema, so it can't be exercised via browser UI. | - |
| C-61a6e3a3 | not_testable | - | - | - | 1 | The criterion concerns a pure function's results when an injected `send` rejects, covered by node unit tests. The page snapshot shows only an empty SPA shell with no route that exposes this behavior to a browser. | - |
| C-74fd23b0 | not_testable | - | - | - | 1 | Criterion checks source files, CSS and exported constants (static analysis); no user-visible browser behaviour to assert in an e2e test. | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-4ad6d2b9 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-efc9d8f0 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-98c49746 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3d1d3680 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-79a9fd48 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-629f74f4 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d83105ac | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bea5ecec | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-df0a8688 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-686289b8 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3bc08473 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-56d95a76 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8e9e0bb2 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-76ec796a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d3d35a1c | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-36608f1a | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-547ad66e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-832d250d | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a36860e0 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-78331251 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-69d9392a | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9d1fffc7 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-412941ac | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0e0cc641 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dc43ef5f | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-08c4c2e4 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-61a6e3a3 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-74fd23b0 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Answers to verdict questions

- Q-001 accept C-98c49746 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as the code stands. createCursorList rejects a pageSize that is not an integer or lies outside 1 to 200 with a KitError of code KIT_PROP_INVALID, so 0, 201 and 1.5 throw and 200 is accepted, and a list without pageSize falls back to DEFAULT_PAGE_SIZE, which is 50, so its f...
- Q-002 reject F-27dc58cb by agent (CLAUDECODE): This replaces the delegate's answer, which is right but covers the view only. Confirmed in the code. Load more after state (5) starts a request that keeps the items and nextCursor of the page before (cursor-list.ts:108-116), so the state is loading, no items, nextCursor "c1"; tableView (data-table.t...
- Q-003 reject F-78d50e72 by agent (CLAUDECODE): Confirmed: for a property without a type parseProperty (schema-fields.ts:283-287) blanks the name and replaces the label with "Field <i+1>", and SchemaForm shows that label above the unsupported error (SchemaForm.tsx:83-89), so the reader cannot tell which property is wrong. Task 4.1 makes an unsupp...
- Q-004 reject F-4c79e0be by agent (CLAUDECODE): This replaces the delegate's accept, which did not know the M2 caller and read the test conflict as covering every call; it covers only calls that start nothing. Confirmed: load, loadMore and retry return Promise.resolve() at once even when they start a request (cursor-list.ts:178-204), so awaiting ...
- Q-005 reject F-d49cb373 by agent (CLAUDECODE): Confirmed: parseProperty returns "the property has no type" (schema-fields.ts:283-287) before it looks at enum, so { enum: ["bug", "task"] } becomes an unsupported field and blocks the form. Task 4.1 defines the enum kind as enum of texts with type absent or "string", and only an enum with another t...
- Q-006 accept H-fe461ce5 by the delegate (claude-fable-5-1 via claude-code): The hold is waived. Criterion C-4ad6d2b9 is the scenario First page, then load more of the cursor list, which describes the states, items, cursors and requests of createCursorList, a plain state machine in cursor-list.ts with no markup of its own. The Node test for it creates a list with page size 2...
- Q-007 accept H-ee891db8 by agent (CLAUDECODE): The hold may be waived. Criterion C-efc9d8f0 is the scenario "Nothing to do": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no jo...
- Q-008 accept H-949d5558 by the delegate (claude-fable-5-1 via claude-code): The hold is waived. Criterion C-98c49746 is the scenario Page size and subscribers of the cursor list, which describes the module API of createCursorList: a pageSize outside 1 to 200 or not an integer throws a KitError of code KIT_PROP_INVALID, a list without pageSize asks for limit 50, a second sub...
- Q-009 accept H-c97509ef by agent (CLAUDECODE): The hold may be waived. Criterion C-3d1d3680 is the scenario "Failed pages and retry": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit ...
- Q-010 accept H-e034653d by agent (CLAUDECODE): The hold may be waived. Criterion C-79a9fd48 is the scenario "A stale answer after reset": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this u...
- Q-011 accept H-1632d223 by agent (CLAUDECODE): The hold may be waived. Criterion C-629f74f4 is the scenario "A malformed page": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no...
- Q-012 accept H-78854961 by agent (CLAUDECODE): The hold may be waived. Criterion C-d83105ac is the scenario "Parsing and requesting": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit ...
- Q-013 accept H-e3eeb0c7 by agent (CLAUDECODE): The hold may be waived. Criterion C-bea5ecec is the scenario "Bad body, item, query, client error": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, ...
- Q-014 accept H-5ffc170f by agent (CLAUDECODE): The hold may be waived. Criterion C-df0a8688 is the scenario "The model": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journe...
- Q-015 accept H-9e6818f7 by agent (CLAUDECODE): The hold may be waived. Criterion C-686289b8 is the scenario "The view for every state": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this uni...
- Q-016 accept H-6c2adf23 by agent (CLAUDECODE): The hold may be waived. Criterion C-3bc08473 is the scenario "Where focus goes": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no...
- Q-017 accept H-d3cb390d by agent (CLAUDECODE): The hold may be waived. Criterion C-56d95a76 is the scenario "Field messages and unknown entries": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, s...
- Q-018 accept H-52ff52d0 by agent (CLAUDECODE): The hold may be waived. Criterion C-8e9e0bb2 is the scenario "No usable details and other errors": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, s...
- Q-019 accept H-9be5d094 by agent (CLAUDECODE): The hold may be waived. Criterion C-76ec796a is the scenario "Hostile and oversized text": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this u...
- Q-020 accept H-9990db33 by agent (CLAUDECODE): The hold may be waived. Criterion C-d3d35a1c is the scenario "Field ids": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journe...
- Q-021 accept H-c7821b44 by agent (CLAUDECODE): The hold may be waived. Criterion C-36608f1a is the scenario "Invalid fields and forms": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this uni...
- Q-022 accept H-f819f6de by agent (CLAUDECODE): The hold may be waived. Criterion C-547ad66e is the scenario "The form model, focus target and attempts": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo r...
- Q-023 accept H-d81669ad by agent (CLAUDECODE): The hold may be waived. Criterion C-832d250d is the scenario "Every supported kind": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit ha...
- Q-024 accept H-a9305e9d by agent (CLAUDECODE): The hold may be waived. Criterion C-a36860e0 is the scenario "Labels and hints": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no...
- Q-025 accept H-9f575e04 by agent (CLAUDECODE): The hold may be waived. Criterion C-78331251 is the scenario "Unsupported properties": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit ...
- Q-026 accept H-b9b4b515 by agent (CLAUDECODE): The hold may be waived. Criterion C-69d9392a is the scenario "Names, required and bounds": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this u...
- Q-027 accept H-4f7f2c66 by agent (CLAUDECODE): The hold may be waived. Criterion C-9d1fffc7 is the scenario "Root problems": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no jo...
- Q-028 accept H-772da66c by agent (CLAUDECODE): The hold may be waived. Criterion C-412941ac is the scenario "Required, text and number rules": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so t...
- Q-029 accept H-12fc3427 by agent (CLAUDECODE): The hold may be waived. Criterion C-0e0cc641 is the scenario "Enum and list rules": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has...
- Q-030 accept H-74697ad6 by agent (CLAUDECODE): The hold may be waived. Criterion C-dc43ef5f is the scenario "An unsupported part blocks the form": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, ...
- Q-031 accept H-ca2dd6a8 by agent (CLAUDECODE): The hold may be waived. Criterion C-08c4c2e4 is the scenario "Invalid input is not sent, valid input is sent once": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a ...
- Q-032 accept H-979139da by agent (CLAUDECODE): The hold may be waived. Criterion C-61a6e3a3 is the scenario "The server rejects": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has ...
- Q-033 accept H-034ad64a by agent (CLAUDECODE): The hold may be waived. Criterion C-74fd23b0 is the scenario "Styles, documentation and sources": a check of source files (data.css, the .tsx files and the exported constants), which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rul...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-4ad6d2b9 | web-data-kit › A cursor list loads one page at a time and appends the next › First page, then load more | pass | pass | the judge passed it and a discriminating test passes |
| C-efc9d8f0 | web-data-kit › A cursor list loads one page at a time and appends the next › Nothing to do | pass | pass | the judge passed it and a discriminating test passes |
| C-98c49746 | web-data-kit › A cursor list loads one page at a time and appends the next › Page size and subscribers | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as the code stands. createCursorList rejects a pageSize that is not an integer or lies outside 1 to 200 with a KitError of code KIT_PROP_INVALID, so 0, 201 and 1.5 throw and 200 is accepted, and a list without pa... |
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
- [major, judge] task 1.1: load/loadMore/retry resolve before the request settles (criterion C-4ad6d2b9): Task 1.1 says a no-op call 'settles with the request in flight (if any)', which implies the method promises follow the request. Instead load(), loadMore() and retry() call start() and return Promise.resolve() at once, so `await list.load()` returns while the state is still `loading`, and a no-op call made while a request is in flight resolves at once instead of waiting for it.
- [minor, judge] load() promise settles before the page arrives (spec gap) (criterion C-4ad6d2b9): No scenario says when the promise returned by load() settles. The committed code resolves it immediately; an implementation that resolves after the page is applied would behave differently.
- [minor, judge] subscribe calls the listener immediately on sign-up (spec gap) (criterion C-98c49746): subscribe() calls the listener once synchronously before registering it, even though nothing changed. This is not in the task text, and it differs from a store that notifies only on changes.
- [minor, judge] A failed first page moves focus to the retry button (spec gap) (criterion C-3bc08473): focusAfterChange returns `retry` for any loading→error change, including the first page (no items). Design says 'a first page moves no focus', which a reader could apply to a failed first page as well. The scenarios only pin a failed load more.
- [minor, judge] mapEnvelopeErrors gives __proto__ an own key when the caller lists it (spec gap) (criterion C-76ec796a): fieldNameOf only checks `fields.includes(name)`. If the caller's field list contains "__proto__", then body/__proto__ is set as an own enumerable `__proto__` key through defineProperty. Another implementation could reject the name with isFieldName.
- [minor, judge] A query key present with value undefined is refused (spec gap) (criterion C-bea5ecec): cursorPageFetcher refuses a query that has `limit` or `cursor` as an own key even when its value is undefined (QueryValue allows undefined). The scenario pins only `{ limit: 5 }`.
- [minor, judge] task 3.2: stacked Field puts the error before the control (criterion C-d3d35a1c): Task 3.2 orders the stacked field as label, hint, control, error. Field.tsx renders label, then hint and error together, then the control, so the error comes before the control.
- [minor, judge] task 2.1: checkbox uses --ui-color-accent, outside the listed colour roles (criterion C-74fd23b0): Task 2.1 and design Decision 8 limit colours to the listed roles and to pairs that CONTRAST_PAIRS covers. .ui-checkbox uses accent-color: var(--ui-color-accent), which is not among them. The token is defined, since the token test passes.
- [minor, judge] task 1.2: parseCursorPage accepts non-plain objects (criterion C-d83105ac): Task 1.2 says parseCursorPage accepts a plain object. The code accepts any object that is not an array, such as a class instance or one with inherited items. The implementer's note says it parses with Object.hasOwn checks, but it does not.
- [minor, judge] DataTable Load more button has no key and the stub comment remains (criterion C-686289b8): In the actions array the Load more element has no `key` while retry has one, so React warns. DataTable.tsx still starts with the scaffold 'Signature stub' comment.
- [major, judge] task 4.1: an enum without a type is rejected instead of being an enum field (criterion C-832d250d): Task 4.1 says the enum kind has `type` absent or "string". parseProperty returns 'the property has no type' for every property without `type` before any enum handling, so `{ enum: ["a", "b"] }` becomes unsupported and blocks the form.
- [minor, judge] A property without a type loses its name and label (spec gap) (criterion C-78331251): The unsupported field for a property with no type gets name "" and the label 'Field <i+1>' even when the property name is valid (for example `c`). The user cannot tell which property is unsupported, which works against 'never drop a property silently'. Task 4.1 asks for the blank-name label only when a name fails isFieldName and is blank.
- [minor, judge] the judge called a test inadequate (criterion C-98c49746): web.src.kit.data.cursor-list.test.ts::C-98c49746 page size and subscribers
- [major, human] Load more after an empty page unmounts the focused button (spec gap) (criterion C-686289b8): After state (5) (loaded, no items, cursor c1), pressing Load more gives loading with no items. tableView returns body 'loading' and loadMore 'hidden', so the Load more button that has focus unmounts. focusAfterChange(loaded 0 c1, loading 0 c1) returns 'none', so keyboard focus is lost. This contradicts design Decision 4: Load more keeps focus while busy. [rejected by agent (CLAUDECODE) (This replaces the delegate's answer, which is right but covers the view only. Confirmed in the code. Load more after state (5) starts a request that keeps the items and nextCursor of the page before (cursor-lis...
- [major, human] An unsupported property `c` comes back with an empty name (spec gap) (criterion C-78331251): The passing test expects the unsupported fields of properties a..g to be named ["a","b","","d","e","f","g"]. Property `c` ({}), whose reason is 'the property has no type', loses its name. That property can no longer be identified, which goes against 'never drop a property silently'. The test pins this behaviour instead of catching it. [rejected by agent (CLAUDECODE) (Confirmed: for a property without a type parseProperty (schema-fields.ts:283-287) blanks the name and replaces the label with "Field <i+1>", and SchemaForm shows that label above the unsupported error (SchemaForm.tsx:83-89), so th...
- [major, human] task 1.1: no-op calls and loads do not settle with the request in flight (criterion C-efc9d8f0): Task 1.1 says any other call is a no-op that settles with the request in flight (if any). load(), loadMore() and retry() always return Promise.resolve() at once, both after starting a request and when doing nothing. Awaiting them does not wait for the page. [rejected by agent (CLAUDECODE) (This replaces the delegate's accept, which did not know the M2 caller and read the test conflict as covering every call; it covers only calls that start nothing. Confirmed: load, loadMore and retry return Promise.resolve() at once even when they start a request (cursor-list.ts:178-204), so awaiting them does...
- [major, human] task 4.1: an enum property without type is not rendered as an enum: Task 4.1 says the enum kind is `enum` of texts with `type` absent or "string". parseProperty returns unsupported 'the property has no type' whenever `type` is missing, before it looks at `enum`. So `{ enum: ["a", "b"] }` becomes an unsupported field and the form is blocked. [rejected by agent (CLAUDECODE) (Confirmed: parseProperty returns "the property has no type" (schema-fields.ts:283-287) before it looks at enum, so { enum: ["bug", "task"] } becomes an unsupported field and blocks the form. Task 4.1 defines the enum kind as enum of texts with type absent or "string", and only an enum with a...

## Fix unit

Fix unit 1 is created for these tasks:
- F-27dc58cb Load more after an empty page unmounts the focused button
- F-78d50e72 An unsupported property `c` comes back with an empty name
- F-4c79e0be task 1.1: no-op calls and loads do not settle with the request in flight
- F-d49cb373 task 4.1: an enum property without type is not rendered as an enum

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
