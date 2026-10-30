# Verification: openspec:add-web-data-kit: NEEDS_HUMAN (round 3)

traceability: 32/32 criteria covered by a discriminating test

- Base: `ad020030cede9a1d1713e60f512d9cc976b64ccb`
- Head: `7c601540a4666ea26653ffc6288021463c5a07f1`
- Implementer profiles: glm, deepseek-free
- Judge: claude-judge (claude-opus-5-5), 2 call(s), judged in 2 parts, prompt sha256 `7dbd0e710332f2cc08087a8a603b665cc1bb77200c79929b317a2d8690955f4e`
  - part 1: 21 file(s), 116809 characters, profile claude-judge, reply valid
  - part 2: 8 file(s), 94297 characters, profile claude-judge, reply valid
- Judge replies of claude-judge (this unit, all rounds): valid 6, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), glm zhipu (declared), deepseek-free deepseek (declared)
- Cost: $4.5202

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.8 | base main@ad020030ce contained |
| 1 | integrity | ok | 71.6 | 10 sub-checks; scope: 43 changed file(s) |
| 2 | build | ok | 23.8 |  |
| 3 | tests | ok | 84.8 |  |
| 4 | traceability | ok | 0.2 | 32/32 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | ok | 115.9 | 32 not_testable |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/kit/data/DataTable.tsx, web/src/kit/data/Field.tsx, web/src/kit/data/Form.tsx, web/src/kit/data/SchemaForm.tsx, web/src/kit/data/cursor-list.ts and 8 more |
| 8 | s1 judge | ok | 3.2 | 31/32 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 201.8 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261030T0126Z-8768/089-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261030T0126Z-8768/090-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261030T0126Z-8768/091-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261030T0126Z-8768/092-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261030T0126Z-8768/093-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261030T0126Z-8768/094-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261030T0126Z-8768/095-e2e.log |

## Files by part

- part 1: openspec/changes/add-web-data-kit-fix-1/.openspec.yaml (302 characters)
- part 1: web/src/kit/data/cursor-list.test.ts (24498 characters)
- part 1: web/src/kit/data/cursor-list.ts (6593 characters)
- part 1: web/src/kit/data/data.css (2586 characters)
- part 1: web/src/kit/data/data-css.test.ts (5467 characters)
- part 1: web/src/kit/data/data-keyboard.test.ts (3093 characters)
- part 1: web/src/kit/data/data-keyboard.ts (1093 characters)
- part 1: web/src/kit/data/data-table.test.ts (12552 characters)
- part 1: web/src/kit/data/data-table.ts (6444 characters)
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
- part 1: openspec/changes/add-web-data-kit-fix-1/proposal.md (4765 characters)
- part 2: web/src/kit/data/schema-fields.test.ts (14170 characters)
- part 2: web/src/kit/data/schema-fields.ts (14087 characters)
- part 2: web/src/kit/data/schema-values.test.ts (10769 characters)
- part 2: web/src/kit/data/schema-values.ts (7549 characters)
- part 2: web/src/kit/data/SchemaForm.tsx (7138 characters)
- part 2: openspec/changes/add-web-data-kit-fix-1/specs/web-data-kit/spec.md (2420 characters)
- part 2: openspec/changes/add-web-data-kit-fix-1/tasks.md (702 characters)
- part 2: openspec/changes/add-web-data-kit/tasks.md (37462 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 14 task(s): red and green compared |
| test path freeze | ok | 14 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/kit/data/DataTable.tsx, web/src/kit/data/Field.tsx, web/src/kit/data/Form.tsx, web/src/kit/data/SchemaForm.tsx, web/src/kit/data/cursor-list.test.ts (+18 more) |
| tdd history | ok | 14 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 861 of 861 base tests pass on the unit's code with its 10 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-4ad6d2b9 | web-data-kit › A cursor list loads one page at a time and appends the next › First page, then load more | covered | web.src.kit.data.cursor-list.test.ts::C-4ad6d2b9 first page then load more (passed, red_assertion) | - | 0.95 | - |
| C-efc9d8f0 | web-data-kit › A cursor list loads one page at a time and appends the next › Nothing to do | covered | web.src.kit.data.cursor-list.test.ts::C-efc9d8f0 C-247ad9d2 no-op calls settle at once while a request is in flight (passed, red_assertion); web.src.kit.data.cursor-list.test.ts::C-efc9d8f0 nothing to do (passed, red_assertion) | - | 0.77 | - |
| C-98c49746 | web-data-kit › A cursor list loads one page at a time and appends the next › Page size and subscribers | covered | web.src.kit.data.cursor-list.test.ts::C-98c49746 page size and subscribers (passed, red_assertion) | - | 0.91 | - |
| C-3d1d3680 | web-data-kit › A failed page keeps the rows and a stale answer is dropped › Failed pages and retry | covered | web.src.kit.data.cursor-list.test.ts::C-3d1d3680 failed pages and retry (passed, red_assertion) | - | 0.93 | - |
| C-79a9fd48 | web-data-kit › A failed page keeps the rows and a stale answer is dropped › A stale answer after reset | covered | web.src.kit.data.cursor-list.test.ts::C-79a9fd48 stale answer after reset (passed, red_assertion) | - | 0.92 | - |
| C-629f74f4 | web-data-kit › A failed page keeps the rows and a stale answer is dropped › A malformed page | covered | web.src.kit.data.cursor-list.test.ts::C-629f74f4 malformed page (passed, red_assertion) | - | 0.85 | - |
| C-d83105ac | web-data-kit › The page fetcher speaks the cursor contract › Parsing and requesting | covered | web.src.kit.data.page-fetcher.test.ts::C-d83105ac parseCursorPage accepts a well shaped page and rejects the rest (passed, red_assertion); web.src.kit.data.page-fetcher.test.ts::C-d83105ac the fetcher asks for limit and cursor and returns the parsed page (passed, red_assertion) | - | 0.95 | - |
| C-bea5ecec | web-data-kit › The page fetcher speaks the cursor contract › Bad body, item, query, client error | covered | web.src.kit.data.page-fetcher.test.ts::C-bea5ecec bad body item query and client error (passed, red_assertion) | - | 0.92 | - |
| C-df0a8688 | web-data-kit › DataTable has a caption, scoped headers and a view for each state › The model | covered | web.src.kit.data.data-table.test.ts::C-df0a8688 dataTableModel throws KIT_PROP_INVALID for a bad spec (passed, red_assertion); web.src.kit.data.data-table.test.ts::C-df0a8688 dataTableModel trims a valid spec and fills the defaults (passed, red_assertion) | - | 0.93 | - |
| C-686289b8 | web-data-kit › DataTable has a caption, scoped headers and a view for each state › The view for every state | covered | web.src.kit.data.data-table.test.ts::C-686289b8 C-ab5cf141 tableView keeps a load more after an empty page busy (passed, red_assertion); web.src.kit.data.data-table.test.ts::C-686289b8 tableView gives every state its view (passed, red_assertion) | - | 0.91 | - |
| C-3bc08473 | web-data-kit › DataTable has a caption, scoped headers and a view for each state › Where focus goes | covered | web.src.kit.data.data-table.test.ts::C-3bc08473 focusAfterChange names where focus moves after a change (passed, red_assertion) | - | 0.93 | - |
| C-56d95a76 | web-data-kit › Envelope errors map to field messages › Field messages and unknown entries | covered | web.src.kit.data.form-errors.test.ts::C-56d95a76 known fields take their message and unknown entries join the form message (passed, red_assertion) | - | 0.92 | - |
| C-8e9e0bb2 | web-data-kit › Envelope errors map to field messages › No usable details and other errors | covered | web.src.kit.data.form-errors.test.ts::C-8e9e0bb2 unusable details and other codes keep the catalogue text (passed, red_assertion) | - | 0.91 | - |
| C-76ec796a | web-data-kit › Envelope errors map to field messages › Hostile and oversized text | covered | web.src.kit.data.form-errors.test.ts::C-76ec796a a proto pseudo field never lands on the result object (passed, red_assertion); web.src.kit.data.form-errors.test.ts::C-76ec796a hostile and oversized messages are shown unchanged or capped (passed, red_assertion); web.src.kit.data.form-errors.test.ts:... | - | 0.91 | - |
| C-d3d35a1c | web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › Field ids | covered | web.src.kit.data.field.test.ts::C-d3d35a1c fieldModel links hint and error ids to the control (passed, red_assertion); web.src.kit.data.field.test.ts::C-d3d35a1c fieldModel trims a blank hint or error away and keeps the inline layout (passed, red_assertion) | - | 0.86 | - |
| C-36608f1a | web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › Invalid fields and forms | covered | web.src.kit.data.field.test.ts::C-36608f1a fieldModel throws KitError for a spec it cannot trust (passed, red_assertion); web.src.kit.data.field.test.ts::C-36608f1a isFieldName admits plain names and rejects every other shape (passed, red_assertion); web.src.kit.data.form.test.ts::C-36608f1a formMod... | - | 0.93 | - |
| C-547ad66e | web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › The form model, focus target and attempts | covered | web.src.kit.data.form.test.ts::C-547ad66e attemptFocus skips a busy attempt and repeats an earlier attempt (passed, red_assertion); web.src.kit.data.form.test.ts::C-547ad66e focusTargetFor names the first invalid field, the form or none (passed, red_assertion); web.src.kit.data.form.test.ts::C-547ad... | - | - | - |
| C-832d250d | web-data-kit › SchemaForm renders the supported JSON Schema subset as typed fields › Every supported kind | covered | web.src.kit.data.schema-fields.test.ts::C-832d250d schemaToFields types every supported kind in order (passed, red_assertion) | - | 0.92 | - |
| C-a36860e0 | web-data-kit › SchemaForm renders the supported JSON Schema subset as typed fields › Labels and hints | covered | web.src.kit.data.schema-fields.test.ts::C-a36860e0 schemaToFields derives labels from names and caps hints (passed, red_assertion) | - | 0.90 | - |
| C-78331251 | web-data-kit › Anything outside the subset is a visible unsupported error › Unsupported properties | covered | web.src.kit.data.schema-fields.test.ts::C-78331251 C-852bb719 schemaToFields labels an untyped property by its name (passed, red_assertion); web.src.kit.data.schema-fields.test.ts::C-78331251 schemaToFields marks each unsupported property with its reason (passed, red_assertion) | - | 0.91 | - |
| C-69d9392a | web-data-kit › Anything outside the subset is a visible unsupported error › Names, required and bounds | covered | web.src.kit.data.schema-fields.test.ts::C-69d9392a schemaToFields feeds fieldModel and formModel without prototype changes (passed, red_assertion); web.src.kit.data.schema-fields.test.ts::C-69d9392a schemaToFields keeps every property and caps the derived text (passed, red_assertion); web.src.kit.da... | - | 0.94 | - |
| C-9d1fffc7 | web-data-kit › Anything outside the subset is a visible unsupported error › Root problems | covered | web.src.kit.data.schema-fields.test.ts::C-9d1fffc7 schemaToFields accepts an empty object schema and holds 100 properties (passed, red_assertion); web.src.kit.data.schema-fields.test.ts::C-9d1fffc7 schemaToFields reports root problems without dropping fields (passed, red_assertion) | - | 0.84 | - |
| C-412941ac | web-data-kit › Client-side validation mirrors the subset › Required, text and number rules | covered | web.src.kit.data.schema-values.test.ts::C-412941ac validateValues applies the required, text and number rules (passed, red_assertion) | - | 0.89 | - |
| C-0e0cc641 | web-data-kit › Client-side validation mirrors the subset › Enum and list rules | covered | web.src.kit.data.schema-values.test.ts::C-0e0cc641 validateValues checks enum options and string list lines (passed, red_assertion) | - | 0.90 | - |
| C-dc43ef5f | web-data-kit › Client-side validation mirrors the subset › An unsupported part blocks the form | covered | web.src.kit.data.schema-values.test.ts::C-dc43ef5f an unsupported field or root problem blocks the form (passed, red_assertion) | - | 0.90 | - |
| C-08c4c2e4 | web-data-kit › Submitting sends valid values once › Invalid input is not sent, valid input is sent once | covered | web.src.kit.data.schema-values.test.ts::C-08c4c2e4 submitValues sends valid values once and never invalid ones (passed, red_assertion) | - | 0.93 | - |
| C-61a6e3a3 | web-data-kit › Submitting sends valid values once › The server rejects | covered | web.src.kit.data.schema-values.test.ts::C-61a6e3a3 submitValues maps a rejected send to field and form errors (passed, red_assertion) | - | 0.93 | - |
| C-74fd23b0 | web-data-kit › The data components are documented, token-styled and free of inline styles › Styles, documentation and sources | covered | web.src.kit.data.data-css.test.ts::C-74fd23b0 data css colours the parts as the design states (passed, red_assertion); web.src.kit.data.data-css.test.ts::C-74fd23b0 data css holds the 16 classes and the target token (passed, red_assertion); web.src.kit.data.data-css.test.ts::C-74fd23b0 data css size... | - | 0.93 | - |
| C-ab5cf141 | web-data-kit › DataTable has a caption, scoped headers and a view for each state — regression 1 › Load more after an empty page unmounts the focused button | covered | web.src.kit.data.data-table.test.ts::C-686289b8 C-ab5cf141 tableView keeps a load more after an empty page busy (passed, red_assertion); web.src.kit.data.data-table.test.ts::C-ab5cf141 focusAfterChange moves to the table when an empty page ends the list (passed, red_assertion) | - | 0.87 | - |
| C-852bb719 | web-data-kit › Anything outside the subset is a visible unsupported error — regression 1 › An unsupported property `c` comes back with an empty name | covered | web.src.kit.data.schema-fields.test.ts::C-78331251 C-852bb719 schemaToFields labels an untyped property by its name (passed, red_assertion) | - | 0.86 | - |
| C-247ad9d2 | web-data-kit › A cursor list loads one page at a time and appends the next — regression 1 › task 1.1: no-op calls and loads do not settle with the request in flight | covered | web.src.kit.data.cursor-list.test.ts::C-247ad9d2 load loadMore and retry settle with their request (passed, red_assertion); web.src.kit.data.cursor-list.test.ts::C-efc9d8f0 C-247ad9d2 no-op calls settle at once while a request is in flight (passed, red_assertion) | - | 0.92 | - |
| C-a0904f4d | web-data-kit › task 4.1: an enum property without type is not rendered as an enum — finding F-d49cb373 › task 4.1: an enum property without type is not rendered as an enum | covered | web.src.kit.data.schema-fields.test.ts::C-a0904f4d schemaToFields treats an enum without type as a text enum (passed, red_assertion) | - | 0.93 | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-web-data-kit-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit-fix-1/specs/web-data-kit/spec.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/evidence/round-2/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/evidence/round-2/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/evidence/round-2/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/ledger/r-20261029T2151Z-07ed.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/ledger/r-20261030T0021Z-b45b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/ledger/r-20261030T0116Z-3bb9.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/ledger/r-20261030T0121Z-07ef.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/ledger/r-20261030T0126Z-8768.jsonl` |  | none | exempt: harness, spec or documentation path |
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

952 of 952 passed, 0 failed, 0 errored, 0 skipped.
54 of 54 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-4ad6d2b9 | not_testable | - | - | - | 1 | The criterion covers the createCursorList state machine, a pure TypeScript API with injected fetchPage. The page snapshot shows only an empty app shell with no route that exposes this list, so no user-visible flow exists to check from a browser. | - |
| C-efc9d8f0 | not_testable | - | - | - | 1 | The criterion concerns the createCursorList API (call counts of fetchPage and state after redundant loadMore/load/retry calls). It has no stable page route or UI surface, and the page snapshot is an empty app shell, so a browser test can't drive it. | - |
| C-98c49746 | not_testable | - | - | - | 1 | Criterion concerns the createCursorList library API (pageSize validation, subscriber isolation, getState identity); the page snapshot shows only an empty SPA shell with no UI route exposing it, so a browser test can't check it. | - |
| C-3d1d3680 | not_testable | - | - | - | 1 | The criterion concerns the createCursorList state machine (unit-level API with injected fetchPage and error instances); the page snapshot is a bare app shell with no known route using DataTable, so it can't be driven through the browser. | - |
| C-79a9fd48 | not_testable | - | - | - | 1 | The criterion is about the createCursorList API (request signal aborts, stale answers dropped). The page snapshot shows only an empty root with no route that exercises it, so a browser test has nothing to drive. Node unit tests cover it. | - |
| C-629f74f4 | not_testable | - | - | - | 1 | Behavior is a cursor-list state-machine contract (INVALID_RESPONSE ApiRequestError on malformed pages); no known page route in the app exercises it, so it can't be checked through the browser UI. | - |
| C-d83105ac | not_testable | - | - | - | 1 | Pure module functions (parseCursorPage, page fetcher with fake client) checked via unit calls; no user-visible page behavior reachable in a browser. | - |
| C-bea5ecec | not_testable | - | - | - | 1 | Behavior concerns a library function (cursorPageFetcher) rejecting/throwing with ApiRequestError/KitError; no user-visible browser behavior or page route exposes it, so it is covered by unit tests, not e2e. | - |
| C-df0a8688 | not_testable | - | - | - | 1 | Criterion is about the pure dataTableModel function (unit-level inputs, returned object, thrown KitError); no page or route in the app exposes it, so a browser e2e test cannot check it. | - |
| C-686289b8 | not_testable | - | - | - | 1 | The criterion specifies a pure function (tableView) with eight state inputs; the page snapshot shows no route that renders DataTable with controllable states, so a browser test cannot drive them. | - |
| C-3bc08473 | not_testable | - | - | - | 1 | focusAfterChange is a pure internal function with no public page route in the SPA snapshot; the DataTable is not reachable at a known URL, so this input/output table can't be checked end-to-end. | - |
| C-56d95a76 | not_testable | - | - | - | 1 | mapEnvelopeErrors is a pure internal function with no route or UI reaching it from the page; the snapshot shows only an empty app shell, so a browser test can't check it. | - |
| C-8e9e0bb2 | not_testable | - | - | - | 1 | mapEnvelopeErrors is a pure library function with no route or UI in the app that exposes it; the page snapshot is an empty SPA shell, so a browser test cannot reach it. | - |
| C-76ec796a | not_testable | - | - | - | 1 | Criterion concerns a pure function mapping error envelopes to field messages (no own __proto__ in result); the page snapshot shows only an empty SPA shell with no route exposing it, so it can't be checked through the browser UI. | - |
| C-d3d35a1c | not_testable | - | - | - | 1 | Criterion specifies the return value of the pure function fieldModel; the page snapshot is only an empty SPA shell with no known route that renders Field, so it can't be checked through the browser. | - |
| C-36608f1a | not_testable | - | - | - | 1 | Criterion covers pure functions (isFieldName, fieldModel, formModel) throwing KitError; no user-visible behavior in the browser app, so it's a unit-level check, not an e2e one. | - |
| C-547ad66e | not_testable | - | - | - | 1 | Criterion specifies pure functions (formModel, focusTargetFor, attemptFocus) with no route or page in the app that exposes them; the page snapshot is an empty SPA shell, so a browser test can't call them. | - |
| C-832d250d | not_testable | - | - | - | 1 | The criterion is about the schemaToFields function's return value, not a user-visible page. The snapshot is a bare SPA shell with no known route that renders a SchemaForm for this schema, so a browser test can't check it. | - |
| C-a36860e0 | not_testable | - | - | - | 1 | SchemaForm is a library component that takes a schema prop. The snapshot shows only an empty SPA shell, and nothing shows a page or route that renders it with these properties, so a browser test has nothing to load. | - |
| C-78331251 | not_testable | - | - | - | 1 | The criterion is about the pure function schemaToFields; the page snapshot shows only an empty SPA shell with no known route that renders a SchemaForm with this schema, so it can't be checked through the browser. | - |
| C-69d9392a | not_testable | - | - | - | 1 | The criterion tests pure functions (schemaToFields, fieldModel, formModel) with inputs and prototype checks; the page snapshot is an empty SPA shell with no known route rendering SchemaForm, so no user-visible flow can be exercised. | - |
| C-9d1fffc7 | not_testable | - | - | - | 1 | The criterion is about the pure function schemaToFields, and the page snapshot shows no route that renders it with these inputs, so a browser test can't reach it. | - |
| C-412941ac | not_testable | - | - | - | 1 | Criterion targets a pure function (validate with initialValues) with no known route in the served app; the page snapshot is an empty SPA shell, so a browser test can't reach it. | - |
| C-0e0cc641 | not_testable | - | - | - | 1 | No route is shown that renders a SchemaForm with a `kind` enum and `tags` list; the snapshot is only an empty SPA shell, so there is nothing to drive in a browser. | - |
| C-dc43ef5f | not_testable | - | - | - | 1 | Criterion targets the pure function validateValues (unit-level return values ok/errors.$form); no page or route in the snapshot exposes it, only an empty app shell. | - |
| C-08c4c2e4 | not_testable | - | - | - | 1 | The criterion tests the pure function submitValues with a send spy and an injected raw key, which a browser can't do. The page snapshot shows no route that renders the schema form. | - |
| C-61a6e3a3 | not_testable | - | - | - | 1 | The criterion is about the return value of a non-UI submit helper when `send` rejects. The page snapshot is just an empty app shell with no route that exposes this behaviour, so a browser test cannot check it. | - |
| C-74fd23b0 | not_testable | - | - | - | 1 | Criterion inspects source files (data.css, tokens.css, DATA_KEYBOARD, .tsx sources) and helper functions, not browser-observable behaviour; the page snapshot is only an empty app shell. | - |
| C-ab5cf141 | not_testable | - | - | - | 1 | Criterion specifies pure functions tableView and focusAfterChange (unit-level inputs); the page snapshot is a bare app shell with no known route rendering DataTable, so it can't be exercised end-to-end. | - |
| C-852bb719 | not_testable | - | - | - | 1 | The criterion targets the pure schemaToFields function with a named test scenario; the page snapshot is just an empty app shell with no route that renders SchemaForm, so it can't be checked through the browser UI. | - |
| C-247ad9d2 | not_testable | - | - | - | 1 | Concerns promise settlement timing of the cursor-list API (load/loadMore/retry); the page snapshot is an empty SPA shell with no route exposing it, so no user-observable UI outcome exists. | - |
| C-a0904f4d | not_testable | - | - | - | 1 | The criterion is about the schemaToFields function's output (problems and fields). The page snapshot shows only an empty app shell, with no route that renders a SchemaForm for a given schema, so a browser test cannot reach it. | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-4ad6d2b9 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-efc9d8f0 | ok | 0.770 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-98c49746 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3d1d3680 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-79a9fd48 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-629f74f4 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d83105ac | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bea5ecec | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-df0a8688 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-686289b8 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3bc08473 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-56d95a76 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8e9e0bb2 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-76ec796a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d3d35a1c | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-36608f1a | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-547ad66e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-832d250d | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a36860e0 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-78331251 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-69d9392a | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9d1fffc7 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-412941ac | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0e0cc641 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dc43ef5f | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-08c4c2e4 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-61a6e3a3 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-74fd23b0 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ab5cf141 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-852bb719 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-247ad9d2 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a0904f4d | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Answers to verdict questions

- Q-001 accept C-98c49746 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as the code stands. createCursorList rejects a pageSize that is not an integer or lies outside 1 to 200 with a KitError of code KIT_PROP_INVALID, so 0, 201 and 1.5 throw and 200 is accepted, and a list without pageSize falls back to DEFAULT_PAGE_SIZE, which is 50, so its f...
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
| C-ab5cf141 | web-data-kit › DataTable has a caption, scoped headers and a view for each state — regression 1 › Load more after an empty page unmounts the focused button | pass | pass | the judge passed it and a discriminating test passes |
| C-852bb719 | web-data-kit › Anything outside the subset is a visible unsupported error — regression 1 › An unsupported property `c` comes back with an empty name | pass | pass | the judge passed it and a discriminating test passes |
| C-247ad9d2 | web-data-kit › A cursor list loads one page at a time and appends the next — regression 1 › task 1.1: no-op calls and loads do not settle with the request in flight | pass | pass | the judge passed it and a discriminating test passes |
| C-a0904f4d | web-data-kit › task 4.1: an enum property without type is not rendered as an enum — finding F-d49cb373 › task 4.1: an enum property without type is not rendered as an enum | pass | pass | the judge passed it and a discriminating test passes |

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
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-ab5cf141): No end-to-end test traces criterion C-ab5cf141 (web-data-kit › DataTable has a caption, scoped headers and a view for each state — regression 1 › Load more after an empty page unmounts the focused button); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-852bb719): No end-to-end test traces criterion C-852bb719 (web-data-kit › Anything outside the subset is a visible unsupported error — regression 1 › An unsupported property `c` comes back with an empty name); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-247ad9d2): No end-to-end test traces criterion C-247ad9d2 (web-data-kit › A cursor list loads one page at a time and appends the next — regression 1 › task 1.1: no-op calls and loads do not settle with the request in flight); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a0904f4d): No end-to-end test traces criterion C-a0904f4d (web-data-kit › task 4.1: an enum property without type is not rendered as an enum — finding F-d49cb373 › task 4.1: an enum property without type is not rendered as an enum); step 5 generates one.
- [minor, judge] subscribe calls the listener at once, before any change (spec gap) (criterion C-98c49746): CursorList.subscribe calls the new listener synchronously on sign-up (cursor-list.ts, subscribe: `listener();` before `listeners.add`), although no change has happened. The C-98c49746 test pins this behaviour by expecting ["one","two","one","two"]. A conventional external store notifies only on a change. React's useSyncExternalStore tolerates the extra call, but other callers can see a notification without a state change.
- [minor, judge] A failed Load more after an empty page gives body none (spec gap) (criterion C-686289b8): Take the state error with no items and nextCursor "c1", which follows a Load more after an empty page that fails. tableView treats it as error without items, so body is none, loadMore is hidden and retry is again. No scenario pins this state.
- [minor, judge] The Load more button has no React key (criterion C-686289b8): DataTable.tsx pushes the Load more button into the `actions` array without a `key`, while the retry button has key="retry". When both are rendered, React warns about a missing key in the list.
- [minor, judge] The scaffold stub comment is left in DataTable.tsx: DataTable.tsx still starts with '// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.' although the file is now implemented. The other files removed this comment.
- [minor, judge] task 3.2: in a stacked Field the error is rendered before the control: Task 3.2 lists the stacked Field markup as label, hint, the control from children, then the error p. Field.tsx renders the label, then the hint and the error together (`described`), then the control, so the error comes before the control.
- [minor, judge] Enum value with surrounding spaces is rejected (spec gap) (criterion C-0e0cc641): validateValues checks blank on the trimmed text but compares the untrimmed text with the options (`field.options.includes(text)`), so " bug " gives 'Choose one of the listed values'. Numbers are trimmed and other implementations could trim here too; no scenario pins it. SchemaForm uses a select, so this matters only to other callers.
- [minor, judge] Integer bounds that are not whole numbers are accepted and shown in messages as they are (spec gap) (criterion C-412941ac): rangeValue accepts any finite number for an integer field's minimum and maximum, so { type: 'integer', minimum: 1.5 } gives 'Enter a whole number of at least 1.5' for '1'. Another implementation could reject the schema instead. No scenario pins this.

## Needs a human

- UI criterion C-ab5cf141 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-852bb719 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-247ad9d2 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-a0904f4d has no end-to-end test (not_testable); see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.kit.data.cursor-list.test.ts::C-247ad9d2 load loadMore and retry settle with their request` (task 1.3): passed
- `web.src.kit.data.cursor-list.test.ts::C-3d1d3680 failed pages and retry` (task 1.1): passed
- `web.src.kit.data.cursor-list.test.ts::C-4ad6d2b9 first page then load more` (task 1.1): passed
- `web.src.kit.data.cursor-list.test.ts::C-629f74f4 malformed page` (task 1.1): passed
- `web.src.kit.data.cursor-list.test.ts::C-79a9fd48 stale answer after reset` (task 1.1): passed
- `web.src.kit.data.cursor-list.test.ts::C-98c49746 page size and subscribers` (task 1.1): passed
- `web.src.kit.data.cursor-list.test.ts::C-efc9d8f0 C-247ad9d2 no-op calls settle at once while a request is in flight` (task 1.3): passed
- `web.src.kit.data.cursor-list.test.ts::C-efc9d8f0 nothing to do` (task 1.1): passed
- `web.src.kit.data.data-css.test.ts::C-74fd23b0 data css colours the parts as the design states` (task 2.1): passed
- `web.src.kit.data.data-css.test.ts::C-74fd23b0 data css holds the 16 classes and the target token` (task 2.1): passed
- `web.src.kit.data.data-css.test.ts::C-74fd23b0 data css sizes and spacing use the kit tokens` (task 2.1): passed
- `web.src.kit.data.data-css.test.ts::C-74fd23b0 data css uses only defined kit tokens and no raw colours` (task 2.1): passed
- `web.src.kit.data.data-keyboard.test.ts::C-74fd23b0 data component sources use no inline style and no raw HTML` (task 5.1): passed
- `web.src.kit.data.data-keyboard.test.ts::C-74fd23b0 data keyboard documents exactly the four components` (task 5.1): passed
- `web.src.kit.data.data-keyboard.test.ts::C-74fd23b0 data keyboard states the documented bindings` (task 5.1): passed
- `web.src.kit.data.data-table.test.ts::C-3bc08473 focusAfterChange names where focus moves after a change` (task 2.2): passed
- `web.src.kit.data.data-table.test.ts::C-686289b8 C-ab5cf141 tableView keeps a load more after an empty page busy` (task 1.1): passed
- `web.src.kit.data.data-table.test.ts::C-686289b8 tableView gives every state its view` (task 2.2): passed
- `web.src.kit.data.data-table.test.ts::C-ab5cf141 focusAfterChange moves to the table when an empty page ends the list` (task 1.1): passed
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
- `web.src.kit.data.schema-fields.test.ts::C-78331251 C-852bb719 schemaToFields labels an untyped property by its name` (task 1.2): passed
- `web.src.kit.data.schema-fields.test.ts::C-78331251 schemaToFields marks each unsupported property with its reason` (task 4.1): passed
- `web.src.kit.data.schema-fields.test.ts::C-832d250d schemaToFields types every supported kind in order` (task 4.1): passed
- `web.src.kit.data.schema-fields.test.ts::C-9d1fffc7 schemaToFields accepts an empty object schema and holds 100 properties` (task 4.1): passed
- `web.src.kit.data.schema-fields.test.ts::C-9d1fffc7 schemaToFields reports root problems without dropping fields` (task 4.1): passed
- `web.src.kit.data.schema-fields.test.ts::C-a0904f4d schemaToFields treats an enum without type as a text enum` (task 1.4): passed
- `web.src.kit.data.schema-fields.test.ts::C-a36860e0 schemaToFields derives labels from names and caps hints` (task 4.1): passed
- `web.src.kit.data.schema-values.test.ts::C-08c4c2e4 submitValues sends valid values once and never invalid ones` (task 4.2): passed
