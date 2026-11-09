# Verification: openspec:add-fake-egress-proxy: NEEDS_HUMAN (round 1)

traceability: 13/13 criteria covered by a discriminating test

- Base: `283ccadc21e8265eae6c5220c0178ae0472ab0d3`
- Head: `cb86d8d1df74ee803cba25c8f1198f086d213519`
- Implementer profiles: claude-sonnet, glm
- Judge: beam-judge, 5 call(s), judged in 2 parts, prompt sha256 `931aaf974a19754be0e301c38d8d2c2564294f8d2d1c6b4905179b5680137b13`
  - part 1: 15 file(s), 109639 characters, profile beam-judge, reply retried
  - part 2: 6 file(s), 39744 characters, profile beam-judge, reply valid
- Judge replies of beam-judge (this unit, all rounds): valid 1, repaired 0, retried 1, discarded 0; this round: retried
- independence: declared (unverified): beam-judge reflection (declared), claude-sonnet anthropic (tool), glm zhipu (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.2 | base main@283ccadc21 contained |
| 1 | integrity | ok | 172.8 | 11 sub-checks; scope: 27 changed file(s) |
| 2 | build | ok | 23.3 |  |
| 3 | tests | ok | 270.8 |  |
| 4 | traceability | ok | 0.2 | 13/13 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: test/support/fake-egress/broker.ts, test/support/fake-egress/contract.ts, test/support/fake-egress/echo.ts, test/support/fake-egress/index.ts, test/support/fake-egress/jwt.ts and 5 more |
| 8 | s1 judge | ok | 1.2 | 12/13 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 799.8 | 5 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261109T0113Z-8a17/034-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261109T0113Z-8a17/035-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261109T0113Z-8a17/036-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261109T0113Z-8a17/037-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261109T0113Z-8a17/038-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261109T0113Z-8a17/039-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261109T0113Z-8a17/040-e2e.log |

## Files by part

- part 1: test/support/fake-egress/audit.test.ts (6521 characters)
- part 1: test/support/fake-egress/broker.test.ts (9555 characters)
- part 1: test/support/fake-egress/broker.ts (5685 characters)
- part 1: test/support/fake-egress/contract.test.ts (8985 characters)
- part 1: test/support/fake-egress/contract.ts (13389 characters)
- part 1: test/support/fake-egress/echo.test.ts (2703 characters)
- part 1: test/support/fake-egress/echo.ts (2467 characters)
- part 1: test/support/fake-egress/index.ts (6598 characters)
- part 1: test/support/fake-egress/jwt.ts (1137 characters)
- part 1: test/support/fake-egress/lifecycle.test.ts (7776 characters)
- part 1: test/support/fake-egress/proxy.ts (10760 characters)
- part 1: test/support/fake-egress/proxy-forward.test.ts (17097 characters)
- part 1: test/support/fake-egress/proxy-refusals.test.ts (9625 characters)
- part 1: test/support/fake-egress/secrets.test.ts (5873 characters)
- part 1: test/support/fake-egress/state.ts (1468 characters)
- part 2: openspec/changes/add-fake-egress-proxy/tasks.md (10049 characters)
- part 2: test/support/fake-egress/vault.test.ts (11802 characters)
- part 2: test/support/fake-egress/vault.ts (4630 characters)
- part 2: test/support/fake-egress/vault-client.ts (3186 characters)
- part 2: test/support/fake-egress/wire.test.ts (4134 characters)
- part 2: test/support/fake-egress/wire.ts (5943 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 7 task(s): red and green compared |
| test path freeze | ok | 7 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/support/fake-egress/audit.test.ts, test/support/fake-egress/broker.test.ts, test/support/fake-egress/broker.ts, test/support/fake-egress/contract.test.ts, test/support/fake-egress/contract.ts (+15 more) |
| tdd history | ok | 9 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1969 of 1969 base tests pass on the unit's code with its 10 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-5004676d | test-fake-egress › The broker issues a bounded EdDSA token and records it › Issue succeeds and is recorded | covered | test.support.fake-egress.broker.test.ts::C-5004676d issue succeeds and is recorded (passed, red_assertion) | - | 0.91 |
| C-10de5fbe | test-fake-egress › The broker issues a bounded EdDSA token and records it › Issue refuses bad requests and bounds the TTL | covered | test.support.fake-egress.broker.test.ts::C-10de5fbe issue refuses bad requests and bounds the TTL (passed, red_assertion) | - | 0.76 |
| C-fd7f2cf3 | test-fake-egress › The echo upstream shows what it received › The echo upstream shows what it received | covered | test.support.fake-egress.echo.test.ts::C-fd7f2cf3 the echo upstream shows what it received (passed, red_assertion) | - | 0.81 |
| C-aaa7c26b | test-fake-egress › The proxy forwards with the stored credential injected › The proxy forwards through the echo upstream | covered | test.support.fake-egress.proxy-forward.test.ts::C-aaa7c26b the proxy forwards F1 to F4 with the stored credential injected (passed, red_assertion) | - | 0.92 |
| C-4347a436 | test-fake-egress › The proxy forwards with the stored credential injected › Streaming, redirects and upstream errors pass through | covered | test.support.fake-egress.proxy-forward.test.ts::C-4347a436 redirects, errors and unrouted hosts pass through (passed, red_assertion, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-001: the check was inconclusive); test.support.fake-egress.proxy-forward.test.ts::C-4347a436 the ... | - | 0.90 |
| C-6f87d878 | test-fake-egress › The proxy forwards with the stored credential injected › The credential-less route is fake-only | covered | test.support.fake-egress.proxy-forward.test.ts::C-6f87d878 bad credential-less registrations throw and register nothing (passed, red_assertion, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-001: the check was inconclusive); test.support.fake-egress.proxy-forward.test.ts::C-6f... | - | 0.94 |
| C-b724a651 | test-fake-egress › The proxy refuses before it calls an upstream › The proxy refuses on the injected clock | covered | test.support.fake-egress.proxy-refusals.test.ts::C-b724a651 the proxy answers the 401 rows P1 to P9 and P16 and records nothing (passed, red_assertion); test.support.fake-egress.proxy-refusals.test.ts::C-b724a651 the proxy checks expiry with a 30 second leeway on the injected clock (passed, red_asse... | - | 0.90 |
| C-0bc1717c | test-fake-egress › The vault stores a credential and counts key versions › The vault stores a credential and counts key versions | covered | test.support.fake-egress.proxy-forward.test.ts::C-0bc1717c the proxy injects the re-stored credential (passed, red_assertion); test.support.fake-egress.vault.test.ts::C-0bc1717c putCredential returns the key version of each write (passed, red_assertion); test.support.fake-egress.vault.test.ts::C-0bc... | - | - |
| C-e831e54f | test-fake-egress › The vault stores a credential and counts key versions › The vault refuses bad callers and bad messages | covered | test.support.fake-egress.vault.test.ts::C-e831e54f the vault answers h2c with a grpc status in the trailers (passed, red_assertion); test.support.fake-egress.vault.test.ts::C-e831e54f the vault answers unimplemented for other RPCs (passed, red_assertion); test.support.fake-egress.vault.test.ts::C-e8... | - | 0.88 |
| C-835a1ff3 | test-fake-egress › Audit events reach the sink with the emitter's token › Events reach the sink with the emitter's token | covered | test.support.fake-egress.audit.test.ts::C-835a1ff3 a failing, closed or absent sink is ignored and the event is still recorded (passed, red_assertion); test.support.fake-egress.audit.test.ts::C-835a1ff3 each event is posted to the sink with the emitter's token before the call returns (passed, red_as... | - | 0.83 |
| C-dd64c392 | test-fake-egress › No secret is recorded and nothing is printed › No secret is recorded and nothing is printed | covered | test.support.fake-egress.secrets.test.ts::C-dd64c392 no needle is recorded or posted, six events are posted and no source prints (passed, red_assertion) | - | 0.92 |
| C-eb168123 | test-fake-egress › The fake starts on loopback, clears its records and closes completely › Start, register, clear and close | covered | test.support.fake-egress.lifecycle.test.ts::C-eb168123: start, register, clear and close (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-003: the check was inconclusive) | - | 0.93 |
| C-37594c69 | test-fake-egress › The contract suite runs against base URLs › The contract suite passes on the fake and fails on broken targets | covered | test.support.fake-egress.contract.test.ts::C-37594c69 egressContract returns the nine checks in order (passed, red_assertion); test.support.fake-egress.contract.test.ts::C-37594c69 on a closed port all nine checks reject with unreachable or failed (passed, red_assertion); test.support.fake-egress.co... | test.support.fake-egress.contract.test.ts.C-37594c69 the nine checks pass on the fake::issue enforces the TTL bounds (no proof that it discriminates (no red, audit or generated record)); test.support.fake-egress.contract.test.ts.C-37594c69 the nine checks pass on the fake::issue needs the service to... | 0.96 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-fake-egress-proxy/.l4/ledger/r-20261108T1910Z-4c91.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-egress-proxy/.l4/ledger/r-20261108T2150Z-9e5e.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-egress-proxy/.l4/ledger/r-20261108T2228Z-da41.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-egress-proxy/.l4/ledger/r-20261108T2346Z-e004.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-egress-proxy/.l4/ledger/r-20261109T0113Z-8a17.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-egress-proxy/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-egress-proxy/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/fake-egress/audit.test.ts` |  | relevant | new test file |
| `test/support/fake-egress/broker.test.ts` |  | relevant | new test file |
| `test/support/fake-egress/broker.ts` | test | relevant | named in the spec |
| `test/support/fake-egress/contract.test.ts` |  | relevant | new test file |
| `test/support/fake-egress/contract.ts` | test | relevant | named in the spec |
| `test/support/fake-egress/echo.test.ts` |  | relevant | new test file |
| `test/support/fake-egress/echo.ts` | test | relevant | named in the spec |
| `test/support/fake-egress/index.ts` | test | relevant | named in the spec |
| `test/support/fake-egress/jwt.ts` | test | relevant | named in the spec |
| `test/support/fake-egress/lifecycle.test.ts` |  | relevant | new test file |
| `test/support/fake-egress/proxy-forward.test.ts` |  | relevant | new test file |
| `test/support/fake-egress/proxy-refusals.test.ts` |  | relevant | new test file |
| `test/support/fake-egress/proxy.ts` | test | relevant | named in the spec |
| `test/support/fake-egress/secrets.test.ts` |  | relevant | new test file |
| `test/support/fake-egress/state.ts` | test | relevant | named in the spec |
| `test/support/fake-egress/vault-client.ts` | test | relevant | named in the spec |
| `test/support/fake-egress/vault.test.ts` |  | relevant | new test file |
| `test/support/fake-egress/vault.ts` | test | relevant | named in the spec |
| `test/support/fake-egress/wire.test.ts` |  | relevant | new test file |
| `test/support/fake-egress/wire.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: test/support/fake-egress/broker.ts, test/support/fake-egress/contract.ts, test/support/fake-egress/echo.ts, test/support/fake-egress/index.ts, test/support/fake-egress/jwt.ts and 5 more

### Tests

2074 of 2074 passed, 0 failed, 0 errored, 0 skipped.
36 of 36 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-5004676d | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-10de5fbe | ok | 0.760 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fd7f2cf3 | ok | 0.810 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-aaa7c26b | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4347a436 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6f87d878 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b724a651 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0bc1717c | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-e831e54f | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-835a1ff3 | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dd64c392 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-eb168123 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-37594c69 | ok | 0.960 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-5004676d | test-fake-egress › The broker issues a bounded EdDSA token and records it › Issue succeeds and is recorded | pass | pass | the judge passed it and a discriminating test passes |
| C-10de5fbe | test-fake-egress › The broker issues a bounded EdDSA token and records it › Issue refuses bad requests and bounds the TTL | pass | pass | the judge passed it and a discriminating test passes |
| C-fd7f2cf3 | test-fake-egress › The echo upstream shows what it received › The echo upstream shows what it received | pass | pass | the judge passed it and a discriminating test passes |
| C-aaa7c26b | test-fake-egress › The proxy forwards with the stored credential injected › The proxy forwards through the echo upstream | pass | pass | the judge passed it and a discriminating test passes |
| C-4347a436 | test-fake-egress › The proxy forwards with the stored credential injected › Streaming, redirects and upstream errors pass through | pass | pass | the judge passed it and a discriminating test passes |
| C-6f87d878 | test-fake-egress › The proxy forwards with the stored credential injected › The credential-less route is fake-only | pass | pass | the judge passed it and a discriminating test passes |
| C-b724a651 | test-fake-egress › The proxy refuses before it calls an upstream › The proxy refuses on the injected clock | pass | pass | the judge passed it and a discriminating test passes |
| C-0bc1717c | test-fake-egress › The vault stores a credential and counts key versions › The vault stores a credential and counts key versions | pass | pass | the judge passed it and a discriminating test passes |
| C-e831e54f | test-fake-egress › The vault stores a credential and counts key versions › The vault refuses bad callers and bad messages | pass | pass | the judge passed it and a discriminating test passes |
| C-835a1ff3 | test-fake-egress › Audit events reach the sink with the emitter's token › Events reach the sink with the emitter's token | pass | pass | the judge passed it and a discriminating test passes |
| C-dd64c392 | test-fake-egress › No secret is recorded and nothing is printed › No secret is recorded and nothing is printed | pass | pass | the judge passed it and a discriminating test passes |
| C-eb168123 | test-fake-egress › The fake starts on loopback, clears its records and closes completely › Start, register, clear and close | pass | pass | the judge passed it and a discriminating test passes |
| C-37594c69 | test-fake-egress › The contract suite runs against base URLs › The contract suite passes on the fake and fails on broken targets | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-37594c69): test.support.fake-egress.contract.test.ts.C-37594c69 the nine checks pass on the fake::issue enforces the TTL bounds: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-37594c69): test.support.fake-egress.contract.test.ts.C-37594c69 the nine checks pass on the fake::issue needs the service token: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-37594c69): test.support.fake-egress.contract.test.ts.C-37594c69 the nine checks pass on the fake::issue returns a JWT for the service and tenant: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-37594c69): test.support.fake-egress.contract.test.ts.C-37594c69 the nine checks pass on the fake::proxy forwards to the echo service with the injected header: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-37594c69): test.support.fake-egress.contract.test.ts.C-37594c69 the nine checks pass on the fake::proxy passes a redirect through: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-37594c69): test.support.fake-egress.contract.test.ts.C-37594c69 the nine checks pass on the fake::proxy refuses a request without a bearer: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-37594c69): test.support.fake-egress.contract.test.ts.C-37594c69 the nine checks pass on the fake::proxy refuses a token for another service: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-37594c69): test.support.fake-egress.contract.test.ts.C-37594c69 the nine checks pass on the fake::vault put with a denied identity is refused: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-37594c69): test.support.fake-egress.contract.test.ts.C-37594c69 the nine checks pass on the fake::vault put with the admin identity returns a key version: no proof that it discriminates (no red, audit or generated record)
- [major, judge] Unreachable request body hash is computed before the body is drained (spec gap) (criterion C-4347a436): For an upstream connection error, unreachable() calls req.resume() and then finish(502) immediately, so ForwardedRequest.bodySha256 is hashed only from bytes already received before the error.
- [minor, judge] IPv6 loopback target host is not recognized as loopback (spec gap) (criterion C-4347a436): The loopback check compares targetUrl.hostname to "[::1]", but URL.hostname for an IPv6 URL is "::1" without brackets, so such a target is treated as unrouted.
- [minor, judge] task 4.2: proxy pass-through tests are consolidated, not in the named file (criterion C-6f87d878): The task names test/support/fake-egress/proxy-pass-through.test.ts, but the diff parts list no such file; the pass-through and credential-less tests appear under proxy-forward.test.ts.
- [minor, judge] Vault accepts an empty caller_actor_id (spec gap) (criterion C-0bc1717c): validate() does not reject an empty caller_actor_id, so the credential is stored with an empty actor id.
- [minor, judge] Vault ignores header_name for bearer-token credentials (spec gap) (criterion C-0bc1717c): For auth_scheme 3, the stored credential always has headerName null, even if a non-empty header_name is supplied.
- [minor, judge] the judge called a test inadequate (criterion C-e831e54f): test.support.fake-egress.vault.test.ts::C-e831e54f the vault stores the edge cases that are valid
- [major, judge] task 4.2 is ticked as already satisfied, but its text is not done: No proxy-pass-through.test.ts appears in the diff parts; pass-through and credential-less tests are in proxy-forward.test.ts.

## New tests (red then green, `task.red_ok` in the ledger)

- `test.support.fake-egress.audit.test.ts::C-835a1ff3 a failing, closed or absent sink is ignored and the event is still recorded` (task 5.1): passed
- `test.support.fake-egress.audit.test.ts::C-835a1ff3 each event is posted to the sink with the emitter's token before the call returns` (task 5.1): passed
- `test.support.fake-egress.broker.test.ts::C-10de5fbe issue refuses bad requests and bounds the TTL` (task 2.1): passed
- `test.support.fake-egress.broker.test.ts::C-5004676d issue succeeds and is recorded` (task 2.1): passed
- `test.support.fake-egress.contract.test.ts::C-37594c69 egressContract returns the nine checks in order` (task 6.1): passed
- `test.support.fake-egress.contract.test.ts::C-37594c69 on a closed port all nine checks reject with unreachable or failed` (task 6.1): passed
- `test.support.fake-egress.contract.test.ts::C-37594c69 on mutant A only issue needs the service token rejects` (task 6.1): passed
- `test.support.fake-egress.contract.test.ts::C-37594c69 on mutant B only proxy passes a redirect through rejects` (task 6.1): passed
- `test.support.fake-egress.contract.test.ts::C-37594c69 the nine checks pass on the fake` (task 6.1): passed
- `test.support.fake-egress.echo.test.ts::C-fd7f2cf3 the echo upstream shows what it received` (task 1.2): passed
- `test.support.fake-egress.lifecycle.test.ts::C-eb168123: start, register, clear and close` (task 5.2): passed
- `test.support.fake-egress.proxy-forward.test.ts::C-0bc1717c the proxy injects the re-stored credential` (task 4.1): passed
- `test.support.fake-egress.proxy-forward.test.ts::C-4347a436 redirects, errors and unrouted hosts pass through` (task 4.1): passed
- `test.support.fake-egress.proxy-forward.test.ts::C-4347a436 the proxy streams the body before the upstream ends` (task 4.1): passed
- `test.support.fake-egress.proxy-forward.test.ts::C-6f87d878 bad credential-less registrations throw and register nothing` (task 4.1): passed
- `test.support.fake-egress.proxy-forward.test.ts::C-6f87d878 the credential-less route serves until a credential is stored` (task 4.1): passed
- `test.support.fake-egress.proxy-forward.test.ts::C-aaa7c26b the proxy forwards F1 to F4 with the stored credential injected` (task 4.1): passed
- `test.support.fake-egress.proxy-refusals.test.ts::C-b724a651 the proxy answers the 401 rows P1 to P9 and P16 and records nothing` (task 4.1): passed
- `test.support.fake-egress.proxy-refusals.test.ts::C-b724a651 the proxy checks expiry with a 30 second leeway on the injected clock` (task 4.1): passed
- `test.support.fake-egress.proxy-refusals.test.ts::C-b724a651 the proxy refuses addressing, audience and credential rows P10 to P15` (task 4.1): passed
- `test.support.fake-egress.secrets.test.ts::C-dd64c392 no needle is recorded or posted, six events are posted and no source prints` (task 5.1): passed
- `test.support.fake-egress.vault.test.ts::C-0bc1717c putCredential returns the key version of each write` (task 3.1): passed
- `test.support.fake-egress.vault.test.ts::C-0bc1717c the vault counts key versions and answers with fixed bytes` (task 3.1): passed
- `test.support.fake-egress.vault.test.ts::C-e831e54f the vault answers h2c with a grpc status in the trailers` (task 3.1): passed
- `test.support.fake-egress.vault.test.ts::C-e831e54f the vault answers unimplemented for other RPCs` (task 3.1): passed
- `test.support.fake-egress.vault.test.ts::C-e831e54f the vault refuses invalid fields with the row's message` (task 3.1): passed
- `test.support.fake-egress.vault.test.ts::C-e831e54f the vault refuses malformed frames and messages` (task 3.1): passed
- `test.support.fake-egress.vault.test.ts::C-e831e54f the vault refuses unknown callers and callers without vault put` (task 3.1): passed
- `test.support.fake-egress.vault.test.ts::C-e831e54f the vault stores the edge cases that are valid` (task 3.1): passed
- `test.support.fake-egress.wire.test.ts.wire::C-0bc1717c decodePutRequest returns the inputs` (task 1.1): passed
- `test.support.fake-egress.wire.test.ts.wire::C-0bc1717c decodePutRequest throws WireError for V25 and V26` (task 1.1): passed
- `test.support.fake-egress.wire.test.ts.wire::C-0bc1717c decodePutResponse round-trips 1, 2 and 300` (task 1.1): passed
- `test.support.fake-egress.wire.test.ts.wire::C-0bc1717c encodePutRequest equals the REQ1 and REQ2 vectors` (task 1.1): passed
- `test.support.fake-egress.wire.test.ts.wire::C-0bc1717c response frames carry the key version` (task 1.1): passed
- `test.support.fake-egress.wire.test.ts.wire::C-0bc1717c unframe returns the message of one frame` (task 1.1): passed
- `test.support.fake-egress.wire.test.ts.wire::C-0bc1717c unframe throws WireError for V22 to V24` (task 1.1): passed
