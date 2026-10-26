# Verification: openspec:add-engine-skeleton: PASS (round 2)

traceability: 36/36 criteria covered by a discriminating test

- Base: `f01a0413a890c257db1b4c9baad1155861ecb63e`
- Head: `f7f58206c3ccdfc418878058c684329594fb0314`
- Implementer profiles: deepseek, glm, claude-sonnet
- Judge: gemini-judge, 2 call(s), judged in 2 parts, prompt sha256 `761df7f6ab8d8bd1d3e4189c933842fc8c2fd0afcf146305a8c618e32d3d5dd7`
  - part 1: 23 file(s), 116579 characters, profile gemini-judge, reply valid
  - part 2: 7 file(s), 40135 characters, profile gemini-judge, reply repaired
- Judge replies of gemini-judge (this unit, all rounds): valid 1, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): gemini-judge google (declared), deepseek deepseek (declared), glm zhipu (declared), claude-sonnet anthropic (tool)
- Cost: $0.7402

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.8 | base main@f01a0413a8 contained |
| 1 | integrity | ok | 8.2 | 10 sub-checks; scope: 38 changed file(s) |
| 2 | build | ok | 13.9 |  |
| 3 | tests | ok | 5.9 |  |
| 4 | traceability | ok | 0.0 | 36/36 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/errors.ts, src/api/health.ts, src/api/server.ts, src/api/shutdown.ts, src/config/config.ts and 10 more |
| 8 | s1 judge | ok | 3.7 | 36/36 criteria judged by jev |
| 9 | judge | ok | 575.4 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261026T1132Z-7654/014-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261026T1132Z-7654/015-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261026T1132Z-7654/016-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261026T1132Z-7654/017-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261026T1132Z-7654/018-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261026T1132Z-7654/019-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261026T1132Z-7654/020-e2e.log |

## Files by part

- part 1: openspec/changes/add-engine-skeleton-fix-1/.openspec.yaml (329 characters)
- part 1: src/core/clock.test.ts (854 characters)
- part 1: src/core/clock.ts (791 characters)
- part 1: src/config/config.test.ts (16228 characters)
- part 1: src/config/config.ts (7979 characters)
- part 1: src/api/errors.test.ts (6769 characters)
- part 1: src/api/errors.ts (4999 characters)
- part 1: src/config/errors.ts (793 characters)
- part 1: src/api/health.test.ts (5851 characters)
- part 1: src/api/health.ts (4396 characters)
- part 1: src/health.ts (352 characters)
- part 1: src/core/ids.test.ts (3499 characters)
- part 1: src/core/ids.ts (2994 characters)
- part 1: src/observability/index.ts (463 characters)
- part 1: src/observability/logger.test.ts (6934 characters)
- part 1: src/observability/logger.ts (2807 characters)
- part 1: src/main.test.ts (10699 characters)
- part 1: src/main.ts (6613 characters)
- part 1: src/config/process.ts (494 characters)
- part 1: openspec/changes/add-engine-skeleton-fix-1/proposal.md (817 characters)
- part 1: src/config/secret.test.ts (6760 characters)
- part 1: src/config/secret.ts (1863 characters)
- part 1: src/api/server.test.ts (23295 characters)
- part 2: src/api/server.ts (3814 characters)
- part 2: src/api/shutdown.test.ts (13810 characters)
- part 2: src/api/shutdown.ts (2544 characters)
- part 2: openspec/changes/add-engine-skeleton-fix-1/tasks.md (315 characters)
- part 2: openspec/changes/add-engine-skeleton/tasks.md (17761 characters)
- part 2: src/observability/tracer.test.ts (1104 characters)
- part 2: src/observability/tracer.ts (787 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 12 task(s): red and green compared |
| test path freeze | ok | 13 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/errors.test.ts, src/api/errors.ts, src/api/health.test.ts, src/api/health.ts, src/api/server.test.ts (+21 more) |
| tdd history | ok | 12 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 9 of 9 base tests pass on the unit's code with its 11 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-7b6bccec | engine-config › Typed configuration from the environment › Defaults | covered | src.config.config.test.ts::C-7b6bccec loadConfig returns every documented default for an empty environment (passed, red_assertion) | - | 0.95 |
| C-95e9881e | engine-config › Typed configuration from the environment › Values from the environment | covered | src.config.config.test.ts::C-95e9881e loadConfig derives publicBaseUrl from the port and ignores empty or unknown variables (passed, red_assertion); src.config.config.test.ts::C-95e9881e loadConfig reads every non-secret setting from the environment and drops a trailing slash (passed, red_assertion) | - | 0.95 |
| C-c0bf38f0 | engine-config › Typed configuration from the environment › Bad values are refused without echoing them | covered | src.config.config.test.ts::C-c0bf38f0 loadConfig refuses a bad drain deadline or public base URL without echoing the value (passed, red_assertion); src.config.config.test.ts::C-c0bf38f0 loadConfig refuses a bad port host log level or role (passed, red_assertion) | - | 0.94 |
| C-f3f5587d | engine-config › Typed configuration from the environment › A secret placed in the environment is refused | covered | src.config.config.test.ts::C-f3f5587d loadConfig ignores an empty secret-shaped variable (passed, red_assertion); src.config.config.test.ts::C-f3f5587d loadConfig refuses a non-empty secret-shaped variable without echoing its value (passed, red_assertion) | - | 0.87 |
| C-7a4aa4d4 | engine-config › Secrets only from files › Engine key loaded | covered | src.config.config.test.ts::C-7a4aa4d4 loadConfig reads the engine key from its file and strips the trailing newline (passed, red_assertion); src.config.secret.test.ts::C-7a4aa4d4 readSecretValue strips one trailing newline and reads the named file once (passed, red_assertion) | - | 0.93 |
| C-ca797e1f | engine-config › Secrets only from files › Empty, missing or weak engine key refuses start | covered | src.config.config.test.ts::C-ca797e1f loadConfig refuses a weak engine key with CONFIG_INVALID naming its file variable (passed, red_assertion); src.config.config.test.ts::C-ca797e1f loadConfig refuses an empty or unreadable engine key file with CONFIG_SECRET_EMPTY (passed, red_assertion); src.confi... | - | 0.92 |
| C-16430cae | engine-config › Secrets only from files › No secret byte leaves the config object | covered | src.config.config.test.ts::C-16430cae a loaded config hides the engine key and database password from JSON String and inspect (passed, red_assertion); src.config.secret.test.ts::C-16430cae a Secret hides its value from JSON String and inspect (passed, red_assertion) | - | 0.96 |
| C-406ddaa1 | engine-config › Secrets only from files › Database settings | covered | src.config.config.test.ts::C-406ddaa1 loadConfig keeps a postgresql sslmode URL unchanged and leaves a missing password null (passed, red_assertion); src.config.config.test.ts::C-406ddaa1 loadConfig parses app and owner database endpoints with secret passwords (passed, red_assertion); src.config.sec... | - | 0.94 |
| C-3d74e0ae | engine-config › Secrets only from files › Bad database settings | covered | src.config.config.test.ts::C-3d74e0ae a bad database URL is CONFIG_INVALID naming the URL variable without the password (passed, red_assertion); src.config.config.test.ts::C-3d74e0ae a bad owner database URL names the owner URL variable (passed, red_assertion); src.config.config.test.ts::C-3d74e0ae ... | - | 0.92 |
| C-6f8e2578 | engine-runtime › Injected clock and time-sortable ids › UUIDv7 layout | covered | src.core.clock.test.ts::C-6f8e2578 fixedClock rejects an invalid date (passed, red_assertion); src.core.clock.test.ts::C-6f8e2578 fixedClock returns distinct Date objects for one instant (passed, red_assertion); src.core.ids.test.ts::C-6f8e2578 createIds writes the timestamp version counter variant ... | - | 0.95 |
| C-6004f84c | engine-runtime › Injected clock and time-sortable ids › Ordering, rollover and a clock that goes backwards | covered | src.core.ids.test.ts::C-6004f84c ids stay ordered when the clock moves forward and back (passed, red_assertion); src.core.ids.test.ts::C-6004f84c the counter rolls into the timestamp after 4096 ids (passed, red_assertion) | - | 0.92 |
| C-68b36af5 | engine-runtime › Injected clock and time-sortable ids › Prefix, system and sequential sources | covered | src.core.ids.test.ts::C-68b36af5 createIds rejects prefixes outside the lower-case rule (passed, red_assertion); src.core.ids.test.ts::C-68b36af5 sequentialIds counts from its seed (passed, red_assertion); src.core.ids.test.ts::C-68b36af5 sequentialIds rejects a bad seed and overflow (passed, red_as... | - | 0.92 |
| C-d18af48d | engine-runtime › Redacting structured logger › Line shape and level filter | covered | src.observability.logger.test.ts::C-d18af48d a silent logger writes nothing while a warn logger on the same input does (passed, red_assertion); src.observability.logger.test.ts::C-d18af48d a warn logger writes one ISO-timed line and drops records below its level (passed, red_assertion) | - | 0.93 |
| C-cc8bd5a6 | engine-runtime › Redacting structured logger › Secrets are redacted at the listed paths | covered | src.observability.logger.test.ts::C-cc8bd5a6 authorization cookie and set-cookie are redacted alone and under headers (passed, red_assertion); src.observability.logger.test.ts::C-cc8bd5a6 the listed secret keys are redacted from depth zero to three (passed, red_assertion) | - | 0.87 |
| C-fc60a608 | engine-runtime › Redacting structured logger › Errors and requests are logged without their content | covered | src.observability.logger.test.ts::C-fc60a608 a request is logged as method and route pattern, never its URL (passed, red_assertion); src.observability.logger.test.ts::C-fc60a608 a request without a route pattern logs url unmatched (passed, red_assertion); src.observability.logger.test.ts::C-fc60a608... | - | 0.86 |
| C-3c17bb81 | engine-runtime › Tracer port › One span per request | covered | src.api.server.test.ts::C-3c17bb81 a recording tracer holds one ended http.request span per request (passed, red_assertion); src.observability.tracer.test.ts::C-3c17bb81 C-595eb185 noopTracer spans accept attributes and repeated end (passed, red_assertion); src.observability.tracer.test.ts::C-3c17bb... | - | 0.86 |
| C-595eb185 | engine-runtime › Tracer port › A failing tracer does not break requests | covered | src.api.server.test.ts::C-595eb185 a failing tracer logs a warning and the request still succeeds (passed, red_assertion); src.observability.tracer.test.ts::C-3c17bb81 C-595eb185 noopTracer spans accept attributes and repeated end (passed, red_assertion) | - | 0.92 |
| C-3284ea9e | engine-runtime › Uniform error envelope › ApiError | covered | src.api.errors.test.ts::C-3284ea9e ApiError refuses a status outside 400 to 599 or a malformed code (passed, red_assertion); src.api.errors.test.ts::C-3284ea9e toErrorResponse maps an ApiError with and without details (passed, red_assertion); src.api.server.test.ts::C-3284ea9e buildServer answers an... | - | 0.93 |
| C-240590ab | engine-runtime › Uniform error envelope › Schema failure | covered | src.api.errors.test.ts::C-240590ab toErrorResponse maps body schema failures to field details (passed, red_assertion); src.api.errors.test.ts::C-240590ab toErrorResponse reports query and path parameter fields (passed, red_assertion); src.api.server.test.ts::C-240590ab buildServer reports the first ... | - | 0.88 |
| C-d145c766 | engine-runtime › Uniform error envelope › Malformed, oversized and wrongly typed bodies | covered | src.api.errors.test.ts::C-d145c766 toErrorResponse keeps another 4xx status as BAD_REQUEST (passed, red_assertion); src.api.errors.test.ts::C-d145c766 toErrorResponse maps malformed JSON oversized and wrongly typed bodies (passed, red_assertion); src.api.server.test.ts::C-d145c766 buildServer keeps ... | - | 0.93 |
| C-aea19ec5 | engine-runtime › Uniform error envelope › Unknown error leaks nothing | covered | src.api.errors.test.ts::C-aea19ec5 toErrorResponse hides an unknown error behind INTERNAL (passed, red_assertion); src.api.server.test.ts::C-aea19ec5 unknown errors answer INTERNAL and never log hunter2 (passed, red_assertion) | - | 0.91 |
| C-71327adc | engine-runtime › Request ids › Well-formed header is kept | covered | src.api.server.test.ts::C-71327adc a well-formed x-request-id is kept and the route is logged without the query (passed, red_assertion) | - | 0.94 |
| C-2490a98e | engine-runtime › Request ids › Paths that carry a token are not logged | covered | src.api.server.test.ts::C-2490a98e a path that carries a token logs the wildcard route only (passed, red_assertion) | - | 0.91 |
| C-c68d2bde | engine-runtime › Request ids › Missing or malformed header is replaced | covered | src.api.server.test.ts::C-c68d2bde missing malformed and oversized request ids are replaced (passed, red_assertion) | - | 0.85 |
| C-64866f0f | engine-runtime › Request ids › Errors carry the id | covered | src.api.server.test.ts::C-64866f0f a 404 and a thrown error both carry the request id (passed, red_assertion) | - | 0.93 |
| C-14452135 | engine-runtime › Health endpoint and check registry › No checks registered | covered | src.api.health.test.ts::C-14452135 an empty registry reports ok with no checks (passed, red_assertion); src.api.health.test.ts::C-14452135 checks that resolve ok are reported by name (passed, red_assertion); src.api.server.test.ts::C-14452135 GET /health reports passing checks by name (passed, red_a... | - | 0.92 |
| C-ce3d89ea | engine-runtime › Health endpoint and check registry › The health request log holds the route only | covered | src.api.server.test.ts::C-ce3d89ea the health request log holds the route without the query token (passed, red_assertion) | - | 0.93 |
| C-609c36a3 | engine-runtime › Health endpoint and check registry › A check fails, throws, times out or returns junk | covered | src.api.health.test.ts::C-609c36a3 a check that never settles times out after 10 ms (passed, red_assertion); src.api.health.test.ts::C-609c36a3 a check that resolves fail marks the report failed (passed, red_assertion); src.api.health.test.ts::C-609c36a3 a check that resolves junk fails as an invali... | - | 0.96 |
| C-64e17386 | engine-runtime › Health endpoint and check registry › Registration rules and shared runs | covered | src.api.health.test.ts::C-64e17386 a check registered after a run appears in the next run (passed, red_assertion); src.api.health.test.ts::C-64e17386 duplicate and invalid names are refused (passed, red_assertion); src.api.health.test.ts::C-64e17386 overlapping runs call every check once (passed, re... | - | 0.92 |
| C-341a5ed6 | engine-runtime › Graceful shutdown with a bounded drain › Clean drain | covered | src.api.shutdown.test.ts::C-341a5ed6 a SIGTERM then SIGINT closes once and exits zero (passed, red_assertion) | - | 0.94 |
| C-3d0f68d6 | engine-runtime › Graceful shutdown with a bounded drain › Direct call, repeats and dispose | covered | src.api.shutdown.test.ts::C-3d0f68d6 a direct shutdown is idempotent and resolves undefined after exit zero (passed, red_assertion); src.api.shutdown.test.ts::C-3d0f68d6 dispose removes both signal listeners and never closes (passed, red_assertion) | - | 0.93 |
| C-78a31ae6 | engine-runtime › Graceful shutdown with a bounded drain › Drain deadline or failed close | covered | src.api.shutdown.test.ts::C-78a31ae6 a failed close logs shutdown failed without the error text (passed, red_assertion); src.api.shutdown.test.ts::C-78a31ae6 a missed drain deadline force closes and exits one (passed, red_assertion) | - | 0.92 |
| C-9abd6ccb | engine-runtime › Graceful shutdown with a bounded drain › Requests during the drain | covered | src.api.shutdown.test.ts::C-9abd6ccb requests during the drain still get the envelope and the slow request finishes (passed, red_assertion) | - | 0.95 |
| C-6912835f | engine-runtime › Composition root keeps the bootstrap contracts › startServer serves health and closes | covered | src.main.test.ts::C-6912835f startServer serves health on the bound loopback port and closes (passed, red_assertion) | - | 0.92 |
| C-c7407753 | engine-runtime › Composition root keeps the bootstrap contracts › main starts and stops | covered | src.main.test.ts::C-c7407753 main listens on the configured host and reports it (passed, red_assertion); src.main.test.ts::C-c7407753 main starts a port-0 server and stops on SIGTERM (passed, red_assertion) | - | 0.92 |
| C-469d7fec | engine-runtime › Composition root keeps the bootstrap contracts › Startup failures refuse start | covered | src.main.test.ts::C-469d7fec main reports EADDRINUSE for a busy port at info and silent (passed, red_assertion); src.main.test.ts::C-469d7fec main writes one fatal line for an empty secret file (passed, red_assertion); src.main.test.ts::C-469d7fec main writes one fatal line without the error text fo... | - | 0.94 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-engine-skeleton-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-engine-skeleton-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-engine-skeleton-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-engine-skeleton-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-engine-skeleton/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-engine-skeleton/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-engine-skeleton/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-engine-skeleton/.l4/ledger/r-20261026T0930Z-3e3f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-engine-skeleton/.l4/ledger/r-20261026T1111Z-3b02.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-engine-skeleton/.l4/ledger/r-20261026T1132Z-7654.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-engine-skeleton/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-engine-skeleton/verification.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/errors.test.ts` |  | relevant | new test file |
| `src/api/errors.ts` | api | relevant | named in the spec |
| `src/api/health.test.ts` |  | relevant | new test file |
| `src/api/health.ts` | api | relevant | named in the spec |
| `src/api/server.test.ts` |  | relevant | new test file |
| `src/api/server.ts` | api | relevant | named in the spec |
| `src/api/shutdown.test.ts` |  | relevant | new test file |
| `src/api/shutdown.ts` | api | relevant | named in the spec |
| `src/config/config.test.ts` |  | relevant | new test file |
| `src/config/config.ts` | config | relevant | named in the spec |
| `src/config/errors.ts` | config | relevant | named in the spec |
| `src/config/process.ts` | config | relevant | named in the spec |
| `src/config/secret.test.ts` |  | relevant | new test file |
| `src/config/secret.ts` | config | relevant | named in the spec |
| `src/core/clock.test.ts` |  | relevant | new test file |
| `src/core/clock.ts` | core | relevant | named in the spec |
| `src/core/ids.test.ts` |  | relevant | new test file |
| `src/core/ids.ts` | core | relevant | named in the spec |
| `src/health.ts` | health | relevant | named in the spec |
| `src/main.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `src/observability/index.ts` | observability | relevant | named in the spec |
| `src/observability/logger.test.ts` |  | relevant | new test file |
| `src/observability/logger.ts` | observability | relevant | named in the spec |
| `src/observability/tracer.test.ts` |  | relevant | new test file |
| `src/observability/tracer.ts` | observability | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/errors.ts, src/api/health.ts, src/api/server.ts, src/api/shutdown.ts, src/config/config.ts and 10 more

### Tests

98 of 98 passed, 0 failed, 0 errored, 0 skipped.
88 of 88 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-7b6bccec | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-95e9881e | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c0bf38f0 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f3f5587d | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7a4aa4d4 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ca797e1f | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-16430cae | ok | 0.960 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-406ddaa1 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3d74e0ae | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6f8e2578 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6004f84c | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-68b36af5 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d18af48d | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cc8bd5a6 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fc60a608 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3c17bb81 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-595eb185 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3284ea9e | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-240590ab | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d145c766 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-aea19ec5 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-71327adc | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2490a98e | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c68d2bde | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-64866f0f | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-14452135 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ce3d89ea | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-609c36a3 | ok | 0.960 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-64e17386 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-341a5ed6 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3d0f68d6 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-78a31ae6 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9abd6ccb | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6912835f | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c7407753 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-469d7fec | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-7b6bccec | engine-config › Typed configuration from the environment › Defaults | pass | pass | the judge passed it and a discriminating test passes |
| C-95e9881e | engine-config › Typed configuration from the environment › Values from the environment | pass | pass | the judge passed it and a discriminating test passes |
| C-c0bf38f0 | engine-config › Typed configuration from the environment › Bad values are refused without echoing them | pass | pass | the judge passed it and a discriminating test passes |
| C-f3f5587d | engine-config › Typed configuration from the environment › A secret placed in the environment is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-7a4aa4d4 | engine-config › Secrets only from files › Engine key loaded | pass | pass | the judge passed it and a discriminating test passes |
| C-ca797e1f | engine-config › Secrets only from files › Empty, missing or weak engine key refuses start | pass | pass | the judge passed it and a discriminating test passes |
| C-16430cae | engine-config › Secrets only from files › No secret byte leaves the config object | pass | pass | the judge passed it and a discriminating test passes |
| C-406ddaa1 | engine-config › Secrets only from files › Database settings | pass | pass | the judge passed it and a discriminating test passes |
| C-3d74e0ae | engine-config › Secrets only from files › Bad database settings | pass | pass | the judge passed it and a discriminating test passes |
| C-6f8e2578 | engine-runtime › Injected clock and time-sortable ids › UUIDv7 layout | pass | pass | the judge passed it and a discriminating test passes |
| C-6004f84c | engine-runtime › Injected clock and time-sortable ids › Ordering, rollover and a clock that goes backwards | pass | pass | the judge passed it and a discriminating test passes |
| C-68b36af5 | engine-runtime › Injected clock and time-sortable ids › Prefix, system and sequential sources | pass | pass | the judge passed it and a discriminating test passes |
| C-d18af48d | engine-runtime › Redacting structured logger › Line shape and level filter | pass | pass | the judge passed it and a discriminating test passes |
| C-cc8bd5a6 | engine-runtime › Redacting structured logger › Secrets are redacted at the listed paths | pass | pass | the judge passed it and a discriminating test passes |
| C-fc60a608 | engine-runtime › Redacting structured logger › Errors and requests are logged without their content | pass | pass | the judge passed it and a discriminating test passes |
| C-3c17bb81 | engine-runtime › Tracer port › One span per request | pass | pass | the judge passed it and a discriminating test passes |
| C-595eb185 | engine-runtime › Tracer port › A failing tracer does not break requests | pass | pass | the judge passed it and a discriminating test passes |
| C-3284ea9e | engine-runtime › Uniform error envelope › ApiError | pass | pass | the judge passed it and a discriminating test passes |
| C-240590ab | engine-runtime › Uniform error envelope › Schema failure | pass | pass | the judge passed it and a discriminating test passes |
| C-d145c766 | engine-runtime › Uniform error envelope › Malformed, oversized and wrongly typed bodies | pass | pass | the judge passed it and a discriminating test passes |
| C-aea19ec5 | engine-runtime › Uniform error envelope › Unknown error leaks nothing | pass | pass | the judge passed it and a discriminating test passes |
| C-71327adc | engine-runtime › Request ids › Well-formed header is kept | pass | pass | the judge passed it and a discriminating test passes |
| C-2490a98e | engine-runtime › Request ids › Paths that carry a token are not logged | pass | pass | the judge passed it and a discriminating test passes |
| C-c68d2bde | engine-runtime › Request ids › Missing or malformed header is replaced | pass | pass | the judge passed it and a discriminating test passes |
| C-64866f0f | engine-runtime › Request ids › Errors carry the id | pass | pass | the judge passed it and a discriminating test passes |
| C-14452135 | engine-runtime › Health endpoint and check registry › No checks registered | pass | pass | the judge passed it and a discriminating test passes |
| C-ce3d89ea | engine-runtime › Health endpoint and check registry › The health request log holds the route only | pass | pass | the judge passed it and a discriminating test passes |
| C-609c36a3 | engine-runtime › Health endpoint and check registry › A check fails, throws, times out or returns junk | pass | pass | the judge passed it and a discriminating test passes |
| C-64e17386 | engine-runtime › Health endpoint and check registry › Registration rules and shared runs | pass | pass | the judge passed it and a discriminating test passes |
| C-341a5ed6 | engine-runtime › Graceful shutdown with a bounded drain › Clean drain | pass | pass | the judge passed it and a discriminating test passes |
| C-3d0f68d6 | engine-runtime › Graceful shutdown with a bounded drain › Direct call, repeats and dispose | pass | pass | the judge passed it and a discriminating test passes |
| C-78a31ae6 | engine-runtime › Graceful shutdown with a bounded drain › Drain deadline or failed close | pass | pass | the judge passed it and a discriminating test passes |
| C-9abd6ccb | engine-runtime › Graceful shutdown with a bounded drain › Requests during the drain | pass | pass | the judge passed it and a discriminating test passes |
| C-6912835f | engine-runtime › Composition root keeps the bootstrap contracts › startServer serves health and closes | pass | pass | the judge passed it and a discriminating test passes |
| C-c7407753 | engine-runtime › Composition root keeps the bootstrap contracts › main starts and stops | pass | pass | the judge passed it and a discriminating test passes |
| C-469d7fec | engine-runtime › Composition root keeps the bootstrap contracts › Startup failures refuse start | pass | pass | the judge passed it and a discriminating test passes |

## Findings

None.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.errors.test.ts::C-240590ab toErrorResponse maps body schema failures to field details` (task 4.1): passed
- `src.api.errors.test.ts::C-240590ab toErrorResponse reports query and path parameter fields` (task 4.1): passed
- `src.api.errors.test.ts::C-3284ea9e ApiError refuses a status outside 400 to 599 or a malformed code` (task 4.1): passed
- `src.api.errors.test.ts::C-3284ea9e toErrorResponse maps an ApiError with and without details` (task 4.1): passed
- `src.api.errors.test.ts::C-aea19ec5 toErrorResponse hides an unknown error behind INTERNAL` (task 4.1): passed
- `src.api.errors.test.ts::C-d145c766 toErrorResponse keeps another 4xx status as BAD_REQUEST` (task 4.1): passed
- `src.api.errors.test.ts::C-d145c766 toErrorResponse maps malformed JSON oversized and wrongly typed bodies` (task 4.1): passed
- `src.api.health.test.ts::C-14452135 an empty registry reports ok with no checks` (task 4.2): passed
- `src.api.health.test.ts::C-14452135 checks that resolve ok are reported by name` (task 4.2): passed
- `src.api.health.test.ts::C-609c36a3 a check that never settles times out after 10 ms` (task 4.2): passed
- `src.api.health.test.ts::C-609c36a3 a check that resolves fail marks the report failed` (task 4.2): passed
- `src.api.health.test.ts::C-609c36a3 a check that resolves junk fails as an invalid result` (task 4.2): passed
- `src.api.health.test.ts::C-609c36a3 a check that throws fails without leaking its message` (task 4.2): passed
- `src.api.health.test.ts::C-64e17386 a check registered after a run appears in the next run` (task 4.2): passed
- `src.api.health.test.ts::C-64e17386 duplicate and invalid names are refused` (task 4.2): passed
- `src.api.health.test.ts::C-64e17386 overlapping runs call every check once` (task 4.2): passed
- `src.api.server.test.ts::C-14452135 GET /health reports passing checks by name` (task 4.4): passed
- `src.api.server.test.ts::C-14452135 GET /health with no checks reports ok and healthPayload is unchanged` (task 4.4): passed
- `src.api.server.test.ts::C-240590ab buildServer reports the first body query or path schema fault` (task 4.3): passed
- `src.api.server.test.ts::C-2490a98e a path that carries a token logs the wildcard route only` (task 4.3): passed
- `src.api.server.test.ts::C-3284ea9e buildServer answers an ApiError with its own status code and details` (task 4.3): passed
- `src.api.server.test.ts::C-3c17bb81 a recording tracer holds one ended http.request span per request` (task 4.4): passed
- `src.api.server.test.ts::C-595eb185 a failing tracer logs a warning and the request still succeeds` (task 4.4): passed
- `src.api.server.test.ts::C-609c36a3 GET /health reports a failing check without leaking its content` (task 4.4): passed
- `src.api.server.test.ts::C-609c36a3 GET /health reports a hanging check as a timeout` (task 4.4): passed
- `src.api.server.test.ts::C-609c36a3 GET /health reports a junk check result as invalid` (task 4.4): passed
- `src.api.server.test.ts::C-609c36a3 GET /health reports a throwing check without its message` (task 4.4): passed
- `src.api.server.test.ts::C-64866f0f a 404 and a thrown error both carry the request id` (task 4.3): passed
- `src.api.server.test.ts::C-71327adc a well-formed x-request-id is kept and the route is logged without the query` (task 4.3): passed
- `src.api.server.test.ts::C-aea19ec5 unknown errors answer INTERNAL and never log hunter2` (task 4.3): passed
- `src.api.server.test.ts::C-c68d2bde missing malformed and oversized request ids are replaced` (task 4.3): passed
- `src.api.server.test.ts::C-ce3d89ea the health request log holds the route without the query token` (task 4.4): passed
- `src.api.server.test.ts::C-d145c766 buildServer keeps the fixed codes for malformed oversized and wrongly typed bodies` (task 4.3): passed
- `src.api.server.test.ts::buildServer hands an injectable server to the routes a test adds` (task 4.3): passed
- `src.api.shutdown.test.ts::C-341a5ed6 a SIGTERM then SIGINT closes once and exits zero` (task 4.5): passed
- `src.api.shutdown.test.ts::C-3d0f68d6 a direct shutdown is idempotent and resolves undefined after exit zero` (task 4.5): passed
- `src.api.shutdown.test.ts::C-3d0f68d6 dispose removes both signal listeners and never closes` (task 4.5): passed
- `src.api.shutdown.test.ts::C-78a31ae6 a failed close logs shutdown failed without the error text` (task 4.5): passed
- `src.api.shutdown.test.ts::C-78a31ae6 a missed drain deadline force closes and exits one` (task 4.5): passed
- `src.api.shutdown.test.ts::C-9abd6ccb requests during the drain still get the envelope and the slow request finishes` (task 4.5): passed
- `src.config.config.test.ts::C-16430cae a loaded config hides the engine key and database password from JSON String and inspect` (task 3.3): passed
- `src.config.config.test.ts::C-3d74e0ae a bad database URL is CONFIG_INVALID naming the URL variable without the password` (task 3.3): passed
- `src.config.config.test.ts::C-3d74e0ae a bad owner database URL names the owner URL variable` (task 3.3): passed
- `src.config.config.test.ts::C-3d74e0ae a database password file without its URL names the password-file variable` (task 3.3): passed
- `src.config.config.test.ts::C-3d74e0ae an empty database password file with a valid URL gives CONFIG_SECRET_EMPTY` (task 3.3): passed
- `src.config.config.test.ts::C-406ddaa1 loadConfig keeps a postgresql sslmode URL unchanged and leaves a missing password null` (task 3.3): passed
- `src.config.config.test.ts::C-406ddaa1 loadConfig parses app and owner database endpoints with secret passwords` (task 3.3): passed
- `src.config.config.test.ts::C-7a4aa4d4 loadConfig reads the engine key from its file and strips the trailing newline` (task 3.3): passed
- `src.config.config.test.ts::C-7b6bccec loadConfig returns every documented default for an empty environment` (task 3.2): passed
- `src.config.config.test.ts::C-95e9881e loadConfig derives publicBaseUrl from the port and ignores empty or unknown variables` (task 3.2): passed
