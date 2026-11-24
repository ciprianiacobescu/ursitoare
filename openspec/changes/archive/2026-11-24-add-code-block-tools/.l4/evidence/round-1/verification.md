# Verification: openspec:add-code-block-tools: NEEDS_HUMAN (round 1)

traceability: 13/14 criteria covered by a discriminating test

- Base: `e8adf675493685ef3a5bd1f2cdecb2111691a8b3`
- Head: `c45bca95c9f321e6471658921778b2e3758c8457`
- Implementer profiles: beam, claude-sonnet, deepseek-free
- Judge: nemotron-judge, 2 call(s), judged in 2 parts, prompt sha256 `9ded11f858edd77c3725165a287ca8ae6ee6754ed7600de005801159ae1af997`
  - part 1: 23 file(s), 116210 characters, profile nemotron-judge, reply repaired
  - part 2: 7 file(s), 39846 characters, profile nemotron-judge, reply repaired
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 2, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), beam reflection (declared), claude-sonnet anthropic (tool), deepseek-free deepseek (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@e8adf67549 contained |
| 1 | integrity | ok | 323.3 | 11 sub-checks (+1 unfrozen by human answers); scope: 38 changed file(s) |
| 2 | build | ok | 38.8 |  |
| 3 | tests | ok | 501.0 |  |
| 4 | traceability | ok | 0.2 | 13/14 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/code-block-routes.ts, src/api/credential-routes.ts, src/api/index.ts, src/authoring/index.ts, src/authoring/validate/code-source.ts and 9 more |
| 8 | s1 judge | ok | 1.2 | 13/14 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 475.7 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261124T0721Z-f179/014-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261124T0721Z-f179/015-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261124T0721Z-f179/016-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261124T0721Z-f179/017-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261124T0721Z-f179/018-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261124T0721Z-f179/019-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261124T0721Z-f179/020-e2e.log |

## Files by part

- part 1: src/db/migrations/0550_credential_scheme.sql (321 characters)
- part 1: src/runtimes/invoke/code.test.ts (6505 characters)
- part 1: src/runtimes/invoke/code.ts (1819 characters)
- part 1: src/runtimes/invoke/code-block.db.test.ts (9701 characters)
- part 1: src/api/code-block-routes.test.ts (18026 characters)
- part 1: src/api/code-block-routes.ts (7774 characters)
- part 1: src/authoring/validate/code-source.test.ts (4109 characters)
- part 1: src/authoring/validate/code-source.ts (2848 characters)
- part 1: src/api/credential-refusal.test.ts (7313 characters)
- part 1: src/api/credential-rotate-scheme.test.ts (9497 characters)
- part 1: src/api/credential-routes.ts (2368 characters)
- part 1: src/api/index.ts (725 characters)
- part 1: src/authoring/index.ts (660 characters)
- part 1: src/runtimes/index.ts (333 characters)
- part 1: src/tools/index.ts (776 characters)
- part 1: src/main.codeblocks.test.ts (5223 characters)
- part 1: src/main.conventions.test.ts (663 characters)
- part 1: src/main.ts (2251 characters)
- part 1: docs/api/openapi.json (16031 characters)
- part 1: src/api/people-openapi.test.ts (647 characters)
- part 1: src/credentials/provision.ts (1218 characters)
- part 1: src/credentials/provision-code-block.test.ts (6661 characters)
- part 1: src/tools/code/register.db.test.ts (10741 characters)
- part 2: src/tools/code/register.test.ts (3791 characters)
- part 2: src/tools/code/register.ts (2825 characters)
- part 2: src/credentials/rotate.ts (3079 characters)
- part 2: src/credentials/rotate-scheme.test.ts (14108 characters)
- part 2: openspec/changes/add-code-block-tools/tasks.md (13360 characters)
- part 2: src/credentials/types.ts (460 characters)
- part 2: src/credentials/validate.ts (2223 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 2 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 7 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 7 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/code-block-routes.test.ts, src/api/code-block-routes.ts, src/api/credential-refusal.test.ts, src/api/credential-rotate-scheme.test.ts, src/api/credential-routes.ts (+22 more) |
| tdd history | ok | 7 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 2980 of 2980 base tests pass on the unit's code with its 10 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/api/people-openapi.test.ts kept at head for the run (task 6.1: unfrozen by Q-002)
- src/main.conventions.test.ts kept at head for the run (task 6.1: unfrozen by Q-002)
- src/tools/code/register.db.test.ts kept at head for the run (task 2.1: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/tools/code/register.db.test.ts (task 2.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-aebcc921 | credentials › Credential references are stored per tenant and hold no value › Migration 0480 stores references and no value | uncovered | - | src.credentials.schema.test.ts::C-aebcc921 migration 0480 stores references and no value (no proof that it discriminates (no red, audit or generated record)) | 0.03 |
| C-bc2e752b | credentials › Credential references are stored per tenant and hold no value › Migration 0550 lets the app role change the scheme and header and nothing else | covered | src.credentials.rotate-scheme.test.ts::C-bc2e752b migration 0550 lets the app role change the scheme and header and nothing else (passed, red_assertion) | - | 0.92 |
| C-bf4aafd0 | credentials › A code-block server takes no credential › Provisioning for a code-block server is refused before the vault and a fixture server still provisions | covered | src.api.credential-refusal.test.ts::C-bf4aafd0 the credential route refuses a code block server with OPERATION_REFUSED (passed, red_assertion); src.credentials.provision-code-block.test.ts::C-bf4aafd0 a code block server is refused before the vault while a fixture server provisions (passed, red_asse... | - | 0.90 |
| C-4450f7f8 | credentials › A rotation can change the scheme and the header name, and records them without the value › A rotation changes the scheme and header, refuses a bad pair and a value-only rotation is as before | covered | src.api.credential-rotate-scheme.test.ts::C-4450f7f8 the rotate route changes the scheme and header and refuses a bad pair (passed, red_assertion); src.credentials.rotate-scheme.test.ts::C-4450f7f8 a rotation changes the scheme and header and a value-only rotation is as before (passed, red_assertion... | - | 0.92 |
| C-2e402f84 | tool-code › A code-block surface fixes the trust flags and is registered through the adapter seam › The builder fixes the flags and the digest covers the source | covered | src.tools.code.register.test.ts::C-2e402f84 codeBlockSurface fixes the flags and covers the source, rows B1 to B6 (passed, red_assertion) | - | 0.91 |
| C-548b8f7f | tool-code › A code-block surface fixes the trust flags and is registered through the adapter seam › A server registers pending, a changed source drifts it and each refusal writes nothing | covered | src.tools.code.register.db.test.ts::C-548b8f7f: BIG_OK registers pending (passed, red_assertion); src.tools.code.register.db.test.ts::C-548b8f7f: registerCodeBlockServerTx refuses bad inputs, rows F1 to F8 (passed, red_assertion); src.tools.code.register.db.test.ts::C-548b8f7f: registerCodeBlockServ... | - | 0.89 |
| C-d12dba13 | tool-code › codeSourceProblems reports what L1 reports about a code source › The problems equal L1's and a quoted bad character is made well-formed | covered | src.authoring.validate.code-source.test.ts::C-d12dba13 codeSourceProblems matches L1 on P1 to P10 (passed, red_assertion); src.authoring.validate.code-source.test.ts::C-d12dba13 codeSourceProblems sanitizes P11 and P12 (passed, red_assertion) | - | 0.91 |
| C-8e70f1b7 | tool-code › The code runner runs one source in the sandbox pool and maps every fault › The output, the seed and the clock are the step's, and every failure has fixed details | covered | src.runtimes.invoke.code.test.ts::C-8e70f1b7 E1 a runtime_error fails the node with fixed details (passed, red_assertion); src.runtimes.invoke.code.test.ts::C-8e70f1b7 E2 a syntax_error fails the node with fixed details (passed, red_assertion); src.runtimes.invoke.code.test.ts::C-8e70f1b7 E3 a outpu... | - | - |
| C-0b23a940 | tool-code › A granted code block runs through the invoke path with no permit, no token and no egress › A granted code block runs in a dry run and nothing leaves the engine | covered | src.runtimes.invoke.code-block.db.test.ts::C-0b23a940 C-0e290b4f V4 and V5 a failing source has fixed details and an ungranted block is denied (passed, red_assertion); src.runtimes.invoke.code-block.db.test.ts::C-0b23a940 C-4701952e V1 and V3 a granted block runs with no permit and its taint follows... | - | 0.86 |
| C-0e290b4f | tool-code › A granted code block runs through the invoke path with no permit, no token and no egress › An ungranted code block is denied before its code runs | covered | src.runtimes.invoke.code-block.db.test.ts::C-0b23a940 C-0e290b4f V4 and V5 a failing source has fixed details and an ungranted block is denied (passed, red_assertion) | - | 0.88 |
| C-4701952e | tool-code › A trusted code block cannot launder taint › An untrusted input gives an untrusted output at runtime | covered | src.runtimes.invoke.code-block.db.test.ts::C-0b23a940 C-4701952e V1 and V3 a granted block runs with no permit and its taint follows the input (passed, red_assertion) | - | 0.91 |
| C-20948fad | tool-code › The routes register and update a code-block server for tenant admins › Carol registers and updates, a replay follows its key and each bad body has one fixed field | covered | src.api.code-block-routes.test.ts::C-20948fad carol registers a code block server and a replay follows its key (passed, red_assertion); src.api.code-block-routes.test.ts::C-20948fad each bad code registration body has one fixed field (passed, red_assertion) | - | 0.86 |
| C-043a8b91 | tool-code › The routes register and update a code-block server for tenant admins › Who may use the routes, and each refusal of an existing server | covered | src.api.code-block-routes.test.ts::C-043a8b91 a null route pool answers the code registration with 503 (passed, red_assertion); src.api.code-block-routes.test.ts::C-043a8b91 only tenant admins mutate a code block server and other adapters are refused (passed, red_assertion) | - | 0.82 |
| C-46d522e4 | tool-code › main wires the runner and the routes and the document lists them › main registers the routes, passes the pool getter and the document lists the routes | covered | src.main.codeblocks.test.ts::C-46d522e4 main defines both code block routes with every error registered (passed, red_assertion); src.main.codeblocks.test.ts::C-46d522e4 main passes the code runner getter and registers the routes after the tool server routes (passed, red_assertion); src.main.codebloc... | - | 0.95 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-block-tools/.l4/ledger/r-20261123T2052Z-a278.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-block-tools/.l4/ledger/r-20261123T2308Z-9bd2.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-block-tools/.l4/ledger/r-20261123T2332Z-65e6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-block-tools/.l4/ledger/r-20261124T0148Z-a436.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-block-tools/.l4/ledger/r-20261124T0404Z-afe1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-block-tools/.l4/ledger/r-20261124T0634Z-0e03.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-block-tools/.l4/ledger/r-20261124T0721Z-f179.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-block-tools/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-block-tools/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/code-block-routes.test.ts` |  | relevant | new test file |
| `src/api/code-block-routes.ts` | api | relevant | named in the spec |
| `src/api/credential-refusal.test.ts` |  | relevant | new test file |
| `src/api/credential-rotate-scheme.test.ts` |  | relevant | new test file |
| `src/api/credential-routes.ts` | api | relevant | named in the spec |
| `src/api/index.ts` | api | relevant | named in the spec |
| `src/api/people-openapi.test.ts` |  | none | imports no module of the repository |
| `src/authoring/index.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/code-source.test.ts` |  | relevant | new test file |
| `src/authoring/validate/code-source.ts` | authoring | relevant | named in the spec |
| `src/credentials/provision-code-block.test.ts` |  | relevant | new test file |
| `src/credentials/provision.ts` | credentials | relevant | named in the spec |
| `src/credentials/rotate-scheme.test.ts` |  | relevant | new test file |
| `src/credentials/rotate.ts` | credentials | relevant | named in the spec |
| `src/credentials/types.ts` | credentials | relevant | named in the spec |
| `src/credentials/validate.ts` | credentials | relevant | named in the spec |
| `src/db/migrations/0550_credential_scheme.sql` | db | relevant | named in the spec |
| `src/main.codeblocks.test.ts` |  | relevant | new test file |
| `src/main.conventions.test.ts` |  | relevant | named in the spec |
| `src/main.ts` | main | relevant | named in the spec |
| `src/runtimes/index.ts` | runtimes | relevant | named in the spec |
| `src/runtimes/invoke/code-block.db.test.ts` |  | relevant | new test file |
| `src/runtimes/invoke/code.test.ts` |  | relevant | new test file |
| `src/runtimes/invoke/code.ts` | runtimes | relevant | named in the spec |
| `src/tools/code/register.db.test.ts` |  | relevant | new test file |
| `src/tools/code/register.test.ts` |  | relevant | new test file |
| `src/tools/code/register.ts` | tools | relevant | named in the spec |
| `src/tools/index.ts` | tools | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/code-block-routes.ts, src/api/credential-routes.ts, src/api/index.ts, src/authoring/index.ts, src/authoring/validate/code-source.ts and 9 more

### Tests

3133 of 3133 passed, 0 failed, 0 errored, 0 skipped.
32 of 32 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-aebcc921 | ok | 0.030 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bc2e752b | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bf4aafd0 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4450f7f8 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2e402f84 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-548b8f7f | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d12dba13 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8e70f1b7 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-0b23a940 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0e290b4f | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4701952e | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-20948fad | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-043a8b91 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-46d522e4 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-aebcc921 | credentials › Credential references are stored per tenant and hold no value › Migration 0480 stores references and no value | insufficient_evidence | needs_human | uncovered: no adequate discriminating test traces it |
| C-bc2e752b | credentials › Credential references are stored per tenant and hold no value › Migration 0550 lets the app role change the scheme and header and nothing else | pass | pass | the judge passed it and a discriminating test passes |
| C-bf4aafd0 | credentials › A code-block server takes no credential › Provisioning for a code-block server is refused before the vault and a fixture server still provisions | pass | pass | the judge passed it and a discriminating test passes |
| C-4450f7f8 | credentials › A rotation can change the scheme and the header name, and records them without the value › A rotation changes the scheme and header, refuses a bad pair and a value-only rotation is as before | pass | pass | the judge passed it and a discriminating test passes |
| C-2e402f84 | tool-code › A code-block surface fixes the trust flags and is registered through the adapter seam › The builder fixes the flags and the digest covers the source | pass | pass | the judge passed it and a discriminating test passes |
| C-548b8f7f | tool-code › A code-block surface fixes the trust flags and is registered through the adapter seam › A server registers pending, a changed source drifts it and each refusal writes nothing | pass | pass | the judge passed it and a discriminating test passes |
| C-d12dba13 | tool-code › codeSourceProblems reports what L1 reports about a code source › The problems equal L1's and a quoted bad character is made well-formed | pass | pass | the judge passed it and a discriminating test passes |
| C-8e70f1b7 | tool-code › The code runner runs one source in the sandbox pool and maps every fault › The output, the seed and the clock are the step's, and every failure has fixed details | pass | pass | the judge passed it and a discriminating test passes |
| C-0b23a940 | tool-code › A granted code block runs through the invoke path with no permit, no token and no egress › A granted code block runs in a dry run and nothing leaves the engine | pass | pass | the judge passed it and a discriminating test passes |
| C-0e290b4f | tool-code › A granted code block runs through the invoke path with no permit, no token and no egress › An ungranted code block is denied before its code runs | pass | pass | the judge passed it and a discriminating test passes |
| C-4701952e | tool-code › A trusted code block cannot launder taint › An untrusted input gives an untrusted output at runtime | pass | pass | the judge passed it and a discriminating test passes |
| C-20948fad | tool-code › The routes register and update a code-block server for tenant admins › Carol registers and updates, a replay follows its key and each bad body has one fixed field | pass | pass | the judge passed it and a discriminating test passes |
| C-043a8b91 | tool-code › The routes register and update a code-block server for tenant admins › Who may use the routes, and each refusal of an existing server | pass | pass | the judge passed it and a discriminating test passes |
| C-46d522e4 | tool-code › main wires the runner and the routes and the document lists them › main registers the routes, passes the pool getter and the document lists the routes | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-aebcc921): src.credentials.schema.test.ts::C-aebcc921 migration 0480 stores references and no value: no proof that it discriminates (no red, audit or generated record)
- [minor, judge] rotation with an empty change object {} is not pinned by any scenario (spec gap) (criterion C-4450f7f8): No scenario pins rotateCredential called with change = {} (an object with no members). The spec says the event is {serviceId, keyVersion} when change has no member, but the code treats change !== undefined as a change and emits the 4-member payload {serviceId, keyVersion, authScheme, headerName} taken from the row. Two reasonable implementations differ and no scenario covers this input.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.code-block-routes.test.ts::C-043a8b91 a null route pool answers the code registration with 503` (task 5.1): passed
- `src.api.code-block-routes.test.ts::C-043a8b91 only tenant admins mutate a code block server and other adapters are refused` (task 5.1): passed
- `src.api.code-block-routes.test.ts::C-20948fad carol registers a code block server and a replay follows its key` (task 5.1): passed
- `src.api.code-block-routes.test.ts::C-20948fad each bad code registration body has one fixed field` (task 5.1): passed
- `src.api.credential-refusal.test.ts::C-bf4aafd0 the credential route refuses a code block server with OPERATION_REFUSED` (task 4.1): passed
- `src.api.credential-rotate-scheme.test.ts::C-4450f7f8 the rotate route changes the scheme and header and refuses a bad pair` (task 4.2): passed
- `src.authoring.validate.code-source.test.ts::C-d12dba13 codeSourceProblems matches L1 on P1 to P10` (task 1.1): passed
- `src.authoring.validate.code-source.test.ts::C-d12dba13 codeSourceProblems sanitizes P11 and P12` (task 1.1): passed
- `src.credentials.provision-code-block.test.ts::C-bf4aafd0 a code block server is refused before the vault while a fixture server provisions` (task 4.1): passed
- `src.credentials.rotate-scheme.test.ts::C-4450f7f8 a rotation changes the scheme and header and a value-only rotation is as before` (task 4.2): passed
- `src.credentials.rotate-scheme.test.ts::C-4450f7f8 rotation refusals change no row vault entry or event` (task 4.2): passed
- `src.credentials.rotate-scheme.test.ts::C-bc2e752b migration 0550 lets the app role change the scheme and header and nothing else` (task 4.2): passed
- `src.main.codeblocks.test.ts::C-46d522e4 main defines both code block routes with every error registered` (task 6.1): passed
- `src.main.codeblocks.test.ts::C-46d522e4 main passes the code runner getter and registers the routes after the tool server routes` (task 6.1): passed
- `src.main.codeblocks.test.ts::C-46d522e4 the committed document lists both code block routes and equals the served text` (task 6.1): passed
- `src.runtimes.invoke.code-block.db.test.ts::C-0b23a940 C-0e290b4f V4 and V5 a failing source has fixed details and an ungranted block is denied` (task 3.1): passed
- `src.runtimes.invoke.code-block.db.test.ts::C-0b23a940 C-4701952e V1 and V3 a granted block runs with no permit and its taint follows the input` (task 3.1): passed
- `src.runtimes.invoke.code.test.ts::C-8e70f1b7 E1 a runtime_error fails the node with fixed details` (task 3.1): passed
- `src.runtimes.invoke.code.test.ts::C-8e70f1b7 E2 a syntax_error fails the node with fixed details` (task 3.1): passed
- `src.runtimes.invoke.code.test.ts::C-8e70f1b7 E3 a output_invalid fails the node with fixed details` (task 3.1): passed
- `src.runtimes.invoke.code.test.ts::C-8e70f1b7 E4 a output_too_large fails the node with fixed details` (task 3.1): passed
- `src.runtimes.invoke.code.test.ts::C-8e70f1b7 E5 a timeout fails the node with fixed details` (task 3.1): passed
- `src.runtimes.invoke.code.test.ts::C-8e70f1b7 E6 a stack_overflow fails the node with fixed details` (task 3.1): passed
- `src.runtimes.invoke.code.test.ts::C-8e70f1b7 N1 a null pool rejects and the same runner works once the pool exists` (task 3.1): passed
- `src.runtimes.invoke.code.test.ts::C-8e70f1b7 N2 a closed pool is sandbox_unavailable` (task 3.1): passed
- `src.runtimes.invoke.code.test.ts::C-8e70f1b7 O1 runs the source on the pool with the limits and the step options` (task 3.1): passed
- `src.runtimes.invoke.code.test.ts::C-8e70f1b7 O2 the seed and the clock are the step's` (task 3.1): passed
- `src.tools.code.register.db.test.ts::C-548b8f7f: BIG_OK registers pending` (task 2.1): passed
- `src.tools.code.register.db.test.ts::C-548b8f7f: registerCodeBlockServerTx refuses bad inputs, rows F1 to F8` (task 2.1): passed
- `src.tools.code.register.db.test.ts::C-548b8f7f: registerCodeBlockServerTx registers snips pending, rows R1 to R4` (task 2.1): passed
- `src.tools.code.register.db.test.ts::C-548b8f7f: submitCodeBlocksTx refuses missing, fixture and mismatched servers, rows G1 to G3` (task 2.1): passed
- `src.tools.code.register.test.ts::C-2e402f84 codeBlockSurface fixes the flags and covers the source, rows B1 to B6` (task 2.1): passed

## Guard events

- guard.violation: src/authoring/index.ts
- guard.violation: src/authoring/validate/code-source.ts
- guard.violation: src/authoring/validate/index.ts
- guard.violation: src/runtimes/index.ts
- guard.violation: src/runtimes/invoke/code.ts
