# Verification: openspec:add-web-data-kit: PASS (round 4)

traceability: 32/32 criteria covered by a discriminating test

- Base: `b01b0f04212ac950c71b741a895086a700ee0a56`
- Head: `8dee7a9ea41246ba3cd36b97bfe5ae777e98fc4c`
- Implementer profiles: glm, deepseek-free
- Judge: claude-judge (claude-opus-5-5), 2 call(s), judged in 2 parts, prompt sha256 `aad23065ba102e607f89ff8e95101a217ad237a8ebb20385591446ba63638fba`
  - part 1: 21 file(s), 116809 characters, profile claude-judge, reply valid
  - part 2: 8 file(s), 94297 characters, profile claude-judge, reply valid
- Judge replies of claude-judge (this unit, all rounds): valid 8, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), glm zhipu (declared), deepseek-free deepseek (declared)
- Cost: $2.6532

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base merged: main@b01b0f0421 as 8dee7a9ea4 (1 commit) |
| 1 | integrity | ok | 55.2 | 10 sub-checks; scope: 46 changed file(s) |
| 2 | build | ok | 13.8 |  |
| 3 | tests | ok | 55.8 |  |
| 4 | traceability | ok | 0.1 | 32/32 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | ok | 0.0 | 32 UI criteria waived by an accepted answer (L4-VER-067) |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/kit/data/DataTable.tsx, web/src/kit/data/Field.tsx, web/src/kit/data/Form.tsx, web/src/kit/data/SchemaForm.tsx, web/src/kit/data/cursor-list.ts and 8 more |
| 8 | s1 judge | ok | 3.2 | 31/32 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 184.9 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261030T0227Z-af38/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261030T0227Z-af38/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261030T0227Z-af38/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261030T0227Z-af38/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261030T0227Z-af38/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261030T0227Z-af38/009-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261030T0227Z-af38/010-e2e.log |

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
| C-efc9d8f0 | web-data-kit › A cursor list loads one page at a time and appends the next › Nothing to do | covered | web.src.kit.data.cursor-list.test.ts::C-efc9d8f0 C-247ad9d2 no-op calls settle at once while a request is in flight (passed, red_assertion); web.src.kit.data.cursor-list.test.ts::C-efc9d8f0 nothing to do (passed, red_assertion) | - | 0.79 | - |
| C-98c49746 | web-data-kit › A cursor list loads one page at a time and appends the next › Page size and subscribers | covered | web.src.kit.data.cursor-list.test.ts::C-98c49746 page size and subscribers (passed, red_assertion, inadequate) | - | 0.91 | - |
| C-3d1d3680 | web-data-kit › A failed page keeps the rows and a stale answer is dropped › Failed pages and retry | covered | web.src.kit.data.cursor-list.test.ts::C-3d1d3680 failed pages and retry (passed, red_assertion) | - | 0.93 | - |
| C-79a9fd48 | web-data-kit › A failed page keeps the rows and a stale answer is dropped › A stale answer after reset | covered | web.src.kit.data.cursor-list.test.ts::C-79a9fd48 stale answer after reset (passed, red_assertion) | - | 0.92 | - |
| C-629f74f4 | web-data-kit › A failed page keeps the rows and a stale answer is dropped › A malformed page | covered | web.src.kit.data.cursor-list.test.ts::C-629f74f4 malformed page (passed, red_assertion) | - | 0.84 | - |
| C-d83105ac | web-data-kit › The page fetcher speaks the cursor contract › Parsing and requesting | covered | web.src.kit.data.page-fetcher.test.ts::C-d83105ac parseCursorPage accepts a well shaped page and rejects the rest (passed, red_assertion); web.src.kit.data.page-fetcher.test.ts::C-d83105ac the fetcher asks for limit and cursor and returns the parsed page (passed, red_assertion) | - | 0.95 | - |
| C-bea5ecec | web-data-kit › The page fetcher speaks the cursor contract › Bad body, item, query, client error | covered | web.src.kit.data.page-fetcher.test.ts::C-bea5ecec bad body item query and client error (passed, red_assertion) | - | 0.92 | - |
| C-df0a8688 | web-data-kit › DataTable has a caption, scoped headers and a view for each state › The model | covered | web.src.kit.data.data-table.test.ts::C-df0a8688 dataTableModel throws KIT_PROP_INVALID for a bad spec (passed, red_assertion); web.src.kit.data.data-table.test.ts::C-df0a8688 dataTableModel trims a valid spec and fills the defaults (passed, red_assertion) | - | 0.93 | - |
| C-686289b8 | web-data-kit › DataTable has a caption, scoped headers and a view for each state › The view for every state | covered | web.src.kit.data.data-table.test.ts::C-686289b8 C-ab5cf141 tableView keeps a load more after an empty page busy (passed, red_assertion); web.src.kit.data.data-table.test.ts::C-686289b8 tableView gives every state its view (passed, red_assertion) | - | 0.91 | - |
| C-3bc08473 | web-data-kit › DataTable has a caption, scoped headers and a view for each state › Where focus goes | covered | web.src.kit.data.data-table.test.ts::C-3bc08473 focusAfterChange names where focus moves after a change (passed, red_assertion) | - | 0.93 | - |
| C-56d95a76 | web-data-kit › Envelope errors map to field messages › Field messages and unknown entries | covered | web.src.kit.data.form-errors.test.ts::C-56d95a76 known fields take their message and unknown entries join the form message (passed, red_assertion) | - | 0.91 | - |
| C-8e9e0bb2 | web-data-kit › Envelope errors map to field messages › No usable details and other errors | covered | web.src.kit.data.form-errors.test.ts::C-8e9e0bb2 unusable details and other codes keep the catalogue text (passed, red_assertion) | - | 0.90 | - |
| C-76ec796a | web-data-kit › Envelope errors map to field messages › Hostile and oversized text | covered | web.src.kit.data.form-errors.test.ts::C-76ec796a a proto pseudo field never lands on the result object (passed, red_assertion); web.src.kit.data.form-errors.test.ts::C-76ec796a hostile and oversized messages are shown unchanged or capped (passed, red_assertion); web.src.kit.data.form-errors.test.ts:... | - | 0.91 | - |
| C-d3d35a1c | web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › Field ids | covered | web.src.kit.data.field.test.ts::C-d3d35a1c fieldModel links hint and error ids to the control (passed, red_assertion); web.src.kit.data.field.test.ts::C-d3d35a1c fieldModel trims a blank hint or error away and keeps the inline layout (passed, red_assertion) | - | 0.84 | - |
| C-36608f1a | web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › Invalid fields and forms | covered | web.src.kit.data.field.test.ts::C-36608f1a fieldModel throws KitError for a spec it cannot trust (passed, red_assertion); web.src.kit.data.field.test.ts::C-36608f1a isFieldName admits plain names and rejects every other shape (passed, red_assertion); web.src.kit.data.form.test.ts::C-36608f1a formMod... | - | 0.93 | - |
| C-547ad66e | web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › The form model, focus target and attempts | covered | web.src.kit.data.form.test.ts::C-547ad66e attemptFocus skips a busy attempt and repeats an earlier attempt (passed, red_assertion); web.src.kit.data.form.test.ts::C-547ad66e focusTargetFor names the first invalid field, the form or none (passed, red_assertion); web.src.kit.data.form.test.ts::C-547ad... | - | - | - |
| C-832d250d | web-data-kit › SchemaForm renders the supported JSON Schema subset as typed fields › Every supported kind | covered | web.src.kit.data.schema-fields.test.ts::C-832d250d schemaToFields types every supported kind in order (passed, red_assertion) | - | 0.92 | - |
| C-a36860e0 | web-data-kit › SchemaForm renders the supported JSON Schema subset as typed fields › Labels and hints | covered | web.src.kit.data.schema-fields.test.ts::C-a36860e0 schemaToFields derives labels from names and caps hints (passed, red_assertion) | - | 0.91 | - |
| C-78331251 | web-data-kit › Anything outside the subset is a visible unsupported error › Unsupported properties | covered | web.src.kit.data.schema-fields.test.ts::C-78331251 C-852bb719 schemaToFields labels an untyped property by its name (passed, red_assertion); web.src.kit.data.schema-fields.test.ts::C-78331251 schemaToFields marks each unsupported property with its reason (passed, red_assertion) | - | 0.90 | - |
| C-69d9392a | web-data-kit › Anything outside the subset is a visible unsupported error › Names, required and bounds | covered | web.src.kit.data.schema-fields.test.ts::C-69d9392a schemaToFields feeds fieldModel and formModel without prototype changes (passed, red_assertion); web.src.kit.data.schema-fields.test.ts::C-69d9392a schemaToFields keeps every property and caps the derived text (passed, red_assertion); web.src.kit.da... | - | 0.94 | - |
| C-9d1fffc7 | web-data-kit › Anything outside the subset is a visible unsupported error › Root problems | covered | web.src.kit.data.schema-fields.test.ts::C-9d1fffc7 schemaToFields accepts an empty object schema and holds 100 properties (passed, red_assertion); web.src.kit.data.schema-fields.test.ts::C-9d1fffc7 schemaToFields reports root problems without dropping fields (passed, red_assertion) | - | 0.85 | - |
| C-412941ac | web-data-kit › Client-side validation mirrors the subset › Required, text and number rules | covered | web.src.kit.data.schema-values.test.ts::C-412941ac validateValues applies the required, text and number rules (passed, red_assertion) | - | 0.89 | - |
| C-0e0cc641 | web-data-kit › Client-side validation mirrors the subset › Enum and list rules | covered | web.src.kit.data.schema-values.test.ts::C-0e0cc641 validateValues checks enum options and string list lines (passed, red_assertion) | - | 0.90 | - |
| C-dc43ef5f | web-data-kit › Client-side validation mirrors the subset › An unsupported part blocks the form | covered | web.src.kit.data.schema-values.test.ts::C-dc43ef5f an unsupported field or root problem blocks the form (passed, red_assertion) | - | 0.90 | - |
| C-08c4c2e4 | web-data-kit › Submitting sends valid values once › Invalid input is not sent, valid input is sent once | covered | web.src.kit.data.schema-values.test.ts::C-08c4c2e4 submitValues sends valid values once and never invalid ones (passed, red_assertion) | - | 0.93 | - |
| C-61a6e3a3 | web-data-kit › Submitting sends valid values once › The server rejects | covered | web.src.kit.data.schema-values.test.ts::C-61a6e3a3 submitValues maps a rejected send to field and form errors (passed, red_assertion) | - | 0.92 | - |
| C-74fd23b0 | web-data-kit › The data components are documented, token-styled and free of inline styles › Styles, documentation and sources | covered | web.src.kit.data.data-css.test.ts::C-74fd23b0 data css colours the parts as the design states (passed, red_assertion); web.src.kit.data.data-css.test.ts::C-74fd23b0 data css holds the 16 classes and the target token (passed, red_assertion); web.src.kit.data.data-css.test.ts::C-74fd23b0 data css size... | - | 0.93 | - |
| C-ab5cf141 | web-data-kit › DataTable has a caption, scoped headers and a view for each state — regression 1 › Load more after an empty page unmounts the focused button | covered | web.src.kit.data.data-table.test.ts::C-686289b8 C-ab5cf141 tableView keeps a load more after an empty page busy (passed, red_assertion); web.src.kit.data.data-table.test.ts::C-ab5cf141 focusAfterChange moves to the table when an empty page ends the list (passed, red_assertion) | - | 0.86 | - |
| C-852bb719 | web-data-kit › Anything outside the subset is a visible unsupported error — regression 1 › An unsupported property `c` comes back with an empty name | covered | web.src.kit.data.schema-fields.test.ts::C-78331251 C-852bb719 schemaToFields labels an untyped property by its name (passed, red_assertion) | - | 0.88 | - |
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
| `openspec/changes/add-web-data-kit/.l4/evidence/round-3/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/evidence/round-3/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-data-kit/.l4/evidence/round-3/verification.md` |  | none | exempt: harness, spec or documentation path |
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
| C-4ad6d2b9 | waived | - | - | - | 0 | waived by Q-006 | - |
| C-efc9d8f0 | waived | - | - | - | 0 | waived by Q-007 | - |
| C-98c49746 | waived | - | - | - | 0 | waived by Q-008 | - |
| C-3d1d3680 | waived | - | - | - | 0 | waived by Q-009 | - |
| C-79a9fd48 | waived | - | - | - | 0 | waived by Q-010 | - |
| C-629f74f4 | waived | - | - | - | 0 | waived by Q-011 | - |
| C-d83105ac | waived | - | - | - | 0 | waived by Q-012 | - |
| C-bea5ecec | waived | - | - | - | 0 | waived by Q-013 | - |
| C-df0a8688 | waived | - | - | - | 0 | waived by Q-014 | - |
| C-686289b8 | waived | - | - | - | 0 | waived by Q-015 | - |
| C-3bc08473 | waived | - | - | - | 0 | waived by Q-016 | - |
| C-56d95a76 | waived | - | - | - | 0 | waived by Q-017 | - |
| C-8e9e0bb2 | waived | - | - | - | 0 | waived by Q-018 | - |
| C-76ec796a | waived | - | - | - | 0 | waived by Q-019 | - |
| C-d3d35a1c | waived | - | - | - | 0 | waived by Q-020 | - |
| C-36608f1a | waived | - | - | - | 0 | waived by Q-021 | - |
| C-547ad66e | waived | - | - | - | 0 | waived by Q-022 | - |
| C-832d250d | waived | - | - | - | 0 | waived by Q-023 | - |
| C-a36860e0 | waived | - | - | - | 0 | waived by Q-024 | - |
| C-78331251 | waived | - | - | - | 0 | waived by Q-025 | - |
| C-69d9392a | waived | - | - | - | 0 | waived by Q-026 | - |
| C-9d1fffc7 | waived | - | - | - | 0 | waived by Q-027 | - |
| C-412941ac | waived | - | - | - | 0 | waived by Q-028 | - |
| C-0e0cc641 | waived | - | - | - | 0 | waived by Q-029 | - |
| C-dc43ef5f | waived | - | - | - | 0 | waived by Q-030 | - |
| C-08c4c2e4 | waived | - | - | - | 0 | waived by Q-031 | - |
| C-61a6e3a3 | waived | - | - | - | 0 | waived by Q-032 | - |
| C-74fd23b0 | waived | - | - | - | 0 | waived by Q-033 | - |
| C-ab5cf141 | waived | - | - | - | 0 | waived by Q-034 | - |
| C-852bb719 | waived | - | - | - | 0 | waived by Q-035 | - |
| C-247ad9d2 | waived | - | - | - | 0 | waived by Q-036 | - |
| C-a0904f4d | waived | - | - | - | 0 | waived by Q-037 | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-4ad6d2b9 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-efc9d8f0 | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-98c49746 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3d1d3680 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-79a9fd48 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-629f74f4 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d83105ac | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bea5ecec | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-df0a8688 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-686289b8 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3bc08473 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-56d95a76 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8e9e0bb2 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-76ec796a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d3d35a1c | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-36608f1a | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-547ad66e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-832d250d | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a36860e0 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-78331251 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-69d9392a | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9d1fffc7 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-412941ac | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0e0cc641 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dc43ef5f | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-08c4c2e4 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-61a6e3a3 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-74fd23b0 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ab5cf141 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-852bb719 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-247ad9d2 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a0904f4d | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Answers to verdict questions

- Q-001 accept C-98c49746 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as the code stands. createCursorList rejects a pageSize that is not an integer or lies outside 1 to 200 with a KitError of code KIT_PROP_INVALID, so 0, 201 and 1.5 throw and 200 is accepted, and a list without pageSize falls back to DEFAULT_PAGE_SIZE, which is 50, so its f...

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

- [minor, deterministic] UI criterion without an end-to-end test (criterion C-4ad6d2b9): No end-to-end test traces criterion C-4ad6d2b9 (web-data-kit › A cursor list loads one page at a time and appends the next › First page, then load more); waived by Q-006, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-efc9d8f0): No end-to-end test traces criterion C-efc9d8f0 (web-data-kit › A cursor list loads one page at a time and appends the next › Nothing to do); waived by Q-007, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-98c49746): No end-to-end test traces criterion C-98c49746 (web-data-kit › A cursor list loads one page at a time and appends the next › Page size and subscribers); waived by Q-008, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3d1d3680): No end-to-end test traces criterion C-3d1d3680 (web-data-kit › A failed page keeps the rows and a stale answer is dropped › Failed pages and retry); waived by Q-009, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-79a9fd48): No end-to-end test traces criterion C-79a9fd48 (web-data-kit › A failed page keeps the rows and a stale answer is dropped › A stale answer after reset); waived by Q-010, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-629f74f4): No end-to-end test traces criterion C-629f74f4 (web-data-kit › A failed page keeps the rows and a stale answer is dropped › A malformed page); waived by Q-011, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d83105ac): No end-to-end test traces criterion C-d83105ac (web-data-kit › The page fetcher speaks the cursor contract › Parsing and requesting); waived by Q-012, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-bea5ecec): No end-to-end test traces criterion C-bea5ecec (web-data-kit › The page fetcher speaks the cursor contract › Bad body, item, query, client error); waived by Q-013, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-df0a8688): No end-to-end test traces criterion C-df0a8688 (web-data-kit › DataTable has a caption, scoped headers and a view for each state › The model); waived by Q-014, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-686289b8): No end-to-end test traces criterion C-686289b8 (web-data-kit › DataTable has a caption, scoped headers and a view for each state › The view for every state); waived by Q-015, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3bc08473): No end-to-end test traces criterion C-3bc08473 (web-data-kit › DataTable has a caption, scoped headers and a view for each state › Where focus goes); waived by Q-016, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-56d95a76): No end-to-end test traces criterion C-56d95a76 (web-data-kit › Envelope errors map to field messages › Field messages and unknown entries); waived by Q-017, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-8e9e0bb2): No end-to-end test traces criterion C-8e9e0bb2 (web-data-kit › Envelope errors map to field messages › No usable details and other errors); waived by Q-018, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-76ec796a): No end-to-end test traces criterion C-76ec796a (web-data-kit › Envelope errors map to field messages › Hostile and oversized text); waived by Q-019, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d3d35a1c): No end-to-end test traces criterion C-d3d35a1c (web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › Field ids); waived by Q-020, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-36608f1a): No end-to-end test traces criterion C-36608f1a (web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › Invalid fields and forms); waived by Q-021, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-547ad66e): No end-to-end test traces criterion C-547ad66e (web-data-kit › Fields link their hint and error, and focus goes to the first invalid field › The form model, focus target and attempts); waived by Q-022, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-832d250d): No end-to-end test traces criterion C-832d250d (web-data-kit › SchemaForm renders the supported JSON Schema subset as typed fields › Every supported kind); waived by Q-023, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a36860e0): No end-to-end test traces criterion C-a36860e0 (web-data-kit › SchemaForm renders the supported JSON Schema subset as typed fields › Labels and hints); waived by Q-024, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-78331251): No end-to-end test traces criterion C-78331251 (web-data-kit › Anything outside the subset is a visible unsupported error › Unsupported properties); waived by Q-025, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-69d9392a): No end-to-end test traces criterion C-69d9392a (web-data-kit › Anything outside the subset is a visible unsupported error › Names, required and bounds); waived by Q-026, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-9d1fffc7): No end-to-end test traces criterion C-9d1fffc7 (web-data-kit › Anything outside the subset is a visible unsupported error › Root problems); waived by Q-027, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-412941ac): No end-to-end test traces criterion C-412941ac (web-data-kit › Client-side validation mirrors the subset › Required, text and number rules); waived by Q-028, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0e0cc641): No end-to-end test traces criterion C-0e0cc641 (web-data-kit › Client-side validation mirrors the subset › Enum and list rules); waived by Q-029, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-dc43ef5f): No end-to-end test traces criterion C-dc43ef5f (web-data-kit › Client-side validation mirrors the subset › An unsupported part blocks the form); waived by Q-030, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-08c4c2e4): No end-to-end test traces criterion C-08c4c2e4 (web-data-kit › Submitting sends valid values once › Invalid input is not sent, valid input is sent once); waived by Q-031, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-61a6e3a3): No end-to-end test traces criterion C-61a6e3a3 (web-data-kit › Submitting sends valid values once › The server rejects); waived by Q-032, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-74fd23b0): No end-to-end test traces criterion C-74fd23b0 (web-data-kit › The data components are documented, token-styled and free of inline styles › Styles, documentation and sources); waived by Q-033, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-ab5cf141): No end-to-end test traces criterion C-ab5cf141 (web-data-kit › DataTable has a caption, scoped headers and a view for each state — regression 1 › Load more after an empty page unmounts the focused button); waived by Q-034, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-852bb719): No end-to-end test traces criterion C-852bb719 (web-data-kit › Anything outside the subset is a visible unsupported error — regression 1 › An unsupported property `c` comes back with an empty name); waived by Q-035, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-247ad9d2): No end-to-end test traces criterion C-247ad9d2 (web-data-kit › A cursor list loads one page at a time and appends the next — regression 1 › task 1.1: no-op calls and loads do not settle with the request in flight); waived by Q-036, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a0904f4d): No end-to-end test traces criterion C-a0904f4d (web-data-kit › task 4.1: an enum property without type is not rendered as an enum — finding F-d49cb373 › task 4.1: an enum property without type is not rendered as an enum); waived by Q-037, step 5 generates none.
- [minor, judge] subscribe() calls the listener at once at sign-up, without a change (spec gap) (criterion C-98c49746): cursor-list.ts subscribe() calls listener() synchronously before adding it to the set. No change has happened at that point. The test C-98c49746 relies on this extra call: it expects marked to be one, two, one, two after a single commit.
- [minor, judge] A failed load more after an empty page shows no body (spec gap) (criterion C-686289b8): For error with no items and nextCursor "c1" (a Load more after an empty page that failed), tableView gives body none. The state before it, (5), showed body rows with 0 rows. No scenario pins this state, and another implementation could keep rows.
- [minor, judge] Load more button in the actions array has no React key (criterion C-686289b8): DataTable.tsx pushes the Load more <button> into the actions array without a key, while the retry button has key="retry". React warns about missing keys in arrays.
- [minor, judge] DataTable.tsx keeps the scaffold stub comment: The first line of DataTable.tsx is still the 'Signature stub' comment, although the file is now implemented. The other files removed this comment.
- [minor, judge] data.css uses --ui-color-accent, a token outside the design's list (criterion C-74fd23b0): .ui-checkbox uses accent-color: var(--ui-color-accent). design.md lists only bg, surface, text, text-muted, border, danger, danger-text and danger-surface among the --ui-color-* tokens. The token exists, because the defined-token test passed, but CONTRAST_PAIRS coverage (Decision 8) cannot be checked from the diff.
- [minor, judge] A string-list value has no overall length cap (spec gap) (criterion C-0e0cc641): validateValues caps a string field at 10,000 code points before running its pattern, but a string-list only caps the number of lines (100). Each line is trimmed and run through itemPattern with no length limit, so a pattern can run on a line far longer than the 10,000 characters design.md Security 3 names.
- [minor, judge] An integer field accepts exponent notation and a fractional bound (spec gap) (criterion C-412941ac): NUMBER_PATTERN accepts "1e3" for an integer field, which validates to 1000. No check requires minimum or maximum of an integer property to be whole, so a bound such as 1.5 is accepted and shown in the message as "of at least 1.5". No scenario pins either case.
- [minor, judge] the judge called a test inadequate (criterion C-98c49746): web.src.kit.data.cursor-list.test.ts::C-98c49746 page size and subscribers

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
