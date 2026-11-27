# Verification: openspec:add-web-tool-trust: NEEDS_HUMAN (round 1)

traceability: 10/17 criteria covered by a discriminating test

- Base: `141a2678bd58eaff5969eeb44f503c8744c01aa8`
- Head: `1ed7306ae57c22d1ece11056ac07fae285f904aa`
- Implementer profiles: deepseek-free, beam, claude-sonnet
- Judge: mimo-go-judge, 7 call(s), judged in 2 parts, prompt sha256 `45842f51d8e0767bfe63a7a948ad56ae9fc99ea78d9636f5c927125e39d62646`
  - part 1: 15 file(s), 114782 characters, profile mimo-go-judge, reply repaired
  - part 2: 4 file(s), 18117 characters, profile mimo-go-judge, reply retried
- Judge replies of mimo-go-judge (this unit, all rounds): valid 2, repaired 1, retried 1, discarded 0; this round: retried
- independence: declared (unverified): mimo-go-judge xiaomi (declared), deepseek-free deepseek (declared), beam reflection (declared), claude-sonnet anthropic (tool)
- Cost: $0.1471

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base merged: main@141a2678bd as 1ed7306ae5 (2 commits) |
| 1 | integrity | ok | 311.2 | 11 sub-checks; scope: 28 changed file(s) |
| 2 | build | ok | 33.1 |  |
| 3 | tests | ok | 505.0 |  |
| 4 | traceability | ok | 0.3 | 9/17 criteria covered |
| 4a | audit sampling | ok | 270.1 | 2 not_testable, 1 skipped; support files at the base: 10 |
| 5 | ui test generation | ok | 3840.3 | 1 accepted, 11 not_testable, 5 writer_failed; 9 not_testable covered by step 4: notes, no hold (L4-VER-067); e2e support files shown to the writer: 1 |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/tools/RegisterPage.tsx, web/src/tools/ReplaceSection.tsx, web/src/tools/ReviewSections.tsx, web/src/tools/ServersPage.tsx, web/src/tools/TrustControls.tsx and 3 more |
| 8 | s1 judge | ok | 1.7 | 17/17 criteria judged by jev |
| 9 | judge | ok | 3404.4 | 7 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261126T2208Z-78d9/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261126T2208Z-78d9/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261126T2208Z-78d9/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261126T2208Z-78d9/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261126T2208Z-78d9/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261126T2208Z-78d9/009-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261126T2208Z-78d9/010-e2e.log |

## Files by part

- part 1: e2e/test_m8_tool_trust.py (13290 characters)
- part 1: e2e/test_m8_tool_trust_review.py (10862 characters)
- part 1: web/src/tools/register.ts (2862 characters)
- part 1: web/src/tools/register-trust.test.ts (3215 characters)
- part 1: web/src/tools/RegisterPage.tsx (7948 characters)
- part 1: web/src/tools/ReplaceSection.tsx (11302 characters)
- part 1: web/src/tools/review.ts (5153 characters)
- part 1: web/src/tools/review-trust.test.ts (5648 characters)
- part 1: web/src/tools/ReviewSections.tsx (8567 characters)
- part 1: web/src/tools/ServersPage.tsx (489 characters)
- part 1: openspec/changes/add-web-tool-trust/tasks.md (9709 characters)
- part 1: web/src/tools/trust.test.ts (11013 characters)
- part 1: web/src/tools/trust.ts (15296 characters)
- part 1: web/src/tools/trust-ack.test.ts (4057 characters)
- part 1: web/src/tools/trust-changes.test.ts (5371 characters)
- part 2: web/src/tools/trust-overlay.test.ts (9337 characters)
- part 2: web/src/tools/trust-pages.test.ts (4105 characters)
- part 2: web/src/tools/trust-review-pages.test.ts (2495 characters)
- part 2: web/src/tools/TrustControls.tsx (2180 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 2 test file(s) compared with the base |
| red-green freeze | ok | 8 task(s): red and green compared |
| test path freeze | ok | 8 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/tools/RegisterPage.tsx, web/src/tools/ReplaceSection.tsx, web/src/tools/ReviewSections.tsx, web/src/tools/ServersPage.tsx, web/src/tools/TrustControls.tsx (+11 more) |
| tdd history | ok | 8 task(s); red tests passing at head: step 3 |
| python encoding | ok | 2 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 3117 of 3117 base tests pass on the unit's code with its 10 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-03790492 | web-tools › A stored surface is read for trust and the fields a replacement carries › A stored surface gives each tool's trust with the engine's defaults and a malformed one is refused | covered | web.src.tools.trust.test.ts::C-03790492 storedTools gives an empty map and refuses malformed surfaces (ST3, ST4, ST5) (passed, red_assertion); web.src.tools.trust.test.ts::C-03790492 storedTools reads MCP tools with the server name (ST2) (passed, red_assertion); web.src.tools.trust.test.ts::C-037904... | - | 0.92 | - |
| C-199d4e64 | web-tools › A stored surface is read for trust and the fields a replacement carries › A retry flag is carried only when the effect is unchanged | covered | web.src.tools.trust.test.ts::C-199d4e64 carriedAfterEffect treats Proposed as write and carries nothing for a changed effect (CA1 to CA10) (passed, red_assertion); web.src.tools.trust.test.ts::C-199d4e64 carriedFields carries a retry flag only when the OpenAPI effect is unchanged (CF1 to CF8) (passe... | - | 0.92 | - |
| C-75b3f1d2 | web-tools › An overlay entry holds only the values that differ from the engine's defaults › Overlay entries are built from trust and carried fields, and Replace and Discover prefill them | covered | web.src.tools.trust-overlay.test.ts::C-75b3f1d2 discoverSettings reads the server tool names (DS1 to DS3) (passed, red_assertion); web.src.tools.trust-overlay.test.ts::C-75b3f1d2 overlayEntry keeps only non-default members in order (OE1 to OE7) (passed, red_assertion); web.src.tools.trust-overlay.te... | - | 0.75 | - |
| C-5367a266 | web-tools › Trusting a result needs the fixed warning and a tick for each tool › The tick list, the refusal text and the fixed names are as the plan says | covered | web.src.tools.trust-ack.test.ts::C-5367a266 AK1 trustAckMissing lists unticked trusted or public keys (passed, red_assertion); web.src.tools.trust-ack.test.ts::C-5367a266 AK2 trustAckMissing empty and inherited key (passed, red_assertion); web.src.tools.trust-ack.test.ts::C-5367a266 AK3 ackStatus sh... | - | 0.91 | - |
| C-315dc330 | web-tools › Changes shows the old and new value of each changed field › Changed values read as fixed lines under their tool | covered | web.src.tools.trust-changes.test.ts::C-315dc330 VL1 each changed field reads as a fixed line under its tool (passed, red_assertion); web.src.tools.trust-changes.test.ts::C-315dc330 VL2 an unreadable surface gives an empty map (passed, red_assertion); web.src.tools.trust-changes.test.ts::C-315dc330 V... | - | 0.89 | - |
| C-1da179fb | web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › The OpenAPI form sources hold the trust controls and keep the page rules | covered | web.src.tools.trust-pages.test.ts::C-1da179fb the OpenAPI form sources hold the trust controls and keep the page rules (passed, red_assertion) | - | 0.90 | - |
| C-f52c8d49 | web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › An OpenAPI server is registered with a trusted result after a tick | uncovered | - | test_m8_tool_trust::test_register_with_a_trusted_result[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.13 | - |
| C-3a1c08af | web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace keeps the stored trust and needs no tick | uncovered | - | test_m8_tool_trust::test_replace_keeps_the_stored_trust[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.13 | - |
| C-08abe836 | web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace drops a retry flag when the effect changes | uncovered | - | test_m8_tool_trust::test_replace_drops_the_retry_flag_on_an_effect_change[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.10 | `e2e/test_l4_c_08abe836.py`, `.l4-out/e2e/page.html` |
| C-3ad08589 | web-tools › A registration draft becomes the API request or names the field to fix › The three drafts become the registration requests or name the field to fix | uncovered | - | web.src.tools.register.test.ts::C-3ad08589 codeRegistration builds one tool without a description and one with it (no proof that it discriminates (no red, audit or generated record)); web.src.tools.register.test.ts::C-3ad08589 codeRegistration refuses the input before the output schema (no proof tha... | 0.05 | - |
| C-7b68e67c | web-tools › A registration draft becomes the API request or names the field to fix › A draft with trust and carried fields builds the overlay with only the members that differ | covered | web.src.tools.register-trust.test.ts::C-7b68e67c openApiRegistration builds the overlay from trust and carried fields (RG0, RG1) (passed, red_assertion); web.src.tools.register-trust.test.ts::C-7b68e67c openApiRegistration throws RangeError for a data class off the list (RG2) (passed, red_assertion) | - | 0.91 | - |
| C-7374d16f | web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › Settings become the body and a discovery is worded with every tool left out | uncovered | - | web.src.tools.review-discover.test.ts::C-7374d16f discoverBody builds the overlay body and omits proto entries (B1) (no proof that it discriminates (no red, audit or generated record)); web.src.tools.review-discover.test.ts::C-7374d16f discoverBody rejects bad keys, effects, names and too many entri... | 0.06 | - |
| C-cbd5fcec | web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › A settings draft with trust and carried fields builds the overlay body | covered | web.src.tools.review-trust.test.ts::C-cbd5fcec review-trust builds the overlay body from trust and carried fields (DB0 to DB6) (passed, red_assertion) | - | 0.86 | - |
| C-9da14d6e | web-tools › The server page shows discovery, settings, changes and calls › An MCP server is discovered, given a setting and discovered again | covered | test_l4_c_9da14d6e::test_discovery_settings_and_calls_keeps_trust_out_of_bodies (passed, generated, base fail, head pass) | test_m7_tool_review::test_discovery_settings_and_calls[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.77 | `e2e/test_l4_c_9da14d6e.py`, `.l4-out/e2e/page.html` |
| C-c8329b48 | web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server | uncovered | - | test_m7_tool_review::test_changes_and_calls_of_a_drifted_server[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.06 | - |
| C-c7bb4abe | web-tools › The server page shows discovery, settings, changes and calls › Tool settings carries the trust controls, Discover keeps the stored trust and Changes shows the value lines | uncovered | - | test_m8_tool_trust_review::test_tool_settings_trust[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.24 | - |
| C-9bb4c4cf | web-tools › The server page shows discovery, settings, changes and calls › The Tool settings sources hold the trust controls and keep the page rules | covered | web.src.tools.trust-review-pages.test.ts::C-9bb4c4cf the Tool settings sources hold the trust controls and keep the page rules (passed, red_assertion) | - | 0.90 | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m8_tool_trust.py` |  | relevant | new test file |
| `e2e/test_m8_tool_trust_review.py` |  | relevant | new test file |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T0856Z-9b38.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T1129Z-e48e.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T1401Z-9952.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T1620Z-708c.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T1907Z-ab78.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T1945Z-5ff4.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T2021Z-c69f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T2056Z-b64d.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T2131Z-30c3.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/tools/RegisterPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/ReplaceSection.tsx` | web | relevant | named in the spec |
| `web/src/tools/ReviewSections.tsx` | web | relevant | named in the spec |
| `web/src/tools/ServersPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/TrustControls.tsx` | web | relevant | named in the spec |
| `web/src/tools/register-trust.test.ts` |  | relevant | new test file |
| `web/src/tools/register.ts` | web | relevant | named in the spec |
| `web/src/tools/review-trust.test.ts` |  | relevant | new test file |
| `web/src/tools/review.ts` | web | relevant | named in the spec |
| `web/src/tools/trust-ack.test.ts` |  | relevant | new test file |
| `web/src/tools/trust-changes.test.ts` |  | relevant | new test file |
| `web/src/tools/trust-overlay.test.ts` |  | relevant | new test file |
| `web/src/tools/trust-pages.test.ts` |  | relevant | new test file |
| `web/src/tools/trust-review-pages.test.ts` |  | relevant | new test file |
| `web/src/tools/trust.test.ts` |  | relevant | new test file |
| `web/src/tools/trust.ts` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/tools/RegisterPage.tsx, web/src/tools/ReplaceSection.tsx, web/src/tools/ReviewSections.tsx, web/src/tools/ServersPage.tsx, web/src/tools/TrustControls.tsx and 3 more

### Tests

3293 of 3293 passed, 0 failed, 0 errored, 0 skipped.
37 of 37 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-03790492 | not_testable | - | - | - | 1 | The criterion specifies outcomes of unit-test rows in trust.test.ts (entry counts, order, null maps, frozen DEFAULT_TRUST), which are internal module properties not observable through the browser's public UI.; covered by step 4: web.src.tools.trust.test.ts::C-03790492 storedTools gives an empty map ... | - |
| C-199d4e64 | not_testable | - | - | - | 1 | the criterion only specifies rows of a unit test file (trust.test.ts), which has no browser-visible outcome to observe; covered by step 4: web.src.tools.trust.test.ts::C-199d4e64 carriedAfterEffect treats Proposed as write and carries nothing for a changed effect (CA1 to CA10), web.src.tools.trust.t... | - |
| C-75b3f1d2 | not_testable | - | - | - | 1 | The criterion is defined entirely by rows of the unit test file trust-overlay.test.ts (object shapes, RangeError throws), which are not observable through the browser UI.; covered by step 4: web.src.tools.trust-overlay.test.ts::C-75b3f1d2 discoverSettings reads the server tool names (DS1 to DS3), we... | - |
| C-5367a266 | not_testable | - | - | - | 1 | the criterion asserts rows AK1-AK9 and NM1 of trust-ack.test.ts, an internal unit-test file whose inputs and expected outputs are not observable through the browser UI; covered by step 4: web.src.tools.trust-ack.test.ts::C-5367a266 AK1 trustAckMissing lists unticked trusted or public keys, web.src.t... | - |
| C-315dc330 | not_testable | - | - | - | 1 | the criterion is defined by rows VL1-VL7 of the unit test file trust-changes.test.ts; those diff fixtures are not reachable through the web UI, so a browser e2e cannot reproduce them; covered by step 4: web.src.tools.trust-changes.test.ts::C-315dc330 VL1 each changed field reads as a fixed line unde... | - |
| C-1da179fb | not_testable | - | - | - | 1 | the criterion inspects source-file tokens and import edges, which are not observable through the browser's public interface; covered by step 4: web.src.tools.trust-pages.test.ts::C-1da179fb the OpenAPI form sources hold the trust controls and keep the page rules; a note, not a hold (L4-VER-067) | - |
| C-f52c8d49 | writer_failed | - | - | - | 1 | no answer within 600s | - |
| C-3a1c08af | writer_failed | - | - | - | 1 | no answer within 600s | - |
| C-08abe836 | writer_failed | e2e/test_l4_c_08abe836.py | - | - | 2 | no answer within 600s | - |
| C-3ad08589 | not_testable | - | - | - | 1 | The criterion's WHEN is the unit test file register.test.ts running unedited, and its THEN is request bodies, pinned-row messages and internal draft state, none of which a user can observe in the served page. | - |
| C-7b68e67c | not_testable | - | - | - | 1 | The criterion only specifies assertions inside register-trust.test.ts unit-test rows (RG0-RG2) on internal overlay object shapes; no user-visible outcome through the web UI to drive with Playwright.; covered by step 4: web.src.tools.register-trust.test.ts::C-7b68e67c openApiRegistration builds the o... | - |
| C-7374d16f | not_testable | - | - | - | 1 | The criterion asserts outcomes of internal TypeScript unit functions in review-discover.test.ts, which cannot be observed through the browser UI the e2e suite drives. | - |
| C-cbd5fcec | not_testable | - | - | - | 1 | The criterion is defined by rows DB0-DB6 of the unit test review-trust.test.ts (prototype keys, RangeError on 100 keys), none of which are reachable or observable through the browser UI.; covered by step 4: web.src.tools.review-trust.test.ts::C-cbd5fcec review-trust builds the overlay body from trus... | - |
| C-9da14d6e | accepted | e2e/test_l4_c_9da14d6e.py | fail | pass | 1 | - | - |
| C-c8329b48 | writer_failed | - | - | - | 1 | no answer within 600s | - |
| C-c7bb4abe | writer_failed | - | - | - | 1 | no answer within 600s | - |
| C-9bb4c4cf | not_testable | - | - | - | 1 | The criterion inspects source files (token counts, scanner results in ReviewSections.tsx/messages.ts), which is not observable through the served page's browser interface.; covered by step 4: web.src.tools.trust-review-pages.test.ts::C-9bb4c4cf the Tool settings sources hold the trust controls and k... | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-03790492 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-199d4e64 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-75b3f1d2 | ok | 0.750 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5367a266 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-315dc330 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1da179fb | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f52c8d49 | ok | 0.130 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3a1c08af | ok | 0.130 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-08abe836 | ok | 0.100 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3ad08589 | ok | 0.050 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7b68e67c | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7374d16f | ok | 0.060 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cbd5fcec | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9da14d6e | ok | 0.770 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c8329b48 | ok | 0.060 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c7bb4abe | ok | 0.240 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9bb4c4cf | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-7b68e67c | skipped | - | - | cap |
| C-1da179fb | not_testable | - | - | the criterion's token list lives in test-plan.md's Source rows and the outcome is a jest run of trust-pages.test.ts; the tokens and file paths are not given, so a pytest cannot reproduce the five scanners |
| C-03790492 | not_testable | - | - | the module under test is TypeScript (web/src/tools/trust.ts), which pytest cannot import, and the ST1-ST5/TO1-TO2 fixture rows are not shown |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-03790492 | web-tools › A stored surface is read for trust and the fields a replacement carries › A stored surface gives each tool's trust with the engine's defaults and a malformed one is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-199d4e64 | web-tools › A stored surface is read for trust and the fields a replacement carries › A retry flag is carried only when the effect is unchanged | pass | pass | the judge passed it and a discriminating test passes |
| C-75b3f1d2 | web-tools › An overlay entry holds only the values that differ from the engine's defaults › Overlay entries are built from trust and carried fields, and Replace and Discover prefill them | pass | pass | the judge passed it and a discriminating test passes |
| C-5367a266 | web-tools › Trusting a result needs the fixed warning and a tick for each tool › The tick list, the refusal text and the fixed names are as the plan says | pass | pass | the judge passed it and a discriminating test passes |
| C-315dc330 | web-tools › Changes shows the old and new value of each changed field › Changed values read as fixed lines under their tool | pass | pass | the judge passed it and a discriminating test passes |
| C-1da179fb | web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › The OpenAPI form sources hold the trust controls and keep the page rules | pass | pass | the judge passed it and a discriminating test passes |
| C-f52c8d49 | web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › An OpenAPI server is registered with a trusted result after a tick | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-3a1c08af | web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace keeps the stored trust and needs no tick | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-08abe836 | web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace drops a retry flag when the effect changes | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-3ad08589 | web-tools › A registration draft becomes the API request or names the field to fix › The three drafts become the registration requests or name the field to fix | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-7b68e67c | web-tools › A registration draft becomes the API request or names the field to fix › A draft with trust and carried fields builds the overlay with only the members that differ | pass | pass | the judge passed it and a discriminating test passes |
| C-7374d16f | web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › Settings become the body and a discovery is worded with every tool left out | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-cbd5fcec | web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › A settings draft with trust and carried fields builds the overlay body | pass | pass | the judge passed it and a discriminating test passes |
| C-9da14d6e | web-tools › The server page shows discovery, settings, changes and calls › An MCP server is discovered, given a setting and discovered again | pass | pass | the judge passed it and a discriminating test passes |
| C-c8329b48 | web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-c7bb4abe | web-tools › The server page shows discovery, settings, changes and calls › Tool settings carries the trust controls, Discover keeps the stored trust and Changes shows the value lines | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-9bb4c4cf | web-tools › The server page shows discovery, settings, changes and calls › The Tool settings sources hold the trust controls and keep the page rules | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-f52c8d49): test_m8_tool_trust::test_register_with_a_trusted_result[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3a1c08af): test_m8_tool_trust::test_replace_keeps_the_stored_trust[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-08abe836): test_m8_tool_trust::test_replace_drops_the_retry_flag_on_an_effect_change[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3ad08589): web.src.tools.register.test.ts::C-3ad08589 codeRegistration builds one tool without a description and one with it: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3ad08589): web.src.tools.register.test.ts::C-3ad08589 codeRegistration refuses the input before the output schema: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3ad08589): web.src.tools.register.test.ts::C-3ad08589 codeReplacement checks the schemas and refuses a server id off the pattern: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3ad08589): web.src.tools.register.test.ts::C-3ad08589 mcpRegistration builds the trimmed MCP body and refuses the id before the url: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3ad08589): web.src.tools.register.test.ts::C-3ad08589 mcpRegistration keeps a local http address as typed: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3ad08589): web.src.tools.register.test.ts::C-3ad08589 no builder changes the draft it is given: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3ad08589): web.src.tools.register.test.ts::C-3ad08589 openApiRegistration builds the overlay of the chosen effects and refuses the first failing field: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3ad08589): web.src.tools.register.test.ts::C-3ad08589 openApiReplacement checks the document and overlay and ignores the origin: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3ad08589): web.src.tools.register.test.ts::C-3ad08589 previewRequest sends the origin it parses and the document, refusing origin first: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3ad08589): web.src.tools.register.test.ts::C-3ad08589 the replacement builders build the PUT bodies and refuse a bad server id: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-7374d16f): web.src.tools.review-discover.test.ts::C-7374d16f discoverBody builds the overlay body and omits proto entries (B1): no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-7374d16f): web.src.tools.review-discover.test.ts::C-7374d16f discoverBody rejects bad keys, effects, names and too many entries (B2): no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-7374d16f): web.src.tools.review-discover.test.ts::C-7374d16f discoveryText cuts a long neutralised name to 79 characters (X3): no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-7374d16f): web.src.tools.review-discover.test.ts::C-7374d16f discoveryText neutralises a bidi name (X5): no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-7374d16f): web.src.tools.review-discover.test.ts::C-7374d16f discoveryText states the count, version and left-out tools (X1, X2, X4, X6): no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-7374d16f): web.src.tools.review-discover.test.ts::C-7374d16f initialDraft keeps a name only when it differs and omits proto tools (I2): no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-7374d16f): web.src.tools.review-discover.test.ts::C-7374d16f initialDraft reads the approved tools and keeps only server tools (I1): no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-7374d16f): web.src.tools.review-discover.test.ts::C-7374d16f parseDiscovery reads a valid discovery answer (P1): no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-7374d16f): web.src.tools.review-discover.test.ts::C-7374d16f parseDiscovery rejects malformed answers (P2): no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-9da14d6e): test_m7_tool_review::test_discovery_settings_and_calls[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-c8329b48): test_m7_tool_review::test_changes_and_calls_of_a_drifted_server[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-c7bb4abe): test_m8_tool_trust_review::test_tool_settings_trust[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-03790492): No end-to-end test traces criterion C-03790492 (web-tools › A stored surface is read for trust and the fields a replacement carries › A stored surface gives each tool's trust with the engine's defaults and a malformed one is refused); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-199d4e64): No end-to-end test traces criterion C-199d4e64 (web-tools › A stored surface is read for trust and the fields a replacement carries › A retry flag is carried only when the effect is unchanged); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-75b3f1d2): No end-to-end test traces criterion C-75b3f1d2 (web-tools › An overlay entry holds only the values that differ from the engine's defaults › Overlay entries are built from trust and carried fields, and Replace and Discover prefill them); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5367a266): No end-to-end test traces criterion C-5367a266 (web-tools › Trusting a result needs the fixed warning and a tick for each tool › The tick list, the refusal text and the fixed names are as the plan says); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-315dc330): No end-to-end test traces criterion C-315dc330 (web-tools › Changes shows the old and new value of each changed field › Changed values read as fixed lines under their tool); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1da179fb): No end-to-end test traces criterion C-1da179fb (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › The OpenAPI form sources hold the trust controls and keep the page rules); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-f52c8d49): The end-to-end test test_m8_tool_trust::test_register_with_a_trusted_result[chromium] traces criterion C-f52c8d49 (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › An OpenAPI server is registered with a trusted result after a tick), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3a1c08af): The end-to-end test test_m8_tool_trust::test_replace_keeps_the_stored_trust[chromium] traces criterion C-3a1c08af (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace keeps the stored trust and needs no tick), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-08abe836): The end-to-end test test_m8_tool_trust::test_replace_drops_the_retry_flag_on_an_effect_change[chromium] traces criterion C-08abe836 (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace drops a retry flag when the effect changes), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3ad08589): No end-to-end test traces criterion C-3ad08589 (web-tools › A registration draft becomes the API request or names the field to fix › The three drafts become the registration requests or name the field to fix); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-7b68e67c): No end-to-end test traces criterion C-7b68e67c (web-tools › A registration draft becomes the API request or names the field to fix › A draft with trust and carried fields builds the overlay with only the members that differ); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-7374d16f): No end-to-end test traces criterion C-7374d16f (web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › Settings become the body and a discovery is worded with every tool left out); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-cbd5fcec): No end-to-end test traces criterion C-cbd5fcec (web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › A settings draft with trust and carried fields builds the overlay body); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-9da14d6e): The end-to-end test test_m7_tool_review::test_discovery_settings_and_calls[chromium] traces criterion C-9da14d6e (web-tools › The server page shows discovery, settings, changes and calls › An MCP server is discovered, given a setting and discovered again), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c8329b48): The end-to-end test test_m7_tool_review::test_changes_and_calls_of_a_drifted_server[chromium] traces criterion C-c8329b48 (web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c7bb4abe): The end-to-end test test_m8_tool_trust_review::test_tool_settings_trust[chromium] traces criterion C-c7bb4abe (web-tools › The server page shows discovery, settings, changes and calls › Tool settings carries the trust controls, Discover keeps the stored trust and Changes shows the value lines), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-9bb4c4cf): No end-to-end test traces criterion C-9bb4c4cf (web-tools › The server page shows discovery, settings, changes and calls › The Tool settings sources hold the trust controls and keep the page rules); step 5 generates one.
- [minor, judge] leftover deliberation comments in the tool settings browser test: e2e/test_m8_tool_trust_review.py carries the author's self-talk about the expected row count inside the test body instead of a real comment, which reads as unfinished work in a committed test.
- [minor, judge] the Tool settings browser test watches the CSP but never asserts it: test_tool_settings_trust collects CSP violations with watch_csp(page) and never checks the result, unlike the three tests of test_m8_tool_trust.py which end with assert csp == []. A CSP regression on the review page would go unnoticed.
- [minor, judge] order of the keys in shown/missing and the refusal message is not pinned by any scenario (spec gap) (criterion C-5367a266): ackStatus sorts shown and derives missing from it, so the refusal text lists keys alphabetically. AK3 uses keys a,b,c,d whose insertion order already equals sorted order, so no row distinguishes sorted order from first-appearance (form/table) order; two reasonable implementations would differ for e.g. {zebra, apple}.
- [major, judge] discoverBody neither validates nor emits keys that appear only in a draft's carried map (spec gap) (criterion C-cbd5fcec): The specification requires discoverBody to throw RangeError for a key of effects, names, trust *or carried* outside ^[A-Za-z0-9_.-]{1,128}$ (and to bound the total at 100 keys). review.ts builds its key set from effects, names and trust only; carried keys are never pattern-checked, never counted against MAX_TOOLS, and — because the loop iterates that key set — a carried entry whose key is in none of the other three maps is silently dropped. No DB row pins a carried-only key, so the gap is undiscovered by the criterion's scenarios.
- [major, judge] Page trust lookups read inherited Object.prototype members instead of Object.prototype-safe defaults (spec gap) (criterion C-c7bb4abe): The spec's failure cases demand that every lookup by a tool name or operationId use Object.hasOwn or a Map. RegisterPage.tsx, ReplaceSection.tsx and ReviewSections.tsx all fall back with `trust[name] ?? DEFAULT_TRUST`; for a legal key such as "toString" with no own entry the read yields Object.prototype.toString (not nullish), so the checkbox/select get a function instead of DEFAULT_TRUST, and ticking it writes dataClass undefined, which makes overlayEntry throw RangeError on submit with no message shown. The builders (RG1/DB5) are safe; only the React reads are not.
- [minor, judge] task 2.1: PF5 does not go through overlayEntry (criterion C-75b3f1d2): Task 2.1's detail line says "PF2, PF4 and PF5 go through overlayEntry". In web/src/tools/trust-overlay.test.ts the rows PF1, PF5, PF6 and PF7 are asserted inside the test titled "prefillTrust pairs stored tools with operations (PF1, PF5, PF6, PF7)", whose body never calls overlayEntry (it deepEquals prefillTrust's trust/carried records directly); only the test titled "prefilled entries carry only non-default values (PF2, PF3, PF4)" builds entries through entryFor -> overlayEntry. Row identities are taken from the test's own titles because test-plan.md § Overlay rows is not in the prompt; if PF...
- [minor, judge] The five scanners do not read trust.ts (spec gap) (criterion C-1da179fb): The criterion's THEN says the test reads trust.ts, TrustControls.tsx, RegisterPage.tsx, ReplaceSection.tsx and ServersPage.tsx and that "the five scanners give []". trust-pages.test.ts runs findInlineStyleUse, findPaletteUtilities, findCssImports, findBannedImports and findRawColours only over the four-component `pages` array; trust.ts is checked for console./localStorage/sessionStorage/registerMessages and for its import lines, but no scanner runs on it. Which files the scanners must cover is not pinned by the scenario, and two reasonable readings differ.

## Needs a human

- UI criterion C-f52c8d49 has no end-to-end test; see the generated UI tests table
- UI criterion C-3a1c08af has no end-to-end test; see the generated UI tests table
- UI criterion C-08abe836 has no end-to-end test; see the generated UI tests table
- UI criterion C-3ad08589 has no end-to-end test; see the generated UI tests table
- UI criterion C-7374d16f has no end-to-end test; see the generated UI tests table
- UI criterion C-c8329b48 has no end-to-end test; see the generated UI tests table
- UI criterion C-c7bb4abe has no end-to-end test; see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.tools.register-trust.test.ts::C-7b68e67c openApiRegistration builds the overlay from trust and carried fields (RG0, RG1)` (task 3.1): passed
- `web.src.tools.register-trust.test.ts::C-7b68e67c openApiRegistration throws RangeError for a data class off the list (RG2)` (task 3.1): passed
- `web.src.tools.review-trust.test.ts::C-cbd5fcec review-trust builds the overlay body from trust and carried fields (DB0 to DB6)` (task 3.2): passed
- `web.src.tools.trust-ack.test.ts::C-5367a266 AK1 trustAckMissing lists unticked trusted or public keys` (task 4.1): passed
- `web.src.tools.trust-ack.test.ts::C-5367a266 AK2 trustAckMissing empty and inherited key` (task 4.1): passed
- `web.src.tools.trust-ack.test.ts::C-5367a266 AK3 ackStatus shown missing message` (task 4.1): passed
- `web.src.tools.trust-ack.test.ts::C-5367a266 AK4 ackStatus baseline removes shown` (task 4.1): passed
- `web.src.tools.trust-ack.test.ts::C-5367a266 AK5 ackStatus all ticks missing empty` (task 4.1): passed
- `web.src.tools.trust-ack.test.ts::C-5367a266 AK6 ackStatus untrusting shows nothing` (task 4.1): passed
- `web.src.tools.trust-ack.test.ts::C-5367a266 AK7 ackStatus newly public shows key` (task 4.1): passed
- `web.src.tools.trust-ack.test.ts::C-5367a266 AK8 ackStatus keeps dollar ampersand` (task 4.1): passed
- `web.src.tools.trust-ack.test.ts::C-5367a266 AK9 fillName replaces key literally` (task 4.1): passed
- `web.src.tools.trust-ack.test.ts::C-5367a266 NM1 trust names and warning` (task 4.1): passed
- `web.src.tools.trust-changes.test.ts::C-315dc330 VL1 each changed field reads as a fixed line under its tool` (task 4.2): passed
- `web.src.tools.trust-changes.test.ts::C-315dc330 VL2 an unreadable surface gives an empty map` (task 4.2): passed
- `web.src.tools.trust-changes.test.ts::C-315dc330 VL3 a default written out on one side only gives no line` (task 4.2): passed
- `web.src.tools.trust-changes.test.ts::C-315dc330 VL4 trust and class removed read as old to new` (task 4.2): passed
- `web.src.tools.trust-changes.test.ts::C-315dc330 VL5 a long data class is cut at 2000 characters` (task 4.2): passed
- `web.src.tools.trust-changes.test.ts::C-315dc330 VL6 withValueLines appends lines to the changed items only` (task 4.2): passed
- `web.src.tools.trust-changes.test.ts::C-315dc330 VL7 a line exists exactly when the diff names the field` (task 4.2): passed
- `web.src.tools.trust-overlay.test.ts::C-75b3f1d2 discoverSettings reads the server tool names (DS1 to DS3)` (task 2.1): passed
- `web.src.tools.trust-overlay.test.ts::C-75b3f1d2 overlayEntry keeps only non-default members in order (OE1 to OE7)` (task 2.1): passed
- `web.src.tools.trust-overlay.test.ts::C-75b3f1d2 prefillTrust pairs stored tools with operations (PF1, PF5, PF6, PF7)` (task 2.1): passed
- `web.src.tools.trust-overlay.test.ts::C-75b3f1d2 prefilled entries carry only non-default values (PF2, PF3, PF4)` (task 2.1): passed
- `web.src.tools.trust-pages.test.ts::C-1da179fb the OpenAPI form sources hold the trust controls and keep the page rules` (task 5.1): passed
- `web.src.tools.trust-review-pages.test.ts::C-9bb4c4cf the Tool settings sources hold the trust controls and keep the page rules` (task 5.2): passed
- `web.src.tools.trust.test.ts::C-03790492 storedTools gives an empty map and refuses malformed surfaces (ST3, ST4, ST5)` (task 1.1): passed
- `web.src.tools.trust.test.ts::C-03790492 storedTools reads MCP tools with the server name (ST2)` (task 1.1): passed
- `web.src.tools.trust.test.ts::C-03790492 storedTools reads the four OpenAPI tools in order with the engine defaults (ST1)` (task 1.1): passed
- `web.src.tools.trust.test.ts::C-03790492 trustOf gives DEFAULT_TRUST itself for an absent tool and the stored trust (TO1, TO2)` (task 1.1): passed
- `web.src.tools.trust.test.ts::C-199d4e64 carriedAfterEffect treats Proposed as write and carries nothing for a changed effect (CA1 to CA10)` (task 1.1): passed
- `web.src.tools.trust.test.ts::C-199d4e64 carriedFields carries a retry flag only when the OpenAPI effect is unchanged (CF1 to CF8)` (task 1.1): passed
- `web.src.tools.trust.test.ts::C-199d4e64 carriedFields carries the MCP retry flag and a differing name (CF9 to CF14)` (task 1.1): passed
