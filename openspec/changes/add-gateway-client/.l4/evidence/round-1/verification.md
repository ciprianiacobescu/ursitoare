# Verification: openspec:add-gateway-client: PASS (round 1)

traceability: 13/13 criteria covered by a discriminating test

- Base: `3c30dc1b4fbfd994f50dd3188f728200c042a623`
- Head: `52c2b08cafc9e3158d2f9b53667a2da449fd5a5c`
- Implementer profiles: glm, deepseek-free, claude-sonnet
- Judge: nemotron-judge, 2 call(s), judged in 2 parts, prompt sha256 `f8b47f743fb7c15630b82705f15f7173f928dda01ecfdc2ab2df6e35b73988b7`
  - part 1: 22 file(s), 110073 characters, profile nemotron-judge, reply repaired
  - part 2: 6 file(s), 44776 characters, profile nemotron-judge, reply repaired
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 2, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), glm zhipu (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base main@3c30dc1b4f contained |
| 1 | integrity | ok | 259.5 | 11 sub-checks (+2 unfrozen by human answers); scope: 33 changed file(s) |
| 2 | build | ok | 38.7 |  |
| 3 | tests | ok | 358.0 |  |
| 4 | traceability | ok | 0.2 | 13/13 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/config/config.ts, src/config/egress.ts, src/config/index.ts, src/gateway/client.ts, src/gateway/digest.ts and 10 more |
| 8 | s1 judge | ok | 1.1 | 13/13 criteria judged by jev |
| 9 | judge | ok | 505.9 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261109T0906Z-2c9c/014-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261109T0906Z-2c9c/015-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261109T0906Z-2c9c/016-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261109T0906Z-2c9c/017-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261109T0906Z-2c9c/018-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261109T0906Z-2c9c/019-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261109T0906Z-2c9c/020-e2e.log |

## Files by part

- part 1: test/support/e2e-stack/parts/45-egress.ts (276 characters)
- part 1: src/gateway/client.ts (12321 characters)
- part 1: src/config/config.ts (1512 characters)
- part 1: src/gateway/digest.ts (1244 characters)
- part 1: src/config/egress.test.ts (12387 characters)
- part 1: src/config/egress.ts (5724 characters)
- part 1: test/support/e2e-stack/egress-part.test.ts (9511 characters)
- part 1: test/support/e2e-stack/egress-part.ts (3528 characters)
- part 1: test/arch/egress-sites.test.ts (2952 characters)
- part 1: test/arch/egress-sites.ts (2114 characters)
- part 1: test/support/gateway-kit.ts (3944 characters)
- part 1: src/gateway/helpers.test.ts (4915 characters)
- part 1: src/config/index.ts (534 characters)
- part 1: src/pdp/index.ts (377 characters)
- part 1: src/pdp/issued-permit.test.ts (4128 characters)
- part 1: src/gateway/logs.test.ts (5944 characters)
- part 1: src/main.egress.test.ts (10546 characters)
- part 1: src/main.ts (1813 characters)
- part 1: src/pdp/permit.ts (911 characters)
- part 1: src/gateway/self-check.test.ts (10074 characters)
- part 1: src/gateway/self-check.ts (2843 characters)
- part 1: src/gateway/send-forward.test.ts (12475 characters)
- part 2: src/gateway/send-limits.test.ts (15325 characters)
- part 2: src/gateway/send-refusals.test.ts (8705 characters)
- part 2: openspec/changes/add-gateway-client/tasks.md (9633 characters)
- part 2: src/gateway/tenant.ts (873 characters)
- part 2: src/gateway/token.test.ts (9328 characters)
- part 2: src/gateway/types.ts (912 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 12 task(s): red and green compared (+2 unfrozen by a delegate or an agent) |
| test path freeze | ok | 12 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/config/config.ts, src/config/egress.test.ts, src/config/egress.ts, src/config/index.ts, src/gateway/client.ts (+22 more) |
| tdd history | ok | 12 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 2028 of 2028 base tests pass on the unit's code with its 10 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/config/egress.test.ts kept at head for the run (task 2.1: unfrozen by Q-001)
- test/support/e2e-stack/egress-part.test.ts kept at head for the run (task 8.1: unfrozen by Q-002)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/config/egress.test.ts (task 2.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))
- test/support/e2e-stack/egress-part.test.ts (task 8.1, unfrozen by Q-002 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-58c9e6d3 | engine-config › The egress configuration is optional and read from URSITOARE_EGRESS_ variables › A complete egress configuration loads and an absent one leaves no key | covered | src.config.egress.test.ts::C-58c9e6d3 loadConfig leaves no own egress key when no URSITOARE egress variable has a value and loadEgressConfig is undefined with no read (passed, red_assertion); src.config.egress.test.ts::C-58c9e6d3 loadConfig reads the broker token once and the vault token when every ... | - | 0.90 |
| C-9a6e394a | engine-config › The egress configuration is optional and read from URSITOARE_EGRESS_ variables › An incomplete or malformed egress configuration is refused | covered | src.config.egress.test.ts::C-9a6e394a loadConfig refuses an incomplete egress configuration naming the missing variable (passed, red_assertion); src.config.egress.test.ts::C-9a6e394a loadConfig refuses egress token files holding a line break a NUL a space a non-ascii or an overlong token (passed, re... | - | 0.92 |
| C-187a76ab | gateway › Digests, tenant ids, call headers and permit matches are fixed › Vectors, call header and permit matching | covered | src.gateway.helpers.test.ts::C-187a76ab bodyDigest hashes null and empty as the empty digest and a body as its sha256 (passed, red_assertion); src.gateway.helpers.test.ts::C-187a76ab callHeader joins run node and attempt (passed, red_assertion); src.gateway.helpers.test.ts::C-187a76ab mintkeyTenantI... | - | 0.88 |
| C-4846a8b6 | gateway › isIssuedPermit is true only for a permit this process's PDP returned › Only a permit issued by this process is accepted | covered | src.pdp.issued-permit.test.ts::C-4846a8b6 a second engine's permit is accepted and non permit decisions carry none (passed, red_assertion); src.pdp.issued-permit.test.ts::C-4846a8b6 isIssuedPermit refuses values that are not this process's permit (passed, red_assertion); src.pdp.issued-permit.test.t... | - | 0.85 |
| C-a6742749 | gateway › requestToken issues a one-use token for an issued permit › requestToken posts one issue request and holds the token privately | covered | src.gateway.token.test.ts::C-a6742749 requestToken accepts the token and expiry bounds (passed, red_assertion); src.gateway.token.test.ts::C-a6742749 requestToken hides the broker service token of a throwing fetch (passed, red_assertion); src.gateway.token.test.ts::C-a6742749 requestToken maps a ref... | - | 0.90 |
| C-c4c97ae4 | gateway › send refuses everything the permit does not cover before the network › send refuses before any network call | covered | src.gateway.send-refusals.test.ts::C-c4c97ae4 send refuses a foreign permit and every permit mismatch before the network (passed, red_assertion); src.gateway.send-refusals.test.ts::C-c4c97ae4 send refuses a permit whose service id is not a lower-case UUID (passed, red_assertion); src.gateway.send-re... | - | 0.91 |
| C-720131d6 | gateway › send forwards through the proxy and returns the answer unchanged › send forwards through the proxy and passes redirects through | covered | src.gateway.send-forward.test.ts::C-720131d6 send forwards the permitted request through the proxy and spends the token (passed, red_assertion); src.gateway.send-forward.test.ts::C-720131d6 send forwards through the fake egress and the echo sees the permitted request (passed, red_assertion); src.gat... | - | 0.93 |
| C-92bd4c96 | gateway › Size and time are bounded › Size and time are bounded and a failed send is final | covered | src.gateway.send-limits.test.ts::C-92bd4c96 a chunked response respects the same size limit (passed, red_assertion); src.gateway.send-limits.test.ts::C-92bd4c96 a network failure is unavailable and spends the token (passed, red_assertion); src.gateway.send-limits.test.ts::C-92bd4c96 a response at th... | - | 0.94 |
| C-51b30b5c | gateway › Logs and errors carry no secret › Logs and errors carry no secret | covered | src.gateway.logs.test.ts::C-51b30b5c gateway logs answered calls and failures without a secret or payload (passed, red_assertion) | - | 0.91 |
| C-b6e0b10b | gateway › The start-up self-check refuses an open issuer › checkEgress closes on refusal and refuses an open issuer | covered | src.gateway.self-check.test.ts::C-b6e0b10b a connection failure makes the broker unreachable (passed, red_assertion); src.gateway.self-check.test.ts::C-b6e0b10b an open issuer is refused at the first 2xx answer (passed, red_assertion); src.gateway.self-check.test.ts::C-b6e0b10b checkEgress posts two... | - | 0.86 |
| C-cfd3a3ab | gateway › main refuses an open issuer and starts otherwise › main refuses an open issuer and starts otherwise | covered | src.main.egress.test.ts::C-cfd3a3ab main calls the checkEgress seam only when egress is configured (passed, red_assertion); src.main.egress.test.ts::C-cfd3a3ab main refuses an open issuer before it opens the database (passed, red_assertion); src.main.egress.test.ts::C-cfd3a3ab main starts against th... | - | 0.89 |
| C-76ead8ea | gateway › Only inventoried files import the gateway › Only inventoried files import the gateway | covered | test.arch.egress-sites.test.ts::C-76ead8ea the engine's egress sites are exactly the inventory (passed, red_assertion) | - | 0.85 |
| C-e09b6c9e | gateway › The egress part starts in the e2e stack and the crash cluster › The egress part starts in a crash cluster and closes completely | covered | test.support.e2e-stack.egress-part.test.ts::C-e09b6c9e discovery lists the egress part after durable and the part file re-exports it (passed, red_assertion); test.support.e2e-stack.egress-part.test.ts::C-e09b6c9e the crash cluster runs the egress part and its broker turns unreachable after close (pa... | - | 0.90 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-gateway-client/.l4/ledger/r-20261109T0343Z-db5e.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-gateway-client/.l4/ledger/r-20261109T0430Z-f3a6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-gateway-client/.l4/ledger/r-20261109T0705Z-0de6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-gateway-client/.l4/ledger/r-20261109T0906Z-2c9c.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-gateway-client/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-gateway-client/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/config/config.ts` | config | relevant | named in the spec |
| `src/config/egress.test.ts` |  | relevant | new test file |
| `src/config/egress.ts` | config | relevant | named in the spec |
| `src/config/index.ts` | config | relevant | named in the spec |
| `src/gateway/client.ts` | gateway | relevant | named in the spec |
| `src/gateway/digest.ts` | gateway | relevant | named in the spec |
| `src/gateway/helpers.test.ts` |  | relevant | new test file |
| `src/gateway/logs.test.ts` |  | relevant | new test file |
| `src/gateway/self-check.test.ts` |  | relevant | new test file |
| `src/gateway/self-check.ts` | gateway | relevant | named in the spec |
| `src/gateway/send-forward.test.ts` |  | relevant | new test file |
| `src/gateway/send-limits.test.ts` |  | relevant | new test file |
| `src/gateway/send-refusals.test.ts` |  | relevant | new test file |
| `src/gateway/tenant.ts` | gateway | relevant | named in the spec |
| `src/gateway/token.test.ts` |  | relevant | new test file |
| `src/gateway/types.ts` | gateway | relevant | named in the spec |
| `src/main.egress.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `src/pdp/index.ts` | pdp | relevant | named in the spec |
| `src/pdp/issued-permit.test.ts` |  | relevant | new test file |
| `src/pdp/permit.ts` | pdp | relevant | named in the spec |
| `test/arch/egress-sites.test.ts` |  | relevant | new test file |
| `test/arch/egress-sites.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/egress-part.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/egress-part.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/parts/45-egress.ts` | test | relevant | named in the spec |
| `test/support/gateway-kit.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/config/config.ts, src/config/egress.ts, src/config/index.ts, src/gateway/client.ts, src/gateway/digest.ts and 10 more

### Tests

2132 of 2132 passed, 0 failed, 0 errored, 0 skipped.
56 of 56 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-58c9e6d3 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9a6e394a | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-187a76ab | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4846a8b6 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a6742749 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c4c97ae4 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-720131d6 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-92bd4c96 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-51b30b5c | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b6e0b10b | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cfd3a3ab | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-76ead8ea | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e09b6c9e | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-58c9e6d3 | engine-config › The egress configuration is optional and read from URSITOARE_EGRESS_ variables › A complete egress configuration loads and an absent one leaves no key | pass | pass | the judge passed it and a discriminating test passes |
| C-9a6e394a | engine-config › The egress configuration is optional and read from URSITOARE_EGRESS_ variables › An incomplete or malformed egress configuration is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-187a76ab | gateway › Digests, tenant ids, call headers and permit matches are fixed › Vectors, call header and permit matching | pass | pass | the judge passed it and a discriminating test passes |
| C-4846a8b6 | gateway › isIssuedPermit is true only for a permit this process's PDP returned › Only a permit issued by this process is accepted | pass | pass | the judge passed it and a discriminating test passes |
| C-a6742749 | gateway › requestToken issues a one-use token for an issued permit › requestToken posts one issue request and holds the token privately | pass | pass | the judge passed it and a discriminating test passes |
| C-c4c97ae4 | gateway › send refuses everything the permit does not cover before the network › send refuses before any network call | pass | pass | the judge passed it and a discriminating test passes |
| C-720131d6 | gateway › send forwards through the proxy and returns the answer unchanged › send forwards through the proxy and passes redirects through | pass | pass | the judge passed it and a discriminating test passes |
| C-92bd4c96 | gateway › Size and time are bounded › Size and time are bounded and a failed send is final | pass | pass | the judge passed it and a discriminating test passes |
| C-51b30b5c | gateway › Logs and errors carry no secret › Logs and errors carry no secret | pass | pass | the judge passed it and a discriminating test passes |
| C-b6e0b10b | gateway › The start-up self-check refuses an open issuer › checkEgress closes on refusal and refuses an open issuer | pass | pass | the judge passed it and a discriminating test passes |
| C-cfd3a3ab | gateway › main refuses an open issuer and starts otherwise › main refuses an open issuer and starts otherwise | pass | pass | the judge passed it and a discriminating test passes |
| C-76ead8ea | gateway › Only inventoried files import the gateway › Only inventoried files import the gateway | pass | pass | the judge passed it and a discriminating test passes |
| C-e09b6c9e | gateway › The egress part starts in the e2e stack and the crash cluster › The egress part starts in a crash cluster and closes completely | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] loadEgressConfig check order between vault validation and broker-token read is unpinned (spec gap) (criterion C-9a6e394a): When vault variables are incomplete and the broker token file is missing or blank, loadEgressConfig validates the vault trio (readVaultParts) before reading the broker token file, so a CONFIG_INVALID vault error wins over CONFIG_SECRET_EMPTY for the token file; the spec pins neither order for that combination and two reasonable implementations differ.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.config.egress.test.ts::C-58c9e6d3 loadConfig leaves no own egress key when no URSITOARE egress variable has a value and loadEgressConfig is undefined with no read` (task 2.1): passed
- `src.config.egress.test.ts::C-58c9e6d3 loadConfig reads the broker token once and the vault token when every egress variable is set` (task 2.1): passed
- `src.config.egress.test.ts::C-58c9e6d3 loadConfig strips trailing slashes from the egress URLs and accepts a 4096 character broker token` (task 2.1): passed
- `src.config.egress.test.ts::C-9a6e394a loadConfig refuses an incomplete egress configuration naming the missing variable` (task 2.1): passed
- `src.config.egress.test.ts::C-9a6e394a loadConfig refuses egress token files holding a line break a NUL a space a non-ascii or an overlong token` (task 2.1): passed
- `src.config.egress.test.ts::C-9a6e394a loadConfig refuses malformed egress URLs and a bad agent id` (task 2.1): passed
- `src.config.egress.test.ts::C-9a6e394a loadConfig refuses missing empty and unreadable egress token files` (task 2.1): passed
- `src.config.egress.test.ts::C-9a6e394a loadConfig reports the first failing egress check` (task 2.1): passed
- `src.config.egress.test.ts::C-9a6e394a loadConfig requires the vault variables together and an origin without path for the vault` (task 2.1): passed
- `src.gateway.helpers.test.ts::C-187a76ab bodyDigest hashes null and empty as the empty digest and a body as its sha256` (task 3.1): passed
- `src.gateway.helpers.test.ts::C-187a76ab callHeader joins run node and attempt` (task 3.1): passed
- `src.gateway.helpers.test.ts::C-187a76ab mintkeyTenantId derives the frozen UUIDv8 tenant ids` (task 3.1): passed
- `src.gateway.helpers.test.ts::C-187a76ab permitMatches accepts equal method host path and digest` (task 3.1): passed
- `src.gateway.helpers.test.ts::C-187a76ab permitMatches rejects any method host path or digest difference and an unparsable origin` (task 3.1): passed
- `src.gateway.logs.test.ts::C-51b30b5c gateway logs answered calls and failures without a secret or payload` (task 5.4): passed
- `src.gateway.self-check.test.ts::C-b6e0b10b a connection failure makes the broker unreachable` (task 6.1): passed
- `src.gateway.self-check.test.ts::C-b6e0b10b an open issuer is refused at the first 2xx answer` (task 6.1): passed
- `src.gateway.self-check.test.ts::C-b6e0b10b checkEgress posts two probes without a service token` (task 6.1): passed
- `src.gateway.self-check.test.ts::C-b6e0b10b checkEgress treats non 2xx answers as a closed broker and logs nothing` (task 6.1): passed
- `src.gateway.self-check.test.ts::C-b6e0b10b each probe aborts at five seconds and not before` (task 6.1): passed
- `src.gateway.self-check.test.ts::C-b6e0b10b the real fake broker answers as closed without recording an issue` (task 6.1): passed
- `src.gateway.send-forward.test.ts::C-720131d6 send forwards the permitted request through the proxy and spends the token` (task 5.2): passed
- `src.gateway.send-forward.test.ts::C-720131d6 send forwards through the fake egress and the echo sees the permitted request` (task 5.2): passed
- `src.gateway.send-forward.test.ts::C-720131d6 send honours the token's expiry second and forwards a query path with a null body` (task 5.2): passed
- `src.gateway.send-forward.test.ts::C-720131d6 send returns a redirect from the proxy unchanged and never follows it` (task 5.2): passed
- `src.gateway.send-forward.test.ts::C-720131d6 send returns the proxy's 502 for a tenant with no stored credential` (task 5.2): passed
- `src.gateway.send-limits.test.ts::C-92bd4c96 a chunked response respects the same size limit` (task 5.3): passed
- `src.gateway.send-limits.test.ts::C-92bd4c96 a network failure is unavailable and spends the token` (task 5.3): passed
- `src.gateway.send-limits.test.ts::C-92bd4c96 a response at the size limit passes and one byte more is too large` (task 5.3): passed
- `src.gateway.send-limits.test.ts::C-92bd4c96 a send timer aborts a stalled body and leaves a finished call alone` (task 5.3): passed
- `src.gateway.send-limits.test.ts::C-92bd4c96 a token request aborts at thirty seconds and not before` (task 5.3): passed
- `src.gateway.send-limits.test.ts::C-92bd4c96 an oversized token answer is unavailable while one at the limit is accepted` (task 5.3): passed
- `src.gateway.send-refusals.test.ts::C-c4c97ae4 send refuses a foreign permit and every permit mismatch before the network` (task 5.1): passed
- `src.gateway.send-refusals.test.ts::C-c4c97ae4 send refuses a permit whose service id is not a lower-case UUID` (task 5.1): passed
- `src.gateway.send-refusals.test.ts::C-c4c97ae4 send refuses a token for another service one that is used and one that is expired` (task 5.1): passed
- `src.gateway.send-refusals.test.ts::C-c4c97ae4 send refuses an invalid tag before the network` (task 5.1): passed
- `src.gateway.send-refusals.test.ts::C-c4c97ae4 send refuses every unsafe header before the network` (task 5.1): passed
- `src.gateway.send-refusals.test.ts::C-c4c97ae4 send refuses every unsafe path before the network` (task 5.1): passed
- `src.gateway.send-refusals.test.ts::C-c4c97ae4 send refuses in the order foreign mismatch tag service path` (task 5.1): passed
- `src.gateway.token.test.ts::C-a6742749 requestToken accepts the token and expiry bounds` (task 4.1): passed
- `src.gateway.token.test.ts::C-a6742749 requestToken hides the broker service token of a throwing fetch` (task 4.1): passed
- `src.gateway.token.test.ts::C-a6742749 requestToken maps a refused broker answer to TOKEN_REFUSED and any other status to UNAVAILABLE` (task 4.1): passed
- `src.gateway.token.test.ts::C-a6742749 requestToken posts one issue request and keeps the JWT private` (task 4.1): passed
- `src.gateway.token.test.ts::C-a6742749 requestToken refuses a foreign permit an invalid tag and an invalid service without a call` (task 4.1): passed
- `src.gateway.token.test.ts::C-a6742749 requestToken refuses every malformed token answer as UNAVAILABLE token` (task 4.1): passed
- `src.main.egress.test.ts::C-cfd3a3ab main calls the checkEgress seam only when egress is configured` (task 7.1): passed
- `src.main.egress.test.ts::C-cfd3a3ab main refuses an open issuer before it opens the database` (task 7.1): passed
- `src.main.egress.test.ts::C-cfd3a3ab main starts against the closed fake broker and serves health` (task 7.1): passed
- `src.main.egress.test.ts::C-cfd3a3ab main warns and starts when the broker is unreachable` (task 7.1): passed
- `src.pdp.issued-permit.test.ts::C-4846a8b6 a second engine's permit is accepted and non permit decisions carry none` (task 1.1): passed
