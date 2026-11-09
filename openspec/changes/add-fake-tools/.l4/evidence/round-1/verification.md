# Verification: openspec:add-fake-tools: PASS (round 1)

traceability: 14/14 criteria covered by a discriminating test

- Base: `c6eb88a0cf84f8dbcccaf67476e6c093a19ff1a4`
- Head: `d6cc4e13b4e2ced2494510de980811ecd5df05c2`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: nemotron-judge, 2 call(s), judged in 2 parts, prompt sha256 `613d10a627f39c37b984871021c7d88d50aaad338210b2ccff89962e579e247d`
  - part 1: 16 file(s), 116545 characters, profile nemotron-judge, reply repaired
  - part 2: 5 file(s), 42859 characters, profile nemotron-judge, reply valid
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@c6eb88a0cf contained |
| 1 | integrity | ok | 235.5 | 11 sub-checks (+1 unfrozen by human answers); scope: 25 changed file(s) |
| 2 | build | ok | 33.3 |  |
| 3 | tests | ok | 337.5 |  |
| 4 | traceability | ok | 0.2 | 14/14 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: test/support/e2e-stack/parts/50-tools.ts, test/support/e2e-stack/tools-part.ts, test/support/fake-tools/contract.ts, test/support/fake-tools/fixtures.ts, test/support/fake-tools/index.ts |
| 8 | s1 judge | ok | 1.0 | 10/14 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 437.4 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261109T1401Z-50af/014-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261109T1401Z-50af/015-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261109T1401Z-50af/016-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261109T1401Z-50af/017-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261109T1401Z-50af/018-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261109T1401Z-50af/019-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261109T1401Z-50af/020-e2e.log |

## Files by part

- part 1: test/support/e2e-stack/parts/50-tools.ts (271 characters)
- part 1: test/support/fake-tools/abort.test.ts (2776 characters)
- part 1: test/support/fake-tools/catalogue.test.ts (6847 characters)
- part 1: test/support/fake-tools/contract.test.ts (6207 characters)
- part 1: test/support/fake-tools/contract.ts (7805 characters)
- part 1: test/support/fake-tools/effects.test.ts (6063 characters)
- part 1: test/support/fake-tools/egress.test.ts (8255 characters)
- part 1: test/support/fake-tools/fixtures.test.ts (13846 characters)
- part 1: test/support/fake-tools/fixtures.ts (9345 characters)
- part 1: test/support/fake-tools/index.ts (12038 characters)
- part 1: test/support/fake-tools/knobs.test.ts (10035 characters)
- part 1: test/support/fake-tools/lifecycle.test.ts (7481 characters)
- part 1: test/support/fake-tools/read-call.test.ts (5401 characters)
- part 1: test/support/README.md (1654 characters)
- part 1: test/support/readme.test.ts (1654 characters)
- part 1: test/support/fake-tools/refusals.test.ts (16867 characters)
- part 2: test/support/fake-tools/samples.test.ts (12718 characters)
- part 2: openspec/changes/add-fake-tools/tasks.md (14759 characters)
- part 2: test/support/e2e-stack/tools-part.cluster.test.ts (3043 characters)
- part 2: test/support/e2e-stack/tools-part.test.ts (9762 characters)
- part 2: test/support/e2e-stack/tools-part.ts (2577 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 8 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 8 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/support/e2e-stack/parts/50-tools.ts, test/support/e2e-stack/tools-part.cluster.test.ts, test/support/e2e-stack/tools-part.test.ts, test/support/e2e-stack/tools-part.ts, test/support/fake-tools/abort.test.ts (+14 more) |
| tdd history | ok | 8 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 2073 of 2073 base tests pass on the unit's code with its 13 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- test/support/e2e-stack/tools-part.cluster.test.ts kept at head for the run (task 5.1: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- test/support/e2e-stack/tools-part.cluster.test.ts (task 5.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-56fb9fcb | test-fake-tools › The fake serves the 20 catalogue blocks with fixed outputs and records each call › A read call answers its fixture and is recorded | covered | test.support.fake-tools.read-call.test.ts::C-56fb9fcb a read call answers its fixture and is recorded (passed, red_assertion) | - | - |
| C-ffea85d9 | test-fake-tools › The fake serves the 20 catalogue blocks with fixed outputs and records each call › All 20 outputs match their fixtures and fit their schemas | covered | test.support.fake-tools.fixtures.test.ts::C-ffea85d9 a ref that is not an own fixture throws a RangeError (passed, red_assertion); test.support.fake-tools.fixtures.test.ts::C-ffea85d9 digestHex hashes the idempotency key as lowercase hex (passed, red_assertion); test.support.fake-tools.fixtures.test... | - | - |
| C-e3f31840 | test-fake-tools › An effect needs an idempotency key and replays under it › Effects need a key and replay under it | covered | test.support.fake-tools.effects.test.ts::C-e3f31840 effects need a key and replay under it (passed, red_assertion) | - | 0.91 |
| C-dd5140b9 | test-fake-tools › An effect needs an idempotency key and replays under it › A replay with invalid input is refused and the kept output stays | covered | test.support.fake-tools.refusals.test.ts::C-dd5140b9 a replay with invalid input is refused and the kept output stays (passed, red_assertion) | - | 0.93 |
| C-94d60756 | test-fake-tools › Refusals come first and only parseable calls to known blocks are recorded › Refusals come first and only parseable calls to known blocks are recorded | covered | test.support.fake-tools.refusals.test.ts::C-94d60756 refusals come first and only parseable calls to known blocks are recorded (passed, red_assertion) | - | 0.91 |
| C-0131e867 | test-fake-tools › A catalogue that cannot be read rejects the start before any listener exists › A catalogue that cannot be read rejects the start and opens no listener | covered | test.support.fake-tools.catalogue.test.ts::C-0131e867 a catalogue that cannot be read rejects the start and opens no listener (passed, red_assertion); test.support.fake-tools.catalogue.test.ts::C-0131e867 a catalogue with an extra block opens a listener and ignores it (passed, red_assertion); test.s... | - | - |
| C-bb5569bd | test-fake-tools › Delay and failure knobs apply per block and are checked › Failure and delay knobs apply per block and are checked | covered | test.support.fake-tools.knobs.test.ts::C-bb5569bd a delay waits after the record is appended (passed, red_assertion); test.support.fake-tools.knobs.test.ts::C-bb5569bd a delayed call leaves its record and does not block another block (passed, red_assertion); test.support.fake-tools.knobs.test.ts::C-... | - | 0.87 |
| C-f25a2efd | test-fake-tools › Delay and failure knobs apply per block and are checked › A client that aborts during a delay leaves its record and the next call is answered | covered | test.support.fake-tools.abort.test.ts::C-f25a2efd a client that aborts during a delay leaves its record and the next call is answered (passed, red_assertion) | - | 0.93 |
| C-52efd685 | test-fake-tools › Reset, close and the records behave as one lifecycle › Reset and close | covered | test.support.fake-tools.lifecycle.test.ts::C-52efd685 reset clears the records, delays, failures and idempotency and close is idempotent (passed, red_assertion) | - | 0.94 |
| C-0a3c42a7 | test-fake-tools › Reset, close and the records behave as one lifecycle › A reset leaves a request that is waiting in a delay running | covered | test.support.fake-tools.lifecycle.test.ts::C-0a3c42a7 a reset leaves a request that is waiting in a delay running (passed, red_assertion) | - | 0.80 |
| C-66380829 | test-fake-tools › A credentialed service reaches the fake tools through the fake egress › A credentialed service reaches the fake tools through the fake egress | covered | test.support.fake-tools.egress.test.ts::C-66380829 a credentialed service reaches the fake tools through the fake egress (passed, red_assertion) | - | 0.89 |
| C-5f2ab557 | test-fake-tools › The contract suite runs against a base URL › The contract suite passes on the fake and fails on broken targets | covered | test.support.fake-tools.contract.test.ts::C-5f2ab557 a closed port rejects every check (passed, red_assertion); test.support.fake-tools.contract.test.ts::C-5f2ab557 a foreign Host is refused (passed, red_assertion); test.support.fake-tools.contract.test.ts::C-5f2ab557 a forwarder that changes the id... | - | - |
| C-f75683d5 | test-fake-tools › The tools part registers its upstream, resets with the stack and closes › The part registers its upstream, resets on beforeReset and closes in a crash cluster | covered | test.support.e2e-stack.tools-part.cluster.test.ts::C-f75683d5 P4 the tools part runs in a crash cluster and its origin refuses after close (passed, red_assertion); test.support.e2e-stack.tools-part.test.ts::C-f75683d5 P1 the tools part refuses to start without the egress part and opens no listener (... | - | 0.95 |
| C-6ca0a047 | test-fake-tools › The support README names the fake accurately › The README names the fake accurately | covered | test.support.readme.test.ts::C-6ca0a047 the README names the fake accurately (passed, red_assertion) | - | 0.91 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-fake-tools/.l4/ledger/r-20261109T1000Z-7bad.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-tools/.l4/ledger/r-20261109T1231Z-c5e4.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-tools/.l4/ledger/r-20261109T1401Z-50af.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-tools/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-tools/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/README.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/e2e-stack/parts/50-tools.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/tools-part.cluster.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/tools-part.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/tools-part.ts` | test | relevant | named in the spec |
| `test/support/fake-tools/abort.test.ts` |  | relevant | new test file |
| `test/support/fake-tools/catalogue.test.ts` |  | relevant | new test file |
| `test/support/fake-tools/contract.test.ts` |  | relevant | new test file |
| `test/support/fake-tools/contract.ts` | test | relevant | named in the spec |
| `test/support/fake-tools/effects.test.ts` |  | relevant | new test file |
| `test/support/fake-tools/egress.test.ts` |  | relevant | new test file |
| `test/support/fake-tools/fixtures.test.ts` |  | relevant | new test file |
| `test/support/fake-tools/fixtures.ts` | test | relevant | named in the spec |
| `test/support/fake-tools/index.ts` | test | relevant | named in the spec |
| `test/support/fake-tools/knobs.test.ts` |  | relevant | new test file |
| `test/support/fake-tools/lifecycle.test.ts` |  | relevant | new test file |
| `test/support/fake-tools/read-call.test.ts` |  | relevant | new test file |
| `test/support/fake-tools/refusals.test.ts` |  | relevant | new test file |
| `test/support/fake-tools/samples.test.ts` |  | relevant | new test file |
| `test/support/readme.test.ts` |  | relevant | new test file |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: test/support/e2e-stack/parts/50-tools.ts, test/support/e2e-stack/tools-part.ts, test/support/fake-tools/contract.ts, test/support/fake-tools/fixtures.ts, test/support/fake-tools/index.ts

### Tests

2171 of 2171 passed, 0 failed, 0 errored, 0 skipped.
39 of 39 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-56fb9fcb | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-ffea85d9 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-e3f31840 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dd5140b9 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-94d60756 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0131e867 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-bb5569bd | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f25a2efd | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-52efd685 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0a3c42a7 | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-66380829 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5f2ab557 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-f75683d5 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6ca0a047 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-56fb9fcb | test-fake-tools › The fake serves the 20 catalogue blocks with fixed outputs and records each call › A read call answers its fixture and is recorded | pass | pass | the judge passed it and a discriminating test passes |
| C-ffea85d9 | test-fake-tools › The fake serves the 20 catalogue blocks with fixed outputs and records each call › All 20 outputs match their fixtures and fit their schemas | pass | pass | the judge passed it and a discriminating test passes |
| C-e3f31840 | test-fake-tools › An effect needs an idempotency key and replays under it › Effects need a key and replay under it | pass | pass | the judge passed it and a discriminating test passes |
| C-dd5140b9 | test-fake-tools › An effect needs an idempotency key and replays under it › A replay with invalid input is refused and the kept output stays | pass | pass | the judge passed it and a discriminating test passes |
| C-94d60756 | test-fake-tools › Refusals come first and only parseable calls to known blocks are recorded › Refusals come first and only parseable calls to known blocks are recorded | pass | pass | the judge passed it and a discriminating test passes |
| C-0131e867 | test-fake-tools › A catalogue that cannot be read rejects the start before any listener exists › A catalogue that cannot be read rejects the start and opens no listener | pass | pass | the judge passed it and a discriminating test passes |
| C-bb5569bd | test-fake-tools › Delay and failure knobs apply per block and are checked › Failure and delay knobs apply per block and are checked | pass | pass | the judge passed it and a discriminating test passes |
| C-f25a2efd | test-fake-tools › Delay and failure knobs apply per block and are checked › A client that aborts during a delay leaves its record and the next call is answered | pass | pass | the judge passed it and a discriminating test passes |
| C-52efd685 | test-fake-tools › Reset, close and the records behave as one lifecycle › Reset and close | pass | pass | the judge passed it and a discriminating test passes |
| C-0a3c42a7 | test-fake-tools › Reset, close and the records behave as one lifecycle › A reset leaves a request that is waiting in a delay running | pass | pass | the judge passed it and a discriminating test passes |
| C-66380829 | test-fake-tools › A credentialed service reaches the fake tools through the fake egress › A credentialed service reaches the fake tools through the fake egress | pass | pass | the judge passed it and a discriminating test passes |
| C-5f2ab557 | test-fake-tools › The contract suite runs against a base URL › The contract suite passes on the fake and fails on broken targets | pass | pass | the judge passed it and a discriminating test passes |
| C-f75683d5 | test-fake-tools › The tools part registers its upstream, resets with the stack and closes › The part registers its upstream, resets on beforeReset and closes in a crash cluster | pass | pass | the judge passed it and a discriminating test passes |
| C-6ca0a047 | test-fake-tools › The support README names the fake accurately › The README names the fake accurately | pass | pass | the judge passed it and a discriminating test passes |

## Findings

None.

## New tests (red then green, `task.red_ok` in the ledger)

- `test.support.e2e-stack.tools-part.cluster.test.ts::C-f75683d5 P4 the tools part runs in a crash cluster and its origin refuses after close` (task 5.1): passed
- `test.support.e2e-stack.tools-part.test.ts::C-f75683d5 P1 the tools part refuses to start without the egress part and opens no listener` (task 5.1): passed
- `test.support.e2e-stack.tools-part.test.ts::C-f75683d5 P2 the tools part registers its upstream and resets with the stack` (task 5.1): passed
- `test.support.e2e-stack.tools-part.test.ts::C-f75683d5 P3 the tools part is discovered after egress with its file` (task 5.1): passed
- `test.support.fake-tools.abort.test.ts::C-f25a2efd a client that aborts during a delay leaves its record and the next call is answered` (task 3.1): passed
- `test.support.fake-tools.catalogue.test.ts::C-0131e867 a catalogue that cannot be read rejects the start and opens no listener` (task 2.1): passed
- `test.support.fake-tools.catalogue.test.ts::C-0131e867 a catalogue with an extra block opens a listener and ignores it` (task 2.1): passed
- `test.support.fake-tools.catalogue.test.ts::C-0131e867 an accepted catalogue opens one listener` (task 2.1): passed
- `test.support.fake-tools.contract.test.ts::C-5f2ab557 a closed port rejects every check` (task 4.1): passed
- `test.support.fake-tools.contract.test.ts::C-5f2ab557 a foreign Host is refused` (task 4.1): passed
- `test.support.fake-tools.contract.test.ts::C-5f2ab557 a forwarder that changes the idempotency key fails only the replay check` (task 4.1): passed
- `test.support.fake-tools.contract.test.ts::C-5f2ab557 a forwarder that rewrites the Host fails only the foreign Host check` (task 4.1): passed
- `test.support.fake-tools.contract.test.ts::C-5f2ab557 a read answers its fixture` (task 4.1): passed
- `test.support.fake-tools.contract.test.ts::C-5f2ab557 an effect needs an idempotency key` (task 4.1): passed
- `test.support.fake-tools.contract.test.ts::C-5f2ab557 an effect replays under the same key` (task 4.1): passed
- `test.support.fake-tools.contract.test.ts::C-5f2ab557 an invalid input is refused with details` (task 4.1): passed
- `test.support.fake-tools.contract.test.ts::C-5f2ab557 an unknown block is refused` (task 4.1): passed
- `test.support.fake-tools.contract.test.ts::C-5f2ab557 only POST is allowed` (task 4.1): passed
- `test.support.fake-tools.contract.test.ts::C-5f2ab557 the contract names are the seven checks in order` (task 4.1): passed
- `test.support.fake-tools.effects.test.ts::C-e3f31840 effects need a key and replay under it` (task 2.2): passed
- `test.support.fake-tools.egress.test.ts::C-66380829 a credentialed service reaches the fake tools through the fake egress` (task 2.2): passed
- `test.support.fake-tools.fixtures.test.ts::C-ffea85d9 a ref that is not an own fixture throws a RangeError` (task 1.1): passed
- `test.support.fake-tools.fixtures.test.ts::C-ffea85d9 digestHex hashes the idempotency key as lowercase hex` (task 1.1): passed
- `test.support.fake-tools.fixtures.test.ts::C-ffea85d9 the 20 samples answer their outputs and fit the output schemas` (task 1.1): passed
- `test.support.fake-tools.fixtures.test.ts::C-ffea85d9 the edge rows answer their fixtures, including the prototype names` (task 1.1): passed
- `test.support.fake-tools.fixtures.test.ts::C-ffea85d9 the fixture refs are the catalogue's 20 blocks in order` (task 1.1): passed
- `test.support.fake-tools.fixtures.test.ts::C-ffea85d9 the formulas coerce missing and ill-typed members for non-strict fixtures` (task 1.1): passed
- `test.support.fake-tools.knobs.test.ts::C-bb5569bd a delay waits after the record is appended` (task 3.1): passed
- `test.support.fake-tools.knobs.test.ts::C-bb5569bd a delayed call leaves its record and does not block another block` (task 3.1): passed
- `test.support.fake-tools.knobs.test.ts::C-bb5569bd failure injection is consumed per recorded request` (task 3.1): passed
- `test.support.fake-tools.knobs.test.ts::C-bb5569bd failure injection precedes the schema check and a later call replaces it` (task 3.1): passed
- `test.support.fake-tools.knobs.test.ts::C-bb5569bd knob arguments are checked` (task 3.1): passed
- `test.support.fake-tools.lifecycle.test.ts::C-0a3c42a7 a reset leaves a request that is waiting in a delay running` (task 3.2): passed
- `test.support.fake-tools.lifecycle.test.ts::C-52efd685 reset clears the records, delays, failures and idempotency and close is idempotent` (task 3.2): passed
- `test.support.fake-tools.read-call.test.ts::C-56fb9fcb a read call answers its fixture and is recorded` (task 2.1): passed
- `test.support.fake-tools.refusals.test.ts::C-94d60756 refusals come first and only parseable calls to known blocks are recorded` (task 2.3): passed
- `test.support.fake-tools.refusals.test.ts::C-dd5140b9 a replay with invalid input is refused and the kept output stays` (task 2.3): passed
- `test.support.fake-tools.samples.test.ts::C-ffea85d9 the 20 samples and edge rows answer over HTTP and validate` (task 2.1): passed
- `test.support.readme.test.ts::C-6ca0a047 the README names the fake accurately` (task 5.1): passed
