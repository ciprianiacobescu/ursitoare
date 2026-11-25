# Verification: openspec:add-web-tool-review: NEEDS_HUMAN (round 1)

traceability: 5/7 criteria covered by a discriminating test

- Base: `b5c1358354315980ddc39f1ca45b78c9d36d96f7`
- Head: `f44d67ba5d95df772975f65c283bba8f6033aac6`
- Implementer profiles: deepseek-free, beam
- Judge: nemotron-judge, 2 call(s), prompt sha256 `fec77704dca7bf691e9116a2873420ecb0c6bb750d02a211d845ee8234a32b0d`
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 0, retried 1, discarded 0; this round: retried
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), beam reflection (declared)
- Cost: $0.5692

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.6 | base main@b5c1358354 contained |
| 1 | integrity | ok | 290.3 | 11 sub-checks (+2 unfrozen by human answers); scope: 14 changed file(s) |
| 2 | build | ok | 35.7 |  |
| 3 | tests | ok | 467.5 |  |
| 4 | traceability | ok | 0.2 | 5/7 criteria covered |
| 4a | audit sampling | ok | 8.0 | 2 not_testable; support files at the base: 6 |
| 5 | ui test generation | ok | 29.2 | 7 not_testable; 5 not_testable covered by step 4: notes, no hold (L4-VER-067); e2e support files shown to the writer: 1 |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/tools/ReviewSections.tsx, web/src/tools/ServersPage.tsx, web/src/tools/review.ts |
| 8 | s1 judge | ok | 0.3 | 5/7 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 422.9 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261125T0719Z-dff4/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261125T0719Z-dff4/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261125T0719Z-dff4/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261125T0719Z-dff4/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261125T0719Z-dff4/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261125T0719Z-dff4/009-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261125T0719Z-dff4/010-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 5 task(s): red and green compared (+2 unfrozen by a delegate or an agent) |
| test path freeze | ok | 5 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/tools/ReviewSections.tsx, web/src/tools/ServersPage.tsx, web/src/tools/review-calls.test.ts, web/src/tools/review-diff.test.ts, web/src/tools/review-discover.test.ts (+3 more) |
| tdd history | ok | 5 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 3085 of 3085 base tests pass on the unit's code with its 4 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- web/src/tools/review-diff.test.ts kept at head for the run (task 1.2: unfrozen by Q-001)
- web/src/tools/review-discover.test.ts kept at head for the run (task 2.1: unfrozen by Q-002)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- web/src/tools/review-diff.test.ts (task 1.2, unfrozen by Q-001 (delegate_override, claude-fable-5-1))
- web/src/tools/review-discover.test.ts (task 2.1, unfrozen by Q-002 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-7f5dc957 | web-tools › A surface is read for review with each tool's call, flags and the server's hints › Call texts, hints and flags are read from a surface and a malformed one is refused | covered | web.src.tools.review.test.ts::C-7f5dc957 callRows gives the name, call, effect, retry, result and hints of each tool (passed, red_assertion); web.src.tools.review.test.ts::C-7f5dc957 parseReviewTools reads each tool's call, flags, hints and server name in surface order (passed, red_assertion); web.s... | - | 0.89 | - |
| C-b5979a6e | web-tools › The drift diff compares the approved and the pending surface by tool name › The diff names added, removed and changed tools and the fields that changed | covered | web.src.tools.review-diff.test.ts::C-b5979a6e changeText words added, removed and changed tools (passed, red_assertion); web.src.tools.review-diff.test.ts::C-b5979a6e changesView cuts a long description and counts the rest (passed, red_assertion); web.src.tools.review-diff.test.ts::C-b5979a6e change... | - | - | - |
| C-7374d16f | web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › Settings become the body and a discovery is worded with every tool left out | covered | web.src.tools.review-discover.test.ts::C-7374d16f discoverBody builds the overlay body and omits proto entries (B1) (passed, red_assertion); web.src.tools.review-discover.test.ts::C-7374d16f discoverBody rejects bad keys, effects, names and too many entries (B2) (passed, red_assertion); web.src.tool... | - | - | - |
| C-9ba9b0d3 | web-tools › The discovery call and the review load use their routes and each refusal is worded › The calls use their routes and each refusal has its text | covered | web.src.tools.review-calls.test.ts::C-9ba9b0d3 discoverTools posts the body under the idempotency key and resolves the discovery K1 (passed, red_assertion); web.src.tools.review-calls.test.ts::C-9ba9b0d3 discoverTools refuses a bad id key or body before a call and an unreadable answer K2 (passed, re... | - | 0.86 | - |
| C-85b20ad6 | web-tools › The review names are fixed, the page uses kit components and the messages stay untouched › The review names are fixed and the page reads as the rules say | covered | web.src.tools.review-pages.test.ts::C-85b20ad6 the review names are the twenty three values and the messages stay untouched (passed, red_assertion); web.src.tools.review-pages.test.ts::C-85b20ad6 the review page and its sections use the required parts and pass the rules (passed, red_assertion) | - | 0.93 | - |
| C-9da14d6e | web-tools › The server page shows discovery, settings, changes and calls › An MCP server is discovered, given a setting and discovered again | uncovered | - | test_m7_tool_review::test_discovery_settings_and_calls[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.16 | - |
| C-c8329b48 | web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server | uncovered | - | test_m7_tool_review::test_changes_and_calls_of_a_drifted_server[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.19 | - |

## Evidence

### Needs attention

- tests are not all green (a failed or errored test, or a new test that did not pass)

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m7_tool_review.py` |  | relevant | new test file |
| `openspec/changes/add-web-tool-review/.l4/ledger/r-20261125T0140Z-462b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-review/.l4/ledger/r-20261125T0316Z-e642.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-review/.l4/ledger/r-20261125T0441Z-fbdc.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-review/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-review/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/tools/ReviewSections.tsx` | web | relevant | named in the spec |
| `web/src/tools/ServersPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/review-calls.test.ts` |  | relevant | new test file |
| `web/src/tools/review-diff.test.ts` |  | relevant | new test file |
| `web/src/tools/review-discover.test.ts` |  | relevant | new test file |
| `web/src/tools/review-pages.test.ts` |  | relevant | new test file |
| `web/src/tools/review.test.ts` |  | relevant | new test file |
| `web/src/tools/review.ts` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/tools/ReviewSections.tsx, web/src/tools/ServersPage.tsx, web/src/tools/review.ts

### Tests

3227 of 3229 passed, 2 failed, 0 errored, 0 skipped.
47 of 47 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-7f5dc957 | not_testable | - | - | - | 1 | Criterion covers pure parser/formatter rows (R1-R3, C1, C2, 15 malformed surfaces → null) defined in test-plan.md, with no user-visible UI path or known fixture data to reach them in a browser.; covered by step 4: web.src.tools.review.test.ts::C-7f5dc957 callRows gives the name, call, effect, retry,... | - |
| C-b5979a6e | not_testable | - | - | - | 1 | The criterion covers the pure functions surfaceDiff, changeText and changesView, which are unit-tested from rows D1–D9 and V1–V13. The e2e fixtures give no way to seed those surfaces in a browser.; covered by step 4: web.src.tools.review-diff.test.ts::C-b5979a6e changeText words added, removed and c... | - |
| C-7374d16f | not_testable | - | - | - | 1 | Criterion is about pure functions (discoverBody, discoveryText, parsing) in test-plan rows, with no stated UI path; the e2e fake stack's discovery data and seed are unknown, so it is not checkable by an e2e browser test.; covered by step 4: web.src.tools.review-discover.test.ts::C-7374d16f discoverB... | - |
| C-9ba9b0d3 | not_testable | - | - | - | 1 | The criterion checks unit-level functions (discoverTools, loadServerReview, discoveryErrorText) against a recording fake API client, with no way to inspect recorded requests or exact error texts through the browser UI.; covered by step 4: web.src.tools.review-calls.test.ts::C-9ba9b0d3 discoverTools ... | - |
| C-85b20ad6 | not_testable | - | - | - | 1 | The criterion checks source files and constants read by a node unit test (tools/review-pages.test.ts), not anything a user sees in the browser.; covered by step 4: web.src.tools.review-pages.test.ts::C-85b20ad6 the review names are the twenty three values and the messages stay untouched, web.src.too... | - |
| C-9da14d6e | not_testable | - | - | - | 1 | The test plan's Review 1 steps aren't shown. That leaves the seeded server id, the sign-in user, the fake engine's four discover answers and the exact expected texts unknown, so a test would have to guess them. | - |
| C-c8329b48 | not_testable | - | - | - | 1 | The scenario depends on the '§ Review 2' setup, which isn't shown. That setup covers the drifted server's id, the signed-in user, and the fake stack's seeded approved and pending surfaces. Without it the test would have to guess the URL, the login and the data. | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-7f5dc957 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b5979a6e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-7374d16f | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-9ba9b0d3 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-85b20ad6 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9da14d6e | ok | 0.160 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c8329b48 | ok | 0.190 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-b5979a6e | not_testable | - | - | The criterion targets TypeScript web code (review.ts, changeText/changesView rows in test-plan.md) that no shown Python module exposes. A pytest test cannot call it, and the D1–D9 and V1–V13 rows are not shown. |
| C-9ba9b0d3 | not_testable | - | - | The behaviour is in TypeScript web code (web/src/tools/review.ts). The test-plan rows K1-K3 and E1-E9 aren't shown, so pytest has no Python interface to import and no exact texts to assert. |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-7f5dc957 | web-tools › A surface is read for review with each tool's call, flags and the server's hints › Call texts, hints and flags are read from a surface and a malformed one is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-b5979a6e | web-tools › The drift diff compares the approved and the pending surface by tool name › The diff names added, removed and changed tools and the fields that changed | pass | pass | the judge passed it and a discriminating test passes |
| C-7374d16f | web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › Settings become the body and a discovery is worded with every tool left out | pass | pass | the judge passed it and a discriminating test passes |
| C-9ba9b0d3 | web-tools › The discovery call and the review load use their routes and each refusal is worded › The calls use their routes and each refusal has its text | pass | pass | the judge passed it and a discriminating test passes |
| C-85b20ad6 | web-tools › The review names are fixed, the page uses kit components and the messages stay untouched › The review names are fixed and the page reads as the rules say | pass | pass | the judge passed it and a discriminating test passes |
| C-9da14d6e | web-tools › The server page shows discovery, settings, changes and calls › An MCP server is discovered, given a setting and discovered again | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-c8329b48 | web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server | pass | needs_human | uncovered: no adequate discriminating test traces it |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-9da14d6e): test_m7_tool_review::test_discovery_settings_and_calls[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-c8329b48): test_m7_tool_review::test_changes_and_calls_of_a_drifted_server[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-7f5dc957): No end-to-end test traces criterion C-7f5dc957 (web-tools › A surface is read for review with each tool's call, flags and the server's hints › Call texts, hints and flags are read from a surface and a malformed one is refused); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b5979a6e): No end-to-end test traces criterion C-b5979a6e (web-tools › The drift diff compares the approved and the pending surface by tool name › The diff names added, removed and changed tools and the fields that changed); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-7374d16f): No end-to-end test traces criterion C-7374d16f (web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › Settings become the body and a discovery is worded with every tool left out); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-9ba9b0d3): No end-to-end test traces criterion C-9ba9b0d3 (web-tools › The discovery call and the review load use their routes and each refusal is worded › The calls use their routes and each refusal has its text); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-85b20ad6): No end-to-end test traces criterion C-85b20ad6 (web-tools › The review names are fixed, the page uses kit components and the messages stay untouched › The review names are fixed and the page reads as the rules say); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-9da14d6e): The end-to-end test test_m7_tool_review::test_discovery_settings_and_calls[chromium] traces criterion C-9da14d6e (web-tools › The server page shows discovery, settings, changes and calls › An MCP server is discovered, given a setting and discovered again), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c8329b48): The end-to-end test test_m7_tool_review::test_changes_and_calls_of_a_drifted_server[chromium] traces criterion C-c8329b48 (web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.

## Needs a human

- UI criterion C-9da14d6e has no end-to-end test; see the generated UI tests table
- UI criterion C-c8329b48 has no end-to-end test; see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.tools.review-calls.test.ts::C-9ba9b0d3 discoverTools posts the body under the idempotency key and resolves the discovery K1` (task 2.2): passed
- `web.src.tools.review-calls.test.ts::C-9ba9b0d3 discoverTools refuses a bad id key or body before a call and an unreadable answer K2` (task 2.2): passed
- `web.src.tools.review-calls.test.ts::C-9ba9b0d3 discoveryErrorText falls back to toolsErrorMessage for other failures E9` (task 2.2): passed
- `web.src.tools.review-calls.test.ts::C-9ba9b0d3 discoveryErrorText words egress refusals and collidingNames lists the names E6 to E8` (task 2.2): passed
- `web.src.tools.review-calls.test.ts::C-9ba9b0d3 discoveryErrorText words the credential discovery refusals E1 to E5` (task 2.2): passed
- `web.src.tools.review-calls.test.ts::C-9ba9b0d3 loadServerReview reads the detail once and keeps the raw surfaces K3` (task 2.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e changeText words added, removed and changed tools` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e changesView cuts a long description and counts the rest` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e changesView cuts a long input description and counts the rest` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e changesView lists a changed hint` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e changesView lists a changed tool with its descriptions and a removal` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e changesView lists a first approval's tool as added` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e changesView lists at most fifty input properties and counts the rest` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e changesView names an absent pending surface` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e changesView names an unreadable surface` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e changesView neutralises tag characters and format characters` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e changesView says no changes for reordered tools` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e changesView shows a line feed as a mark and a zero width space as a question mark` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e changesView shows a removed description as none` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e changesView shows described input properties for an added and a changed tool` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e surfaceDiff carries described input properties of an added and a changed tool` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e surfaceDiff ignores tool order and canonical input and untrusted field order` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e surfaceDiff is empty when a side is unreadable` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e surfaceDiff reports a call change for an http call and a call kind` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e surfaceDiff reports a changed hint alone` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e surfaceDiff reports a description change with both texts in full` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e surfaceDiff reports an added tool with its description and input` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e surfaceDiff reports changed fields and a removal` (task 1.2): passed
- `web.src.tools.review-diff.test.ts::C-b5979a6e surfaceDiff reports the digest fields that changed` (task 1.2): passed
- `web.src.tools.review-discover.test.ts::C-7374d16f discoverBody builds the overlay body and omits proto entries (B1)` (task 2.1): passed
- `web.src.tools.review-discover.test.ts::C-7374d16f discoverBody rejects bad keys, effects, names and too many entries (B2)` (task 2.1): passed
- `web.src.tools.review-discover.test.ts::C-7374d16f discoveryText cuts a long neutralised name to 79 characters (X3)` (task 2.1): passed
- `web.src.tools.review-discover.test.ts::C-7374d16f discoveryText neutralises a bidi name (X5)` (task 2.1): passed
- `web.src.tools.review-discover.test.ts::C-7374d16f discoveryText states the count, version and left-out tools (X1, X2, X4, X6)` (task 2.1): passed
- `web.src.tools.review-discover.test.ts::C-7374d16f initialDraft keeps a name only when it differs and omits proto tools (I2)` (task 2.1): passed
- `web.src.tools.review-discover.test.ts::C-7374d16f initialDraft reads the approved tools and keeps only server tools (I1)` (task 2.1): passed
- `web.src.tools.review-discover.test.ts::C-7374d16f parseDiscovery reads a valid discovery answer (P1)` (task 2.1): passed
- `web.src.tools.review-discover.test.ts::C-7374d16f parseDiscovery rejects malformed answers (P2)` (task 2.1): passed
- `web.src.tools.review-pages.test.ts::C-85b20ad6 the review names are the twenty three values and the messages stay untouched` (task 3.1): passed
- `web.src.tools.review-pages.test.ts::C-85b20ad6 the review page and its sections use the required parts and pass the rules` (task 3.1): passed
- `web.src.tools.review.test.ts::C-7f5dc957 callRows gives the name, call, effect, retry, result and hints of each tool` (task 1.1): passed
- `web.src.tools.review.test.ts::C-7f5dc957 parseReviewTools reads each tool's call, flags, hints and server name in surface order` (task 1.1): passed
- `web.src.tools.review.test.ts::C-7f5dc957 parseReviewTools reads only the hints the server states, in order` (task 1.1): passed
- `web.src.tools.review.test.ts::C-7f5dc957 parseReviewTools refuses each of the 15 malformed surfaces` (task 1.1): passed
- `web.src.tools.review.test.ts::C-7f5dc957 readNote names the real read call when a tool is read, else is null` (task 1.1): passed
