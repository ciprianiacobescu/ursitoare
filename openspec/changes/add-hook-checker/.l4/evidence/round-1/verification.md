# Verification: openspec:add-hook-checker: PASS (round 1)

traceability: 15/15 criteria covered by a discriminating test

- Base: `c3063687b7780dfbb71c86451d7e41cc7804685f`
- Head: `c70eb39dfff09c1923241f0885d3ad5271c4f80d`
- Implementer profiles: claude-sonnet
- Judge: beam-judge, 1 call(s), prompt sha256 `99e0ab47ef716d45c2eebdfb89d180d8ac29f454bf769bb83b2a2e407f47f2a4`
- Judge replies of beam-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): beam-judge reflection (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base merged: main@c3063687b7 as c70eb39dff (1 commit) |
| 1 | integrity | ok | 549.3 | 11 sub-checks (+1 unfrozen by human answers); scope: 36 changed file(s) |
| 2 | build | ok | 28.3 |  |
| 3 | tests | ok | 270.7 |  |
| 4 | traceability | ok | 0.2 | 15/15 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/authoring/format/types.ts, src/authoring/hooks/check.ts, src/authoring/hooks/codes.ts, src/authoring/hooks/model.ts, src/authoring/index.ts and 4 more |
| 8 | s1 judge | ok | 1.2 | 9/15 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 133.7 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261107T1907Z-8274/054-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261107T1907Z-8274/055-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261107T1907Z-8274/056-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261107T1907Z-8274/057-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261107T1907Z-8274/058-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261107T1907Z-8274/059-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261107T1907Z-8274/060-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 7 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 7 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/authoring/format/types.ts, src/authoring/hooks/cases.test.ts, src/authoring/hooks/check-schema.test.ts, src/authoring/hooks/check.test.ts, src/authoring/hooks/check.ts (+12 more) |
| tdd history | ok | 7 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1739 of 1739 base tests pass on the unit's code with its 7 test and support files at the base (base: base worktree) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/authoring/hooks/layer.test.ts kept at head for the run (task 3.1: unfrozen by Q-001)
- src.authoring.validate.diagnostics.test.ts::C-73b013e5: DIAGNOSTICS has one entry per code in list order with single-line text (named by the task text, plan:m5@42b4d36c128864cc)
- src.authoring.validate.diagnostics.test.ts::C-73b013e5: the file holds exactly one heading per code (named by the task text, plan:m5@42b4d36c128864cc)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/authoring/hooks/layer.test.ts (task 3.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-7fc61336 | flow-validation › validateFlow runs three gated layers › RF-1 and its variants validate | covered | src.authoring.validate.whole.test.ts::C-7fc61336 RF-1 validates with one trifecta warning (passed, pass_to_pass); src.authoring.validate.whole.test.ts::C-7fc61336 the RF-1 variants validate (passed, pass_to_pass) | - | 0.92 |
| C-a609469d | flow-validation › validateFlow runs three gated layers › Layers gate, order is stable, non-objects fail in L1 | covered | src.authoring.validate.whole.test.ts::C-a609469d layers gate (passed, pass_to_pass); src.authoring.validate.whole.test.ts::C-a609469d node key order does not change the result (passed, pass_to_pass); src.authoring.validate.whole.test.ts::C-a609469d non-object documents fail in L1 (passed, pass_to_pa... | - | 0.89 |
| C-73b013e5 | flow-validation › Diagnostics are documented › The document covers every code | covered | src.authoring.hooks.diagnostics-hooks.test.ts::C-73b013e5: the document has a heading for each hook code (passed, red_assertion, inadequate); src.authoring.hooks.diagnostics-hooks.test.ts::C-73b013e5: the nine hook entries have layer H and single-line text (passed, red_assertion) | src.authoring.validate.diagnostics.test.ts::C-73b013e5: DIAGNOSTICS has one entry per code in list order with single-line text (no proof that it discriminates (no red, audit or generated record)); src.authoring.validate.diagnostics.test.ts::C-73b013e5: links and anchors (no proof that it discriminat... | 0.73 |
| C-8919e1d9 | flow-validation › The code lists › The code lists are exact | covered | src.authoring.hooks.diagnostics-hooks.test.ts::C-d672ebad C-8919e1d9: the hook lists are exact and apart from the flow lists (passed, red_assertion, inadequate); src.authoring.validate.codes.test.ts::C-8919e1d9 The code lists are exact (passed, pass_to_pass) | - | 0.87 |
| C-8f577367 | hooks-static › Node metas and selectors › Metas and selectors | covered | src.authoring.hooks.model.test.ts::C-8f577367: nodeMeta describes nodes and answers null for non-nodes (passed, red_assertion); src.authoring.hooks.model.test.ts::C-8f577367: selectorMatches ANDs the selector fields (passed, red_assertion) | - | - |
| C-71097b3f | hooks-static › Node metas and selectors › when conditions | covered | src.authoring.hooks.model.test.ts::C-71097b3f: whenMatches applies from, next and outcome (passed, red_assertion) | - | 0.91 |
| C-9762b9cd | hooks-static › Hook placements follow the onion order › Order, labels and exclusions | covered | src.authoring.hooks.placements.test.ts::C-9762b9cd: hookPlacements orders rules and node hooks as an onion (passed, red_assertion); src.authoring.hooks.placements.test.ts::C-9762b9cd: hookPlacements skips hookless kinds, end posts and unknown ids (passed, red_assertion) | - | - |
| C-45aac31b | hooks-static › Hook routes extend the successor graph › Routes, augmented successors and declaresHooks | covered | src.authoring.hooks.placements.test.ts::C-45aac31b: augmentedSuccessors adds hook routes to declared successors (passed, red_assertion); src.authoring.hooks.placements.test.ts::C-45aac31b: declaresHooks says whether a document uses hooks (passed, red_assertion); src.authoring.hooks.placements.test.t... | - | 0.92 |
| C-53971bc2 | hooks-static › The checker reports each hook rule with its code › The 45 hook flows | covered | src.authoring.hooks.check.test.ts::C-53971bc2: the 15 flagged hook flows give their rows and the other 30 are clean (passed, red_assertion) | - | 0.95 |
| C-82781d52 | hooks-static › The checker reports each hook rule with its code › Effect routes and effect retries | covered | src.authoring.hooks.check.test.ts::C-82781d52: a pay block hook in a retried post chain is refused even with the flag (passed, red_assertion); src.authoring.hooks.check.test.ts::C-82781d52: a route to a node of unknown effect is H_ROUTE_EFFECT (passed, red_assertion); src.authoring.hooks.check.test.... | - | - |
| C-22c29049 | hooks-static › Malformed hooks give H_SCHEMA and never throw › Malformed documents | covered | src.authoring.hooks.check-schema.test.ts::C-22c29049: M1 gives exactly its H_SCHEMA rows and no warning (passed, red_assertion); src.authoring.hooks.check-schema.test.ts::C-22c29049: M10 gives exactly its H_SCHEMA rows and no warning (passed, red_assertion); src.authoring.hooks.check-schema.test.ts:... | - | - |
| C-0c093690 | hooks-static › Malformed hooks give H_SCHEMA and never throw › Mutated hook flows and deep graphs never throw | covered | src.authoring.hooks.check-schema.test.ts::C-0c093690: 1500 seeded mutants never throw and every issue is well formed (passed, red_assertion); src.authoring.hooks.check-schema.test.ts::C-0c093690: a 5000-node chain with a hook route checks clean and a broken hook is found (passed, red_assertion); src... | - | - |
| C-576d5329 | hooks-static › The H layer follows L3 for flows that declare a hook › Gating and ordering | covered | src.authoring.hooks.layer.test.ts::C-576d5329: A keeps three layers and B adds layer H with the one warning (passed, red_assertion); src.authoring.hooks.layer.test.ts::C-576d5329: C orders the H warning before the L3 one (passed, red_assertion); src.authoring.hooks.layer.test.ts::C-576d5329: D gives... | - | - |
| C-b5fb44bc | hooks-static › Hook case files pin each code › Each case file yields its codes | covered | src.authoring.hooks.cases.test.ts::C-b5fb44bc: hooks-no-match gives ok true and the one W_NO_MATCH warning (passed, red_assertion); src.authoring.hooks.cases.test.ts::C-b5fb44bc: the 2 valid case files give no issue over four layers (passed, red_assertion); src.authoring.hooks.cases.test.ts::C-b5fb4... | - | 0.93 |
| C-d672ebad | hooks-static › The hook codes have their own lists › Lists and links | covered | src.authoring.hooks.diagnostics-hooks.test.ts::C-d672ebad C-8919e1d9: the hook lists are exact and apart from the flow lists (passed, red_assertion); src.authoring.hooks.diagnostics-hooks.test.ts::C-d672ebad: hook codes have links and unknown ones none (passed, red_assertion); src.authoring.hooks.mo... | - | 0.92 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/authoring/diagnostics.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-checker/.l4/ledger/r-20261107T1637Z-49fc.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-checker/.l4/ledger/r-20261107T1904Z-fd28.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-checker/.l4/ledger/r-20261107T1907Z-8274.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-checker/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-checker/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/authoring/format/types.ts` | authoring | relevant | named in the spec |
| `src/authoring/hooks/cases.test.ts` |  | relevant | new test file |
| `src/authoring/hooks/check-schema.test.ts` |  | relevant | new test file |
| `src/authoring/hooks/check.test.ts` |  | relevant | new test file |
| `src/authoring/hooks/check.ts` | authoring | relevant | named in the spec |
| `src/authoring/hooks/codes.ts` | authoring | relevant | named in the spec |
| `src/authoring/hooks/diagnostics-hooks.test.ts` |  | relevant | new test file |
| `src/authoring/hooks/layer.test.ts` |  | relevant | new test file |
| `src/authoring/hooks/model.test.ts` |  | relevant | new test file |
| `src/authoring/hooks/model.ts` | authoring | relevant | named in the spec |
| `src/authoring/hooks/placements.test.ts` |  | relevant | new test file |
| `src/authoring/index.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/diagnostics.test.ts` |  | relevant | named in the spec |
| `src/authoring/validate/diagnostics.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/types.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/validate.ts` | authoring | relevant | named in the spec |
| `test/support/README.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/hook-cases/index.ts` | test | relevant | named in the spec |
| `test/support/hook-cases/invalid/h-block-missing-input.yaml` | test | relevant | named in the spec |
| `test/support/hook-cases/invalid/h-cycle.yaml` | test | relevant | named in the spec |
| `test/support/hook-cases/invalid/h-dominance.yaml` | test | relevant | named in the spec |
| `test/support/hook-cases/invalid/h-retry-scope-pay.yaml` | test | relevant | named in the spec |
| `test/support/hook-cases/invalid/h-route-effect-x3.yaml` | test | relevant | named in the spec |
| `test/support/hook-cases/invalid/h-route-human.yaml` | test | relevant | named in the spec |
| `test/support/hook-cases/invalid/h-route-target-missing.yaml` | test | relevant | named in the spec |
| `test/support/hook-cases/invalid/h-schema-post-on-end.yaml` | test | relevant | named in the spec |
| `test/support/hook-cases/invalid/h-schema-unknown-field.yaml` | test | relevant | named in the spec |
| `test/support/hook-cases/valid/hooks-onion.yaml` | test | relevant | module `test` is named in the spec |
| `test/support/hook-cases/valid/hooks-retry-read.yaml` | test | relevant | module `test` is named in the spec |
| `test/support/hook-cases/warnings/hooks-no-match.yaml` | test | relevant | module `test` is named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/authoring/format/types.ts, src/authoring/hooks/check.ts, src/authoring/hooks/codes.ts, src/authoring/hooks/model.ts, src/authoring/index.ts and 4 more

### Tests

1863 of 1863 passed, 0 failed, 0 errored, 0 skipped.
66 of 66 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-7fc61336 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a609469d | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-73b013e5 | ok | 0.730 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8919e1d9 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8f577367 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-71097b3f | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9762b9cd | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-45aac31b | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-53971bc2 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-82781d52 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-22c29049 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-0c093690 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-576d5329 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-b5fb44bc | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d672ebad | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-7fc61336 | flow-validation › validateFlow runs three gated layers › RF-1 and its variants validate | pass | pass | the judge passed it and a discriminating test passes |
| C-a609469d | flow-validation › validateFlow runs three gated layers › Layers gate, order is stable, non-objects fail in L1 | pass | pass | the judge passed it and a discriminating test passes |
| C-73b013e5 | flow-validation › Diagnostics are documented › The document covers every code | pass | pass | the judge passed it and a discriminating test passes |
| C-8919e1d9 | flow-validation › The code lists › The code lists are exact | pass | pass | the judge passed it and a discriminating test passes |
| C-8f577367 | hooks-static › Node metas and selectors › Metas and selectors | pass | pass | the judge passed it and a discriminating test passes |
| C-71097b3f | hooks-static › Node metas and selectors › when conditions | pass | pass | the judge passed it and a discriminating test passes |
| C-9762b9cd | hooks-static › Hook placements follow the onion order › Order, labels and exclusions | pass | pass | the judge passed it and a discriminating test passes |
| C-45aac31b | hooks-static › Hook routes extend the successor graph › Routes, augmented successors and declaresHooks | pass | pass | the judge passed it and a discriminating test passes |
| C-53971bc2 | hooks-static › The checker reports each hook rule with its code › The 45 hook flows | pass | pass | the judge passed it and a discriminating test passes |
| C-82781d52 | hooks-static › The checker reports each hook rule with its code › Effect routes and effect retries | pass | pass | the judge passed it and a discriminating test passes |
| C-22c29049 | hooks-static › Malformed hooks give H_SCHEMA and never throw › Malformed documents | pass | pass | the judge passed it and a discriminating test passes |
| C-0c093690 | hooks-static › Malformed hooks give H_SCHEMA and never throw › Mutated hook flows and deep graphs never throw | pass | pass | the judge passed it and a discriminating test passes |
| C-576d5329 | hooks-static › The H layer follows L3 for flows that declare a hook › Gating and ordering | pass | pass | the judge passed it and a discriminating test passes |
| C-b5fb44bc | hooks-static › Hook case files pin each code › Each case file yields its codes | pass | pass | the judge passed it and a discriminating test passes |
| C-d672ebad | hooks-static › The hook codes have their own lists › Lists and links | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-73b013e5): src.authoring.validate.diagnostics.test.ts::C-73b013e5: DIAGNOSTICS has one entry per code in list order with single-line text: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-73b013e5): src.authoring.validate.diagnostics.test.ts::C-73b013e5: links and anchors: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-73b013e5): src.authoring.validate.diagnostics.test.ts::C-73b013e5: the committed document equals renderDiagnosticsDoc and ends with one newline: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-73b013e5): src.authoring.validate.diagnostics.test.ts::C-73b013e5: the file holds exactly one heading per code: no proof that it discriminates (no red, audit or generated record)
- [minor, judge] selectorMatches ignores unknown selector fields (spec gap) (criterion C-8f577367): The implementation only inspects kind, effect, nodes, and tags, so a selector containing an additional field can still match.
- [minor, judge] whenMatches ignores unknown when fields (spec gap) (criterion C-71097b3f): The implementation only evaluates from, next, and outcome, so an additional when field does not affect the result.
- [minor, judge] Lint suppression hides an any-typed test document: check-schema.test.ts disables @typescript-eslint/no-explicit-any on the Doc alias, allowing untyped mutation documents.
- [minor, judge] the judge called a test inadequate (criterion C-73b013e5): src.authoring.hooks.diagnostics-hooks.test.ts::C-73b013e5: the document has a heading for each hook code
- [minor, judge] the judge called a test inadequate (criterion C-8919e1d9): src.authoring.hooks.diagnostics-hooks.test.ts::C-d672ebad C-8919e1d9: the hook lists are exact and apart from the flow lists

## New tests (red then green, `task.red_ok` in the ledger)

- `src.authoring.hooks.cases.test.ts::C-b5fb44bc: hooks-no-match gives ok true and the one W_NO_MATCH warning` (task 4.1): passed
- `src.authoring.hooks.cases.test.ts::C-b5fb44bc: the 2 valid case files give no issue over four layers` (task 4.1): passed
- `src.authoring.hooks.cases.test.ts::C-b5fb44bc: the 9 invalid case files each give one H error with their code, node and path` (task 4.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-0c093690: 1500 seeded mutants never throw and every issue is well formed` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-0c093690: a 5000-node chain with a hook route checks clean and a broken hook is found` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M1 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M10 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M11 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M12 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M13 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M14 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M15 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M16 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M17 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M18 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M19 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M2 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M20 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M21 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M22 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M23 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M24 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M24 gives one H_SCHEMA and no H_ROUTE_TARGET` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M25 M26 and M30 are valid controls beside a malformed M1` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M27 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M28 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M29 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M3 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M31 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M32 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M33 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M34 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M35 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M36 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M4 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M5 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M6 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M7 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M8 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: M9 gives exactly its H_SCHEMA rows and no warning` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: errors come sorted by path then code then message` (task 2.1): passed
- `src.authoring.hooks.check-schema.test.ts::C-22c29049: non-flow documents give empty lists while a malformed one does not` (task 2.1): passed
- `src.authoring.hooks.check.test.ts::C-0c093690: a throwing catalogue gives H_BLOCK and null effects, and a deep chain stays clean` (task 2.2): passed
- `src.authoring.hooks.check.test.ts::C-53971bc2: the 15 flagged hook flows give their rows and the other 30 are clean` (task 2.2): passed
- `src.authoring.hooks.check.test.ts::C-82781d52: a pay block hook in a retried post chain is refused even with the flag` (task 2.2): passed
- `src.authoring.hooks.check.test.ts::C-82781d52: a route to a node of unknown effect is H_ROUTE_EFFECT` (task 2.2): passed
- `src.authoring.hooks.check.test.ts::C-82781d52: a send block hook in a retried post chain needs the flag` (task 2.2): passed
- `src.authoring.hooks.check.test.ts::C-82781d52: an X3 route into pay and an X1 retry of pay give one error each` (task 2.2): passed
- `src.authoring.hooks.check.test.ts::C-82781d52: retries on a send or write pay node need the flag, a read node needs none` (task 2.2): passed
- `src.authoring.hooks.check.test.ts::C-82781d52: routes to an end or a switch pass and routes to send or write nodes fail` (task 2.2): passed
