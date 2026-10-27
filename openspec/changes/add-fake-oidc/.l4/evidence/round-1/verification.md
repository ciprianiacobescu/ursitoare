# Verification: openspec:add-fake-oidc: NEEDS_HUMAN (round 1)

traceability: 42/42 criteria covered by a discriminating test

- Base: `5481c0d388607a42ec2b37d6fed0e3596138dd80`
- Head: `c3222c592bc96a9f110e82be791a77701836fdbf`
- Implementer profiles: deepseek
- Judge: claude-judge (claude-opus-5-5), 2 call(s), judged in 2 parts, prompt sha256 `64e8b7cddcd5bfc73167345e69ee5648f9b58c238538199dc329e2d926476dbe`
  - part 1: 17 file(s), 118312 characters, profile claude-judge, reply valid
  - part 2: 7 file(s), 60514 characters, profile claude-judge, reply valid
- Judge replies of claude-judge (this unit, all rounds): valid 2, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), deepseek deepseek (declared)
- Cost: $2.2611

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.2 | base main@5481c0d388 contained |
| 1 | integrity | ok | 24.2 | 10 sub-checks (+3 unfrozen by human answers); scope: 29 changed file(s) |
| 2 | build | ok | 10.9 |  |
| 3 | tests | ok | 30.1 |  |
| 4 | traceability | ok | 0.1 | 42/42 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: test/support/fake-oidc/authorize.ts, test/support/fake-oidc/contract.ts, test/support/fake-oidc/jwt.ts, test/support/fake-oidc/keys.ts, test/support/fake-oidc/login-page.ts and 8 more |
| 8 | s1 judge | ok | 4.2 | 41/42 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 228.3 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261027T1244Z-7743/072-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261027T1244Z-7743/073-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261027T1244Z-7743/074-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261027T1244Z-7743/075-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261027T1244Z-7743/076-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261027T1244Z-7743/077-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261027T1244Z-7743/078-e2e.log |

## Files by part

- part 1: test/support/fake-oidc/authorize.test.ts (10261 characters)
- part 1: test/support/fake-oidc/authorize.ts (7023 characters)
- part 1: test/support/fake-oidc/contract.ts (19206 characters)
- part 1: test/support/fake-oidc/fake-oidc.test.ts (10021 characters)
- part 1: test/support/fake-oidc/jwt.test.ts (5463 characters)
- part 1: test/support/fake-oidc/jwt.ts (4012 characters)
- part 1: test/support/fake-oidc/keys.test.ts (4022 characters)
- part 1: test/support/fake-oidc/keys.ts (1919 characters)
- part 1: test/support/fake-oidc/login-page.test.ts (3199 characters)
- part 1: test/support/fake-oidc/login-page.ts (2261 characters)
- part 1: test/support/fake-oidc/pkce.test.ts (1993 characters)
- part 1: test/support/fake-oidc/pkce.ts (1145 characters)
- part 1: test/support/fake-oidc/provider.ts (6270 characters)
- part 1: test/support/fake-oidc/seed.ts (2141 characters)
- part 1: test/support/fake-oidc/server.test.ts (17010 characters)
- part 1: test/support/fake-oidc/server.ts (13256 characters)
- part 1: test/support/fake-oidc/session.test.ts (9110 characters)
- part 2: test/support/fake-oidc/session.ts (5517 characters)
- part 2: openspec/changes/add-fake-oidc/tasks.md (16675 characters)
- part 2: test/support/fake-oidc/token.test.ts (16387 characters)
- part 2: test/support/fake-oidc/token.ts (5560 characters)
- part 2: test/support/fake-oidc/tokens.test.ts (10202 characters)
- part 2: test/support/fake-oidc/tokens.ts (5580 characters)
- part 2: test/support/fake-oidc/types.ts (593 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 10 task(s): red and green compared (+3 unfrozen by a delegate or an agent) |
| test path freeze | ok | 10 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/support/fake-oidc/authorize.test.ts, test/support/fake-oidc/authorize.ts, test/support/fake-oidc/contract.ts, test/support/fake-oidc/fake-oidc.test.ts, test/support/fake-oidc/jwt.test.ts (+18 more) |
| tdd history | ok | 10 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 419 of 419 base tests pass on the unit's code with its 7 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- test/support/fake-oidc/authorize.test.ts kept at head for the run (task 2.2: unfrozen by Q-003)
- test/support/fake-oidc/server.test.ts kept at head for the run (task 2.1: unfrozen by Q-002)
- test/support/fake-oidc/tokens.test.ts kept at head for the run (task 1.4: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- test/support/fake-oidc/tokens.test.ts (task 1.4, unfrozen by Q-001 (delegate_override, claude-fable-5-1))
- test/support/fake-oidc/server.test.ts (task 2.1, unfrozen by Q-002 (delegate_override, claude-fable-5-1))
- test/support/fake-oidc/authorize.test.ts (task 2.2, unfrozen by Q-003 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-0aaa91d6 | test-fake-oidc › The provider binds loopback only and stops cleanly › Default start | covered | test.support.fake-oidc.server.test.ts::C-0aaa91d6 default start binds loopback and serves realm discovery (passed, red_assertion) | - | 0.95 |
| C-2df38924 | test-fake-oidc › The provider binds loopback only and stops cleanly › Bad options | covered | test.support.fake-oidc.server.test.ts::C-2df38924 bad options reject with FAKE_OIDC_START_FAILED and leave no listener (passed, red_assertion) | - | 0.95 |
| C-65cedd86 | test-fake-oidc › The provider binds loopback only and stops cleanly › Foreign Host header, unknown path, wrong method | covered | test.support.fake-oidc.server.test.ts::C-65cedd86 foreign Host unknown path and wrong method are refused (passed, red_assertion) | - | 0.91 |
| C-69ae792e | test-fake-oidc › The provider binds loopback only and stops cleanly › Oversized body | covered | test.support.fake-oidc.server.test.ts::C-69ae792e oversized bodies answer 413 and close while exactly 65536 bytes is allowed (passed, red_assertion) | - | 0.96 |
| C-1d9cc129 | test-fake-oidc › The provider binds loopback only and stops cleanly › Registering redirects | covered | test.support.fake-oidc.server.test.ts::C-1d9cc129 redirect registration validates the URI and the client (passed, red_assertion) | - | 0.94 |
| C-7f218491 | test-fake-oidc › The provider binds loopback only and stops cleanly › Close is idempotent and complete | covered | test.support.fake-oidc.server.test.ts::C-7f218491 close is idempotent and complete while each fake has its own port and kid (passed, red_assertion) | - | 0.94 |
| C-852e549c | test-fake-oidc › Discovery and JWKS mirror the Keycloak realm paths › Discovery fields | covered | test.support.fake-oidc.server.test.ts::C-852e549c discovery mirrors the Keycloak realm paths and capabilities (passed, red_assertion) | - | 0.93 |
| C-a715e6d5 | test-fake-oidc › Discovery and JWKS mirror the Keycloak realm paths › JWKS shape and verification | covered | test.support.fake-oidc.keys.test.ts::C-a715e6d5 a token signed by the current key verifies and a foreign signature does not (passed, red_assertion); test.support.fake-oidc.keys.test.ts::C-a715e6d5 foreign is stable and absent from the published JWKS (passed, red_assertion); test.support.fake-oidc.ke... | - | 0.92 |
| C-5938a11f | test-fake-oidc › Discovery and JWKS mirror the Keycloak realm paths › Rotation keeps old tokens valid | covered | test.support.fake-oidc.keys.test.ts::C-5938a11f rotate makes a new current key and jwks lists new then old (passed, red_assertion); test.support.fake-oidc.keys.test.ts::C-5938a11f tokens from before and after rotation verify against their own keys (passed, red_assertion); test.support.fake-oidc.serv... | - | 0.95 |
| C-7e2314fa | test-fake-oidc › The login page uses Keycloak's labels and is accessible › Labels and structure | covered | test.support.fake-oidc.authorize.test.ts::C-7e2314fa authorization GET renders the accessible Keycloak form for a valid request (passed, red_assertion); test.support.fake-oidc.login-page.test.ts::C-7e2314fa login page has the Keycloak language title heading and exact controls (passed, red_assertion)... | - | 0.94 |
| C-8905a65e | test-fake-oidc › The login page uses Keycloak's labels and is accessible › Escaping and no echo | covered | test.support.fake-oidc.authorize.test.ts::C-ba36cf88 C-8905a65e wrong password and unknown user look alike and the password is never echoed (passed, red_assertion); test.support.fake-oidc.login-page.test.ts::C-8905a65e login page escapes the reflected action username and error (passed, red_assertion... | - | 0.92 |
| C-c07974a7 | test-fake-oidc › The authorization endpoint validates the request and issues a one-use code › Sign-in succeeds | covered | test.support.fake-oidc.authorize.test.ts::C-c07974a7 authorization POST signs alice in and redirects with a fresh one-use code (passed, red_assertion) | - | 0.91 |
| C-388a916a | test-fake-oidc › The authorization endpoint validates the request and issues a one-use code › Redirect URI and client are matched exactly | covered | test.support.fake-oidc.authorize.test.ts::C-388a916a authorization rejects a redirect uri or client that is not an exact match (passed, red_assertion) | - | 0.90 |
| C-63de56cb | test-fake-oidc › The authorization endpoint validates the request and issues a one-use code › Redirects are stored as given, per client | covered | test.support.fake-oidc.authorize.test.ts::C-63de56cb redirects are stored as given and belong to their client (passed, red_assertion) | - | 0.92 |
| C-d4e4e5a6 | test-fake-oidc › The authorization endpoint validates the request and issues a one-use code › Protocol errors go back to the client | covered | test.support.fake-oidc.authorize.test.ts::C-d4e4e5a6 protocol errors redirect to the client with the unchanged state and no code (passed, red_assertion, inadequate) | - | 0.91 |
| C-ba36cf88 | test-fake-oidc › The authorization endpoint validates the request and issues a one-use code › Wrong password and unknown user look alike | covered | test.support.fake-oidc.authorize.test.ts::C-ba36cf88 C-8905a65e wrong password and unknown user look alike and the password is never echoed (passed, red_assertion) | - | 0.85 |
| C-e78e84c8 | test-fake-oidc › The token endpoint exchanges a code once, with PKCE and client authentication › Confidential exchange | covered | test.support.fake-oidc.token.test.ts::C-e78e84c8 a confidential code exchange returns tokens for the engine client (passed, red_assertion) | - | 0.92 |
| C-9366113b | test-fake-oidc › The token endpoint exchanges a code once, with PKCE and client authentication › One use, even in parallel | covered | test.support.fake-oidc.token.test.ts::C-9366113b a code is single use even when exchanges run in parallel (passed, red_assertion) | - | 0.88 |
| C-3b4f2bde | test-fake-oidc › The token endpoint exchanges a code once, with PKCE and client authentication › Sixty seconds on the injected clock | covered | test.support.fake-oidc.token.test.ts::C-3b4f2bde a code expires exactly sixty seconds after issue on the injected clock (passed, red_assertion) | - | 0.64 |
| C-868f25bb | test-fake-oidc › The token endpoint exchanges a code once, with PKCE and client authentication › Verifier and redirect mismatch | covered | test.support.fake-oidc.pkce.test.ts::C-868f25bb a verifier with a plus sign is rejected even when its challenge matches (passed, red_assertion); test.support.fake-oidc.pkce.test.ts::C-868f25bb the RFC 7636 appendix B verifier produces its S256 challenge and verifies (passed, red_assertion); test.sup... | - | 0.89 |
| C-a6e0ee6b | test-fake-oidc › The token endpoint exchanges a code once, with PKCE and client authentication › Client authentication | covered | test.support.fake-oidc.token.test.ts::C-a6e0ee6b client authentication refuses a bad or absent secret and cross-client codes (passed, red_assertion) | - | 0.93 |
| C-e4b64277 | test-fake-oidc › The token endpoint exchanges a code once, with PKCE and client authentication › Bad requests | covered | test.support.fake-oidc.token.test.ts::C-e4b64277 the token endpoint refuses other grants JSON bodies and a missing code (passed, red_assertion) | - | 0.91 |
| C-057cfe90 | test-fake-oidc › The token endpoint exchanges a code once, with PKCE and client authentication › Public client | covered | test.support.fake-oidc.token.test.ts::C-057cfe90 a public client exchanges a code with PKCE only and has no secret (passed, red_assertion) | - | 0.90 |
| C-c940079f | test-fake-oidc › Tokens carry the Keycloak claim shapes for the seed users › Alice's ID token | covered | test.support.fake-oidc.token.test.ts::C-c940079f an exchanged id token for alice carries the Keycloak claim shape (passed, red_assertion); test.support.fake-oidc.tokens.test.ts::C-c940079f alices ID token carries the Keycloak claim shape (passed, red_assertion) | - | 0.93 |
| C-d7a517bf | test-fake-oidc › Tokens carry the Keycloak claim shapes for the seed users › The four seed users and stable subjects | covered | test.support.fake-oidc.token.test.ts::C-d7a517bf exchanged tokens for the seed users carry their groups and stable subjects (passed, red_assertion); test.support.fake-oidc.tokens.test.ts::C-d7a517bf the four seed users have stable UUID subjects with their groups and organisations (passed, red_assert... | - | 0.94 |
| C-5a6e5b58 | test-fake-oidc › Tokens carry the Keycloak claim shapes for the seed users › Scope and nonce gating, access token | covered | test.support.fake-oidc.token.test.ts::C-5a6e5b58 scope gates organisation and nonce and the access token shares the id token sid (passed, red_assertion); test.support.fake-oidc.tokens.test.ts::C-5a6e5b58 scope gates organisation and nonce while the access token shares the sid (passed, red_assertion) | - | 0.94 |
| C-e3681a90 | test-fake-oidc › Userinfo answers only for a live access token › Valid token | covered | test.support.fake-oidc.session.test.ts::C-e3681a90 userinfo answers GET and POST with profile claims for a live access token (passed, red_assertion) | - | 0.92 |
| C-4fc3edb7 | test-fake-oidc › Userinfo answers only for a live access token › Refusals | covered | test.support.fake-oidc.session.test.ts::C-4fc3edb7 userinfo refuses a missing or bad bearer token (passed, red_assertion) | - | 0.89 |
| C-9a6dc816 | test-fake-oidc › End-session ends the session and redirects only to registered URIs › Logout with redirect | covered | test.support.fake-oidc.session.test.ts::C-9a6dc816 logout ends the session and redirects with the unchanged state (passed, red_assertion) | - | 0.86 |
| C-674cee11 | test-fake-oidc › End-session ends the session and redirects only to registered URIs › Unregistered target or bad hint | covered | test.support.fake-oidc.session.test.ts::C-674cee11 logout refuses an unregistered target and a bad id token hint (passed, red_assertion) | - | 0.89 |
| C-a4d2ab09 | test-fake-oidc › End-session ends the session and redirects only to registered URIs › Post-logout URI and no target | covered | test.support.fake-oidc.session.test.ts::C-a4d2ab09 logout accepts a registered post logout uri and shows a logged out page without one (passed, red_assertion) | - | 0.93 |
| C-271f3bbf | test-fake-oidc › mintToken builds tokens that are wrong in exactly one way › Valid by default | covered | test.support.fake-oidc.jwt.test.ts::C-271f3bbf an RS256 token round trips and verifies with its JWK (passed, red_assertion); test.support.fake-oidc.server.test.ts::C-271f3bbf mintToken defaults to a valid alice id token for the engine client (passed, red_assertion); test.support.fake-oidc.tokens.tes... | - | 0.91 |
| C-e5daba08 | test-fake-oidc › mintToken builds tokens that are wrong in exactly one way › Claim flaws | covered | test.support.fake-oidc.tokens.test.ts::C-e5daba08 claim flaws change exactly the named claim and still verify (passed, red_assertion) | - | 0.91 |
| C-4b89bf6e | test-fake-oidc › mintToken builds tokens that are wrong in exactly one way › Signature flaws | covered | test.support.fake-oidc.jwt.test.ts::C-4b89bf6e a changed payload or a corrupt modulus fails verifyRs256 without throwing (passed, red_assertion); test.support.fake-oidc.jwt.test.ts::C-4b89bf6e an HS256 token round trips and fails verifyRs256 (passed, red_assertion); test.support.fake-oidc.jwt.test.t... | - | 0.88 |
| C-940e29ee | test-fake-oidc › mintToken builds tokens that are wrong in exactly one way › Unknown user, client or flaw | covered | test.support.fake-oidc.tokens.test.ts::C-940e29ee unknown user client or flaw throws the documented codes (passed, red_assertion) | - | 0.94 |
| C-a723b427 | test-fake-oidc › Secrets are per start and never recorded › Per-start values | covered | test.support.fake-oidc.server.test.ts::C-a723b427 passwords and client secrets differ per start and are long (passed, red_assertion) | - | 0.92 |
| C-642bcf7e | test-fake-oidc › Secrets are per start and never recorded › Redaction | covered | test.support.fake-oidc.fake-oidc.test.ts::C-642bcf7e a full flow records the request log with every secret redacted (passed, pre_satisfied) | - | 0.93 |
| C-ccee87e5 | test-fake-oidc › Secrets are per start and never recorded › Empty log | covered | test.support.fake-oidc.server.test.ts::C-ccee87e5 a fresh fake has an empty request log and records the first request (passed, red_assertion) | - | 0.85 |
| C-67d66ecd | test-fake-oidc › Secrets are per start and never recorded › Cap | covered | test.support.fake-oidc.server.test.ts::C-67d66ecd the request log keeps the newest 5000 entries and drops the oldest (passed, red_assertion) | - | 0.89 |
| C-34b4df4c | test-fake-oidc › The contract suite runs against any base URL › All checks pass on the fake | covered | test.support.fake-oidc.fake-oidc.test.ts::C-34b4df4c claims of the id token (passed, red_assertion); test.support.fake-oidc.fake-oidc.test.ts::C-34b4df4c code flow with PKCE (passed, red_assertion); test.support.fake-oidc.fake-oidc.test.ts::C-34b4df4c code is single use (passed, red_assertion); test... | - | - |
| C-81c01272 | test-fake-oidc › The contract suite runs against any base URL › A broken provider fails | covered | test.support.fake-oidc.fake-oidc.test.ts::C-81c01272 a broken provider fails the discovery and jwks checks with AssertionError (passed, red_assertion) | - | 0.91 |
| C-be50043b | test-fake-oidc › The contract suite runs against any base URL › Unreachable provider | covered | test.support.fake-oidc.fake-oidc.test.ts::C-be50043b every contract check reports FAKE_OIDC_CONTRACT_UNREACHABLE for a closed port (passed, red_assertion) | - | 0.95 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-fake-oidc/.l4/ledger/r-20261027T1141Z-cd31.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-oidc/.l4/ledger/r-20261027T1208Z-1537.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-oidc/.l4/ledger/r-20261027T1230Z-07f9.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-oidc/.l4/ledger/r-20261027T1244Z-7743.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-oidc/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-fake-oidc/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/fake-oidc/authorize.test.ts` |  | relevant | new test file |
| `test/support/fake-oidc/authorize.ts` | test | relevant | named in the spec |
| `test/support/fake-oidc/contract.ts` | test | relevant | named in the spec |
| `test/support/fake-oidc/fake-oidc.test.ts` |  | relevant | new test file |
| `test/support/fake-oidc/jwt.test.ts` |  | relevant | new test file |
| `test/support/fake-oidc/jwt.ts` | test | relevant | named in the spec |
| `test/support/fake-oidc/keys.test.ts` |  | relevant | new test file |
| `test/support/fake-oidc/keys.ts` | test | relevant | named in the spec |
| `test/support/fake-oidc/login-page.test.ts` |  | relevant | new test file |
| `test/support/fake-oidc/login-page.ts` | test | relevant | named in the spec |
| `test/support/fake-oidc/pkce.test.ts` |  | relevant | new test file |
| `test/support/fake-oidc/pkce.ts` | test | relevant | named in the spec |
| `test/support/fake-oidc/provider.ts` | test | relevant | named in the spec |
| `test/support/fake-oidc/seed.ts` | test | relevant | named in the spec |
| `test/support/fake-oidc/server.test.ts` |  | relevant | new test file |
| `test/support/fake-oidc/server.ts` | test | relevant | named in the spec |
| `test/support/fake-oidc/session.test.ts` |  | relevant | new test file |
| `test/support/fake-oidc/session.ts` | test | relevant | named in the spec |
| `test/support/fake-oidc/token.test.ts` |  | relevant | new test file |
| `test/support/fake-oidc/token.ts` | test | relevant | named in the spec |
| `test/support/fake-oidc/tokens.test.ts` |  | relevant | new test file |
| `test/support/fake-oidc/tokens.ts` | test | relevant | named in the spec |
| `test/support/fake-oidc/types.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: test/support/fake-oidc/authorize.ts, test/support/fake-oidc/contract.ts, test/support/fake-oidc/jwt.ts, test/support/fake-oidc/keys.ts, test/support/fake-oidc/login-page.ts and 8 more

### Tests

494 of 494 passed, 0 failed, 0 errored, 0 skipped.
75 of 75 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-0aaa91d6 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2df38924 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-65cedd86 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-69ae792e | ok | 0.960 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1d9cc129 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7f218491 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-852e549c | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a715e6d5 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5938a11f | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7e2314fa | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8905a65e | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c07974a7 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-388a916a | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-63de56cb | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d4e4e5a6 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ba36cf88 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e78e84c8 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9366113b | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3b4f2bde | ok | 0.640 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-868f25bb | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a6e0ee6b | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e4b64277 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-057cfe90 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c940079f | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d7a517bf | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5a6e5b58 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e3681a90 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4fc3edb7 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9a6dc816 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-674cee11 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a4d2ab09 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-271f3bbf | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e5daba08 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4b89bf6e | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-940e29ee | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a723b427 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-642bcf7e | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ccee87e5 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-67d66ecd | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-34b4df4c | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-81c01272 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-be50043b | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-0aaa91d6 | test-fake-oidc › The provider binds loopback only and stops cleanly › Default start | pass | pass | the judge passed it and a discriminating test passes |
| C-2df38924 | test-fake-oidc › The provider binds loopback only and stops cleanly › Bad options | pass | pass | the judge passed it and a discriminating test passes |
| C-65cedd86 | test-fake-oidc › The provider binds loopback only and stops cleanly › Foreign Host header, unknown path, wrong method | pass | pass | the judge passed it and a discriminating test passes |
| C-69ae792e | test-fake-oidc › The provider binds loopback only and stops cleanly › Oversized body | pass | pass | the judge passed it and a discriminating test passes |
| C-1d9cc129 | test-fake-oidc › The provider binds loopback only and stops cleanly › Registering redirects | pass | pass | the judge passed it and a discriminating test passes |
| C-7f218491 | test-fake-oidc › The provider binds loopback only and stops cleanly › Close is idempotent and complete | pass | pass | the judge passed it and a discriminating test passes |
| C-852e549c | test-fake-oidc › Discovery and JWKS mirror the Keycloak realm paths › Discovery fields | pass | pass | the judge passed it and a discriminating test passes |
| C-a715e6d5 | test-fake-oidc › Discovery and JWKS mirror the Keycloak realm paths › JWKS shape and verification | pass | pass | the judge passed it and a discriminating test passes |
| C-5938a11f | test-fake-oidc › Discovery and JWKS mirror the Keycloak realm paths › Rotation keeps old tokens valid | pass | pass | the judge passed it and a discriminating test passes |
| C-7e2314fa | test-fake-oidc › The login page uses Keycloak's labels and is accessible › Labels and structure | pass | pass | the judge passed it and a discriminating test passes |
| C-8905a65e | test-fake-oidc › The login page uses Keycloak's labels and is accessible › Escaping and no echo | pass | pass | the judge passed it and a discriminating test passes |
| C-c07974a7 | test-fake-oidc › The authorization endpoint validates the request and issues a one-use code › Sign-in succeeds | pass | pass | the judge passed it and a discriminating test passes |
| C-388a916a | test-fake-oidc › The authorization endpoint validates the request and issues a one-use code › Redirect URI and client are matched exactly | pass | pass | the judge passed it and a discriminating test passes |
| C-63de56cb | test-fake-oidc › The authorization endpoint validates the request and issues a one-use code › Redirects are stored as given, per client | pass | pass | the judge passed it and a discriminating test passes |
| C-d4e4e5a6 | test-fake-oidc › The authorization endpoint validates the request and issues a one-use code › Protocol errors go back to the client | pass | needs_human | uncovered: the tests that trace it are inadequate or did not pass |
| C-ba36cf88 | test-fake-oidc › The authorization endpoint validates the request and issues a one-use code › Wrong password and unknown user look alike | pass | pass | the judge passed it and a discriminating test passes |
| C-e78e84c8 | test-fake-oidc › The token endpoint exchanges a code once, with PKCE and client authentication › Confidential exchange | pass | pass | the judge passed it and a discriminating test passes |
| C-9366113b | test-fake-oidc › The token endpoint exchanges a code once, with PKCE and client authentication › One use, even in parallel | pass | pass | the judge passed it and a discriminating test passes |
| C-3b4f2bde | test-fake-oidc › The token endpoint exchanges a code once, with PKCE and client authentication › Sixty seconds on the injected clock | pass | pass | the judge passed it and a discriminating test passes |
| C-868f25bb | test-fake-oidc › The token endpoint exchanges a code once, with PKCE and client authentication › Verifier and redirect mismatch | pass | pass | the judge passed it and a discriminating test passes |
| C-a6e0ee6b | test-fake-oidc › The token endpoint exchanges a code once, with PKCE and client authentication › Client authentication | pass | pass | the judge passed it and a discriminating test passes |
| C-e4b64277 | test-fake-oidc › The token endpoint exchanges a code once, with PKCE and client authentication › Bad requests | pass | pass | the judge passed it and a discriminating test passes |
| C-057cfe90 | test-fake-oidc › The token endpoint exchanges a code once, with PKCE and client authentication › Public client | pass | pass | the judge passed it and a discriminating test passes |
| C-c940079f | test-fake-oidc › Tokens carry the Keycloak claim shapes for the seed users › Alice's ID token | pass | pass | the judge passed it and a discriminating test passes |
| C-d7a517bf | test-fake-oidc › Tokens carry the Keycloak claim shapes for the seed users › The four seed users and stable subjects | pass | pass | the judge passed it and a discriminating test passes |
| C-5a6e5b58 | test-fake-oidc › Tokens carry the Keycloak claim shapes for the seed users › Scope and nonce gating, access token | pass | pass | the judge passed it and a discriminating test passes |
| C-e3681a90 | test-fake-oidc › Userinfo answers only for a live access token › Valid token | pass | pass | the judge passed it and a discriminating test passes |
| C-4fc3edb7 | test-fake-oidc › Userinfo answers only for a live access token › Refusals | pass | pass | the judge passed it and a discriminating test passes |
| C-9a6dc816 | test-fake-oidc › End-session ends the session and redirects only to registered URIs › Logout with redirect | pass | pass | the judge passed it and a discriminating test passes |
| C-674cee11 | test-fake-oidc › End-session ends the session and redirects only to registered URIs › Unregistered target or bad hint | pass | pass | the judge passed it and a discriminating test passes |
| C-a4d2ab09 | test-fake-oidc › End-session ends the session and redirects only to registered URIs › Post-logout URI and no target | pass | pass | the judge passed it and a discriminating test passes |
| C-271f3bbf | test-fake-oidc › mintToken builds tokens that are wrong in exactly one way › Valid by default | pass | pass | the judge passed it and a discriminating test passes |
| C-e5daba08 | test-fake-oidc › mintToken builds tokens that are wrong in exactly one way › Claim flaws | pass | pass | the judge passed it and a discriminating test passes |
| C-4b89bf6e | test-fake-oidc › mintToken builds tokens that are wrong in exactly one way › Signature flaws | pass | pass | the judge passed it and a discriminating test passes |
| C-940e29ee | test-fake-oidc › mintToken builds tokens that are wrong in exactly one way › Unknown user, client or flaw | pass | pass | the judge passed it and a discriminating test passes |
| C-a723b427 | test-fake-oidc › Secrets are per start and never recorded › Per-start values | pass | pass | the judge passed it and a discriminating test passes |
| C-642bcf7e | test-fake-oidc › Secrets are per start and never recorded › Redaction | pass | pass | the judge passed it and a discriminating test passes |
| C-ccee87e5 | test-fake-oidc › Secrets are per start and never recorded › Empty log | pass | pass | the judge passed it and a discriminating test passes |
| C-67d66ecd | test-fake-oidc › Secrets are per start and never recorded › Cap | pass | pass | the judge passed it and a discriminating test passes |
| C-34b4df4c | test-fake-oidc › The contract suite runs against any base URL › All checks pass on the fake | pass | pass | the judge passed it and a discriminating test passes |
| C-81c01272 | test-fake-oidc › The contract suite runs against any base URL › A broken provider fails | pass | pass | the judge passed it and a discriminating test passes |
| C-be50043b | test-fake-oidc › The contract suite runs against any base URL › Unreachable provider | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [major, judge] task 3.1: the jwks keys check inspects only the first key, not 'at least one' RS256 key (criterion C-34b4df4c): Task 3.1 check 2 requires that `keys` holds at least one key with `alg` RS256 and a non-empty kid, n and e. checkJwks asserts these on `keys[0]` only. Real Keycloak JWKS often lists an RSA-OAEP encryption key alongside the signing key, so the contract can fail against Keycloak even though a valid RS256 key is present.
- [minor, judge] Successful and error redirects are re-serialised by URL, so the Location can differ from the registered string (spec gap) (criterion C-63de56cb): redirectReply builds the Location with `new URL(redirectUri)` and `searchParams.set`. A redirect registered as `http://127.0.0.1:9` therefore gets `/` added, and an existing query is re-encoded. The criteria require exact string matching on input but do not pin the output form.
- [minor, judge] Sign-in POST reads username and password from the query before the form body (spec gap) (criterion C-ba36cf88): param() returns the query value when one exists and falls back to the form only otherwise. A POST with `username` or `password` in the query therefore ignores the posted form value.
- [minor, judge] verifyRs256 also requires the header kid to equal the JWK kid (spec gap) (criterion C-4b89bf6e): Design decision 5 says verifyRs256 is true for alg RS256 plus a matching signature. The implementation also returns false when the header kid differs from the JWK's kid, so a token signed by the right key under another kid fails. This affects how 'the current key's signature checks' can be shown for the unknown_kid flaw.
- [minor, judge] Oversized bodies are read to the end before the 413 (spec gap) (criterion C-69ae792e): readBody keeps consuming data after the limit is passed, discarding it, and answers only at `end`. A huge upload is fully received before the 413 is sent and the socket destroyed.
- [minor, judge] Leftover scaffold stub comments and a misleading close error code: jwt.ts and keys.ts still begin with 'Signature stub (milestone scaffold...)' although they are now implemented. close() rejects with FAKE_OIDC_START_FAILED when the server fails to close.
- [minor, judge] Userinfo accepts an ID token as the bearer (spec gap) (criterion C-4fc3edb7): liveAccessToken in session.ts checks the signature, iss, exp and sid, but never typ. A valid ID token (typ "ID") sent as a bearer gets a 200 profile, although the requirement says "live access token". No scenario pins this.
- [minor, judge] mintJwt treats an unknown kind as an ID token (spec gap) (criterion C-940e29ee): mintJwt picks access claims only when kind === "access". Any other value, for example "refresh" cast in, silently gives an ID token, where unknown user, client and flaw all throw.
- [minor, judge] wrong_nonce without a nonce yields "-mismatch" (spec gap) (criterion C-e5daba08): applyClaimFlaw writes `${nonce ?? ""}-mismatch`, so wrong_nonce with no nonce option gives nonce "-mismatch". No scenario covers it.
- [minor, judge] the judge called a test inadequate (criterion C-d4e4e5a6): test.support.fake-oidc.authorize.test.ts::C-d4e4e5a6 protocol errors redirect to the client with the unchanged state and no code

## New tests (red then green, `task.red_ok` in the ledger)

- `test.support.fake-oidc.authorize.test.ts::C-388a916a authorization rejects a redirect uri or client that is not an exact match` (task 2.2): passed
- `test.support.fake-oidc.authorize.test.ts::C-63de56cb redirects are stored as given and belong to their client` (task 2.2): passed
- `test.support.fake-oidc.authorize.test.ts::C-7e2314fa authorization GET renders the accessible Keycloak form for a valid request` (task 2.2): passed
- `test.support.fake-oidc.authorize.test.ts::C-ba36cf88 C-8905a65e wrong password and unknown user look alike and the password is never echoed` (task 2.2): passed
- `test.support.fake-oidc.authorize.test.ts::C-c07974a7 authorization POST signs alice in and redirects with a fresh one-use code` (task 2.2): passed
- `test.support.fake-oidc.authorize.test.ts::C-d4e4e5a6 protocol errors redirect to the client with the unchanged state and no code` (task 2.2): passed
- `test.support.fake-oidc.fake-oidc.test.ts::C-34b4df4c claims of the id token` (task 3.1): passed
- `test.support.fake-oidc.fake-oidc.test.ts::C-34b4df4c code flow with PKCE` (task 3.1): passed
- `test.support.fake-oidc.fake-oidc.test.ts::C-34b4df4c code is single use` (task 3.1): passed
- `test.support.fake-oidc.fake-oidc.test.ts::C-34b4df4c discovery document` (task 3.1): passed
- `test.support.fake-oidc.fake-oidc.test.ts::C-34b4df4c jwks keys` (task 3.1): passed
- `test.support.fake-oidc.fake-oidc.test.ts::C-34b4df4c logout ends the session` (task 3.1): passed
- `test.support.fake-oidc.fake-oidc.test.ts::C-34b4df4c plain PKCE is refused` (task 3.1): passed
- `test.support.fake-oidc.fake-oidc.test.ts::C-34b4df4c redirect uri must match exactly` (task 3.1): passed
- `test.support.fake-oidc.fake-oidc.test.ts::C-34b4df4c the contract exposes the ten named checks in the documented order` (task 3.1): passed
- `test.support.fake-oidc.fake-oidc.test.ts::C-34b4df4c userinfo with the access token` (task 3.1): passed
- `test.support.fake-oidc.fake-oidc.test.ts::C-34b4df4c wrong password shows the error` (task 3.1): passed
- `test.support.fake-oidc.fake-oidc.test.ts::C-642bcf7e a full flow records the request log with every secret redacted` (task 3.1): passed
- `test.support.fake-oidc.fake-oidc.test.ts::C-81c01272 a broken provider fails the discovery and jwks checks with AssertionError` (task 3.1): passed
- `test.support.fake-oidc.fake-oidc.test.ts::C-be50043b every contract check reports FAKE_OIDC_CONTRACT_UNREACHABLE for a closed port` (task 3.1): passed
- `test.support.fake-oidc.jwt.test.ts::C-271f3bbf an RS256 token round trips and verifies with its JWK` (task 1.1): passed
- `test.support.fake-oidc.jwt.test.ts::C-4b89bf6e a changed payload or a corrupt modulus fails verifyRs256 without throwing` (task 1.1): passed
- `test.support.fake-oidc.jwt.test.ts::C-4b89bf6e an HS256 token round trips and fails verifyRs256` (task 1.1): passed
- `test.support.fake-oidc.jwt.test.ts::C-4b89bf6e an alg none token has an empty signature and fails verifyRs256` (task 1.1): passed
- `test.support.fake-oidc.jwt.test.ts::C-4b89bf6e an unknown kid or a foreign key fails verifyRs256` (task 1.1): passed
- `test.support.fake-oidc.jwt.test.ts::FakeOidcError keeps its code message and cause` (task 1.1): passed
- `test.support.fake-oidc.jwt.test.ts::decodeJwt rejects malformed base64url and non JSON parts` (task 1.1): passed
- `test.support.fake-oidc.jwt.test.ts::decodeJwt rejects tokens without exactly three parts` (task 1.1): passed
- `test.support.fake-oidc.keys.test.ts::C-5938a11f rotate makes a new current key and jwks lists new then old` (task 1.2): passed
- `test.support.fake-oidc.keys.test.ts::C-5938a11f tokens from before and after rotation verify against their own keys` (task 1.2): passed
- `test.support.fake-oidc.keys.test.ts::C-a715e6d5 a token signed by the current key verifies and a foreign signature does not` (task 1.2): passed
- `test.support.fake-oidc.keys.test.ts::C-a715e6d5 foreign is stable and absent from the published JWKS` (task 1.2): passed
- `test.support.fake-oidc.keys.test.ts::C-a715e6d5 the current key is an RS256 signing key whose kid is the RFC 7638 thumbprint` (task 1.2): passed
- `test.support.fake-oidc.login-page.test.ts::C-7e2314fa login page has the Keycloak language title heading and exact controls` (task 1.5): passed
- `test.support.fake-oidc.login-page.test.ts::C-7e2314fa login page reflects a username and an error only when they are given` (task 1.5): passed
- `test.support.fake-oidc.login-page.test.ts::C-8905a65e login page escapes the reflected action username and error` (task 1.5): passed
- `test.support.fake-oidc.pkce.test.ts::C-868f25bb a verifier with a plus sign is rejected even when its challenge matches` (task 1.3): passed
- `test.support.fake-oidc.pkce.test.ts::C-868f25bb the RFC 7636 appendix B verifier produces its S256 challenge and verifies` (task 1.3): passed
- `test.support.fake-oidc.pkce.test.ts::C-868f25bb verifier lengths 43 and 128 verify and 42 and 129 do not` (task 1.3): passed
- `test.support.fake-oidc.pkce.test.ts::C-868f25bb verifyPkce rejects a wrong challenge and an empty challenge` (task 1.3): passed
- `test.support.fake-oidc.server.test.ts::C-0aaa91d6 default start binds loopback and serves realm discovery` (task 2.1): passed
- `test.support.fake-oidc.server.test.ts::C-1d9cc129 redirect registration validates the URI and the client` (task 2.1): passed
- `test.support.fake-oidc.server.test.ts::C-271f3bbf mintToken defaults to a valid alice id token for the engine client` (task 2.1): passed
- `test.support.fake-oidc.server.test.ts::C-2df38924 bad options reject with FAKE_OIDC_START_FAILED and leave no listener` (task 2.1): passed
- `test.support.fake-oidc.server.test.ts::C-5938a11f rotation keeps old tokens valid and publishes both keys` (task 2.1): passed
- `test.support.fake-oidc.server.test.ts::C-65cedd86 foreign Host unknown path and wrong method are refused` (task 2.1): passed
- `test.support.fake-oidc.server.test.ts::C-67d66ecd the request log keeps the newest 5000 entries and drops the oldest` (task 2.1): passed
- `test.support.fake-oidc.server.test.ts::C-69ae792e oversized bodies answer 413 and close while exactly 65536 bytes is allowed` (task 2.1): passed
- `test.support.fake-oidc.server.test.ts::C-7f218491 close is idempotent and complete while each fake has its own port and kid` (task 2.1): passed
- `test.support.fake-oidc.server.test.ts::C-852e549c discovery mirrors the Keycloak realm paths and capabilities` (task 2.1): passed

## Guard events

- guard.violation: test/support/fake-oidc/server.ts
- guard.violation: test/support/fake-oidc/token.ts
