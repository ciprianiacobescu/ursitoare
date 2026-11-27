# Verification: openspec:add-web-ref-carry: PASS (round 3)

traceability: 9/12 criteria covered by a discriminating test

- Base: `5d6dc2df5ecb7514c9e57daf22ff9048e64b1054`
- Head: `029a2d69ca47c2ec5046dbe4ec8bb15590b45511`
- Implementer profiles: deepseek-free, beam, claude-sonnet
- Judge: nemotron-judge, 1 call(s), prompt sha256 `0b0ba4ca360451ead3ae56afe08f371383973738dbbe19fd8acdde9612e69773`
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), beam reflection (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | reused | 0.0 | reused (round 2) |
| 1 | integrity | reused | 0.0 | reused (round 2) |
| 2 | build | reused | 0.0 | reused (round 2) |
| 3 | tests | reused | 0.0 | reused (round 2) |
| 4 | traceability | reused | 0.0 | reused (round 2) |
| 4a | audit sampling | reused | 0.0 | reused (round 2) |
| 5 | ui test generation | reused | 0.0 | reused (round 2) |
| 6 | quality | reused | 0.0 | reused (round 2) |
| 8 | s1 judge | reused | 0.0 | reused (round 2) |
| 9 | judge | reused | 0.0 | reused (round 2) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261127T1709Z-6964/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261127T1709Z-6964/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261127T1709Z-6964/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261127T1709Z-6964/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261127T1709Z-6964/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261127T1709Z-6964/009-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261127T1709Z-6964/010-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 2 test file(s) compared with the base |
| red-green freeze | ok | 6 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 7 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | ok | 1 new suppression(s), 1 declared; not checked: python only; changed files outside it: web/src/tools/GrantsPage.tsx, web/src/tools/RefCarryPanel.tsx, web/src/tools/RefMarker.tsx, web/src/tools/ServersPage.tsx, web/src/tools/ref-carry-copy.test.ts (+6 more) |
| tdd history | ok | 6 task(s); red tests passing at head: step 3 |
| python encoding | ok | 2 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 3160 of 3160 base tests pass on the unit's code with its 7 test and support files at the base (base: not needed) |

Declared suppressions:
- e2e/test_m8_ref_carry.py:187 # type: ignore (declared: Playwright's Page type has no _others member; the red step of task 4.1 stashes the captured write methods on the page ob)

## Pre-existing tests changed with an allowance (L4-VER-031)

- e2e/test_m8_ref_carry.py kept at head for the run (task 4.1: unfrozen by Q-002, Q-003)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- e2e/test_m8_ref_carry.py (task 4.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-d008fd69 | web-tools › A changed ref is found by tool name and worded as old to new › Changed refs are found by tool name and worded as old to new | covered | web.src.tools.ref-carry-refs.test.ts::C-d008fd69 approvedEffects maps a readable surface and is empty otherwise (passed, red_assertion); web.src.tools.ref-carry-refs.test.ts::C-d008fd69 changedRefs adds an effect only from the approved effects (passed, red_assertion); web.src.tools.ref-carry-refs.te... | - | 0.95 | - |
| C-d7d00513 | web-tools › A grant is read with its arguments and every page of grants and tool servers is read › A grant record keeps its arguments and malformed ones are refused | covered | web.src.tools.ref-carry-read.test.ts::C-d7d00513 parseGrantRecord reads a grant with its arguments and the boundary values (passed, red_assertion); web.src.tools.ref-carry-read.test.ts::C-d7d00513 parseGrantRecord refuses each malformed record (passed, red_assertion) | - | 0.69 | - |
| C-b97e74b9 | web-tools › A grant is read with its arguments and every page of grants and tool servers is read › Every page is read, a hundred pages are the bound and a bad item rejects | covered | web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllGrants always passes an AbortSignal (passed, red_assertion); web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllGrants reads every page with its cursor limit and signal (passed, red_assertion); web.src.tools.ref-carry-read.test.ts::C-b97e7... | - | - | - |
| C-b4fa2d61 | web-tools › The plan copies any step grants and lists node grants as update the flow first › The plan copies any step grants and lists node grants as update the flow first | covered | web.src.tools.ref-carry-copy.test.ts::C-b4fa2d61 copyGrantBody returns a fresh any step body and refuses a bad ref (passed, red_assertion); web.src.tools.ref-carry-copy.test.ts::C-b4fa2d61 copyPlan copies any step grants and lists node grants as update the flow first (passed, red_assertion); web.src... | - | 0.74 | - |
| C-0db1d5a2 | web-tools › A copy is one request per grant, in order, and every refusal is reported › A copy sends one request per grant and reports a refusal without stopping | covered | web.src.tools.ref-carry-copy.test.ts::C-0db1d5a2 carryKeys reuses one key per pair and refuses a key outside the header alphabet (passed, red_assertion); web.src.tools.ref-carry-copy.test.ts::C-0db1d5a2 copyGrants reports a refusal reason or an error code without stopping (passed, red_assertion); we... | - | 0.92 | - |
| C-1733a357 | web-tools › The carry result lines, notes and run are fixed › The lines, notes and the whole carry read as fixed texts | covered | web.src.tools.ref-carry-view.test.ts::C-1733a357 carryGrants never copies a grant whose effect changed (passed, red_assertion); web.src.tools.ref-carry-view.test.ts::C-1733a357 carryGrants posts nothing when no grant names an old ref (passed, red_assertion); web.src.tools.ref-carry-view.test.ts::C-1... | - | - | - |
| C-568a8224 | web-tools › A grant's ref is current, superseded or waiting by the server that lists its tool › A ref is current, superseded or waiting by the server that lists it | covered | web.src.tools.ref-carry-refs.test.ts::C-568a8224 REF_MARKERS holds the superseded and waiting texts (passed, red_assertion); web.src.tools.ref-carry-refs.test.ts::C-568a8224 refState gives null for a ref that no non-pending server lists (passed, red_assertion); web.src.tools.ref-carry-refs.test.ts::... | - | 0.90 | `e2e/test_l4_c_568a8224.py`, `test-results/test-l4-c-568a8224-py-test-grant-ref-state-is-current-superseded-waiting-or-null-chromium/test-failed-1.png`, `test-results/test-l4-c-568a8224-py-test-grant-ref-state-is-current-superseded-waiting-or-null-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-88f41f1b | web-tools › The carry panel is thin and the Servers page keeps its pins › The panel and the Servers page source keep every pin | covered | web.src.tools.ref-carry-pages.test.ts::C-88f41f1b the carry panel and Servers page keep every pin (passed, red_assertion) | - | 0.84 | - |
| C-5db13202 | web-tools › The ref marker is thin and the Grants page keeps its pins › The marker and the Grants page source keep every pin | covered | web.src.tools.ref-marker-pages.test.ts::C-5db13202 the ref marker and the Grants page keep every pin (passed, red_assertion) | - | 0.85 | - |
| C-8540a4f8 | web-tools › The server page offers the copy after an approval that changed refs › Approving a bumped surface offers the copy and reports one line per grant | uncovered | - | test_m8_ref_carry::test_a_failed_grants_read_creates_nothing[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m8_ref_carry::test_approving_bumped_refs_offers_the_copy[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m8_ref_carry... | 0.11 | - |
| C-4b83877f | web-tools › The Grants list marks superseded and waiting refs without a second badge or a new alert › Superseded and waiting refs are marked beside the one badge | uncovered | - | test_m8_ref_carry_grants::test_superseded_and_waiting_refs_are_marked_beside_the_badge[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.11 | `e2e/test_l4_c_4b83877f.py`, `test-results/test-l4-c-4b83877f-py-test-superseded-and-waiting-refs-are-marked-beside-the-badge-chromium/test-failed-1.png`, `test-results/test-l4-c-4b83877f-py-test-superseded-and-waiting-refs-are-marked-beside-the-badge-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-b8363cd2 | web-tools › The Grants list marks superseded and waiting refs without a second badge or a new alert › A failed server read leaves the Grants page as it was | uncovered | - | test_m8_ref_carry_grants::test_a_failed_server_read_adds_no_alert[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m8_ref_carry_grants::test_a_failed_server_read_shows_no_marker[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m... | 0.09 | `e2e/test_l4_c_b8363cd2.py`, `test-results/test-l4-c-b8363cd2-py-test-failed-server-read-leaves-grants-page-as-it-was-chromium/test-failed-1.png`, `test-results/test-l4-c-b8363cd2-py-test-failed-server-read-leaves-grants-page-as-it-was-chromium/trace.zip`, `.l4-out/e2e/page.html` |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m8_ref_carry.py` |  | relevant | new test file |
| `e2e/test_m8_ref_carry_grants.py` |  | relevant | new test file |
| `openspec/changes/add-web-ref-carry-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry/.l4/ledger/r-20261127T0637Z-36df.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry/.l4/ledger/r-20261127T0851Z-5327.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry/.l4/ledger/r-20261127T1106Z-2a77.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry/.l4/ledger/r-20261127T1428Z-eae0.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry/verification.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/tools/GrantsPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/RefCarryPanel.tsx` | web | relevant | named in the spec |
| `web/src/tools/RefMarker.tsx` | web | relevant | named in the spec |
| `web/src/tools/ServersPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/ref-carry-copy.test.ts` |  | relevant | new test file |
| `web/src/tools/ref-carry-pages.test.ts` |  | relevant | new test file |
| `web/src/tools/ref-carry-read.test.ts` |  | relevant | new test file |
| `web/src/tools/ref-carry-refs.test.ts` |  | relevant | new test file |
| `web/src/tools/ref-carry-view.test.ts` |  | relevant | new test file |
| `web/src/tools/ref-carry.ts` | web | relevant | named in the spec |
| `web/src/tools/ref-marker-pages.test.ts` |  | relevant | new test file |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/tools/GrantsPage.tsx, web/src/tools/RefCarryPanel.tsx, web/src/tools/RefMarker.tsx, web/src/tools/ServersPage.tsx, web/src/tools/ref-carry.ts

### Tests

3351 of 3351 passed, 0 failed, 0 errored, 0 skipped.
47 of 47 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-d008fd69 | not_testable | - | - | - | 1 | The criterion verifies the `changedRefs` function for named test-plan rows (CH1-CH8, AE1, NT1-NT3) whose inputs and expected outputs are not in the provided sources; no route, seed server, approver user, or public action is described through which an e2e test could reproduce those before/after ref s... | - |
| C-d7d00513 | not_testable | - | - | - | 1 | The criterion's decisive outcomes (no `fingerprints` member, each of 23 malformed variants parsing to `null`, and the five boundary values) are internal grant-record parsing results from `parseGrantRecord`, not user-observable behavior on the grants or tool servers pages; a user cannot see JSON memb... | - |
| C-b97e74b9 | not_testable | - | - | - | 1 | The criterion's defining assertions concern internal fetch mechanics (exact call counts, cursor values, AbortSignal, HTTP status codes 500/401/INVALID_RESPONSE) that are not observable through the web UI's public interface; these are unit-level behaviors of loadAllGrants/loadAllToolServers rather th... | - |
| C-b4fa2d61 | not_testable | - | - | - | 1 | The criterion asserts internal copyPlan/copyGrantBody results (copy/flowFirst/effectChanged lists and a RangeError on a bad tool ref). These computations are not rendered or exposed through the web interface, so there is no user-observable outcome to assert with a Playwright page against L4_E2E_BASE... | - |
| C-0db1d5a2 | not_testable | - | - | - | 1 | The criterion verifies copyGrants internal recording (one POST per grant in order, exact idempotency keys, per-grant refusal reasons) against a recording fake; no e2e routes, seed grants (CG1-CG4/CK1-CK3), or rendered outcome strings are provided to drive and observe this through the public UI.; cov... | - |
| C-1733a357 | not_testable | - | - | - | 1 | The criterion is bound to test-plan.md rows (FT1–FT3, GL1, CV1–CV5, CR1–CR4) whose seeded setup, UI routes, and selectors are not provided, so no self-contained e2e test can be authored from the prompt alone.; covered by step 4: web.src.tools.ref-carry-view.test.ts::C-1733a357 carryGrants never copi... | - |
| C-568a8224 | fails_at_head | e2e/test_l4_c_568a8224.py | fail | fail | 2 | the test fails at the head: test_l4_c_568a8224::test_grant_ref_state_is_current_superseded_waiting_or_null[chromium] | test-results/test-l4-c-568a8224-py-test-grant-ref-state-is-current-superseded-waiting-or-null-chromium/test-failed-1.png, test-results/test-l4-c-568a8224-py-test-grant-ref-state-is-current-superseded-waiting-or-null-chromium/trace.zip |
| C-88f41f1b | not_testable | - | - | - | 1 | the criterion inspects source files on disk (RefCarryPanel.tsx, ServersPage.tsx, ref-carry.ts), which is not observable through the web origin served at L4_E2E_BASE_URL; it is a static source-analysis test, not e2e UI behavior.; covered by step 4: web.src.tools.ref-carry-pages.test.ts::C-88f41f1b th... | - |
| C-5db13202 | not_testable | - | - | - | 1 | the criterion requires reading TypeScript source files (RefMarker.tsx, GrantsPage.tsx) and running static source scanners over them; those sources are not served at L4_E2E_BASE_URL and nothing a user sees in the browser reflects this source-level check; covered by step 4: web.src.tools.ref-marker-pa... | - |
| C-8540a4f8 | writer_failed | - | - | - | 2 | opencode's permission rules rejected a tool call (bash) | - |
| C-4b83877f | fails_at_head | e2e/test_l4_c_4b83877f.py | fail | fail | 2 | the test fails at the head: test_l4_c_4b83877f::test_superseded_and_waiting_refs_are_marked_beside_the_badge[chromium] | test-results/test-l4-c-4b83877f-py-test-superseded-and-waiting-refs-are-marked-beside-the-badge-chromium/test-failed-1.png, test-results/test-l4-c-4b83877f-py-test-superseded-and-waiting-refs-are-marked-beside-the-badge-chromium/trace.zip |
| C-b8363cd2 | fails_at_head | e2e/test_l4_c_b8363cd2.py | fail | fail | 2 | the test fails at the head: test_l4_c_b8363cd2::test_failed_server_read_leaves_grants_page_as_it_was[chromium] | test-results/test-l4-c-b8363cd2-py-test-failed-server-read-leaves-grants-page-as-it-was-chromium/test-failed-1.png, test-results/test-l4-c-b8363cd2-py-test-failed-server-read-leaves-grants-page-as-it-was-chromium/trace.zip |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-d008fd69 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d7d00513 | ok | 0.690 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b97e74b9 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-b4fa2d61 | ok | 0.740 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0db1d5a2 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1733a357 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-568a8224 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-88f41f1b | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5db13202 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8540a4f8 | ok | 0.110 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4b83877f | ok | 0.110 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b8363cd2 | ok | 0.090 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-0db1d5a2 | skipped | - | - | cap |
| C-568a8224 | not_testable | - | - | The criterion tests refState and RefMarker rendering in the TypeScript frontend (web/src/tools/ref-carry.ts, web/src/components/RefMarker.tsx); the shown sources provide no Python module under test for pytest to import, so it cannot be checked by an automated pytest test. |
| C-1733a357 | not_testable | - | - | The change is frontend logic in web/src/tools/ref-carry.ts (TypeScript) plus React panels; pytest cannot import it, no Python port or existing test-file header is shown, and test-plan.md § View rows run (rows FT1..FT3, GL1, CV1..CV5, CR1..CR4) is not provided, so the named UI outcomes have no public |

## Answers to verdict questions

- Q-004 accept C-8540a4f8 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. ServersPage keeps the view before the approval, feeds it and the approve answer to changedRefs with the approved surface's effects, and mounts RefCarryPanel inside the Surface section only after a successful approval. The panel returns nothing when refNoticeT...
- Q-005 accept C-4b83877f by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The Grants page reads GET /tool-servers through loadAllToolServers with a plain API client beside its other reads; the page reader asks for limit 100 and passes each page's cursor, so two pages give two hits, the second with cursor s2. Each row renders RefMar...
- Q-006 accept C-b8363cd2 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The servers read on the Grants page uses a plain API client whose fetch is the global one, so the 401 session-end handler that only the session client wraps around its fetch never runs and the URL stays on /admin/grants. The read's rejection handler is empty ...
- Q-007 accept H-3d26971a by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. C-568a8224 is the refState and REF_MARKERS requirement, whose scenario runs rows RS1 and RS2 of the test plan: pure-function rows, not a browser journey. Three Node tests named with the criterion assert every value of those rows and passed from a red that failed by assertion,...
- Q-008 accept H-96a6450c by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. The repository already holds the end-to-end tests for C-8540a4f8: the three tests of e2e/test_m8_ref_carry.py, tagged with the criterion and following test-plan-browser.md § Approve step by step, cover the bumped approval with the copy, a first approval and a 403 on the grant...
- Q-009 accept H-d011c1bb by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. The repository already holds an end-to-end test for C-4b83877f: test_superseded_and_waiting_refs_are_marked_beside_the_badge in e2e/test_m8_ref_carry_grants.py, tagged with the criterion and following test-plan-browser.md § Grants markers step by step. It answers /tool-server...
- Q-010 accept H-cb55efac by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. The repository already holds end-to-end tests for C-b8363cd2: the three tests test_a_failed_server_read_shows_no_marker, test_a_failed_server_read_adds_no_alert and test_an_unanswered_server_read_does_not_end_the_session in e2e/test_m8_ref_carry_grants.py, each tagged with th...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-d008fd69 | web-tools › A changed ref is found by tool name and worded as old to new › Changed refs are found by tool name and worded as old to new | pass | pass | the judge passed it and a discriminating test passes |
| C-d7d00513 | web-tools › A grant is read with its arguments and every page of grants and tool servers is read › A grant record keeps its arguments and malformed ones are refused | pass | pass | the judge passed it and a discriminating test passes |
| C-b97e74b9 | web-tools › A grant is read with its arguments and every page of grants and tool servers is read › Every page is read, a hundred pages are the bound and a bad item rejects | pass | pass | the judge passed it and a discriminating test passes |
| C-b4fa2d61 | web-tools › The plan copies any step grants and lists node grants as update the flow first › The plan copies any step grants and lists node grants as update the flow first | pass | pass | the judge passed it and a discriminating test passes |
| C-0db1d5a2 | web-tools › A copy is one request per grant, in order, and every refusal is reported › A copy sends one request per grant and reports a refusal without stopping | pass | pass | the judge passed it and a discriminating test passes |
| C-1733a357 | web-tools › The carry result lines, notes and run are fixed › The lines, notes and the whole carry read as fixed texts | pass | pass | the judge passed it and a discriminating test passes |
| C-568a8224 | web-tools › A grant's ref is current, superseded or waiting by the server that lists its tool › A ref is current, superseded or waiting by the server that lists it | pass | pass | the judge passed it and a discriminating test passes |
| C-88f41f1b | web-tools › The carry panel is thin and the Servers page keeps its pins › The panel and the Servers page source keep every pin | pass | pass | the judge passed it and a discriminating test passes |
| C-5db13202 | web-tools › The ref marker is thin and the Grants page keeps its pins › The marker and the Grants page source keep every pin | pass | pass | the judge passed it and a discriminating test passes |
| C-8540a4f8 | web-tools › The server page offers the copy after an approval that changed refs › Approving a bumped surface offers the copy and reports one line per grant | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. ServersPage keeps the view before the approval, feeds it and the approve answer to changedRefs with the approved surface's effects, and mounts RefCarryPanel inside the Surface section only after a s... |
| C-4b83877f | web-tools › The Grants list marks superseded and waiting refs without a second badge or a new alert › Superseded and waiting refs are marked beside the one badge | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The Grants page reads GET /tool-servers through loadAllToolServers with a plain API client beside its other reads; the page reader asks for limit 100 and passes each page's cursor, so two pages give... |
| C-b8363cd2 | web-tools › The Grants list marks superseded and waiting refs without a second badge or a new alert › A failed server read leaves the Grants page as it was | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The servers read on the Grants page uses a plain API client whose fetch is the global one, so the 401 session-end handler that only the session client wraps around its fetch never runs and the URL s... |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-8540a4f8): test_m8_ref_carry::test_a_failed_grants_read_creates_nothing[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-8540a4f8): test_m8_ref_carry::test_approving_bumped_refs_offers_the_copy[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-8540a4f8): test_m8_ref_carry::test_first_approval_offers_nothing[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-4b83877f): test_m8_ref_carry_grants::test_superseded_and_waiting_refs_are_marked_beside_the_badge[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-b8363cd2): test_m8_ref_carry_grants::test_a_failed_server_read_adds_no_alert[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-b8363cd2): test_m8_ref_carry_grants::test_a_failed_server_read_shows_no_marker[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-b8363cd2): test_m8_ref_carry_grants::test_an_unanswered_server_read_does_not_end_the_session[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d008fd69): No end-to-end test traces criterion C-d008fd69 (web-tools › A changed ref is found by tool name and worded as old to new › Changed refs are found by tool name and worded as old to new); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d7d00513): No end-to-end test traces criterion C-d7d00513 (web-tools › A grant is read with its arguments and every page of grants and tool servers is read › A grant record keeps its arguments and malformed ones are refused); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b97e74b9): No end-to-end test traces criterion C-b97e74b9 (web-tools › A grant is read with its arguments and every page of grants and tool servers is read › Every page is read, a hundred pages are the bound and a bad item rejects); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b4fa2d61): No end-to-end test traces criterion C-b4fa2d61 (web-tools › The plan copies any step grants and lists node grants as update the flow first › The plan copies any step grants and lists node grants as update the flow first); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0db1d5a2): No end-to-end test traces criterion C-0db1d5a2 (web-tools › A copy is one request per grant, in order, and every refusal is reported › A copy sends one request per grant and reports a refusal without stopping); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1733a357): No end-to-end test traces criterion C-1733a357 (web-tools › The carry result lines, notes and run are fixed › The lines, notes and the whole carry read as fixed texts); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-568a8224): No end-to-end test traces criterion C-568a8224 (web-tools › A grant's ref is current, superseded or waiting by the server that lists its tool › A ref is current, superseded or waiting by the server that lists it); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-88f41f1b): No end-to-end test traces criterion C-88f41f1b (web-tools › The carry panel is thin and the Servers page keeps its pins › The panel and the Servers page source keep every pin); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5db13202): No end-to-end test traces criterion C-5db13202 (web-tools › The ref marker is thin and the Grants page keeps its pins › The marker and the Grants page source keep every pin); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-8540a4f8): The end-to-end test test_m8_ref_carry::test_a_failed_grants_read_creates_nothing[chromium], test_m8_ref_carry::test_approving_bumped_refs_offers_the_copy[chromium], test_m8_ref_carry::test_first_approval_offers_nothing[chromium] traces criterion C-8540a4f8 (web-tools › The server page offers the copy after an approval that changed refs › Approving a bumped surface offers the copy and reports one line per grant), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-4b83877f): The end-to-end test test_m8_ref_carry_grants::test_superseded_and_waiting_refs_are_marked_beside_the_badge[chromium] traces criterion C-4b83877f (web-tools › The Grants list marks superseded and waiting refs without a second badge or a new alert › Superseded and waiting refs are marked beside the one badge), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b8363cd2): The end-to-end test test_m8_ref_carry_grants::test_a_failed_server_read_adds_no_alert[chromium], test_m8_ref_carry_grants::test_a_failed_server_read_shows_no_marker[chromium], test_m8_ref_carry_grants::test_an_unanswered_server_read_does_not_end_the_session[chromium] traces criterion C-b8363cd2 (web-tools › The Grants list marks superseded and waiting refs without a second badge or a new alert › A failed server read leaves the Grants page as it was), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.tools.ref-carry-copy.test.ts::C-0db1d5a2 carryKeys reuses one key per pair and refuses a key outside the header alphabet` (task 3.1): passed
- `web.src.tools.ref-carry-copy.test.ts::C-0db1d5a2 copyGrants reports a refusal reason or an error code without stopping` (task 3.1): passed
- `web.src.tools.ref-carry-copy.test.ts::C-0db1d5a2 copyGrants sends nothing for an unusable key and for an empty plan` (task 3.1): passed
- `web.src.tools.ref-carry-copy.test.ts::C-0db1d5a2 copyGrants sends one post per grant in order and reports each answer` (task 3.1): passed
- `web.src.tools.ref-carry-copy.test.ts::C-b4fa2d61 copyGrantBody returns a fresh any step body and refuses a bad ref` (task 3.1): passed
- `web.src.tools.ref-carry-copy.test.ts::C-b4fa2d61 copyPlan copies any step grants and lists node grants as update the flow first` (task 3.1): passed
- `web.src.tools.ref-carry-copy.test.ts::C-b4fa2d61 copyPlan gives empty lists without changes or grants` (task 3.1): passed
- `web.src.tools.ref-carry-copy.test.ts::C-b4fa2d61 copyPlan lists a changed effect whatever the grant scope` (task 3.1): passed
- `web.src.tools.ref-carry-pages.test.ts::C-88f41f1b the carry panel and Servers page keep every pin` (task 4.1): passed
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllGrants always passes an AbortSignal` (task 2.1): passed
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllGrants reads every page with its cursor limit and signal` (task 2.1): passed
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllGrants refuses a bad item and a bad page` (task 2.1): passed
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllGrants rejects with the failed request error` (task 2.1): passed
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllGrants stops at a hundred pages and reports it incomplete` (task 2.1): passed
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllToolServers reads every page with its cursor limit and signal` (task 2.1): passed
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllToolServers refuses an unreadable item` (task 2.1): passed
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllToolServers rejects a 401 from the real client` (task 2.1): passed
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllToolServers stops at a hundred pages and reports it incomplete` (task 2.1): passed
- `web.src.tools.ref-carry-read.test.ts::C-d7d00513 parseGrantRecord reads a grant with its arguments and the boundary values` (task 2.1): passed
- `web.src.tools.ref-carry-read.test.ts::C-d7d00513 parseGrantRecord refuses each malformed record` (task 2.1): passed
- `web.src.tools.ref-carry-refs.test.ts::C-568a8224 REF_MARKERS holds the superseded and waiting texts` (task 1.1): passed
- `web.src.tools.ref-carry-refs.test.ts::C-568a8224 refState gives null for a ref that no non-pending server lists` (task 1.1): passed
- `web.src.tools.ref-carry-refs.test.ts::C-568a8224 refState tells current superseded and waiting on the listing server` (task 1.1): passed
- `web.src.tools.ref-carry-refs.test.ts::C-d008fd69 approvedEffects maps a readable surface and is empty otherwise` (task 1.1): passed
- `web.src.tools.ref-carry-refs.test.ts::C-d008fd69 changedRefs adds an effect only from the approved effects` (task 1.1): passed
- `web.src.tools.ref-carry-refs.test.ts::C-d008fd69 changedRefs finds the bumped tool and sorts the changes by tool name` (task 1.1): passed
- `web.src.tools.ref-carry-refs.test.ts::C-d008fd69 changedRefs skips a first approval an added and a removed tool and a null ref` (task 1.1): passed
- `web.src.tools.ref-carry-refs.test.ts::C-d008fd69 refNoticeText words the changes as old to new` (task 1.1): passed
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryGrants never copies a grant whose effect changed` (task 3.2): passed
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryGrants posts nothing when no grant names an old ref` (task 3.2): passed
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryGrants reads every page then copies and reports every grant` (task 3.2): passed
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryGrants rejects with the read error before any post` (task 3.2): passed
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryView gives one line per outcome then the update the flow first line` (task 3.2): passed
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryView lists a changed effect and copies nothing for it` (task 3.2): passed
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryView notes an incomplete read and deploys only after a created grant` (task 3.2): passed
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryView of nothing says no grant names the old refs` (task 3.2): passed
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryView refuses outcomes that do not follow the plan copy` (task 3.2): passed
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 fillRefText replaces own keys once and literally` (task 3.2): passed
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 grantLabel names the subject and the scope` (task 3.2): passed
- `web.src.tools.ref-marker-pages.test.ts::C-5db13202 the ref marker and the Grants page keep every pin` (task 4.2): passed

## Guard events

- guard.test_tamper: e2e/test_m8_ref_carry.py
