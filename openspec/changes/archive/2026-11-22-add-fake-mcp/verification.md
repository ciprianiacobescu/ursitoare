# Verification: openspec:add-fake-mcp: PASS (round 1)

traceability: 11/11 criteria covered by a discriminating test

- Base: `bb7ecc65f9bef8738f32bb6da5b1e61017a44b4a`
- Head: `bfaff6f95624e9dec11f5cc6dc1f4649fd6a2f32`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: nemotron-judge, 4 call(s), judged in 2 parts, prompt sha256 `48549838bb2c1636e2a2970b818b5b48f0338028b4509c0524685cc8527970de`
  - part 1: 15 file(s), 99515 characters, profile nemotron-judge, reply retried
  - part 2: 7 file(s), 57461 characters, profile nemotron-judge, reply retried
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 0, retried 2, discarded 0; this round: retried
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@bb7ecc65f9 contained |
| 1 | integrity | ok | 268.8 | 11 sub-checks (+1 unfrozen by human answers); scope: 26 changed file(s) |
| 2 | build | ok | 33.8 |  |
| 3 | tests | ok | 429.9 |  |
| 4 | traceability | ok | 0.2 | 11/11 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: test/support/e2e-stack/mcp-part.ts, test/support/e2e-stack/parts/55-mcp.ts, test/support/fake-mcp/contract.ts, test/support/fake-mcp/index.ts, test/support/fake-mcp/server.ts and 1 more |
| 8 | s1 judge | ok | 0.5 | 9/11 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 739.1 | 4 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261122T1820Z-536e/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261122T1820Z-536e/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261122T1820Z-536e/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261122T1820Z-536e/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261122T1820Z-536e/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261122T1820Z-536e/009-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261122T1820Z-536e/010-e2e.log |

## Files by part

- part 1: test/support/e2e-stack/parts/55-mcp.ts (261 characters)
- part 1: test/support/fake-mcp/calls.test.ts (7705 characters)
- part 1: test/support/fake-mcp/contract.test.ts (7734 characters)
- part 1: test/support/fake-mcp/contract.ts (10860 characters)
- part 1: test/support/fake-mcp/discover.test.ts (8405 characters)
- part 1: test/support/fake-mcp/index.ts (4487 characters)
- part 1: test/support/fake-mcp/knobs.test.ts (16408 characters)
- part 1: test/support/fake-mcp/legacy.test.ts (6963 characters)
- part 1: test/support/e2e-stack/mcp-part.cluster.test.ts (3328 characters)
- part 1: test/support/e2e-stack/mcp-part.test.ts (11470 characters)
- part 1: test/support/e2e-stack/mcp-part.ts (2490 characters)
- part 1: test/support/fake-mcp/modern-refusals.test.ts (8720 characters)
- part 1: test/support/README.md (1297 characters)
- part 1: test/support/fake-mcp/readme.test.ts (1207 characters)
- part 1: test/support/fake-mcp/records.test.ts (8180 characters)
- part 2: test/support/fake-mcp/server.ts (19147 characters)
- part 2: test/support/fake-mcp/sessions.test.ts (9365 characters)
- part 2: test/support/fake-mcp/sse.test.ts (6333 characters)
- part 2: openspec/changes/add-fake-mcp/tasks.md (10442 characters)
- part 2: test/support/fake-mcp/transport.test.ts (9810 characters)
- part 2: test/support/fake-mcp/wire.test.ts (1520 characters)
- part 2: test/support/fake-mcp/wire.ts (844 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 9 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 9 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/support/e2e-stack/mcp-part.cluster.test.ts, test/support/e2e-stack/mcp-part.test.ts, test/support/e2e-stack/mcp-part.ts, test/support/e2e-stack/parts/55-mcp.ts, test/support/fake-mcp/calls.test.ts (+15 more) |
| tdd history | ok | 9 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 2733 of 2733 base tests pass on the unit's code with its 13 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- test/support/fake-mcp/records.test.ts kept at head for the run (task 4.1: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- test/support/fake-mcp/records.test.ts (task 4.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-9713619c | test-fake-mcp › The fake answers discovery, listing and calls in the modern era › Discovery and paged listing carry the fixtures U54 needs | covered | test.support.fake-mcp.discover.test.ts::C-9713619c D1 server discover advertises the dual era (passed, red_assertion); test.support.fake-mcp.discover.test.ts::C-9713619c D2 a modern-only server advertises only the modern version (passed, red_assertion); test.support.fake-mcp.discover.test.ts::C-9713... | - | 0.95 |
| C-5c007fd0 | test-fake-mcp › The fake answers discovery, listing and calls in the modern era › Calls answer both tools, errors and structured content | covered | test.support.fake-mcp.calls.test.ts::C-5c007fd0 C1 and C2 find_vendor answers a known and an unknown vendor (passed, red_assertion); test.support.fake-mcp.calls.test.ts::C-5c007fd0 C3 and C4 log_note answers and defaults missing arguments (passed, red_assertion); test.support.fake-mcp.calls.test.ts:... | - | 0.93 |
| C-285c5703 | test-fake-mcp › A modern request is refused with the protocol's own errors › Header and version mismatches and unknown methods are refused | covered | test.support.fake-mcp.modern-refusals.test.ts::C-285c5703 H1 to H4 MCP-Protocol-Version and Mcp-Method mismatches are 400 -32020 (passed, red_assertion); test.support.fake-mcp.modern-refusals.test.ts::C-285c5703 H10 N1 and N2 an unknown method 404 and notifications 202 or -32020 (passed, red_asserti... | - | 0.92 |
| C-50dbcfcf | test-fake-mcp › Transport refusals come first and the key is required › Host, path, method, key and body refusals | covered | test.support.fake-mcp.transport.test.ts::C-50dbcfcf T1 and T2 the Host header is checked and the local hosts are accepted (passed, red_assertion); test.support.fake-mcp.transport.test.ts::C-50dbcfcf T10 host, method and path refusals precede the key check (passed, red_assertion); test.support.fake-m... | - | 0.68 |
| C-5de3e5f2 | test-fake-mcp › The legacy eras answer a handshake, with or without a session › A legacy handshake without a session, and the stateless calls | covered | test.support.fake-mcp.legacy.test.ts::C-5de3e5f2 G1 initialize echoes 2025-11-25 and issues no session (passed, red_assertion); test.support.fake-mcp.legacy.test.ts::C-5de3e5f2 G2 initialize echoes 2025-06-18 and 2025-03-26 and falls back to 2025-11-25 (passed, red_assertion); test.support.fake-mcp.... | - | 0.95 |
| C-19bb5be6 | test-fake-mcp › The legacy eras answer a handshake, with or without a session › Sessions, and each era answers the other | covered | test.support.fake-mcp.knobs.test.ts::C-19bb5be6 X5 reset restarts the session counter and forgets sessions (passed, red_assertion); test.support.fake-mcp.sessions.test.ts::C-19bb5be6 E1 a modern-only fake refuses legacy messages with -32020 (passed, red_assertion); test.support.fake-mcp.sessions.tes... | - | 0.95 |
| C-5a43c763 | test-fake-mcp › SSE answers carry a progress event first › SSE answers and the answers that stay JSON | covered | test.support.fake-mcp.knobs.test.ts::C-5a43c763 S5 failNext keeps the injected failure a JSON body under sse (passed, red_assertion); test.support.fake-mcp.sse.test.ts::C-5a43c763 S1 a discover answer is an SSE stream with a progress event first (passed, red_assertion); test.support.fake-mcp.sse.tes... | - | 0.91 |
| C-c83e670d | test-fake-mcp › Every request is recorded and secrets never are › Records hold the facts and none of the secrets | covered | test.support.fake-mcp.records.test.ts::C-c83e670d Q1 to Q6 the six records hold the facts, the filters and the copies (passed, red_assertion); test.support.fake-mcp.records.test.ts::C-c83e670d a session id is recorded as a placeholder and requests() works after close (passed, red_assertion) | - | 0.91 |
| C-0357da28 | test-fake-mcp › Knobs, reset and close are checked and behave as one lifecycle › Failure and surface knobs, reset, close and argument checks | covered | test.support.fake-mcp.knobs.test.ts::C-0357da28 A1 to A7 bad start options reject with RangeError and open no listener (passed, red_assertion); test.support.fake-mcp.knobs.test.ts::C-0357da28 A8 to A15 bad knob arguments throw RangeError and change nothing (passed, red_assertion); test.support.fake-... | - | 0.94 |
| C-d61fc3e1 | test-fake-mcp › The contract suite runs against a base URL › The suite passes on the fake and fails on the broken targets | covered | test.support.fake-mcp.contract.test.ts::C-d61fc3e1 a closed port rejects every check as unreachable (passed, red_assertion); test.support.fake-mcp.contract.test.ts::C-d61fc3e1 a forwarder that adds the key fails only the missing key check (passed, red_assertion); test.support.fake-mcp.contract.test.... | - | - |
| C-24cbda4b | test-fake-mcp › The mcp part registers its upstream, resets with the stack and closes › A credentialed service reaches the fake, reset, crash cluster and README | covered | test.support.e2e-stack.mcp-part.cluster.test.ts::C-24cbda4b P5 the mcp part runs in a crash cluster and its origin refuses after close (passed, red_assertion); test.support.e2e-stack.mcp-part.test.ts::C-24cbda4b P1 the mcp part refuses to start without the egress part and opens no listener (passed, ... | - | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-fake-mcp/.l4/ledger/r-20261122T1159Z-230b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-mcp/.l4/ledger/r-20261122T1423Z-2592.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-mcp/.l4/ledger/r-20261122T1557Z-b7c0.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-mcp/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-mcp/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/README.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/e2e-stack/mcp-part.cluster.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/mcp-part.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/mcp-part.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/parts/55-mcp.ts` | test | relevant | named in the spec |
| `test/support/fake-mcp/calls.test.ts` |  | relevant | new test file |
| `test/support/fake-mcp/contract.test.ts` |  | relevant | new test file |
| `test/support/fake-mcp/contract.ts` | test | relevant | named in the spec |
| `test/support/fake-mcp/discover.test.ts` |  | relevant | new test file |
| `test/support/fake-mcp/index.ts` | test | relevant | named in the spec |
| `test/support/fake-mcp/knobs.test.ts` |  | relevant | new test file |
| `test/support/fake-mcp/legacy.test.ts` |  | relevant | new test file |
| `test/support/fake-mcp/modern-refusals.test.ts` |  | relevant | new test file |
| `test/support/fake-mcp/readme.test.ts` |  | relevant | new test file |
| `test/support/fake-mcp/records.test.ts` |  | relevant | new test file |
| `test/support/fake-mcp/server.ts` | test | relevant | named in the spec |
| `test/support/fake-mcp/sessions.test.ts` |  | relevant | new test file |
| `test/support/fake-mcp/sse.test.ts` |  | relevant | new test file |
| `test/support/fake-mcp/transport.test.ts` |  | relevant | new test file |
| `test/support/fake-mcp/wire.test.ts` |  | relevant | new test file |
| `test/support/fake-mcp/wire.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: test/support/e2e-stack/mcp-part.ts, test/support/e2e-stack/parts/55-mcp.ts, test/support/fake-mcp/contract.ts, test/support/fake-mcp/index.ts, test/support/fake-mcp/server.ts and 1 more

### Tests

2927 of 2927 passed, 0 failed, 0 errored, 0 skipped.
71 of 71 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-9713619c | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5c007fd0 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-285c5703 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-50dbcfcf | ok | 0.680 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5de3e5f2 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-19bb5be6 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5a43c763 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c83e670d | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0357da28 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d61fc3e1 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-24cbda4b | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-9713619c | test-fake-mcp › The fake answers discovery, listing and calls in the modern era › Discovery and paged listing carry the fixtures U54 needs | pass | pass | the judge passed it and a discriminating test passes |
| C-5c007fd0 | test-fake-mcp › The fake answers discovery, listing and calls in the modern era › Calls answer both tools, errors and structured content | pass | pass | the judge passed it and a discriminating test passes |
| C-285c5703 | test-fake-mcp › A modern request is refused with the protocol's own errors › Header and version mismatches and unknown methods are refused | pass | pass | the judge passed it and a discriminating test passes |
| C-50dbcfcf | test-fake-mcp › Transport refusals come first and the key is required › Host, path, method, key and body refusals | pass | pass | the judge passed it and a discriminating test passes |
| C-5de3e5f2 | test-fake-mcp › The legacy eras answer a handshake, with or without a session › A legacy handshake without a session, and the stateless calls | pass | pass | the judge passed it and a discriminating test passes |
| C-19bb5be6 | test-fake-mcp › The legacy eras answer a handshake, with or without a session › Sessions, and each era answers the other | pass | pass | the judge passed it and a discriminating test passes |
| C-5a43c763 | test-fake-mcp › SSE answers carry a progress event first › SSE answers and the answers that stay JSON | pass | pass | the judge passed it and a discriminating test passes |
| C-c83e670d | test-fake-mcp › Every request is recorded and secrets never are › Records hold the facts and none of the secrets | pass | pass | the judge passed it and a discriminating test passes |
| C-0357da28 | test-fake-mcp › Knobs, reset and close are checked and behave as one lifecycle › Failure and surface knobs, reset, close and argument checks | pass | pass | the judge passed it and a discriminating test passes |
| C-d61fc3e1 | test-fake-mcp › The contract suite runs against a base URL › The suite passes on the fake and fails on the broken targets | pass | pass | the judge passed it and a discriminating test passes |
| C-24cbda4b | test-fake-mcp › The mcp part registers its upstream, resets with the stack and closes › A credentialed service reaches the fake, reset, crash cluster and README | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] pageSize option unvalidated (spec gap) (criterion C-9713619c): startFakeMcp accepts pageSize without validation (server.ts: `const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;`). A pageSize of 0 makes tools/list return an empty first page whose nextCursor is page-0, so repeating that cursor yields the same empty page indefinitely. No scenario pins down pageSize=0 behavior.

## New tests (red then green, `task.red_ok` in the ledger)

- `test.support.e2e-stack.mcp-part.cluster.test.ts::C-24cbda4b P5 the mcp part runs in a crash cluster and its origin refuses after close` (task 6.1): passed
- `test.support.e2e-stack.mcp-part.test.ts::C-24cbda4b P1 the mcp part refuses to start without the egress part and opens no listener` (task 6.1): passed
- `test.support.e2e-stack.mcp-part.test.ts::C-24cbda4b P2 a credentialed service reaches the fake and one without is refused` (task 6.1): passed
- `test.support.e2e-stack.mcp-part.test.ts::C-24cbda4b P3 a reset empties the fake and keeps its route and the part closes twice` (task 6.1): passed
- `test.support.e2e-stack.mcp-part.test.ts::C-24cbda4b P4 the part file exports the part and is discovered after egress and tool-servers` (task 6.1): passed
- `test.support.fake-mcp.calls.test.ts::C-5c007fd0 C1 and C2 find_vendor answers a known and an unknown vendor` (task 2.1): passed
- `test.support.fake-mcp.calls.test.ts::C-5c007fd0 C3 and C4 log_note answers and defaults missing arguments` (task 2.1): passed
- `test.support.fake-mcp.calls.test.ts::C-5c007fd0 C5 a base64 mcp-name sentinel is accepted` (task 2.1): passed
- `test.support.fake-mcp.calls.test.ts::C-5c007fd0 C6 and C7 an unknown tool and non-object arguments are -32602` (task 2.1): passed
- `test.support.fake-mcp.calls.test.ts::C-5c007fd0 C8 isError is present exactly when the result sets it` (task 2.1): passed
- `test.support.fake-mcp.contract.test.ts::C-d61fc3e1 a closed port rejects every check as unreachable` (task 5.1): passed
- `test.support.fake-mcp.contract.test.ts::C-d61fc3e1 a forwarder that adds the key fails only the missing key check` (task 5.1): passed
- `test.support.fake-mcp.contract.test.ts::C-d61fc3e1 a header mismatch is refused with -32020` (task 5.1): passed
- `test.support.fake-mcp.contract.test.ts::C-d61fc3e1 a legacy initialize answers its handshake` (task 5.1): passed
- `test.support.fake-mcp.contract.test.ts::C-d61fc3e1 a legacy-only fake fails the six modern checks and passes the key and handshake` (task 5.1): passed
- `test.support.fake-mcp.contract.test.ts::C-d61fc3e1 a missing key is refused` (task 5.1): passed
- `test.support.fake-mcp.contract.test.ts::C-d61fc3e1 a modern-only fake passes seven checks and fails only the legacy handshake` (task 5.1): passed
- `test.support.fake-mcp.contract.test.ts::C-d61fc3e1 an unknown method is refused with -32601` (task 5.1): passed
- `test.support.fake-mcp.contract.test.ts::C-d61fc3e1 an unsupported version is refused with -32022` (task 5.1): passed
- `test.support.fake-mcp.contract.test.ts::C-d61fc3e1 server/discover answers its versions` (task 5.1): passed
- `test.support.fake-mcp.contract.test.ts::C-d61fc3e1 the contract names are the eight checks in order` (task 5.1): passed
- `test.support.fake-mcp.contract.test.ts::C-d61fc3e1 the keyless contract has seven checks and all resolve` (task 5.1): passed
- `test.support.fake-mcp.contract.test.ts::C-d61fc3e1 tools/call answers find_vendor` (task 5.1): passed
- `test.support.fake-mcp.contract.test.ts::C-d61fc3e1 tools/list answers the tools` (task 5.1): passed
- `test.support.fake-mcp.discover.test.ts::C-9713619c D1 server discover advertises the dual era` (task 2.1): passed
- `test.support.fake-mcp.discover.test.ts::C-9713619c D2 a modern-only server advertises only the modern version` (task 2.1): passed
- `test.support.fake-mcp.discover.test.ts::C-9713619c L1 tools list serves the two fixtures in one page` (task 2.1): passed
- `test.support.fake-mcp.discover.test.ts::C-9713619c L2 tools list pages by cursor and carries x-mcp-header verbatim` (task 2.1): passed
- `test.support.fake-mcp.discover.test.ts::C-9713619c L3 invalid cursors are -32602 with HTTP 200` (task 2.1): passed
- `test.support.fake-mcp.knobs.test.ts::C-0357da28 A1 to A7 bad start options reject with RangeError and open no listener` (task 4.2): passed
- `test.support.fake-mcp.knobs.test.ts::C-0357da28 A8 to A15 bad knob arguments throw RangeError and change nothing` (task 4.2): passed
- `test.support.fake-mcp.knobs.test.ts::C-0357da28 K1 failNext fails the next matching messages and records them` (task 4.2): passed
- `test.support.fake-mcp.knobs.test.ts::C-0357da28 K2 failNext is not consumed by a refusal and the later call replaces it` (task 4.2): passed
- `test.support.fake-mcp.knobs.test.ts::C-0357da28 K3 failNext on initialize injects a plain HTTP failure` (task 4.2): passed
- `test.support.fake-mcp.knobs.test.ts::C-0357da28 K4 and K5 setTools and reset restore the surface while close stays idempotent` (task 4.2): passed
- `test.support.fake-mcp.knobs.test.ts::C-19bb5be6 X5 reset restarts the session counter and forgets sessions` (task 4.2): passed
- `test.support.fake-mcp.knobs.test.ts::C-5a43c763 S5 failNext keeps the injected failure a JSON body under sse` (task 4.2): passed
- `test.support.fake-mcp.legacy.test.ts::C-5de3e5f2 G1 initialize echoes 2025-11-25 and issues no session` (task 3.1): passed
- `test.support.fake-mcp.legacy.test.ts::C-5de3e5f2 G2 initialize echoes 2025-06-18 and 2025-03-26 and falls back to 2025-11-25` (task 3.1): passed
- `test.support.fake-mcp.legacy.test.ts::C-5de3e5f2 G3 the initialized notification is 202 and empty` (task 3.1): passed
- `test.support.fake-mcp.legacy.test.ts::C-5de3e5f2 G4 tools/list answers on a fresh fake with no resultType` (task 3.1): passed
- `test.support.fake-mcp.legacy.test.ts::C-5de3e5f2 G5 tools/call answers on a fresh fake with no resultType` (task 3.1): passed
- `test.support.fake-mcp.legacy.test.ts::C-5de3e5f2 G6 a missing, modern or old version header is 400 -32600` (task 3.1): passed
- `test.support.fake-mcp.legacy.test.ts::C-5de3e5f2 G7 unknown method, tool and server/discover are 200 errors` (task 3.1): passed
- `test.support.fake-mcp.modern-refusals.test.ts::C-285c5703 H1 to H4 MCP-Protocol-Version and Mcp-Method mismatches are 400 -32020` (task 2.2): passed
- `test.support.fake-mcp.modern-refusals.test.ts::C-285c5703 H10 N1 and N2 an unknown method 404 and notifications 202 or -32020` (task 2.2): passed
- `test.support.fake-mcp.modern-refusals.test.ts::C-285c5703 H5 to H7 Mcp-Name missing, mismatched and invalid sentinel are 400 -32020` (task 2.2): passed
- `test.support.fake-mcp.modern-refusals.test.ts::C-285c5703 H8 and H9 an unsupported version is 400 -32022 with data` (task 2.2): passed
- `test.support.fake-mcp.readme.test.ts::C-24cbda4b the README holds one fake-mcp row owned by add-fake-mcp` (task 6.1): passed
- `test.support.fake-mcp.records.test.ts::C-c83e670d Q1 to Q6 the six records hold the facts, the filters and the copies` (task 4.1): passed
