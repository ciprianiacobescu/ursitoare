# Verification: openspec:add-api-pep: PASS (round 1)

traceability: 33/33 criteria covered by a discriminating test

- Base: `e0bc27bd4b45eee4a4593aaba02382153c78bdbe`
- Head: `a3cda54e2362a4baa0f16c094236f22909077661`
- Implementer profiles: deepseek-free, glm, claude-sonnet
- Judge: mimo-go-judge, 2 call(s), judged in 2 parts, prompt sha256 `7f5c778fe5afb9b56b4b04f0437a675002260da70862e3d16e9fdd7d805cbd1f`
  - part 1: 21 file(s), 104784 characters, profile mimo-go-judge, reply valid
  - part 2: 16 file(s), 102251 characters, profile mimo-go-judge, reply valid
- Judge replies of mimo-go-judge (this unit, all rounds): valid 2, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): mimo-go-judge xiaomi (declared), deepseek-free deepseek (declared), glm zhipu (declared), claude-sonnet anthropic (tool)
- Cost: $0.0348

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base main@e0bc27bd4b contained |
| 1 | integrity | ok | 61.1 | 10 sub-checks; scope: 41 changed file(s) |
| 2 | build | ok | 21.9 |  |
| 3 | tests | ok | 73.3 |  |
| 4 | traceability | ok | 0.1 | 33/33 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/coverage.ts, src/api/csrf.ts, src/api/decision.ts, src/api/index.ts, src/api/internal.ts and 17 more |
| 8 | s1 judge | ok | 2.5 | 33/33 criteria judged by jev |
| 9 | judge | ok | 770.2 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261029T0947Z-5526/120-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261029T0947Z-5526/121-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261029T0947Z-5526/122-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261029T0947Z-5526/123-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261029T0947Z-5526/124-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261029T0947Z-5526/125-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261029T0947Z-5526/126-e2e.log |

## Files by part

- part 1: test/support/api-session.ts (1747 characters)
- part 1: src/config/config.ts (1400 characters)
- part 1: src/api/coverage.test.ts (3037 characters)
- part 1: src/api/coverage.ts (1095 characters)
- part 1: src/api/csrf.test.ts (11635 characters)
- part 1: src/api/csrf.ts (1557 characters)
- part 1: src/api/decision.test.ts (19026 characters)
- part 1: src/api/decision.ts (2957 characters)
- part 1: src/api/index.ts (1035 characters)
- part 1: src/config/index.ts (510 characters)
- part 1: src/tenancy/index.ts (499 characters)
- part 1: src/api/internal.test.ts (5621 characters)
- part 1: src/api/internal.ts (1015 characters)
- part 1: src/config/internal.test.ts (2451 characters)
- part 1: src/config/internal.ts (1356 characters)
- part 1: src/api/list-filter.test.ts (16750 characters)
- part 1: src/api/list-filter.ts (3529 characters)
- part 1: src/main.api.test.ts (9703 characters)
- part 1: src/main.ts (5009 characters)
- part 1: src/api/me.test.ts (11230 characters)
- part 1: src/api/me.ts (3622 characters)
- part 2: src/api/pep.test.ts (14119 characters)
- part 2: src/api/pep.ts (2931 characters)
- part 2: src/tenancy/profile.test.ts (1636 characters)
- part 2: src/tenancy/profile.ts (1077 characters)
- part 2: src/api/public-group.test.ts (3929 characters)
- part 2: src/api/public-group.ts (2386 characters)
- part 2: src/api/refusal.ts (767 characters)
- part 2: src/api/resource.test.ts (10433 characters)
- part 2: src/api/route.test.ts (8721 characters)
- part 2: src/api/route.ts (13741 characters)
- part 2: src/api/server.ts (3383 characters)
- part 2: src/api/session-auth.ts (788 characters)
- part 2: openspec/changes/add-api-pep/tasks.md (31413 characters)
- part 2: src/api/types.ts (928 characters)
- part 2: src/api/web.classify.test.ts (2859 characters)
- part 2: src/api/web.ts (3140 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 12 task(s): red and green compared |
| test path freeze | ok | 12 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/coverage.test.ts, src/api/coverage.ts, src/api/csrf.test.ts, src/api/csrf.ts, src/api/decision.test.ts (+31 more) |
| tdd history | ok | 12 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 755 of 755 base tests pass on the unit's code with its 14 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-5a782e1a | api-authz › A route declares a wired authentication kind and a known policy action › A public route registers | covered | src.api.route.test.ts::C-5a782e1a a public route registers and answers (passed, red_assertion) | - | 0.95 |
| C-d738ea05 | api-authz › A route declares a wired authentication kind and a known policy action › Unwired kinds refuse | covered | src.api.route.test.ts::C-d738ea05 unwired kinds refuse and verifier registrations are unique (passed, red_assertion) | - | 0.93 |
| C-b74fec9d | api-authz › A route declares a wired authentication kind and a known policy action › A non-public route needs a known action | covered | src.api.route.test.ts::C-b74fec9d a non-public route needs a known action (passed, red_assertion) | - | 0.75 |
| C-1788d011 | api-authz › A route declares a wired authentication kind and a known policy action › Bad definitions | covered | src.api.route.test.ts::C-1788d011 bad definitions are refused with their reason (passed, red_assertion) | - | 0.92 |
| C-3f4fc0c0 | api-authz › A route declares a wired authentication kind and a known policy action › Duplicates and listeners | covered | src.api.route.test.ts::C-3f4fc0c0 duplicates and listeners are refused (passed, red_assertion) | - | 0.93 |
| C-97e53f5d | api-authz › A session request is authenticated before anything else runs › No live session | covered | src.api.pep.test.ts::C-97e53f5d a session request without a live session is refused before the body is parsed (passed, red_assertion) | - | 0.79 |
| C-0a031758 | api-authz › A session request is authenticated before anything else runs › A live session sets the principal | covered | src.api.pep.test.ts::C-0a031758 a live session sets the principal from the session alone (passed, red_assertion) | - | 0.85 |
| C-500709e4 | api-authz › A session request is authenticated before anything else runs › Authentication cannot run | covered | src.api.pep.test.ts::C-500709e4 authentication failures answer AUTHZ_UNAVAILABLE and run no handler (passed, red_assertion) | - | 0.92 |
| C-2ae6619c | api-authz › A session request is authenticated before anything else runs › One PEP per server | covered | src.api.pep.test.ts::C-2ae6619c a server carries one PEP and refuses an invalid public base url (passed, red_assertion) | - | 0.82 |
| C-da8f0a06 | api-authz › State-changing session requests need the CSRF token and a matching origin › Refused | covered | src.api.csrf.test.ts::C-3422c6ae C-da8f0a06 a current token and a matching origin pass while a missing token is refused (passed, red_assertion); src.api.csrf.test.ts::C-da8f0a06 a session POST without the current CSRF token or with a foreign origin is refused (passed, red_assertion) | - | 0.82 |
| C-3422c6ae | api-authz › State-changing session requests need the CSRF token and a matching origin › Accepted and exempt | covered | src.api.csrf.test.ts::C-3422c6ae C-da8f0a06 a current token and a matching origin pass while a missing token is refused (passed, red_assertion) | - | 0.29 |
| C-7d0a8576 | api-authz › Every authorized request is decided, recorded and, when denied, a 403 with its decision id › Allow | covered | src.api.decision.test.ts::C-7d0a8576 an allowed request is decided with the default tenant resource and recorded (passed, red_assertion) | - | 0.92 |
| C-af47ea36 | api-authz › Every authorized request is decided, recorded and, when denied, a 403 with its decision id › Deny | covered | src.api.decision.test.ts::C-af47ea36 a denied request is recorded, audited and answers 403 with its decision id (passed, red_assertion) | - | 0.92 |
| C-b1687a15 | api-authz › Every authorized request is decided, recorded and, when denied, a 403 with its decision id › A failing audit changes nothing | covered | src.api.decision.test.ts::C-b1687a15 a failing refusal audit still answers 403 and keeps the recorded decision (passed, red_assertion) | - | 0.90 |
| C-1cd8fac0 | api-authz › The PEP fails closed › A policy error denies | covered | src.api.decision.test.ts::C-1cd8fac0 an allow or deny carrying policy evaluation errors is a 403 and the errors are recorded (passed, red_assertion) | - | 0.92 |
| C-a4f43d9a | api-authz › The PEP fails closed › Unable to decide or record | covered | src.api.decision.test.ts::C-a4f43d9a a rejected check or an unrecordable decision answers 503 with no row and no audit (passed, red_assertion) | - | 0.92 |
| C-7eb422a8 | api-authz › A resource is loaded under its tenant and checked › A loaded resource is checked | covered | src.api.resource.test.ts::C-7eb422a8 a loaded resource is checked under its tenant and the loaded ref is decided (passed, red_assertion) | - | 0.90 |
| C-d88f7662 | api-authz › A resource is loaded under its tenant and checked › Absent, foreign, failing | covered | src.api.resource.test.ts::C-d88f7662 an absent foreign or failing resource is refused before a decision is made (passed, red_assertion) | - | 0.89 |
| C-8690a372 | api-authz › A list route never returns items the principal cannot read › Item filter | covered | src.api.list-filter.test.ts::C-8690a372 an item filter keeps only the readable items and refuses a bare array payload (passed, red_assertion) | - | 0.92 |
| C-f2f45e63 | api-authz › A list route never returns items the principal cannot read › Sql filter | covered | src.api.list-filter.test.ts::C-f2f45e63 a sql filter marks the request and refuses a handler that skips its predicate (passed, red_assertion) | - | 0.85 |
| C-ff0152a4 | api-authz › A list route never returns items the principal cannot read › Error replies pass unchanged | covered | src.api.list-filter.test.ts::C-ff0152a4 error replies pass a list route unchanged (passed, pre_satisfied) | - | 0.89 |
| C-da500cdd | api-authz › A list route never returns items the principal cannot read › Other 2xx payloads refuse | covered | src.api.list-filter.test.ts::C-da500cdd a list route refuses a 2xx string or Buffer payload (passed, red_assertion) | - | 0.88 |
| C-50e3532e | api-authz › The internal listener serves only service-token routes and opens only with routes › The port setting | covered | src.config.internal.test.ts::C-50e3532e loadConfig exposes the internal port (passed, red_assertion); src.config.internal.test.ts::C-50e3532e parseInternalPort defaults to 8090 and reads the environment (passed, red_assertion); src.config.internal.test.ts::C-50e3532e parseInternalPort refuses out-of... | - | 0.92 |
| C-da82873d | api-authz › The internal listener serves only service-token routes and opens only with routes › The internal server | covered | src.api.internal.test.ts::C-da82873d the internal listener serves only service-token routes and no health (passed, red_assertion) | - | 0.84 |
| C-45aacd7c | api-authz › The internal listener serves only service-token routes and opens only with routes › Opened only with routes | covered | src.main.api.test.ts::C-45aacd7c main opens the internal listener only with routes and closes both ports (passed, red_assertion) | - | 0.91 |
| C-c31ceb04 | api-authz › The existing routes are classified public › Health and static | covered | src.api.coverage.test.ts::C-c31ceb04 health is a public defined route on the public listener only (passed, red_assertion); src.api.web.classify.test.ts::C-c31ceb04 health and static are classified public routes (passed, red_assertion) | - | 0.76 |
| C-b78b341e | api-authz › The existing routes are classified public › OIDC routes through a group | covered | src.api.public-group.test.ts::C-b78b341e oidc routes are classified through a public group (passed, red_assertion) | - | 0.87 |
| C-9b9e9b40 | api-authz › Every route of every listener comes from defineRoute › A raw route is reported | covered | src.api.coverage.test.ts::C-9b9e9b40 raw and plugin routes are reported while defined routes are not (passed, red_assertion) | - | 0.93 |
| C-1191d5a9 | api-authz › Every route of every listener comes from defineRoute › The real engine | covered | src.main.api.test.ts::C-1191d5a9 main wires both listeners so every route comes from defineRoute (passed, red_assertion) | - | 0.59 |
| C-0f1f124b | api-authz › GET /api/v1/me reports the user, tenant, capabilities and a CSRF token › The answer | covered | src.api.me.test.ts::C-0f1f124b GET /api/v1/me reports the user, tenant, capabilities and a fresh CSRF token (passed, red_assertion) | - | 0.91 |
| C-07420469 | api-authz › GET /api/v1/me reports the user, tenant, capabilities and a CSRF token › Tenants stay apart | covered | src.api.me.test.ts::C-07420469 GET /api/v1/me stays inside the session tenant and ignores tenant selectors (passed, red_assertion) | - | 0.89 |
| C-c3bb1913 | api-authz › GET /api/v1/me reports the user, tenant, capabilities and a CSRF token › Refusals and capabilities | covered | src.api.me.test.ts::C-c3bb1913 GET /api/v1/me refuses missing and disabled sessions, has no HEAD and reports stub capabilities (passed, red_assertion) | - | 0.76 |
| C-2be08620 | api-authz › A tenant profile is read under row-level security › Own and foreign tenant | covered | src.tenancy.profile.test.ts::C-2be08620 getTenantProfile reads its own tenant profile and null for another (passed, red_assertion) | - | 0.92 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-api-pep/.l4/ledger/r-20261029T0711Z-dbf6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-api-pep/.l4/ledger/r-20261029T0735Z-b17c.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-api-pep/.l4/ledger/r-20261029T0947Z-5526.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-api-pep/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-api-pep/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/coverage.test.ts` |  | relevant | new test file |
| `src/api/coverage.ts` | api | relevant | named in the spec |
| `src/api/csrf.test.ts` |  | relevant | new test file |
| `src/api/csrf.ts` | api | relevant | named in the spec |
| `src/api/decision.test.ts` |  | relevant | new test file |
| `src/api/decision.ts` | api | relevant | named in the spec |
| `src/api/index.ts` | api | relevant | named in the spec |
| `src/api/internal.test.ts` |  | relevant | new test file |
| `src/api/internal.ts` | api | relevant | named in the spec |
| `src/api/list-filter.test.ts` |  | relevant | new test file |
| `src/api/list-filter.ts` | api | relevant | named in the spec |
| `src/api/me.test.ts` |  | relevant | new test file |
| `src/api/me.ts` | api | relevant | named in the spec |
| `src/api/pep.test.ts` |  | relevant | new test file |
| `src/api/pep.ts` | api | relevant | named in the spec |
| `src/api/public-group.test.ts` |  | relevant | new test file |
| `src/api/public-group.ts` | api | relevant | named in the spec |
| `src/api/refusal.ts` | api | relevant | named in the spec |
| `src/api/resource.test.ts` |  | relevant | new test file |
| `src/api/route.test.ts` |  | relevant | new test file |
| `src/api/route.ts` | api | relevant | named in the spec |
| `src/api/server.ts` | api | relevant | named in the spec |
| `src/api/session-auth.ts` | api | relevant | named in the spec |
| `src/api/types.ts` | api | relevant | named in the spec |
| `src/api/web.classify.test.ts` |  | relevant | new test file |
| `src/api/web.ts` | api | relevant | named in the spec |
| `src/config/config.ts` | config | relevant | named in the spec |
| `src/config/index.ts` | config | relevant | named in the spec |
| `src/config/internal.test.ts` |  | relevant | new test file |
| `src/config/internal.ts` | config | relevant | named in the spec |
| `src/main.api.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `src/tenancy/index.ts` | tenancy | relevant | named in the spec |
| `src/tenancy/profile.test.ts` |  | relevant | new test file |
| `src/tenancy/profile.ts` | tenancy | relevant | named in the spec |
| `test/support/api-session.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/coverage.ts, src/api/csrf.ts, src/api/decision.ts, src/api/index.ts, src/api/internal.ts and 17 more

### Tests

818 of 818 passed, 0 failed, 0 errored, 0 skipped.
37 of 37 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-5a782e1a | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d738ea05 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b74fec9d | ok | 0.750 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1788d011 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3f4fc0c0 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-97e53f5d | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0a031758 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-500709e4 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2ae6619c | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-da8f0a06 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3422c6ae | ok | 0.290 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7d0a8576 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-af47ea36 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b1687a15 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1cd8fac0 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a4f43d9a | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7eb422a8 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d88f7662 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8690a372 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f2f45e63 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ff0152a4 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-da500cdd | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-50e3532e | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-da82873d | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-45aacd7c | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c31ceb04 | ok | 0.760 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b78b341e | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9b9e9b40 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1191d5a9 | ok | 0.590 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0f1f124b | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-07420469 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c3bb1913 | ok | 0.760 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2be08620 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-5a782e1a | api-authz › A route declares a wired authentication kind and a known policy action › A public route registers | pass | pass | the judge passed it and a discriminating test passes |
| C-d738ea05 | api-authz › A route declares a wired authentication kind and a known policy action › Unwired kinds refuse | pass | pass | the judge passed it and a discriminating test passes |
| C-b74fec9d | api-authz › A route declares a wired authentication kind and a known policy action › A non-public route needs a known action | pass | pass | the judge passed it and a discriminating test passes |
| C-1788d011 | api-authz › A route declares a wired authentication kind and a known policy action › Bad definitions | pass | pass | the judge passed it and a discriminating test passes |
| C-3f4fc0c0 | api-authz › A route declares a wired authentication kind and a known policy action › Duplicates and listeners | pass | pass | the judge passed it and a discriminating test passes |
| C-97e53f5d | api-authz › A session request is authenticated before anything else runs › No live session | pass | pass | the judge passed it and a discriminating test passes |
| C-0a031758 | api-authz › A session request is authenticated before anything else runs › A live session sets the principal | pass | pass | the judge passed it and a discriminating test passes |
| C-500709e4 | api-authz › A session request is authenticated before anything else runs › Authentication cannot run | pass | pass | the judge passed it and a discriminating test passes |
| C-2ae6619c | api-authz › A session request is authenticated before anything else runs › One PEP per server | pass | pass | the judge passed it and a discriminating test passes |
| C-da8f0a06 | api-authz › State-changing session requests need the CSRF token and a matching origin › Refused | pass | pass | the judge passed it and a discriminating test passes |
| C-3422c6ae | api-authz › State-changing session requests need the CSRF token and a matching origin › Accepted and exempt | pass | pass | the judge passed it and a discriminating test passes |
| C-7d0a8576 | api-authz › Every authorized request is decided, recorded and, when denied, a 403 with its decision id › Allow | pass | pass | the judge passed it and a discriminating test passes |
| C-af47ea36 | api-authz › Every authorized request is decided, recorded and, when denied, a 403 with its decision id › Deny | pass | pass | the judge passed it and a discriminating test passes |
| C-b1687a15 | api-authz › Every authorized request is decided, recorded and, when denied, a 403 with its decision id › A failing audit changes nothing | pass | pass | the judge passed it and a discriminating test passes |
| C-1cd8fac0 | api-authz › The PEP fails closed › A policy error denies | pass | pass | the judge passed it and a discriminating test passes |
| C-a4f43d9a | api-authz › The PEP fails closed › Unable to decide or record | pass | pass | the judge passed it and a discriminating test passes |
| C-7eb422a8 | api-authz › A resource is loaded under its tenant and checked › A loaded resource is checked | pass | pass | the judge passed it and a discriminating test passes |
| C-d88f7662 | api-authz › A resource is loaded under its tenant and checked › Absent, foreign, failing | pass | pass | the judge passed it and a discriminating test passes |
| C-8690a372 | api-authz › A list route never returns items the principal cannot read › Item filter | pass | pass | the judge passed it and a discriminating test passes |
| C-f2f45e63 | api-authz › A list route never returns items the principal cannot read › Sql filter | pass | pass | the judge passed it and a discriminating test passes |
| C-ff0152a4 | api-authz › A list route never returns items the principal cannot read › Error replies pass unchanged | pass | pass | the judge passed it and a discriminating test passes |
| C-da500cdd | api-authz › A list route never returns items the principal cannot read › Other 2xx payloads refuse | pass | pass | the judge passed it and a discriminating test passes |
| C-50e3532e | api-authz › The internal listener serves only service-token routes and opens only with routes › The port setting | pass | pass | the judge passed it and a discriminating test passes |
| C-da82873d | api-authz › The internal listener serves only service-token routes and opens only with routes › The internal server | pass | pass | the judge passed it and a discriminating test passes |
| C-45aacd7c | api-authz › The internal listener serves only service-token routes and opens only with routes › Opened only with routes | pass | pass | the judge passed it and a discriminating test passes |
| C-c31ceb04 | api-authz › The existing routes are classified public › Health and static | pass | pass | the judge passed it and a discriminating test passes |
| C-b78b341e | api-authz › The existing routes are classified public › OIDC routes through a group | pass | pass | the judge passed it and a discriminating test passes |
| C-9b9e9b40 | api-authz › Every route of every listener comes from defineRoute › A raw route is reported | pass | pass | the judge passed it and a discriminating test passes |
| C-1191d5a9 | api-authz › Every route of every listener comes from defineRoute › The real engine | pass | pass | the judge passed it and a discriminating test passes |
| C-0f1f124b | api-authz › GET /api/v1/me reports the user, tenant, capabilities and a CSRF token › The answer | pass | pass | the judge passed it and a discriminating test passes |
| C-07420469 | api-authz › GET /api/v1/me reports the user, tenant, capabilities and a CSRF token › Tenants stay apart | pass | pass | the judge passed it and a discriminating test passes |
| C-c3bb1913 | api-authz › GET /api/v1/me reports the user, tenant, capabilities and a CSRF token › Refusals and capabilities | pass | pass | the judge passed it and a discriminating test passes |
| C-2be08620 | api-authz › A tenant profile is read under row-level security › Own and foreign tenant | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] A repeated X-CSRF-Token header is refused as a token failure (spec gap) (criterion C-da8f0a06): src/api/csrf.ts singleTokenHeader counts X-CSRF-Token occurrences in rawHeaders and treats anything other than exactly one occurrence as an absent token, so a request whose single logical token is correct is refused when the header is duplicated. No criterion scenario pins a repeated header; two reasonable implementations (first value wins, as parseCookies does for the session cookie, versus refuse) differ here.
- [minor, judge] task 1.1: defineRoute throws ROUTE_AUTH_UNWIRED before the action checks, the reverse of the task's stated order (criterion C-b74fec9d): Task 1.1 says the first-failure order is (3) ROUTE_ACTION_MISSING then ROUTE_ACTION_UNKNOWN, then (4) ROUTE_AUTH_UNWIRED. In the committed src/api/route.ts the non-public block that throws ROUTE_AUTH_UNWIRED runs before the action checks, so a definition that fails both (an unwired non-session kind with no action) reports ROUTE_AUTH_UNWIRED where the task text says ROUTE_ACTION_MISSING. The scenario of C-d738ea05 (an hmac route with no action) matches the code, so no criterion is affected, but the task detail line is not done as written.
- [minor, judge] task 3.1: the 503 raised for a missing PEP or a null pool/engine emits no warn line (criterion C-500709e4): Task 3.1 (and design.md) require that each 401 or 503 logs request.log.warn({ code, reason? }, "request refused"). In the authentication hook the early throw for no ursitoarePep, null pool or null engine leaves the function before any log call, so the AUTHZ_UNAVAILABLE answer of C-500709e4's first two situations is silent. Every other 401/503 path in the hook does log.
- [minor, judge] task 4.1: the CSRF refusal is implemented in src/api/route.ts, not in an onRequest hook of src/api/pep.ts as the task te... (criterion C-da8f0a06): Task 4.1 places the post-authentication CSRF check, the authz.csrf_refused audit and the CSRF_INVALID throw "in the onRequest hook of src/api/pep.ts". The committed src/api/pep.ts contains only installPep and decisionPreHandler; the logic lives in authenticationHook in src/api/route.ts (attached by defineRoute, as task 3.1 describes). Behaviour matches the specification scenarios, only the task's file detail is unfulfilled, and the two task texts disagree about where the hook lives.
- [minor, judge] defineRoute after the instance has started records the route without registering it (spec gap) (criterion C-5a782e1a): defineRoute wraps server.route in try/catch and swallows FST_ERR_INSTANCE_ALREADY_LISTENING, then pushes the definition into state.defined regardless. A definition added after listen therefore appears in listDefinedRoutes (and is treated as covered) while no route exists and requests answer 404. No scenario pins this input down and reasonable implementations differ (throw vs. record).
- [minor, judge] installPep rejects a public base URL that parses but carries credentials, a query or a fragment (spec gap) (criterion C-2ae6619c): parsePublicBaseUrl accepts only an http(s) origin with no username, password, search or hash; anything else is ROUTE_DEF_INVALID with reason public_base_url. The scenario only pins "not a url", so a base URL such as "https://app.example.com/?x=1" could reasonably have been accepted and reduced to its origin instead of being refused, and no criterion states which.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.coverage.test.ts::C-9b9e9b40 raw and plugin routes are reported while defined routes are not` (task 2.1): passed
- `src.api.coverage.test.ts::C-c31ceb04 health is a public defined route on the public listener only` (task 2.1): passed
- `src.api.csrf.test.ts::C-3422c6ae C-da8f0a06 a current token and a matching origin pass while a missing token is refused` (task 4.1): passed
- `src.api.csrf.test.ts::C-da8f0a06 a session POST without the current CSRF token or with a foreign origin is refused` (task 4.1): passed
- `src.api.decision.test.ts::C-1cd8fac0 an allow or deny carrying policy evaluation errors is a 403 and the errors are recorded` (task 5.1): passed
- `src.api.decision.test.ts::C-7d0a8576 an allowed request is decided with the default tenant resource and recorded` (task 5.1): passed
- `src.api.decision.test.ts::C-a4f43d9a a rejected check or an unrecordable decision answers 503 with no row and no audit` (task 5.1): passed
- `src.api.decision.test.ts::C-af47ea36 a denied request is recorded, audited and answers 403 with its decision id` (task 5.1): passed
- `src.api.decision.test.ts::C-b1687a15 a failing refusal audit still answers 403 and keeps the recorded decision` (task 5.1): passed
- `src.api.internal.test.ts::C-da82873d the internal listener serves only service-token routes and no health` (task 8.1): passed
- `src.api.list-filter.test.ts::C-8690a372 an item filter keeps only the readable items and refuses a bare array payload` (task 6.2): passed
- `src.api.list-filter.test.ts::C-da500cdd a list route refuses a 2xx string or Buffer payload` (task 6.2): passed
- `src.api.list-filter.test.ts::C-f2f45e63 a sql filter marks the request and refuses a handler that skips its predicate` (task 6.2): passed
- `src.api.list-filter.test.ts::C-ff0152a4 error replies pass a list route unchanged` (task 6.2): passed
- `src.api.me.test.ts::C-07420469 GET /api/v1/me stays inside the session tenant and ignores tenant selectors` (task 10.1): passed
- `src.api.me.test.ts::C-0f1f124b GET /api/v1/me reports the user, tenant, capabilities and a fresh CSRF token` (task 10.1): passed
- `src.api.me.test.ts::C-c3bb1913 GET /api/v1/me refuses missing and disabled sessions, has no HEAD and reports stub capabilities` (task 10.1): passed
- `src.api.pep.test.ts::C-0a031758 a live session sets the principal from the session alone` (task 3.1): passed
- `src.api.pep.test.ts::C-2ae6619c a server carries one PEP and refuses an invalid public base url` (task 3.1): passed
- `src.api.pep.test.ts::C-500709e4 authentication failures answer AUTHZ_UNAVAILABLE and run no handler` (task 3.1): passed
- `src.api.pep.test.ts::C-97e53f5d a session request without a live session is refused before the body is parsed` (task 3.1): passed
- `src.api.public-group.test.ts::C-b78b341e oidc routes are classified through a public group` (task 7.1): passed
- `src.api.resource.test.ts::C-7eb422a8 a loaded resource is checked under its tenant and the loaded ref is decided` (task 6.1): passed
- `src.api.resource.test.ts::C-d88f7662 an absent foreign or failing resource is refused before a decision is made` (task 6.1): passed
- `src.api.route.test.ts::C-1788d011 bad definitions are refused with their reason` (task 1.1): passed
- `src.api.route.test.ts::C-3f4fc0c0 duplicates and listeners are refused` (task 1.1): passed
- `src.api.route.test.ts::C-5a782e1a a public route registers and answers` (task 1.1): passed
- `src.api.route.test.ts::C-b74fec9d a non-public route needs a known action` (task 1.1): passed
- `src.api.route.test.ts::C-d738ea05 unwired kinds refuse and verifier registrations are unique` (task 1.1): passed
- `src.api.web.classify.test.ts::C-c31ceb04 health and static are classified public routes` (task 7.1): passed
- `src.config.internal.test.ts::C-50e3532e loadConfig exposes the internal port` (task 8.1): passed
- `src.config.internal.test.ts::C-50e3532e parseInternalPort defaults to 8090 and reads the environment` (task 8.1): passed
- `src.config.internal.test.ts::C-50e3532e parseInternalPort refuses out-of-range or non-numeric values` (task 8.1): passed
- `src.config.internal.test.ts::C-50e3532e parseInternalPort refuses the public port` (task 8.1): passed
- `src.main.api.test.ts::C-1191d5a9 main wires both listeners so every route comes from defineRoute` (task 11.1): passed
- `src.main.api.test.ts::C-45aacd7c main opens the internal listener only with routes and closes both ports` (task 11.1): passed
- `src.tenancy.profile.test.ts::C-2be08620 getTenantProfile reads its own tenant profile and null for another` (task 9.1): passed

## Guard events

- guard.violation: src/api/csrf.ts
- guard.violation: src/api/refusal.ts
