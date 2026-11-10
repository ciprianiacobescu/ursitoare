# Verification: openspec:add-credentials: PASS (round 2)

traceability: 19/19 criteria covered by a discriminating test

- Base: `80eebba0d90e825aceaa6617d09bdf8a2eb4fc63`
- Head: `f279e2f20a458262db7ee5b045ec44ee29da376c`
- Implementer profiles: claude-sonnet, deepseek-free
- Judge: nemotron-judge, 6 call(s), judged in 3 parts, prompt sha256 `2a6f79232ab2154fa4c05668ae3d809fdb753574c2fc297aa5772773a6e7eb97`
  - part 1: 19 file(s), 114795 characters, profile nemotron-judge, reply repaired
  - part 2: 15 file(s), 116232 characters, profile nemotron-judge, reply valid
  - part 3: 3 file(s), 12613 characters, profile nemotron-judge, reply retried
- Judge replies of nemotron-judge (this unit, all rounds): valid 2, repaired 1, retried 1, discarded 0; this round: retried
- independence: declared (unverified): nemotron-judge nvidia (declared), claude-sonnet anthropic (tool), deepseek-free deepseek (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | reused | 0.0 | reused (round 1) |
| 1 | integrity | reused | 0.0 | reused (round 1) |
| 2 | build | reused | 0.0 | reused (round 1) |
| 3 | tests | reused | 0.0 | reused (round 1) |
| 4 | traceability | reused | 0.0 | reused (round 1) |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | reused | 0.0 | reused (round 1) |
| 8 | s1 judge | reused | 0.0 | reused (round 1) |
| 9 | judge | reused | 0.0 | reused (round 1) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261110T0359Z-e72e/054-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261110T0359Z-e72e/055-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261110T0359Z-e72e/056-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261110T0359Z-e72e/057-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261110T0359Z-e72e/058-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261110T0359Z-e72e/059-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261110T0359Z-e72e/060-e2e.log |

## Files by part

- part 1: src/db/migrations/0480_credentials.sql (2162 characters)
- part 1: test/support/e2e-stack/parts/52-tool-servers.ts (305 characters)
- part 1: src/api/credential-codes.test.ts (764 characters)
- part 1: src/api/credential-deps.test.ts (13846 characters)
- part 1: src/api/credential-routes.test.ts (26472 characters)
- part 1: src/api/credential-routes.ts (10534 characters)
- part 1: src/api/credential-secrets.test.ts (15037 characters)
- part 1: src/credentials/policy/credentials.cedar (346 characters)
- part 1: src/credentials/echo.test.ts (5522 characters)
- part 1: src/credentials/egress-site.test.ts (1156 characters)
- part 1: test/arch/egress-sites.test.ts (603 characters)
- part 1: src/api/error-codes.test.ts (715 characters)
- part 1: src/api/error-codes.ts (674 characters)
- part 1: src/api/index.ts (688 characters)
- part 1: src/credentials/index.ts (784 characters)
- part 1: src/gateway/index.ts (572 characters)
- part 1: src/main.credentials.test.ts (15984 characters)
- part 1: src/main.ts (1627 characters)
- part 1: docs/api/openapi.json (17004 characters)
- part 2: src/credentials/provision.test.ts (9354 characters)
- part 2: src/credentials/provision.ts (6374 characters)
- part 2: src/credentials/provision-failures.test.ts (17977 characters)
- part 2: src/credentials/resolver.test.ts (6725 characters)
- part 2: src/credentials/resolver.ts (2141 characters)
- part 2: src/credentials/rotate.test.ts (12326 characters)
- part 2: src/credentials/rotate.ts (3931 characters)
- part 2: src/credentials/schema.test.ts (7194 characters)
- part 2: src/credentials/store.ts (2032 characters)
- part 2: openspec/changes/add-credentials/tasks.md (10232 characters)
- part 2: test/support/e2e-stack/tool-servers-part.test.ts (17944 characters)
- part 2: test/support/e2e-stack/tool-servers-part.ts (5221 characters)
- part 2: src/credentials/types.ts (678 characters)
- part 2: src/credentials/validate.ts (2608 characters)
- part 2: src/gateway/vault.test.ts (11495 characters)
- part 3: src/gateway/vault.ts (7590 characters)
- part 3: src/credentials/vault-call.ts (1169 characters)
- part 3: src/gateway/vault-codec.test.ts (3854 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 2 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 10 task(s): red and green compared (+2 unfrozen by a delegate or an agent) |
| test path freeze | ok | 10 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/credential-codes.test.ts, src/api/credential-deps.test.ts, src/api/credential-routes.test.ts, src/api/credential-routes.ts, src/api/credential-secrets.test.ts (+28 more) |
| tdd history | ok | 11 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 2142 of 2142 base tests pass on the unit's code with its 15 test and support files at the base (base: base worktree) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/api/credential-secrets.test.ts kept at head for the run (task 5.2: unfrozen by Q-003)
- src/credentials/schema.test.ts kept at head for the run (task 1.1: unfrozen by Q-001)
- src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message (named by the task text, plan:m6@232dc593bd1d151f)
- test.arch.egress-sites.test.ts::C-76ead8ea the engine's egress sites are exactly the inventory (named by the task text, plan:m6@232dc593bd1d151f)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/credentials/schema.test.ts (task 1.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))
- src/api/credential-secrets.test.ts (task 5.2, unfrozen by Q-003 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-96e47324 | api-conventions › Every error code is registered › The registry | covered | src.api.credential-codes.test.ts::C-96e47324 registers EGRESS_UNAVAILABLE with its status and message (passed, red_assertion, inadequate) | src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message (no proof that it discriminates (no red, audit or generated record)); src.api.flow-errors.test.ts::C-96e47324 C-226d18fa: FLOW_TEXT_INVALID is registered with status 422 (no proof that ... | - |
| C-601275f9 | api-conventions › Every error code is registered › An unregistered literal code fails the scan | covered | test.arch.error-codes.test.ts::C-601275f9 An unregistered literal ApiError code fails the scan (passed, pass_to_pass) | - | 0.88 |
| C-05ca73a7 | api-conventions › Every error code is registered › Registered, dynamic and test uses pass | covered | test.arch.error-codes.test.ts::C-05ca73a7 Registered, dynamic and test code use passes the scan (passed, pass_to_pass) | - | 0.82 |
| C-541ef4f9 | api-conventions › Every error code is registered › Route errors | covered | src.api.error-codes.test.ts::C-541ef4f9 Route errors lists only routes whose declared codes are unregistered (passed, pass_to_pass) | - | 0.84 |
| C-aebcc921 | credentials › Credential references are stored per tenant and hold no value › Migration 0480 stores references and no value | covered | src.credentials.schema.test.ts::C-aebcc921 migration 0480 stores references and no value (passed, red_assertion) | - | 0.77 |
| C-5095674e | credentials › The vault codec writes seven request fields and reads the key version › The codec matches hand-written byte vectors and never sends field 7 | covered | src.gateway.vault-codec.test.ts::C-5095674e decode reads the key version of accepted messages (passed, red_assertion); src.gateway.vault-codec.test.ts::C-5095674e decode refuses malformed messages with GATEWAY_UNAVAILABLE (passed, red_assertion); src.gateway.vault-codec.test.ts::C-5095674e encode IN... | - | 0.89 |
| C-2a5da3c6 | credentials › The vault writer puts one credential over h2c gRPC and maps what the vault answers › The writer stores through the fake vault, counts key versions and maps every refusal | covered | src.gateway.vault.test.ts::C-2a5da3c6 an https url against the plaintext stub is unavailable and sends nothing (passed, red_assertion); src.gateway.vault.test.ts::C-2a5da3c6 the log holds one line per call and no value, token or identity (passed, red_assertion); src.gateway.vault.test.ts::C-2a5da3c6... | - | 0.92 |
| C-41cf1ff5 | credentials › Provisioning writes the vault first, then the reference and the audit event, and leaves nothing behind on failure › Provision puts first, stores the reference and refuses what is invalid, unknown or taken | covered | src.credentials.provision.test.ts::C-41cf1ff5 provision puts first then stores the reference and the audit event (passed, red_assertion); src.credentials.provision.test.ts::C-41cf1ff5 provision refuses what is invalid, unknown or taken and changes nothing (passed, red_assertion) | - | 0.86 |
| C-842be4dd | credentials › Provisioning writes the vault first, then the reference and the audit event, and leaves nothing behind on failure › Vault and insert failures write nothing and a later put counts on | covered | src.credentials.provision-failures.test.ts::C-842be4dd a transaction abort and a down pool write nothing (passed, pre_satisfied, accepted by an agent through Q-002: the check was inconclusive); src.credentials.provision-failures.test.ts::C-842be4dd an insert failure leaves the vault entry and the re... | - | - |
| C-9507eedb | credentials › Rotation, listing and the resolver › Rotate moves the key version, refusals change nothing, list shows metadata | covered | src.credentials.rotate.test.ts::C-9507eedb rotate bumps the key version records the caller and lists tenant metadata (passed, red_assertion); src.credentials.rotate.test.ts::C-9507eedb rotation refusals change nothing and concurrent rotations serialise (passed, red_assertion) | - | 0.91 |
| C-c3669299 | credentials › Rotation, listing and the resolver › The resolver answers per tenant and seedServiceId matches its vectors | covered | src.credentials.resolver.test.ts::C-c3669299 a down pool rejects with db down (passed, red_assertion); src.credentials.resolver.test.ts::C-c3669299 resolve answers per tenant before and after rotation and seedServiceId matches its vectors (passed, red_assertion) | - | 0.92 |
| C-bbdd4a2c | credentials › The routes provision, rotate and list for tenant admins and answer 503 without a vault › Carol provisions and rotates, replays follow the key, alice is refused and tenant_b sees nothing | covered | src.api.credential-routes.test.ts::C-bbdd4a2c a closed or refusing vault leaves the row and writes nothing (passed, red_assertion); src.api.credential-routes.test.ts::C-bbdd4a2c a null vault answers 503 for the writes while the list stays available (passed, red_assertion); src.api.credential-routes.... | - | - |
| C-94f3dabe | credentials › The routes provision, rotate and list for tenant admins and answer 503 without a vault › Null dependencies answer as the block routes do | covered | src.api.credential-deps.test.ts::C-94f3dabe a null PEP pool answers every request 503 before validation (passed, red_assertion); src.api.credential-deps.test.ts::C-94f3dabe a null deps pool is 503 for carol and 403 for alice (passed, red_assertion); src.api.credential-deps.test.ts::C-94f3dabe a null... | - | 0.89 |
| C-01ef6501 | credentials › A credential value reaches no log, row, audit payload, response, error, trace or document › A canary value is found in no sink | covered | src.api.credential-secrets.test.ts::C-01ef6501 the credential value never reaches a response, log, span, row or fake sink (passed, red_assertion) | - | 0.89 |
| C-d181bfc1 | credentials › A stored credential is injected as the one credential header on the proxied call › The echo shows the injected header and the fake never shows the value | covered | src.credentials.echo.test.ts::C-d181bfc1 the echo shows the injected header and the fake never shows the value (passed, red_assertion) | - | 0.93 |
| C-0c230dcb | credentials › The gateway has one more inventoried caller, main wires the routes and the document lists them › The inventory names the credentials module once | covered | src.credentials.egress-site.test.ts::C-0c230dcb the credentials module is one inventoried egress site (passed, red_assertion) | - | 0.82 |
| C-1e452907 | credentials › The gateway has one more inventoried caller, main wires the routes and the document lists them › Main registers the routes and the document agrees | covered | src.main.credentials.test.ts::C-1e452907 main registers the credential routes with action manage credentials (passed, red_assertion); src.main.credentials.test.ts::C-1e452907 the committed OpenAPI document lists the credential operations (passed, red_assertion) | - | 0.65 |
| C-8ba7a4db | credentials › The gateway has one more inventoried caller, main wires the routes and the document lists them › Main wires the vault, the ids and the engine key | covered | src.main.credentials.test.ts::C-8ba7a4db main wires the vault the ids and the engine key (passed, red_assertion) | - | 0.86 |
| C-5e7feae0 | credentials › The tool-servers part seeds the journey's pending acme server and its credential › The part seeds once, re-seeds idempotently, survives a reset and runs in the crash cluster | covered | test.support.e2e-stack.tool-servers-part.test.ts::C-5e7feae0 PT1 the part refuses to start without database egress and tools (passed, red_assertion); test.support.e2e-stack.tool-servers-part.test.ts::C-5e7feae0 PT2 to PT4 the part seeds acme once and survives a reset (passed, red_assertion); test.su... | - | 0.92 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-credentials/.l4/ledger/r-20261109T2147Z-0cd4.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-credentials/.l4/ledger/r-20261109T2209Z-2dc7.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-credentials/.l4/ledger/r-20261110T0049Z-18e5.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-credentials/.l4/ledger/r-20261110T0141Z-96fe.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-credentials/.l4/ledger/r-20261110T0359Z-e72e.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-credentials/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-credentials/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/credential-codes.test.ts` |  | relevant | new test file |
| `src/api/credential-deps.test.ts` |  | relevant | new test file |
| `src/api/credential-routes.test.ts` |  | relevant | new test file |
| `src/api/credential-routes.ts` | api | relevant | named in the spec |
| `src/api/credential-secrets.test.ts` |  | relevant | new test file |
| `src/api/error-codes.test.ts` |  | relevant | named in the spec |
| `src/api/error-codes.ts` | api | relevant | named in the spec |
| `src/api/index.ts` | api | relevant | named in the spec |
| `src/credentials/echo.test.ts` |  | relevant | new test file |
| `src/credentials/egress-site.test.ts` |  | relevant | new test file |
| `src/credentials/index.ts` | credentials | relevant | named in the spec |
| `src/credentials/policy/credentials.cedar` | credentials | relevant | named in the spec |
| `src/credentials/provision-failures.test.ts` |  | relevant | new test file |
| `src/credentials/provision.test.ts` |  | relevant | new test file |
| `src/credentials/provision.ts` | credentials | relevant | named in the spec |
| `src/credentials/resolver.test.ts` |  | relevant | new test file |
| `src/credentials/resolver.ts` | credentials | relevant | named in the spec |
| `src/credentials/rotate.test.ts` |  | relevant | new test file |
| `src/credentials/rotate.ts` | credentials | relevant | named in the spec |
| `src/credentials/schema.test.ts` |  | relevant | new test file |
| `src/credentials/store.ts` | credentials | relevant | named in the spec |
| `src/credentials/types.ts` | credentials | relevant | named in the spec |
| `src/credentials/validate.ts` | credentials | relevant | named in the spec |
| `src/credentials/vault-call.ts` | credentials | relevant | named in the spec |
| `src/db/migrations/0480_credentials.sql` | db | relevant | named in the spec |
| `src/gateway/index.ts` | gateway | relevant | named in the spec |
| `src/gateway/vault-codec.test.ts` |  | relevant | new test file |
| `src/gateway/vault.test.ts` |  | relevant | new test file |
| `src/gateway/vault.ts` | gateway | relevant | named in the spec |
| `src/main.credentials.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `test/arch/egress-sites.test.ts` |  | relevant | named in the spec |
| `test/support/e2e-stack/parts/52-tool-servers.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/tool-servers-part.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/tool-servers-part.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/credential-routes.ts, src/api/error-codes.ts, src/api/index.ts, src/credentials/index.ts, src/credentials/provision.ts and 11 more

### Tests

2248 of 2248 passed, 0 failed, 0 errored, 0 skipped.
46 of 46 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-96e47324 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-601275f9 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-05ca73a7 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-541ef4f9 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-aebcc921 | ok | 0.770 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5095674e | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2a5da3c6 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-41cf1ff5 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-842be4dd | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-9507eedb | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c3669299 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bbdd4a2c | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-94f3dabe | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-01ef6501 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d181bfc1 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0c230dcb | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1e452907 | ok | 0.650 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8ba7a4db | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5e7feae0 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Answers to verdict questions

- Q-004 accept C-96e47324 by the delegate (claude-fable-5-1 via claude-code): ERROR_CODES in src/api/error-codes.ts holds exactly the 27 entries of the scenario with the listed status and message, isRegisteredCode is a hasOwnProperty check, and the edited frozen test asserts the exact key set, every entry, true for each code and false for cursor_invalid, the empty string and ...
- Q-005 accept C-601275f9 by the delegate (claude-fable-5-1 via claude-code): checkApiErrorCodes in test/arch/error-codes.ts walks every non-test src ts file, reports each new ApiError whose second argument is a string literal not in the registered list as ARCH_API_ERROR_CODE with the file, the 1-based line and a message naming the code and src/api/error-codes.ts; the tracing...
- Q-006 accept C-05ca73a7 by the delegate (claude-fable-5-1 via claude-code): The scan returns null for a non-literal second argument and skips test files, so the registered literal, the dynamic code and the test-file literal give no violation; the tracing test builds that snapshot and asserts [] with the default registry and with ["NOT_FOUND"], and asserts [] over readSnapsh...
- Q-007 accept C-541ef4f9 by the delegate (claude-fable-5-1 via claude-code): unregisteredRouteErrors in src/api/error-codes.ts collects `${method} ${url}: ${code}` for each declared code that isRegisteredCode refuses and returns the sorted list, so GET /a with [NOT_FOUND, NOPE] and POST /b with [] give ["GET /a: NOPE"] and no routes give []; the tracing test asserts exactly ...
- Q-008 accept F-0b2a2fe6 by the delegate (claude-fable-5-1 via claude-code): The text of task 3.2 is done in the head: vault-call.ts maps GatewayError codes GATEWAY_TOKEN_REFUSED, GATEWAY_INVALID and GATEWAY_UNAVAILABLE to CredentialsError CREDENTIALS_VAULT with reason token_refused, vault_refused or unavailable and rethrows anything else; provision.ts maps the insert's 2350...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-96e47324 | api-conventions › Every error code is registered › The registry | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): ERROR_CODES in src/api/error-codes.ts holds exactly the 27 entries of the scenario with the listed status and message, isRegisteredCode is a hasOwnProperty check, and the edited frozen test asserts the exact key set, every entry, true for ... |
| C-601275f9 | api-conventions › Every error code is registered › An unregistered literal code fails the scan | insufficient_evidence | pass | accepted by the delegate (claude-fable-5-1 via claude-code): checkApiErrorCodes in test/arch/error-codes.ts walks every non-test src ts file, reports each new ApiError whose second argument is a string literal not in the registered list as ARCH_API_ERROR_CODE with the file, the 1-based line and a me... |
| C-05ca73a7 | api-conventions › Every error code is registered › Registered, dynamic and test uses pass | insufficient_evidence | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The scan returns null for a non-literal second argument and skips test files, so the registered literal, the dynamic code and the test-file literal give no violation; the tracing test builds that snapshot and asserts [] with the default re... |
| C-541ef4f9 | api-conventions › Every error code is registered › Route errors | insufficient_evidence | pass | accepted by the delegate (claude-fable-5-1 via claude-code): unregisteredRouteErrors in src/api/error-codes.ts collects `${method} ${url}: ${code}` for each declared code that isRegisteredCode refuses and returns the sorted list, so GET /a with [NOT_FOUND, NOPE] and POST /b with [] give ["GET /a: NO... |
| C-aebcc921 | credentials › Credential references are stored per tenant and hold no value › Migration 0480 stores references and no value | pass | pass | the judge passed it and a discriminating test passes |
| C-5095674e | credentials › The vault codec writes seven request fields and reads the key version › The codec matches hand-written byte vectors and never sends field 7 | pass | pass | the judge passed it and a discriminating test passes |
| C-2a5da3c6 | credentials › The vault writer puts one credential over h2c gRPC and maps what the vault answers › The writer stores through the fake vault, counts key versions and maps every refusal | pass | pass | the judge passed it and a discriminating test passes |
| C-41cf1ff5 | credentials › Provisioning writes the vault first, then the reference and the audit event, and leaves nothing behind on failure › Provision puts first, stores the reference and refuses what is invalid, unknown or taken | pass | pass | the judge passed it and a discriminating test passes |
| C-842be4dd | credentials › Provisioning writes the vault first, then the reference and the audit event, and leaves nothing behind on failure › Vault and insert failures write nothing and a later put counts on | pass | pass | the judge passed it and a discriminating test passes |
| C-9507eedb | credentials › Rotation, listing and the resolver › Rotate moves the key version, refusals change nothing, list shows metadata | pass | pass | the judge passed it and a discriminating test passes |
| C-c3669299 | credentials › Rotation, listing and the resolver › The resolver answers per tenant and seedServiceId matches its vectors | pass | pass | the judge passed it and a discriminating test passes |
| C-bbdd4a2c | credentials › The routes provision, rotate and list for tenant admins and answer 503 without a vault › Carol provisions and rotates, replays follow the key, alice is refused and tenant_b sees nothing | pass | pass | the judge passed it and a discriminating test passes |
| C-94f3dabe | credentials › The routes provision, rotate and list for tenant admins and answer 503 without a vault › Null dependencies answer as the block routes do | pass | pass | the judge passed it and a discriminating test passes |
| C-01ef6501 | credentials › A credential value reaches no log, row, audit payload, response, error, trace or document › A canary value is found in no sink | pass | pass | the judge passed it and a discriminating test passes |
| C-d181bfc1 | credentials › A stored credential is injected as the one credential header on the proxied call › The echo shows the injected header and the fake never shows the value | pass | pass | the judge passed it and a discriminating test passes |
| C-0c230dcb | credentials › The gateway has one more inventoried caller, main wires the routes and the document lists them › The inventory names the credentials module once | pass | pass | the judge passed it and a discriminating test passes |
| C-1e452907 | credentials › The gateway has one more inventoried caller, main wires the routes and the document lists them › Main registers the routes and the document agrees | pass | pass | the judge passed it and a discriminating test passes |
| C-8ba7a4db | credentials › The gateway has one more inventoried caller, main wires the routes and the document lists them › Main wires the vault, the ids and the engine key | pass | pass | the judge passed it and a discriminating test passes |
| C-5e7feae0 | credentials › The tool-servers part seeds the journey's pending acme server and its credential › The part seeds once, re-seeds idempotently, survives a reset and runs in the crash cluster | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-96e47324): src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-96e47324): src.api.flow-errors.test.ts::C-96e47324 C-226d18fa: FLOW_TEXT_INVALID is registered with status 422: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-96e47324): src.api.run-list.test.ts::C-96e47324 the runs failure code is registered with status and message: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-96e47324): src.api.test-run-codes.test.ts::C-96e47324 registers TEST_MOCK_INVALID with its status and message: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-96e47324): src.api.test-run-codes.test.ts::C-96e47324 registers TEST_MOCK_MISSING with its status and message: no proof that it discriminates (no red, audit or generated record)
- [minor, judge] Vault writer sends duplicate mintkey metadata headers beyond the design-specified names (spec gap) (criterion C-2a5da3c6): design.md § Codec and writer names x-mintkey-service-token and x-mintkey-service-identity as the metadata headers, but src/gateway/vault.ts also sends x-mintkey-token and x-mintkey-identity. No scenario pins down whether extra headers may be sent, and two reasonable implementations differ. The implementer's hint flags this design/fake mismatch as unresolved.
- [minor, judge] the judge called a test inadequate (criterion C-96e47324): src.api.credential-codes.test.ts::C-96e47324 registers EGRESS_UNAVAILABLE with its status and message
- [minor, judge] task 3.2 is ticked as already satisfied, but its text is not done: task 3.2 implementation (provision.ts SQLSTATE 23505/23503 mapping, vault-call.ts GatewayError mapping, provision-failures.test.ts) is in parts 2-3, not shown in part 1; the gate report lists C-842be4dd tests as pre_satisfied/inconclusive via Q-002, so part 1 does not show the task is done. (waived by the delegate (claude-fable-5-1 via claude-code): The text of task 3.2 is done in the head: vault-call.ts maps GatewayError codes GATEWAY_TOKEN_REFUSED, GATEWAY_INVALID and GATEWAY_UNAVAILABLE to CredentialsError CREDENTIALS_VAULT with reason token_refused, vault_refused or unavailable and rethrow...

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.credential-codes.test.ts::C-96e47324 registers EGRESS_UNAVAILABLE with its status and message` (task 5.1): passed
- `src.api.credential-deps.test.ts::C-94f3dabe a null PEP pool answers every request 503 before validation` (task 5.2): passed
- `src.api.credential-deps.test.ts::C-94f3dabe a null deps pool is 503 for carol and 403 for alice` (task 5.2): passed
- `src.api.credential-deps.test.ts::C-94f3dabe a null engine key provisions and replays but refuses paging` (task 5.2): passed
- `src.api.credential-deps.test.ts::C-94f3dabe a re-registered server refuses the old key with no vault call` (task 5.2): passed
- `src.api.credential-routes.test.ts::C-bbdd4a2c a closed or refusing vault leaves the row and writes nothing` (task 5.2): passed
- `src.api.credential-routes.test.ts::C-bbdd4a2c a null vault answers 503 for the writes while the list stays available` (task 5.2): passed
- `src.api.credential-routes.test.ts::C-bbdd4a2c alice is refused, mallory sees nothing and rotation moves the key version` (task 5.2): passed
- `src.api.credential-routes.test.ts::C-bbdd4a2c carol provisions, replays and is refused a changed body under the same key` (task 5.2): passed
- `src.api.credential-routes.test.ts::C-bbdd4a2c malformed credential requests are 400 with the field of the rule` (task 5.2): passed
- `src.api.credential-routes.test.ts::C-bbdd4a2c the credentials fragment permits only tenant admins` (task 5.2): passed
- `src.api.credential-secrets.test.ts::C-01ef6501 the credential value never reaches a response, log, span, row or fake sink` (task 5.2): passed
- `src.credentials.echo.test.ts::C-d181bfc1 the echo shows the injected header and the fake never shows the value` (task 3.1): passed
- `src.credentials.egress-site.test.ts::C-0c230dcb the credentials module is one inventoried egress site` (task 3.1): passed
- `src.credentials.provision-failures.test.ts::C-842be4dd a transaction abort and a down pool write nothing` (task 3.2): passed
- `src.credentials.provision-failures.test.ts::C-842be4dd an insert failure leaves the vault entry and the repeat counts on` (task 3.2): passed
- `src.credentials.provision-failures.test.ts::C-842be4dd an insert failure without a service id orphans the first put` (task 3.2): passed
- `src.credentials.provision-failures.test.ts::C-842be4dd concurrent provisions keep one row and refuse the lost race` (task 3.2): passed
- `src.credentials.provision-failures.test.ts::C-842be4dd concurrent provisions of one service id keep one row and refuse the loser` (task 3.2): passed
- `src.credentials.provision-failures.test.ts::C-842be4dd insert constraint errors map by constraint and other errors pass unchanged` (task 3.2): passed
- `src.credentials.provision-failures.test.ts::C-842be4dd vault failures map to CREDENTIALS_VAULT and leave no row or event` (task 3.2): passed
- `src.credentials.provision.test.ts::C-41cf1ff5 provision puts first then stores the reference and the audit event` (task 3.1): passed
- `src.credentials.provision.test.ts::C-41cf1ff5 provision refuses what is invalid, unknown or taken and changes nothing` (task 3.1): passed
- `src.credentials.resolver.test.ts::C-c3669299 a down pool rejects with db down` (task 4.2): passed
- `src.credentials.resolver.test.ts::C-c3669299 resolve answers per tenant before and after rotation and seedServiceId matches its vectors` (task 4.2): passed
- `src.credentials.rotate.test.ts::C-9507eedb rotate bumps the key version records the caller and lists tenant metadata` (task 4.1): passed
- `src.credentials.rotate.test.ts::C-9507eedb rotation refusals change nothing and concurrent rotations serialise` (task 4.1): passed
- `src.credentials.schema.test.ts::C-aebcc921 migration 0480 stores references and no value` (task 1.1): passed
- `src.gateway.vault-codec.test.ts::C-5095674e decode reads the key version of accepted messages` (task 2.1): passed
- `src.gateway.vault-codec.test.ts::C-5095674e decode refuses malformed messages with GATEWAY_UNAVAILABLE` (task 2.1): passed
- `src.gateway.vault-codec.test.ts::C-5095674e encode IN1 matches ENC1 byte for byte` (task 2.1): passed
- `src.gateway.vault-codec.test.ts::C-5095674e encode IN2 matches ENC2 and omits the header field` (task 2.1): passed
- `src.gateway.vault-codec.test.ts::C-5095674e encode a 300 byte value uses a two byte length` (task 2.1): passed
- `src.gateway.vault.test.ts::C-2a5da3c6 an https url against the plaintext stub is unavailable and sends nothing` (task 2.2): passed
- `src.gateway.vault.test.ts::C-2a5da3c6 the log holds one line per call and no value, token or identity` (task 2.2): passed
- `src.gateway.vault.test.ts::C-2a5da3c6 the writer counts key versions against the fake vault` (task 2.2): passed
- `src.gateway.vault.test.ts::C-2a5da3c6 the writer maps the fake vault refusals` (task 2.2): passed
- `src.gateway.vault.test.ts::C-2a5da3c6 the writer maps what the stub answers` (task 2.2): passed
- `src.gateway.vault.test.ts::C-2a5da3c6 the writer sends one framed request with metadata` (task 2.2): passed
- `src.main.credentials.test.ts::C-1e452907 main registers the credential routes with action manage credentials` (task 6.1): passed
- `src.main.credentials.test.ts::C-1e452907 the committed OpenAPI document lists the credential operations` (task 6.1): passed
- `src.main.credentials.test.ts::C-8ba7a4db main wires the vault the ids and the engine key` (task 6.1): passed
- `test.support.e2e-stack.tool-servers-part.test.ts::C-5e7feae0 PT1 the part refuses to start without database egress and tools` (task 6.2): passed
- `test.support.e2e-stack.tool-servers-part.test.ts::C-5e7feae0 PT2 to PT4 the part seeds acme once and survives a reset` (task 6.2): passed
- `test.support.e2e-stack.tool-servers-part.test.ts::C-5e7feae0 PT5 the crash cluster seeds acme and its credential` (task 6.2): passed
- `test.support.e2e-stack.tool-servers-part.test.ts::C-5e7feae0 PT6 discovery lists tool-servers after tools with its file and constants` (task 6.2): passed
