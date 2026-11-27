# Verification: openspec:add-web-tool-trust: NEEDS_HUMAN (round 3)

traceability: 13/19 criteria covered by a discriminating test

- Base: `141a2678bd58eaff5969eeb44f503c8744c01aa8`
- Head: `aaf2f920e88d1681974906676b20eff62dd1c516`
- Implementer profiles: deepseek-free, beam, claude-sonnet
- Judge: nemotron-judge, 9 call(s), judged in 2 parts, prompt sha256 `26ac85b2dd4af26df745d0c8489f2eb77cfee93dbd67d64598a4d5be152f9416`
  - part 1: 20 file(s), 116890 characters, profile nemotron-judge, reply valid
  - part 2: 7 file(s), 28888 characters, profile nemotron-judge, reply repaired
- Judge replies of nemotron-judge (this unit, all rounds): valid 4, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), beam reflection (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.9 | base main@141a2678bd contained |
| 1 | integrity | ok | 292.0 | 11 sub-checks; scope: 51 changed file(s) |
| 2 | build | ok | 36.5 |  |
| 3 | tests | ok | 505.8 |  |
| 4 | traceability | ok | 0.2 | 13/19 criteria covered |
| 4a | audit sampling | ok | 442.2 | 1 not_testable, 1 rejected, 2 skipped; support files at the base: 14 |
| 5 | ui test generation | ok | 1084.3 | 1 fails_at_head, 9 not_testable, 1 writer_failed; 9 not_testable covered by step 4: notes, no hold (L4-VER-067); e2e support files shown to the writer: 1 |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/tools/RegisterPage.tsx, web/src/tools/ReplaceSection.tsx, web/src/tools/ReviewSections.tsx, web/src/tools/ServersPage.tsx, web/src/tools/TrustControls.tsx and 3 more |
| 8 | s1 judge | ok | 1.1 | 19/19 criteria judged by jev |
| 9 | judge | ok | 2802.5 | 9 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261127T0448Z-e4fc/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261127T0448Z-e4fc/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261127T0448Z-e4fc/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261127T0448Z-e4fc/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261127T0448Z-e4fc/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261127T0448Z-e4fc/009-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261127T0448Z-e4fc/010-e2e.log |

## Files by part

- part 1: openspec/changes/add-web-tool-trust-fix-1/.openspec.yaml (308 characters)
- part 1: e2e/test_l4_c_9da14d6e.py (1614 characters)
- part 1: e2e/test_m8_tool_trust.py (13290 characters)
- part 1: e2e/test_m8_tool_trust_review.py (10862 characters)
- part 1: openspec/changes/add-web-tool-trust-fix-1/proposal.md (2963 characters)
- part 1: web/src/tools/register.ts (2862 characters)
- part 1: web/src/tools/register-trust.test.ts (3215 characters)
- part 1: web/src/tools/RegisterPage.tsx (7922 characters)
- part 1: web/src/tools/ReplaceSection.tsx (11290 characters)
- part 1: web/src/tools/review.ts (5254 characters)
- part 1: web/src/tools/review-carried.test.ts (2365 characters)
- part 1: web/src/tools/review-carried-keys.test.ts (1723 characters)
- part 1: web/src/tools/review-trust.test.ts (5708 characters)
- part 1: web/src/tools/ReviewSections.tsx (8548 characters)
- part 1: web/src/tools/ServersPage.tsx (489 characters)
- part 1: openspec/changes/add-web-tool-trust-fix-1/specs/web-tools/spec.md (1696 characters)
- part 1: openspec/changes/add-web-tool-trust-fix-1/tasks.md (557 characters)
- part 1: openspec/changes/add-web-tool-trust/tasks.md (9709 characters)
- part 1: web/src/tools/trust.test.ts (11013 characters)
- part 1: web/src/tools/trust.ts (15502 characters)
- part 2: web/src/tools/trust-ack.test.ts (4057 characters)
- part 2: web/src/tools/trust-changes.test.ts (5371 characters)
- part 2: web/src/tools/trust-lookup.test.ts (1343 characters)
- part 2: web/src/tools/trust-overlay.test.ts (9337 characters)
- part 2: web/src/tools/trust-pages.test.ts (4105 characters)
- part 2: web/src/tools/trust-review-pages.test.ts (2495 characters)
- part 2: web/src/tools/TrustControls.tsx (2180 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 3 test file(s) compared with the base |
| red-green freeze | ok | 10 task(s): red and green compared |
| test path freeze | ok | 10 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/tools/RegisterPage.tsx, web/src/tools/ReplaceSection.tsx, web/src/tools/ReviewSections.tsx, web/src/tools/ServersPage.tsx, web/src/tools/TrustControls.tsx (+14 more) |
| tdd history | ok | 10 task(s); red tests passing at head: step 3 |
| python encoding | ok | 3 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 3117 of 3117 base tests pass on the unit's code with its 14 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-03790492 | web-tools › A stored surface is read for trust and the fields a replacement carries › A stored surface gives each tool's trust with the engine's defaults and a malformed one is refused | covered | web.src.tools.trust.test.ts::C-03790492 storedTools gives an empty map and refuses malformed surfaces (ST3, ST4, ST5) (passed, red_assertion); web.src.tools.trust.test.ts::C-03790492 storedTools reads MCP tools with the server name (ST2) (passed, red_assertion); web.src.tools.trust.test.ts::C-037904... | - | 0.91 | - |
| C-199d4e64 | web-tools › A stored surface is read for trust and the fields a replacement carries › A retry flag is carried only when the effect is unchanged | covered | web.src.tools.trust.test.ts::C-199d4e64 carriedAfterEffect treats Proposed as write and carries nothing for a changed effect (CA1 to CA10) (passed, red_assertion); web.src.tools.trust.test.ts::C-199d4e64 carriedFields carries a retry flag only when the OpenAPI effect is unchanged (CF1 to CF8) (passe... | - | 0.92 | - |
| C-75b3f1d2 | web-tools › An overlay entry holds only the values that differ from the engine's defaults › Overlay entries are built from trust and carried fields, and Replace and Discover prefill them | covered | web.src.tools.trust-overlay.test.ts::C-75b3f1d2 discoverSettings reads the server tool names (DS1 to DS3) (passed, red_assertion); web.src.tools.trust-overlay.test.ts::C-75b3f1d2 overlayEntry keeps only non-default members in order (OE1 to OE7) (passed, red_assertion); web.src.tools.trust-overlay.te... | - | 0.72 | - |
| C-5367a266 | web-tools › Trusting a result needs the fixed warning and a tick for each tool › The tick list, the refusal text and the fixed names are as the plan says | covered | web.src.tools.trust-ack.test.ts::C-5367a266 AK1 trustAckMissing lists unticked trusted or public keys (passed, red_assertion); web.src.tools.trust-ack.test.ts::C-5367a266 AK2 trustAckMissing empty and inherited key (passed, red_assertion); web.src.tools.trust-ack.test.ts::C-5367a266 AK3 ackStatus sh... | - | 0.92 | `e2e/test_l4_c_5367a266.py`, `.l4-out/e2e/page.html` |
| C-315dc330 | web-tools › Changes shows the old and new value of each changed field › Changed values read as fixed lines under their tool | covered | web.src.tools.trust-changes.test.ts::C-315dc330 VL1 each changed field reads as a fixed line under its tool (passed, red_assertion); web.src.tools.trust-changes.test.ts::C-315dc330 VL2 an unreadable surface gives an empty map (passed, red_assertion); web.src.tools.trust-changes.test.ts::C-315dc330 V... | - | 0.88 | - |
| C-1da179fb | web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › The OpenAPI form sources hold the trust controls and keep the page rules | covered | web.src.tools.trust-pages.test.ts::C-1da179fb the OpenAPI form sources hold the trust controls and keep the page rules (passed, red_assertion) | - | 0.89 | - |
| C-f52c8d49 | web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › An OpenAPI server is registered with a trusted result after a tick | uncovered | - | test_m8_tool_trust::test_register_with_a_trusted_result[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.14 | - |
| C-3a1c08af | web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace keeps the stored trust and needs no tick | uncovered | - | test_m8_tool_trust::test_replace_keeps_the_stored_trust[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.13 | - |
| C-08abe836 | web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace drops a retry flag when the effect changes | uncovered | - | test_m8_tool_trust::test_replace_drops_the_retry_flag_on_an_effect_change[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.09 | - |
| C-3ad08589 | web-tools › A registration draft becomes the API request or names the field to fix › The three drafts become the registration requests or name the field to fix | uncovered | - | web.src.tools.register.test.ts::C-3ad08589 codeRegistration builds one tool without a description and one with it (no proof that it discriminates (no red, audit or generated record)); web.src.tools.register.test.ts::C-3ad08589 codeRegistration refuses the input before the output schema (no proof tha... | 0.05 | - |
| C-7b68e67c | web-tools › A registration draft becomes the API request or names the field to fix › A draft with trust and carried fields builds the overlay with only the members that differ | covered | web.src.tools.register-trust.test.ts::C-7b68e67c openApiRegistration builds the overlay from trust and carried fields (RG0, RG1) (passed, red_assertion); web.src.tools.register-trust.test.ts::C-7b68e67c openApiRegistration throws RangeError for a data class off the list (RG2) (passed, red_assertion) | - | 0.90 | - |
| C-7374d16f | web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › Settings become the body and a discovery is worded with every tool left out | uncovered | - | web.src.tools.review-discover.test.ts::C-7374d16f discoverBody builds the overlay body and omits proto entries (B1) (no proof that it discriminates (no red, audit or generated record)); web.src.tools.review-discover.test.ts::C-7374d16f discoverBody rejects bad keys, effects, names and too many entri... | 0.06 | - |
| C-cbd5fcec | web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › A settings draft with trust and carried fields builds the overlay body | covered | web.src.tools.review-carried-keys.test.ts::C-cbd5fcec discoverBody keeps a carried-only key beside a skipped tool (DB3) (passed, red_assertion); web.src.tools.review-trust.test.ts::C-cbd5fcec review-trust builds the overlay body from trust and carried fields (DB0 to DB6) (passed, red_assertion) | - | 0.91 | - |
| C-9da14d6e | web-tools › The server page shows discovery, settings, changes and calls › An MCP server is discovered, given a setting and discovered again | covered | test_l4_c_9da14d6e::test_discovery_settings_and_calls_keeps_trust_out_of_bodies (passed, generated) | test_m7_tool_review::test_discovery_settings_and_calls[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.74 | - |
| C-c8329b48 | web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server | uncovered | - | test_m7_tool_review::test_changes_and_calls_of_a_drifted_server[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.05 | - |
| C-c7bb4abe | web-tools › The server page shows discovery, settings, changes and calls › Tool settings carries the trust controls, Discover keeps the stored trust and Changes shows the value lines | covered | web.src.tools.trust-lookup.test.ts::C-f43385f5 C-c7bb4abe RegisterPage.tsx reads trust only through own entries (passed, red_assertion); web.src.tools.trust-lookup.test.ts::C-f43385f5 C-c7bb4abe ReplaceSection.tsx reads trust only through own entries (passed, red_assertion); web.src.tools.trust-look... | test_m8_tool_trust_review::test_tool_settings_trust[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.71 | - |
| C-9bb4c4cf | web-tools › The server page shows discovery, settings, changes and calls › The Tool settings sources hold the trust controls and keep the page rules | covered | web.src.tools.trust-review-pages.test.ts::C-9bb4c4cf the Tool settings sources hold the trust controls and keep the page rules (passed, red_assertion) | - | 0.89 | - |
| C-c4fa5fc4 | web-tools › Effect settings become the overlay body and a discovery answer names every tool left out — regression 1 › discoverBody neither validates nor emits keys that appear only in a draft's carried map | covered | web.src.tools.review-carried-keys.test.ts::C-c4fa5fc4 discoverBody validates and emits a carried-only key (passed, red_assertion); web.src.tools.review-carried.test.ts::C-c4fa5fc4 discoverBody counts carried-only keys against the 100 limit across maps (R1e) (passed, red_assertion); web.src.tools.rev... | - | 0.95 | `e2e/test_l4_c_c4fa5fc4.py`, `.l4-out/e2e/page.html` |
| C-f43385f5 | web-tools › The server page shows discovery, settings, changes and calls — regression 1 › Page trust lookups read inherited Object.prototype members instead of Object.prototype-safe defaults | covered | web.src.tools.trust-lookup.test.ts::C-f43385f5 C-c7bb4abe RegisterPage.tsx reads trust only through own entries (passed, red_assertion, inadequate); web.src.tools.trust-lookup.test.ts::C-f43385f5 C-c7bb4abe ReplaceSection.tsx reads trust only through own entries (passed, red_assertion); web.src.tool... | - | 0.75 | `e2e/test_l4_c_f43385f5.py`, `test-results/test-l4-c-f43385f5-py-test-object-prototype-member-operation-trust-default-chromium/test-failed-1.png`, `test-results/test-l4-c-f43385f5-py-test-object-prototype-member-operation-trust-default-chromium/trace.zip`, `.l4-out/e2e/page.html` |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_l4_c_9da14d6e.py` |  | relevant | new test file |
| `e2e/test_m8_tool_trust.py` |  | relevant | new test file |
| `e2e/test_m8_tool_trust_review.py` |  | relevant | new test file |
| `openspec/changes/add-web-tool-trust-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust-fix-1/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust-fix-1/specs/web-tools/spec.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/evidence/round-2/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/evidence/round-2/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/evidence/round-2/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T0856Z-9b38.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T1129Z-e48e.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T1401Z-9952.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T1620Z-708c.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T1907Z-ab78.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T1945Z-5ff4.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T2021Z-c69f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T2056Z-b64d.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T2131Z-30c3.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261126T2208Z-78d9.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261127T0036Z-041d.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261127T0049Z-77ad.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261127T0206Z-0d4b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/.l4/ledger/r-20261127T0331Z-4592.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-trust/verification.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/tools/RegisterPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/ReplaceSection.tsx` | web | relevant | named in the spec |
| `web/src/tools/ReviewSections.tsx` | web | relevant | named in the spec |
| `web/src/tools/ServersPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/TrustControls.tsx` | web | relevant | named in the spec |
| `web/src/tools/register-trust.test.ts` |  | relevant | new test file |
| `web/src/tools/register.ts` | web | relevant | named in the spec |
| `web/src/tools/review-carried-keys.test.ts` |  | relevant | new test file |
| `web/src/tools/review-carried.test.ts` |  | relevant | new test file |
| `web/src/tools/review-trust.test.ts` |  | relevant | new test file |
| `web/src/tools/review.ts` | web | relevant | named in the spec |
| `web/src/tools/trust-ack.test.ts` |  | relevant | new test file |
| `web/src/tools/trust-changes.test.ts` |  | relevant | new test file |
| `web/src/tools/trust-lookup.test.ts` |  | relevant | new test file |
| `web/src/tools/trust-overlay.test.ts` |  | relevant | new test file |
| `web/src/tools/trust-pages.test.ts` |  | relevant | new test file |
| `web/src/tools/trust-review-pages.test.ts` |  | relevant | new test file |
| `web/src/tools/trust.test.ts` |  | relevant | new test file |
| `web/src/tools/trust.ts` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/tools/RegisterPage.tsx, web/src/tools/ReplaceSection.tsx, web/src/tools/ReviewSections.tsx, web/src/tools/ServersPage.tsx, web/src/tools/TrustControls.tsx and 3 more

### Tests

3304 of 3304 passed, 0 failed, 0 errored, 0 skipped.
48 of 48 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-f52c8d49 | waived | - | - | - | 0 | waived by Q-010 | - |
| C-3a1c08af | waived | - | - | - | 0 | waived by Q-011 | - |
| C-08abe836 | waived | - | - | - | 0 | waived by Q-012 | - |
| C-3ad08589 | waived | - | - | - | 0 | waived by Q-013 | - |
| C-7374d16f | waived | - | - | - | 0 | waived by Q-014 | - |
| C-c8329b48 | waived | - | - | - | 0 | waived by Q-015 | - |
| C-c7bb4abe | waived | - | - | - | 0 | waived by Q-007 | - |
| C-03790492 | not_testable | - | - | - | 1 | The criterion checks internal `trust.ts` module behavior for unit-test rows ST1–ST5/TO1/TO2 (entry order, empty map, null surfaces, and `DEFAULT_TRUST` object identity/frozen state); none of that is observable through the browser UI, so a Playwright e2e test cannot assert it.; covered by step 4: web... | - |
| C-199d4e64 | not_testable | - | - | - | 1 | The criterion asserts per-row return values of the internal carriedAfterEffect function ({unsafe_to_retry:false} vs {}); that carried state is never rendered to the user or exposed through the public UI (only sent to the server on save), so the CF/CA outcomes are not observable via e2e.; covered by ... | - |
| C-75b3f1d2 | not_testable | - | - | - | 1 | The criterion's observable outcomes are unit-test row expectations over an internal TypeScript test module (exact overlay objects, member count/order, and RangeError throws), not behavior observable through a named browser public interface; no e2e route, button, or selector is specified.; covered by... | - |
| C-5367a266 | not_testable | e2e/test_l4_c_5367a266.py | - | - | 2 | The criterion is expressed as unit-test rows AK1-AK9 and NM1 of trust-ack.test.ts asserting ackStatus return values; no route/URL or test-plan mapping to a browser-observable flow is provided, so it cannot be driven through a public interface from this prompt alone.; covered by step 4: web.src.tools... | - |
| C-315dc330 | not_testable | - | - | - | 1 | The criterion depends on test-plan.md value-line rows VL1–VL7 and trust-changes.test.ts, neither provided; the page snapshot shows no Changes view or value-line rows, and no e2e helper or public URL for a Changes page is defined.; covered by step 4: web.src.tools.trust-changes.test.ts::C-315dc330 VL... | - |
| C-1da179fb | not_testable | - | - | - | 1 | The criterion checks static source-code properties (token presence, imports, occurrence counts, scanner results) of .ts/.tsx files. It has no user-observable outcome through the browser, so it cannot be asserted via the page fixture or the origin base URL.; covered by step 4: web.src.tools.trust-pag... | - |
| C-7b68e67c | not_testable | - | - | - | 1 | The THEN clause (RG0 equals the frozen overlay, RG1's exact overlay member sets, RG2 throws RangeError) asserts internal overlay construction from register-trust.test.ts draft rows. The provided UI diff and page snapshot expose no user-observable page, endpoint, or frozen-overlay surface to drive RG... | - |
| C-cbd5fcec | not_testable | - | - | - | 1 | The criterion asserts internal unit-test outcomes of review-trust.test.ts rows DB0–DB6 (specific trust/carried JSON bodies, RangeError thrown three times, 100 keys passed, __proto__/toString key bodies) from test-plan.md draft rows; these are not observable through the browser page's public UI inter... | - |
| C-9bb4c4cf | not_testable | - | - | - | 1 | The criterion checks static source-file contents (tokens present in messages.ts, at most two `tools-feedback` and no `data-tone="primary"` in ReviewSections.tsx, five scanners returning `[]`) rather than any user-observable behavior through the page, so it cannot be verified with a pytest-playwright... | - |
| C-c4fa5fc4 | writer_failed | e2e/test_l4_c_c4fa5fc4.py | - | - | 2 | opencode's permission rules rejected a tool call (bash) | - |
| C-f43385f5 | fails_at_head | e2e/test_l4_c_f43385f5.py | fail | fail | 2 | the test fails at the head: test_l4_c_f43385f5::test_object_prototype_member_operation_trust_default[chromium] | test-results/test-l4-c-f43385f5-py-test-object-prototype-member-operation-trust-default-chromium/test-failed-1.png, test-results/test-l4-c-f43385f5-py-test-object-prototype-member-operation-trust-default-chromium/trace.zip |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-03790492 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-199d4e64 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-75b3f1d2 | ok | 0.720 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5367a266 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-315dc330 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1da179fb | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f52c8d49 | ok | 0.140 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3a1c08af | ok | 0.130 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-08abe836 | ok | 0.090 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3ad08589 | ok | 0.050 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7b68e67c | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7374d16f | ok | 0.060 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cbd5fcec | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9da14d6e | ok | 0.740 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c8329b48 | ok | 0.050 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c7bb4abe | ok | 0.710 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9bb4c4cf | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c4fa5fc4 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f43385f5 | ok | 0.750 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-cbd5fcec | skipped | - | - | cap |
| C-c7bb4abe | skipped | - | - | cap |
| C-199d4e64 | not_testable | - | - | The criterion targets trust.test.ts against the TypeScript module src/tools/trust.ts (carriedFields/carriedAfterEffect); no Python module or importable public interface is shown, so pytest cannot call it. |
| C-03790492 | rejected | e2e/test_l4_audit_c_03790492_r3.py | base | the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_03790492_r3.py |

## Rejected audit tests

- C-03790492: the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_03790492_r3.py

## Answers to verdict questions

- Q-001 accept C-f52c8d49 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied by the code as it stands. The registration Operations table renders the six headers in order, each non-excluded row gets a TrustToggle described by the warning paragraph that TrustNotes renders once, and the excluded exportVendors row gets no controls. ackStatus with an em...
- Q-002 accept C-3a1c08af by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied. ServersPage passes the pending surface, else the approved one, to ReplaceSection, which reads it with storedTools. After the preview, prefillTrust pairs createPayment with the stored create_payment and gives trusted and private, and carriedFields keeps unsafe_to_retry fal...
- Q-003 accept C-08abe836 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied. Changing an effect in the Replace form calls carriedAfterEffect with the operation's derived name as the lookup, and carriedFields drops unsafe_to_retry whenever the stored effect differs from the new one, so moving createPayment from pay to send and listVendors from read...
- Q-004 accept C-3ad08589 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied. It names a frozen test of an earlier unit that must stay green unedited, so by construction no red of this unit can trace it; the proof is that its assertions still hold against the edited builders. operationOverlay now reads the optional trust and carried records with Ob...
- Q-005 accept C-7374d16f by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied. It names a frozen test of an earlier unit that must stay green unedited, so no red of this unit can trace it; the proof is that its assertions hold against the edited review.ts. initialDraft still returns effects and an always-present names record, discoverBody still give...
- Q-006 accept C-c8329b48 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied by the code as it stands. The M7 drifted-server browser test is frozen from an earlier unit and runs unedited, so no red of this unit can trace it; its assertions hold against the edited review sections. Discover tools now posts discoverBody of initialDraft of the approved...
- Q-007 accept C-c7bb4abe by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied. On each loaded detail the draft is initialDraft of the pending tools with the trust and carried records of discoverSettings of the pending surface, and the baseline is that trust, so find_vendor and log_note start checked with private and public, ping unchecked, and no ti...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-03790492 | web-tools › A stored surface is read for trust and the fields a replacement carries › A stored surface gives each tool's trust with the engine's defaults and a malformed one is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-199d4e64 | web-tools › A stored surface is read for trust and the fields a replacement carries › A retry flag is carried only when the effect is unchanged | pass | pass | the judge passed it and a discriminating test passes |
| C-75b3f1d2 | web-tools › An overlay entry holds only the values that differ from the engine's defaults › Overlay entries are built from trust and carried fields, and Replace and Discover prefill them | pass | pass | the judge passed it and a discriminating test passes |
| C-5367a266 | web-tools › Trusting a result needs the fixed warning and a tick for each tool › The tick list, the refusal text and the fixed names are as the plan says | pass | pass | the judge passed it and a discriminating test passes |
| C-315dc330 | web-tools › Changes shows the old and new value of each changed field › Changed values read as fixed lines under their tool | pass | pass | the judge passed it and a discriminating test passes |
| C-1da179fb | web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › The OpenAPI form sources hold the trust controls and keep the page rules | pass | pass | the judge passed it and a discriminating test passes |
| C-f52c8d49 | web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › An OpenAPI server is registered with a trusted result after a tick | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied by the code as it stands. The registration Operations table renders the six headers in order, each non-excluded row gets a TrustToggle described by the warning paragraph that TrustNotes renders once, and the excl... |
| C-3a1c08af | web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace keeps the stored trust and needs no tick | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied. ServersPage passes the pending surface, else the approved one, to ReplaceSection, which reads it with storedTools. After the preview, prefillTrust pairs createPayment with the stored create_payment and gives tru... |
| C-08abe836 | web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace drops a retry flag when the effect changes | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied. Changing an effect in the Replace form calls carriedAfterEffect with the operation's derived name as the lookup, and carriedFields drops unsafe_to_retry whenever the stored effect differs from the new one, so mo... |
| C-3ad08589 | web-tools › A registration draft becomes the API request or names the field to fix › The three drafts become the registration requests or name the field to fix | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied. It names a frozen test of an earlier unit that must stay green unedited, so by construction no red of this unit can trace it; the proof is that its assertions still hold against the edited builders. operationOve... |
| C-7b68e67c | web-tools › A registration draft becomes the API request or names the field to fix › A draft with trust and carried fields builds the overlay with only the members that differ | pass | pass | the judge passed it and a discriminating test passes |
| C-7374d16f | web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › Settings become the body and a discovery is worded with every tool left out | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied. It names a frozen test of an earlier unit that must stay green unedited, so no red of this unit can trace it; the proof is that its assertions hold against the edited review.ts. initialDraft still returns effect... |
| C-cbd5fcec | web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › A settings draft with trust and carried fields builds the overlay body | pass | pass | the judge passed it and a discriminating test passes |
| C-9da14d6e | web-tools › The server page shows discovery, settings, changes and calls › An MCP server is discovered, given a setting and discovered again | pass | pass | the judge passed it and a discriminating test passes |
| C-c8329b48 | web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied by the code as it stands. The M7 drifted-server browser test is frozen from an earlier unit and runs unedited, so no red of this unit can trace it; its assertions hold against the edited review sections. Discover... |
| C-c7bb4abe | web-tools › The server page shows discovery, settings, changes and calls › Tool settings carries the trust controls, Discover keeps the stored trust and Changes shows the value lines | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied. On each loaded detail the draft is initialDraft of the pending tools with the trust and carried records of discoverSettings of the pending surface, and the baseline is that trust, so find_vendor and log_note sta... |
| C-9bb4c4cf | web-tools › The server page shows discovery, settings, changes and calls › The Tool settings sources hold the trust controls and keep the page rules | pass | pass | the judge passed it and a discriminating test passes |
| C-c4fa5fc4 | web-tools › Effect settings become the overlay body and a discovery answer names every tool left out — regression 1 › discoverBody neither validates nor emits keys that appear only in a draft's carried map | pass | pass | the judge passed it and a discriminating test passes |
| C-f43385f5 | web-tools › The server page shows discovery, settings, changes and calls — regression 1 › Page trust lookups read inherited Object.prototype members instead of Object.prototype-safe defaults | pass | pass | the judge passed it and a discriminating test passes |

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
- [minor, deterministic] an audit test was rejected (criterion C-03790492): the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_03790492_r3.py
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-03790492): No end-to-end test traces criterion C-03790492 (web-tools › A stored surface is read for trust and the fields a replacement carries › A stored surface gives each tool's trust with the engine's defaults and a malformed one is refused); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-199d4e64): No end-to-end test traces criterion C-199d4e64 (web-tools › A stored surface is read for trust and the fields a replacement carries › A retry flag is carried only when the effect is unchanged); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-75b3f1d2): No end-to-end test traces criterion C-75b3f1d2 (web-tools › An overlay entry holds only the values that differ from the engine's defaults › Overlay entries are built from trust and carried fields, and Replace and Discover prefill them); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5367a266): No end-to-end test traces criterion C-5367a266 (web-tools › Trusting a result needs the fixed warning and a tick for each tool › The tick list, the refusal text and the fixed names are as the plan says); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-315dc330): No end-to-end test traces criterion C-315dc330 (web-tools › Changes shows the old and new value of each changed field › Changed values read as fixed lines under their tool); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1da179fb): No end-to-end test traces criterion C-1da179fb (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › The OpenAPI form sources hold the trust controls and keep the page rules); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-f52c8d49): The end-to-end test test_m8_tool_trust::test_register_with_a_trusted_result[chromium] traces criterion C-f52c8d49 (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › An OpenAPI server is registered with a trusted result after a tick), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; waived by Q-010, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3a1c08af): The end-to-end test test_m8_tool_trust::test_replace_keeps_the_stored_trust[chromium] traces criterion C-3a1c08af (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace keeps the stored trust and needs no tick), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; waived by Q-011, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-08abe836): The end-to-end test test_m8_tool_trust::test_replace_drops_the_retry_flag_on_an_effect_change[chromium] traces criterion C-08abe836 (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace drops a retry flag when the effect changes), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; waived by Q-012, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3ad08589): No end-to-end test traces criterion C-3ad08589 (web-tools › A registration draft becomes the API request or names the field to fix › The three drafts become the registration requests or name the field to fix); waived by Q-013, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-7b68e67c): No end-to-end test traces criterion C-7b68e67c (web-tools › A registration draft becomes the API request or names the field to fix › A draft with trust and carried fields builds the overlay with only the members that differ); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-7374d16f): No end-to-end test traces criterion C-7374d16f (web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › Settings become the body and a discovery is worded with every tool left out); waived by Q-014, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-cbd5fcec): No end-to-end test traces criterion C-cbd5fcec (web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › A settings draft with trust and carried fields builds the overlay body); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c8329b48): The end-to-end test test_m7_tool_review::test_changes_and_calls_of_a_drifted_server[chromium] traces criterion C-c8329b48 (web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; waived by Q-015, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c7bb4abe): The end-to-end test test_m8_tool_trust_review::test_tool_settings_trust[chromium] traces criterion C-c7bb4abe (web-tools › The server page shows discovery, settings, changes and calls › Tool settings carries the trust controls, Discover keeps the stored trust and Changes shows the value lines), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; waived by Q-007, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-9bb4c4cf): No end-to-end test traces criterion C-9bb4c4cf (web-tools › The server page shows discovery, settings, changes and calls › The Tool settings sources hold the trust controls and keep the page rules); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c4fa5fc4): No end-to-end test traces criterion C-c4fa5fc4 (web-tools › Effect settings become the overlay body and a discovery answer names every tool left out — regression 1 › discoverBody neither validates nor emits keys that appear only in a draft's carried map); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-f43385f5): No end-to-end test traces criterion C-f43385f5 (web-tools › The server page shows discovery, settings, changes and calls — regression 1 › Page trust lookups read inherited Object.prototype members instead of Object.prototype-safe defaults); step 5 generates one.
- [minor, judge] spec_gap: discoverBody silently excludes __proto__ from key counting and validation (spec gap) (criterion C-c4fa5fc4): discoverBody deletes __proto__ from the collected key set before the 100-key limit check and pattern validation. A draft with 100 valid keys plus __proto__ in any map would not throw, and __proto__ is never emitted. No scenario pins this behavior; two reasonable implementations differ on whether __proto__ counts toward the limit.
- [minor, judge] spec_gap: overlayEntry throws RangeError when trust.dataClass is undefined (spec gap) (criterion C-75b3f1d2): overlayEntry throws RangeError for trust.dataClass that is neither null, public, nor private. The ToolTrust type types dataClass as DataClass | null, so undefined should not occur, but if it does (e.g. from an Object.prototype inheritance leak before the trustFor fix), overlayEntry throws. No scenario pins this input.
- [minor, judge] the judge called a test inadequate (criterion C-f43385f5): web.src.tools.trust-lookup.test.ts::C-f43385f5 C-c7bb4abe RegisterPage.tsx reads trust only through own entries

## Needs a human

- UI criterion C-c4fa5fc4 has no end-to-end test; see the generated UI tests table
- UI criterion C-f43385f5 has no end-to-end test; see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.tools.register-trust.test.ts::C-7b68e67c openApiRegistration builds the overlay from trust and carried fields (RG0, RG1)` (task 3.1): passed
- `web.src.tools.register-trust.test.ts::C-7b68e67c openApiRegistration throws RangeError for a data class off the list (RG2)` (task 3.1): passed
- `web.src.tools.review-carried-keys.test.ts::C-c4fa5fc4 discoverBody validates and emits a carried-only key` (task 1.1): passed
- `web.src.tools.review-carried-keys.test.ts::C-cbd5fcec discoverBody keeps a carried-only key beside a skipped tool (DB3)` (task 1.1): passed
- `web.src.tools.review-carried.test.ts::C-c4fa5fc4 discoverBody counts carried-only keys against the 100 limit across maps (R1e)` (task 1.1): passed
- `web.src.tools.review-carried.test.ts::C-c4fa5fc4 discoverBody emits an overlay entry from carried-only fields (R1c)` (task 1.1): passed
- `web.src.tools.review-carried.test.ts::C-c4fa5fc4 discoverBody omits a carried-only __proto__ key (R1d)` (task 1.1): passed
- `web.src.tools.review-carried.test.ts::C-c4fa5fc4 discoverBody rejects a carried-only key outside the pattern (R1a)` (task 1.1): passed
- `web.src.tools.review-carried.test.ts::C-c4fa5fc4 discoverBody rejects more than 100 carried-only keys (R1b)` (task 1.1): passed
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
- `web.src.tools.trust-lookup.test.ts::C-f43385f5 C-c7bb4abe RegisterPage.tsx reads trust only through own entries` (task 1.2): passed
- `web.src.tools.trust-lookup.test.ts::C-f43385f5 C-c7bb4abe ReplaceSection.tsx reads trust only through own entries` (task 1.2): passed
- `web.src.tools.trust-lookup.test.ts::C-f43385f5 C-c7bb4abe ReviewSections.tsx reads trust only through own entries` (task 1.2): passed
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
