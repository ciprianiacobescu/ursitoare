# Verification: openspec:add-pdp-cedar: PASS (round 5)

traceability: 48/48 criteria covered by a discriminating test

- Base: `8fb5214a883e426132b4aec8b341d5c36cbc70c5`
- Head: `604672c912d0f830768d098349ad719a7cbe1f91`
- Implementer profiles: deepseek, deepseek-free, glm
- Judge: claude-judge (claude-opus-5-5), 2 call(s), judged in 2 parts, prompt sha256 `7742abc78d01999e07c13ef7883768f98988c7367f55452a43a0ef4875738894`
  - part 1: 28 file(s), 114906 characters, profile claude-judge, reply valid
  - part 2: 7 file(s), 25737 characters, profile claude-judge, reply valid
- Judge replies of claude-judge (this unit, all rounds): valid 6, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), deepseek deepseek (declared), deepseek-free deepseek (declared), glm zhipu (declared)
- Cost: $2.0869

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 1.2 | base merged: main@8fb5214a88 as 604672c912 (1 commit) |
| 1 | integrity | ok | 43.7 | 10 sub-checks; scope: 59 changed file(s) |
| 2 | build | ok | 20.3 |  |
| 3 | tests | ok | 52.6 |  |
| 4 | traceability | ok | 0.1 | 48/48 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/pdp/cedar.ts, src/pdp/check.ts, src/pdp/digest.ts, src/pdp/engine.ts, src/pdp/errors.ts and 5 more |
| 8 | s1 judge | ok | 5.4 | 48/48 criteria judged by jev |
| 9 | judge | ok | 178.0 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261028T1828Z-a92a/014-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261028T1828Z-a92a/015-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261028T1828Z-a92a/016-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261028T1828Z-a92a/017-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261028T1828Z-a92a/018-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261028T1828Z-a92a/019-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261028T1828Z-a92a/020-e2e.log |

## Files by part

- part 1: openspec/changes/add-pdp-cedar-fix-1/.openspec.yaml (311 characters)
- part 1: openspec/changes/add-pdp-cedar-fix-2/.openspec.yaml (311 characters)
- part 1: src/db/migrations/0110_policy_decision.sql (1799 characters)
- part 1: src/pdp/cedar.ts (359 characters)
- part 1: src/pdp/check.test.ts (8248 characters)
- part 1: src/pdp/check.ts (3592 characters)
- part 1: src/pdp/digest.test.ts (3461 characters)
- part 1: src/pdp/digest.ts (3639 characters)
- part 1: src/pdp/engine.ts (2287 characters)
- part 1: src/pdp/errors.ts (900 characters)
- part 1: src/pdp/getter.test.ts (6917 characters)
- part 1: src/pdp/guards.test.ts (7241 characters)
- part 1: src/pdp/guards.ts (5705 characters)
- part 1: src/pdp/limits.test.ts (4942 characters)
- part 1: src/pdp/load.test.ts (6449 characters)
- part 1: src/pdp/load.ts (7272 characters)
- part 1: src/pdp/log.guard.test.ts (10621 characters)
- part 1: src/pdp/log.partition.test.ts (5167 characters)
- part 1: src/pdp/log.tenant.test.ts (4150 characters)
- part 1: src/pdp/log.test.ts (8611 characters)
- part 1: src/pdp/log.ts (4980 characters)
- part 1: src/pdp/malformed.m8.test.ts (2454 characters)
- part 1: src/pdp/malformed.test.ts (3210 characters)
- part 1: src/pdp/permit.test.ts (6368 characters)
- part 1: src/pdp/permit.ts (1791 characters)
- part 1: src/db/prepare.test.ts (634 characters)
- part 1: openspec/changes/add-pdp-cedar-fix-1/proposal.md (1756 characters)
- part 1: openspec/changes/add-pdp-cedar-fix-2/proposal.md (1731 characters)
- part 2: src/pdp/schema.test.ts (6538 characters)
- part 2: openspec/changes/add-pdp-cedar-fix-1/tasks.md (376 characters)
- part 2: openspec/changes/add-pdp-cedar-fix-2/tasks.md (351 characters)
- part 2: openspec/changes/add-pdp-cedar/tasks.md (12909 characters)
- part 2: src/pdp/values.test.ts (1335 characters)
- part 2: src/pdp/values.ts (1805 characters)
- part 2: src/pdp/version.test.ts (2423 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 11 task(s): red and green compared |
| test path freeze | ok | 12 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/db/prepare.test.ts, src/pdp/cedar.ts, src/pdp/check.test.ts, src/pdp/check.ts, src/pdp/digest.test.ts (+22 more) |
| tdd history | ok | 11 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 570 of 570 base tests pass on the unit's code with its 16 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/db/prepare.test.ts kept at head for the run (task 4.1: unfrozen by Q-001)

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-df8b4318 | policy-engine › Policies are validated strictly at load › The test set loads | covered | src.pdp.load.test.ts::C-df8b4318 the test set loads (passed, red_assertion) | - | 0.84 |
| C-e2ed1aed | policy-engine › Policies are validated strictly at load › An empty set loads and denies everything | covered | src.pdp.check.test.ts::C-e2ed1aed an empty set loads and denies everything (passed, red_assertion) | - | 0.83 |
| C-50748953 | policy-engine › Policies are validated strictly at load › Each malformed policy is refused | covered | src.pdp.malformed.test.ts::C-50748953 M1 malformed policy is refused (passed, red_assertion); src.pdp.malformed.test.ts::C-50748953 M2 malformed policy is refused (passed, red_assertion); src.pdp.malformed.test.ts::C-50748953 M3 malformed policy is refused (passed, red_assertion); src.pdp.malformed.... | src.pdp.malformed.m8.test.ts::C-50748953 the M8 policy of the design names an undeclared action in the action scope (no proof that it discriminates (no red, audit or generated record)); src.pdp.malformed.m8.test.ts::C-50748953 the undeclared action of the design M8 is a policy fault not a parse faul... | 0.93 |
| C-67cd4eae | policy-engine › Policies are validated strictly at load › The message never holds policy text | covered | src.pdp.load.test.ts::C-67cd4eae the message never holds policy text (passed, red_assertion) | - | 0.90 |
| C-67e34552 | policy-engine › Policies are validated strictly at load › A policy without id, and a template, are refused | covered | src.pdp.load.test.ts::C-67e34552 a policy without id and a template are refused (passed, red_assertion) | - | 0.91 |
| C-805d95d1 | policy-engine › Policies are validated strictly at load › A bad schema is refused | covered | src.pdp.load.test.ts::C-805d95d1 a bad schema is refused (passed, red_assertion) | - | 0.79 |
| C-3e84c79f | policy-engine › Policies are validated strictly at load › Bad options are refused | covered | src.pdp.load.test.ts::C-3e84c79f bad options are refused (passed, red_assertion) | - | 0.89 |
| C-a1ac8630 | policy-engine › Policy ids are unique › A tenant policy cannot reuse a platform id | covered | src.pdp.load.test.ts::C-a1ac8630 a tenant policy cannot reuse a platform id (passed, red_assertion) | - | 0.95 |
| C-f0412753 | policy-engine › Policy ids are unique › A repeat inside one source and a repeated source id | covered | src.pdp.load.test.ts::C-f0412753 a repeat inside one source and a repeated source id (passed, red_assertion) | - | 0.89 |
| C-4240aaaa | policy-engine › The policy set version identifies the loaded set › A known answer | covered | src.pdp.version.test.ts::C-4240aaaa a known answer (passed, red_assertion) | - | 0.84 |
| C-a1580281 | policy-engine › The policy set version identifies the loaded set › Any change changes the version | covered | src.pdp.version.test.ts::C-a1580281 any change changes the version (passed, red_assertion) | - | 0.86 |
| C-de410d69 | policy-engine › A check denies on any error › A forbid that errors is not skipped | covered | src.pdp.limits.test.ts::C-de410d69 a forbid that errors is not skipped (passed, red_assertion) | - | 0.93 |
| C-5da4120c | policy-engine › A check denies on any error › A missing entity is an error | covered | src.pdp.limits.test.ts::C-5da4120c a missing entity is an error (passed, red_assertion) | - | 0.88 |
| C-03fddafe | policy-engine › A check denies on any error › A rejected request is a deny with a fixed code | covered | src.pdp.limits.test.ts::C-03fddafe a rejected request is a deny with a fixed code (passed, red_assertion) | - | 0.83 |
| C-86a46101 | policy-engine › A check denies on any error › An unknown action | covered | src.pdp.guards.test.ts::C-86a46101 an unknown action (passed, red_assertion) | - | 0.85 |
| C-513b047f | policy-engine › A check denies on any error › The principal, the resource and uniqueness | covered | src.pdp.guards.test.ts::C-513b047f the principal, the resource and uniqueness (passed, red_assertion) | - | 0.88 |
| C-8e384c2c | policy-engine › A check denies on any error › A request that is not a request | covered | src.pdp.getter.test.ts::C-8e384c2c a getter that changes between reads is a deny (passed, red_assertion); src.pdp.getter.test.ts::C-8e384c2c a throwing getter inside a request field is a deny (passed, red_assertion); src.pdp.guards.test.ts::C-8e384c2c a request that is not a request (passed, red_ass... | - | 0.86 |
| C-e4b4b8c8 | policy-engine › A check denies on any error › A failing dependency rejects | covered | src.pdp.check.test.ts::C-e4b4b8c8 a failing dependency rejects (passed, red_assertion) | - | 0.93 |
| C-5ddb14ef | policy-engine › A request carries at most 24 entities › The limit is 24 | covered | src.pdp.guards.test.ts::C-5ddb14ef the limit is 24 (passed, red_assertion) | - | 0.90 |
| C-2d7c0fab | policy-engine › A request carries at most 24 entities › The array length is counted | covered | src.pdp.guards.test.ts::C-2d7c0fab the array length is counted (passed, red_assertion) | - | 0.59 |
| C-b4a29f2d | policy-engine › A request carries at most 24 entities › A huge attribute | covered | src.pdp.guards.test.ts::C-b4a29f2d a huge attribute (passed, red_assertion, inadequate) | - | 0.86 |
| C-be9c698f | policy-engine › A decision explains itself › Ids and time | covered | src.pdp.check.test.ts::C-be9c698f ids and time (passed, red_assertion) | - | 0.95 |
| C-e5a037ca | policy-engine › A decision explains itself › Allow, forbid and default deny | covered | src.pdp.check.test.ts::C-e5a037ca allow forbid and default deny (passed, red_assertion) | - | 0.95 |
| C-1642bb70 | policy-engine › A decision explains itself › Reasons are sorted | covered | src.pdp.check.test.ts::C-1642bb70 reasons are sorted (passed, red_assertion) | - | 0.86 |
| C-cd08f435 | policy-engine › A decision explains itself › The deny-on-error log line | covered | src.pdp.check.test.ts::C-cd08f435 the deny-on-error log line (passed, red_assertion) | - | 0.92 |
| C-984b894c | policy-engine › A decision explains itself › Concurrent checks | covered | src.pdp.check.test.ts::C-984b894c concurrent checks (passed, red_assertion) | - | 0.92 |
| C-44202a58 | policy-engine › A permit is copied from the egress request and only on allow › An exact copy | covered | src.pdp.permit.test.ts::C-344619fe C-44202a58 no permit without allow or without egress (passed, red_assertion); src.pdp.permit.test.ts::C-44202a58 a permit is an exact copy of the egress (passed, red_assertion) | - | 0.58 |
| C-344619fe | policy-engine › A permit is copied from the egress request and only on allow › No permit without allow or without egress | covered | src.pdp.permit.test.ts::C-344619fe C-44202a58 no permit without allow or without egress (passed, red_assertion) | - | 0.84 |
| C-97a803d9 | policy-engine › A permit is copied from the egress request and only on allow › An invalid egress denies | covered | src.pdp.permit.test.ts::C-97a803d9 an invalid egress denies (passed, red_assertion) | - | 0.72 |
| C-c797dcfe | policy-engine › Request digests are canonical › Canonical form | covered | src.pdp.digest.test.ts::C-c797dcfe canonical form (passed, red_assertion) | - | 0.83 |
| C-1366d87a | policy-engine › Request digests are canonical › Unsupported values | covered | src.pdp.digest.test.ts::C-1366d87a unsupported values (passed, red_assertion) | - | 0.90 |
| C-f1ea76a1 | policy-engine › Request digests are canonical › A request digest | covered | src.pdp.digest.test.ts::C-f1ea76a1 a request digest (passed, red_assertion) | - | 0.78 |
| C-50195607 | policy-engine › Request digests are canonical › A request that cannot be serialised still has a digest | covered | src.pdp.digest.test.ts::C-50195607 a request that cannot be serialised still has a digest (passed, red_assertion) | - | 0.73 |
| C-7912bb0b | policy-engine › Value helpers build exact Cedar values › Entity references and uids | covered | src.pdp.values.test.ts::C-7912bb0b entity references and uids (passed, red_assertion) | - | 0.89 |
| C-d886fc50 | policy-engine › Value helpers build exact Cedar values › Decimals do not round | covered | src.pdp.values.test.ts::C-d886fc50 decimals do not round (passed, red_assertion) | - | 0.56 |
| C-3eb55a5b | policy-engine › Value helpers build exact Cedar values › The host is the parsed host | covered | src.pdp.values.test.ts::C-3eb55a5b the host is the parsed host (passed, red_assertion) | - | 0.89 |
| C-7001fa59 | policy-engine › The decision log is partitioned, tenant-isolated and append-only › The objects exist and pass the catalog test | covered | src.pdp.schema.test.ts::C-7001fa59 the decision log objects exist and pass the catalog test (passed, red_assertion) | - | 0.89 |
| C-4e36364d | policy-engine › The decision log is partitioned, tenant-isolated and append-only › Privileges | covered | src.pdp.schema.test.ts::C-4e36364d the app role may only read and insert decisions (passed, red_assertion) | - | 0.87 |
| C-6b94480b | policy-engine › The decision log is partitioned, tenant-isolated and append-only › Constraints | covered | src.pdp.schema.test.ts::C-6b94480b decisions and permits are constrained (passed, red_assertion) | - | 0.86 |
| C-d44216c5 | policy-engine › recordDecision appends one row per decision › A full row | covered | src.pdp.log.test.ts::C-d44216c5 a full row records every decision field (passed, red_assertion) | - | 0.92 |
| C-1cafaf79 | policy-engine › recordDecision appends one row per decision › A deny has no permit | covered | src.pdp.log.test.ts::C-1cafaf79 a deny row has no permit (passed, red_assertion) | - | 0.89 |
| C-a9a57f52 | policy-engine › recordDecision appends one row per decision › Recording twice, also concurrently | covered | src.pdp.log.test.ts::C-a9a57f52 a decision is recorded once even twice or concurrently (passed, red_assertion) | - | 0.87 |
| C-ff0a5e53 | policy-engine › recordDecision appends one row per decision › Two tenants | covered | src.pdp.log.tenant.test.ts::C-ff0a5e53 two tenants see only their own decisions (passed, red_assertion) | - | 0.92 |
| C-12c8f3d3 | policy-engine › recordDecision appends one row per decision › A write for another tenant is refused | covered | src.pdp.log.guard.test.ts::C-12c8f3d3 a write for another tenant is refused (passed, red_assertion) | - | 0.90 |
| C-8440a92f | policy-engine › recordDecision appends one row per decision › Partition-ready inserts | covered | src.pdp.log.partition.test.ts::C-8440a92f decisions land in the default or the monthly partition (passed, red_assertion) | - | 0.94 |
| C-88454164 | policy-engine › recordDecision appends one row per decision › Hostile text is bounded | covered | src.pdp.log.guard.test.ts::C-88454164 hostile text is bounded in the decision log (passed, red_assertion) | - | 0.88 |
| C-f837602a | policy-engine › recordDecision appends one row per decision › A request that is not a request is still recorded | covered | src.pdp.log.guard.test.ts::C-f837602a a request that is not a request is still recorded (passed, red_assertion) | - | 0.91 |
| C-2df1f84d | policy-engine › recordDecision appends one row per decision › Invalid decisions and a failing insert | covered | src.pdp.log.guard.test.ts::C-2df1f84d invalid decisions are refused and insert failures are mapped (passed, red_assertion) | - | 0.93 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-pdp-cedar-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar-fix-2/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar-fix-2/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar-fix-2/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar-fix-2/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar-fix-2/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/evidence/round-2/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/evidence/round-2/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/evidence/round-2/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/evidence/round-3/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/evidence/round-3/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/evidence/round-3/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/evidence/round-4/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/evidence/round-4/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/evidence/round-4/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/ledger/r-20261027T2207Z-8356.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/ledger/r-20261027T2318Z-5d3f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/ledger/r-20261027T2346Z-8fbd.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/ledger/r-20261028T0001Z-66b2.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/ledger/r-20261028T1816Z-f7cc.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/ledger/r-20261028T1818Z-7356.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/.l4/ledger/r-20261028T1828Z-a92a.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-pdp-cedar/verification.md` |  | none | exempt: harness, spec or documentation path |
| `src/db/migrations/0110_policy_decision.sql` | db | relevant | named in the spec |
| `src/db/prepare.test.ts` |  | relevant | named in the spec |
| `src/pdp/cedar.ts` | pdp | relevant | named in the spec |
| `src/pdp/check.test.ts` |  | relevant | new test file |
| `src/pdp/check.ts` | pdp | relevant | named in the spec |
| `src/pdp/digest.test.ts` |  | relevant | new test file |
| `src/pdp/digest.ts` | pdp | relevant | named in the spec |
| `src/pdp/engine.ts` | pdp | relevant | named in the spec |
| `src/pdp/errors.ts` | pdp | relevant | named in the spec |
| `src/pdp/getter.test.ts` |  | relevant | new test file |
| `src/pdp/guards.test.ts` |  | relevant | new test file |
| `src/pdp/guards.ts` | pdp | relevant | named in the spec |
| `src/pdp/limits.test.ts` |  | relevant | new test file |
| `src/pdp/load.test.ts` |  | relevant | new test file |
| `src/pdp/load.ts` | pdp | relevant | named in the spec |
| `src/pdp/log.guard.test.ts` |  | relevant | new test file |
| `src/pdp/log.partition.test.ts` |  | relevant | new test file |
| `src/pdp/log.tenant.test.ts` |  | relevant | new test file |
| `src/pdp/log.test.ts` |  | relevant | new test file |
| `src/pdp/log.ts` | pdp | relevant | named in the spec |
| `src/pdp/malformed.m8.test.ts` |  | relevant | new test file |
| `src/pdp/malformed.test.ts` |  | relevant | new test file |
| `src/pdp/permit.test.ts` |  | relevant | new test file |
| `src/pdp/permit.ts` | pdp | relevant | named in the spec |
| `src/pdp/schema.test.ts` |  | relevant | new test file |
| `src/pdp/values.test.ts` |  | relevant | new test file |
| `src/pdp/values.ts` | pdp | relevant | named in the spec |
| `src/pdp/version.test.ts` |  | relevant | new test file |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/pdp/cedar.ts, src/pdp/check.ts, src/pdp/digest.ts, src/pdp/engine.ts, src/pdp/errors.ts and 5 more

### Tests

655 of 655 passed, 0 failed, 0 errored, 0 skipped.
57 of 57 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-df8b4318 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e2ed1aed | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-50748953 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-67cd4eae | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-67e34552 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-805d95d1 | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3e84c79f | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a1ac8630 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f0412753 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4240aaaa | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a1580281 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-de410d69 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5da4120c | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-03fddafe | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-86a46101 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-513b047f | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8e384c2c | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e4b4b8c8 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5ddb14ef | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2d7c0fab | ok | 0.590 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b4a29f2d | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-be9c698f | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e5a037ca | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1642bb70 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cd08f435 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-984b894c | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-44202a58 | ok | 0.580 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-344619fe | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-97a803d9 | ok | 0.720 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c797dcfe | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1366d87a | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f1ea76a1 | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-50195607 | ok | 0.730 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7912bb0b | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d886fc50 | ok | 0.560 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3eb55a5b | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7001fa59 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4e36364d | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6b94480b | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d44216c5 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1cafaf79 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a9a57f52 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ff0a5e53 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-12c8f3d3 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8440a92f | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-88454164 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f837602a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2df1f84d | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Answers to verdict questions

- Q-003 accept C-b4a29f2d by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The tracing test builds the base request, replaces the Tool entity's effect attribute with a string of 300,000 characters, calls check, and asserts that the decision is deny, that errors deep-equals ["PDP_REQUEST_TOO_LARGE"] and that reasons is empty; the lat...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-df8b4318 | policy-engine › Policies are validated strictly at load › The test set loads | pass | pass | the judge passed it and a discriminating test passes |
| C-e2ed1aed | policy-engine › Policies are validated strictly at load › An empty set loads and denies everything | pass | pass | the judge passed it and a discriminating test passes |
| C-50748953 | policy-engine › Policies are validated strictly at load › Each malformed policy is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-67cd4eae | policy-engine › Policies are validated strictly at load › The message never holds policy text | pass | pass | the judge passed it and a discriminating test passes |
| C-67e34552 | policy-engine › Policies are validated strictly at load › A policy without id, and a template, are refused | pass | pass | the judge passed it and a discriminating test passes |
| C-805d95d1 | policy-engine › Policies are validated strictly at load › A bad schema is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-3e84c79f | policy-engine › Policies are validated strictly at load › Bad options are refused | pass | pass | the judge passed it and a discriminating test passes |
| C-a1ac8630 | policy-engine › Policy ids are unique › A tenant policy cannot reuse a platform id | pass | pass | the judge passed it and a discriminating test passes |
| C-f0412753 | policy-engine › Policy ids are unique › A repeat inside one source and a repeated source id | pass | pass | the judge passed it and a discriminating test passes |
| C-4240aaaa | policy-engine › The policy set version identifies the loaded set › A known answer | pass | pass | the judge passed it and a discriminating test passes |
| C-a1580281 | policy-engine › The policy set version identifies the loaded set › Any change changes the version | pass | pass | the judge passed it and a discriminating test passes |
| C-de410d69 | policy-engine › A check denies on any error › A forbid that errors is not skipped | pass | pass | the judge passed it and a discriminating test passes |
| C-5da4120c | policy-engine › A check denies on any error › A missing entity is an error | pass | pass | the judge passed it and a discriminating test passes |
| C-03fddafe | policy-engine › A check denies on any error › A rejected request is a deny with a fixed code | pass | pass | the judge passed it and a discriminating test passes |
| C-86a46101 | policy-engine › A check denies on any error › An unknown action | pass | pass | the judge passed it and a discriminating test passes |
| C-513b047f | policy-engine › A check denies on any error › The principal, the resource and uniqueness | pass | pass | the judge passed it and a discriminating test passes |
| C-8e384c2c | policy-engine › A check denies on any error › A request that is not a request | pass | pass | the judge passed it and a discriminating test passes |
| C-e4b4b8c8 | policy-engine › A check denies on any error › A failing dependency rejects | pass | pass | the judge passed it and a discriminating test passes |
| C-5ddb14ef | policy-engine › A request carries at most 24 entities › The limit is 24 | pass | pass | the judge passed it and a discriminating test passes |
| C-2d7c0fab | policy-engine › A request carries at most 24 entities › The array length is counted | pass | pass | the judge passed it and a discriminating test passes |
| C-b4a29f2d | policy-engine › A request carries at most 24 entities › A huge attribute | insufficient_evidence | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The tracing test builds the base request, replaces the Tool entity's effect attribute with a string of 300,000 characters, calls check, and asserts that the decision is deny, that errors deep-equals... |
| C-be9c698f | policy-engine › A decision explains itself › Ids and time | pass | pass | the judge passed it and a discriminating test passes |
| C-e5a037ca | policy-engine › A decision explains itself › Allow, forbid and default deny | pass | pass | the judge passed it and a discriminating test passes |
| C-1642bb70 | policy-engine › A decision explains itself › Reasons are sorted | pass | pass | the judge passed it and a discriminating test passes |
| C-cd08f435 | policy-engine › A decision explains itself › The deny-on-error log line | pass | pass | the judge passed it and a discriminating test passes |
| C-984b894c | policy-engine › A decision explains itself › Concurrent checks | pass | pass | the judge passed it and a discriminating test passes |
| C-44202a58 | policy-engine › A permit is copied from the egress request and only on allow › An exact copy | pass | pass | the judge passed it and a discriminating test passes |
| C-344619fe | policy-engine › A permit is copied from the egress request and only on allow › No permit without allow or without egress | pass | pass | the judge passed it and a discriminating test passes |
| C-97a803d9 | policy-engine › A permit is copied from the egress request and only on allow › An invalid egress denies | pass | pass | the judge passed it and a discriminating test passes |
| C-c797dcfe | policy-engine › Request digests are canonical › Canonical form | pass | pass | the judge passed it and a discriminating test passes |
| C-1366d87a | policy-engine › Request digests are canonical › Unsupported values | pass | pass | the judge passed it and a discriminating test passes |
| C-f1ea76a1 | policy-engine › Request digests are canonical › A request digest | pass | pass | the judge passed it and a discriminating test passes |
| C-50195607 | policy-engine › Request digests are canonical › A request that cannot be serialised still has a digest | pass | pass | the judge passed it and a discriminating test passes |
| C-7912bb0b | policy-engine › Value helpers build exact Cedar values › Entity references and uids | pass | pass | the judge passed it and a discriminating test passes |
| C-d886fc50 | policy-engine › Value helpers build exact Cedar values › Decimals do not round | pass | pass | the judge passed it and a discriminating test passes |
| C-3eb55a5b | policy-engine › Value helpers build exact Cedar values › The host is the parsed host | pass | pass | the judge passed it and a discriminating test passes |
| C-7001fa59 | policy-engine › The decision log is partitioned, tenant-isolated and append-only › The objects exist and pass the catalog test | pass | pass | the judge passed it and a discriminating test passes |
| C-4e36364d | policy-engine › The decision log is partitioned, tenant-isolated and append-only › Privileges | pass | pass | the judge passed it and a discriminating test passes |
| C-6b94480b | policy-engine › The decision log is partitioned, tenant-isolated and append-only › Constraints | pass | pass | the judge passed it and a discriminating test passes |
| C-d44216c5 | policy-engine › recordDecision appends one row per decision › A full row | pass | pass | the judge passed it and a discriminating test passes |
| C-1cafaf79 | policy-engine › recordDecision appends one row per decision › A deny has no permit | pass | pass | the judge passed it and a discriminating test passes |
| C-a9a57f52 | policy-engine › recordDecision appends one row per decision › Recording twice, also concurrently | pass | pass | the judge passed it and a discriminating test passes |
| C-ff0a5e53 | policy-engine › recordDecision appends one row per decision › Two tenants | pass | pass | the judge passed it and a discriminating test passes |
| C-12c8f3d3 | policy-engine › recordDecision appends one row per decision › A write for another tenant is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-8440a92f | policy-engine › recordDecision appends one row per decision › Partition-ready inserts | pass | pass | the judge passed it and a discriminating test passes |
| C-88454164 | policy-engine › recordDecision appends one row per decision › Hostile text is bounded | pass | pass | the judge passed it and a discriminating test passes |
| C-f837602a | policy-engine › recordDecision appends one row per decision › A request that is not a request is still recorded | pass | pass | the judge passed it and a discriminating test passes |
| C-2df1f84d | policy-engine › recordDecision appends one row per decision › Invalid decisions and a failing insert | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-50748953): src.pdp.malformed.m8.test.ts::C-50748953 the M8 policy of the design names an undeclared action in the action scope: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-50748953): src.pdp.malformed.m8.test.ts::C-50748953 the undeclared action of the design M8 is a policy fault not a parse fault: no proof that it discriminates (no red, audit or generated record)
- [minor, judge] task add-pdp-cedar-fix-2/1.1: the M8 entry of malformed.test.ts still uses the wrong text (criterion C-50748953): The fix finding asked for the M8 text in the malformed-policy test to be replaced with design.md's `permit (principal, action == Action::"reed", resource);`. In src/pdp/malformed.test.ts the M8 entry still reads `@id("bad") permit (principal, action == Action::"read", resource == Action::"reed");`. The implementer's note says this line was replaced; the diff shows it was not. The design case is now tested only in the new src/pdp/malformed.m8.test.ts, so the test named 'M8 malformed policy is refused' still checks a different fault.
- [minor, judge] An egress of null denies instead of counting as absent (spec gap) (criterion C-97a803d9): guards.ts sets `hasEgress: egress !== undefined`, so `egress: null` goes to validateEgress, fails, and the request is denied. An implementation that treats null as 'no egress' would allow it with no permit instead. No scenario pins this case.
- [minor, judge] A non-plain object nested in attrs or context makes the request invalid (spec gap) (criterion C-03fddafe): snapshotValue throws for any nested object whose prototype is neither Object.prototype nor null (for example a Date or a class instance), so check denies with PDP_REQUEST_INVALID. Another implementation could pass such a value through JSON to Cedar instead. The spec only pins that `context` itself must be a plain object.
- [minor, judge] toDecimal accepts values Cedar decimal cannot hold (spec gap) (criterion C-d886fc50): toDecimal only checks that Number(n.toFixed(4)) === n. For |n| >= 1e21, toFixed returns exponential notation, so toDecimal(1e21) returns arg "1e+21". Values above Cedar's decimal range (about 9.22e14) also pass, for example 1e15 → "1000000000000000.0000". Cedar would reject either one later, as PDP_REQUEST_INVALID at check.
- [minor, judge] the judge called a test inadequate (criterion C-50748953): src.pdp.malformed.test.ts::C-50748953 M8 malformed policy is refused
- [minor, judge] the judge called a test inadequate (criterion C-b4a29f2d): src.pdp.guards.test.ts::C-b4a29f2d a huge attribute

## New tests (red then green, `task.red_ok` in the ledger)

- `src.pdp.check.test.ts::C-1642bb70 reasons are sorted` (task 3.1): passed
- `src.pdp.check.test.ts::C-984b894c concurrent checks` (task 3.1): passed
- `src.pdp.check.test.ts::C-be9c698f ids and time` (task 3.1): passed
- `src.pdp.check.test.ts::C-cd08f435 the deny-on-error log line` (task 3.1): passed
- `src.pdp.check.test.ts::C-e2ed1aed an empty set loads and denies everything` (task 3.1): passed
- `src.pdp.check.test.ts::C-e4b4b8c8 a failing dependency rejects` (task 3.1): passed
- `src.pdp.check.test.ts::C-e5a037ca allow forbid and default deny` (task 3.1): passed
- `src.pdp.digest.test.ts::C-1366d87a unsupported values` (task 1.2): passed
- `src.pdp.digest.test.ts::C-50195607 a request that cannot be serialised still has a digest` (task 1.2): passed
- `src.pdp.digest.test.ts::C-c797dcfe canonical form` (task 1.2): passed
- `src.pdp.digest.test.ts::C-f1ea76a1 a request digest` (task 1.2): passed
- `src.pdp.getter.test.ts::C-8e384c2c a getter that changes between reads is a deny` (task 1.1): passed
- `src.pdp.getter.test.ts::C-8e384c2c a throwing getter inside a request field is a deny` (task 1.1): passed
- `src.pdp.guards.test.ts::C-2d7c0fab the array length is counted` (task 3.2): passed
- `src.pdp.guards.test.ts::C-513b047f the principal, the resource and uniqueness` (task 3.2): passed
- `src.pdp.guards.test.ts::C-5ddb14ef the limit is 24` (task 3.2): passed
- `src.pdp.guards.test.ts::C-86a46101 an unknown action` (task 3.2): passed
- `src.pdp.guards.test.ts::C-8e384c2c a request that is not a request` (task 3.2): passed
- `src.pdp.guards.test.ts::C-b4a29f2d a huge attribute` (task 3.2): passed
- `src.pdp.limits.test.ts::C-03fddafe a rejected request is a deny with a fixed code` (task 3.1): passed
- `src.pdp.limits.test.ts::C-5da4120c a missing entity is an error` (task 3.1): passed
- `src.pdp.limits.test.ts::C-de410d69 a forbid that errors is not skipped` (task 3.1): passed
- `src.pdp.load.test.ts::C-3e84c79f bad options are refused` (task 2.1): passed
- `src.pdp.load.test.ts::C-67cd4eae the message never holds policy text` (task 2.1): passed
- `src.pdp.load.test.ts::C-67e34552 a policy without id and a template are refused` (task 2.1): passed
- `src.pdp.load.test.ts::C-805d95d1 a bad schema is refused` (task 2.1): passed
- `src.pdp.load.test.ts::C-a1ac8630 a tenant policy cannot reuse a platform id` (task 2.1): passed
- `src.pdp.load.test.ts::C-df8b4318 the test set loads` (task 2.1): passed
- `src.pdp.load.test.ts::C-f0412753 a repeat inside one source and a repeated source id` (task 2.1): passed
- `src.pdp.log.guard.test.ts::C-12c8f3d3 a write for another tenant is refused` (task 4.3): passed
- `src.pdp.log.guard.test.ts::C-2df1f84d invalid decisions are refused and insert failures are mapped` (task 4.3): passed
- `src.pdp.log.guard.test.ts::C-88454164 hostile text is bounded in the decision log` (task 4.3): passed
- `src.pdp.log.guard.test.ts::C-f837602a a request that is not a request is still recorded` (task 4.3): passed
- `src.pdp.log.partition.test.ts::C-8440a92f decisions land in the default or the monthly partition` (task 4.2): passed
- `src.pdp.log.tenant.test.ts::C-ff0a5e53 two tenants see only their own decisions` (task 4.2): passed
- `src.pdp.log.test.ts::C-1cafaf79 a deny row has no permit` (task 4.2): passed
- `src.pdp.log.test.ts::C-a9a57f52 a decision is recorded once even twice or concurrently` (task 4.2): passed
- `src.pdp.log.test.ts::C-d44216c5 a full row records every decision field` (task 4.2): passed
- `src.pdp.malformed.test.ts::C-50748953 M1 malformed policy is refused` (task 2.1): passed
- `src.pdp.malformed.test.ts::C-50748953 M2 malformed policy is refused` (task 2.1): passed
- `src.pdp.malformed.test.ts::C-50748953 M3 malformed policy is refused` (task 2.1): passed
- `src.pdp.malformed.test.ts::C-50748953 M4 malformed policy is refused` (task 2.1): passed
- `src.pdp.malformed.test.ts::C-50748953 M5 malformed policy is refused` (task 2.1): passed
- `src.pdp.malformed.test.ts::C-50748953 M6 malformed policy is refused` (task 2.1): passed
- `src.pdp.malformed.test.ts::C-50748953 M7 malformed policy is refused` (task 2.1): passed
- `src.pdp.malformed.test.ts::C-50748953 M8 malformed policy is refused` (task 2.1): passed
- `src.pdp.permit.test.ts::C-344619fe C-44202a58 no permit without allow or without egress` (task 3.3): passed
- `src.pdp.permit.test.ts::C-44202a58 a permit is an exact copy of the egress` (task 3.3): passed
- `src.pdp.permit.test.ts::C-97a803d9 an invalid egress denies` (task 3.3): passed
- `src.pdp.schema.test.ts::C-4e36364d the app role may only read and insert decisions` (task 4.1): passed

## Guard events

- guard.test_tamper: src/db/prepare.test.ts
- guard.test_tamper: src/pdp/malformed.test.ts
- guard.test_tamper: src/pdp/malformed.test.ts
