# Verification: openspec:add-http-openapi-tools: PASS (round 1)

traceability: 13/13 criteria covered by a discriminating test

- Base: `8caa74279e57f25afc61587e6d82582571f20077`
- Head: `1b1f67b207c16690f9e54f37f72840098f52370a`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: nemotron-judge, 6 call(s), judged in 2 parts and 1 follow-up, prompt sha256 `751754767ff3176716b5d7e3cb1ba26675eb65a41b29b245709e48f0c5300cb6`
  - part 1: 16 file(s), 105451 characters, profile nemotron-judge, reply repaired
  - part 2: 6 file(s), 58260 characters, profile nemotron-judge, reply repaired
  - follow-up 1: C-c13efd06; files of parts 1 and 2: 4 file(s), 25825 characters, profile nemotron-judge, reply retried
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 3, retried 1, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@8caa74279e contained |
| 1 | integrity | ok | 271.2 | 11 sub-checks (+1 unfrozen by human answers); scope: 27 changed file(s) |
| 2 | build | ok | 33.7 |  |
| 3 | tests | ok | 438.2 |  |
| 4 | traceability | ok | 0.2 | 13/13 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/index.ts, src/api/openapi-tool-routes.ts, src/main.ts, src/tools/http/adapter.ts, src/tools/index.ts and 4 more |
| 8 | s1 judge | ok | 1.2 | 9/13 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 705.1 | 6 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261123T0024Z-5a98/014-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261123T0024Z-5a98/015-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261123T0024Z-5a98/016-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261123T0024Z-5a98/017-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261123T0024Z-5a98/018-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261123T0024Z-5a98/019-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261123T0024Z-5a98/020-e2e.log |

## Files by part

- part 1: src/tools/http/adapter.ts (5072 characters)
- part 1: src/tools/http/adapter-answer.test.ts (2254 characters)
- part 1: src/tools/http/adapter-build.test.ts (8037 characters)
- part 1: src/tools/http/exit13.db.test.ts (9503 characters)
- part 1: src/tools/openapi/import.test.ts (12682 characters)
- part 1: src/api/index.ts (720 characters)
- part 1: src/tools/index.ts (797 characters)
- part 1: src/main.conventions.test.ts (753 characters)
- part 1: src/main.openapi-tools.test.ts (1889 characters)
- part 1: src/main.ts (1990 characters)
- part 1: docs/api/openapi.json (18004 characters)
- part 1: test/support/openapi-kit.ts (4141 characters)
- part 1: src/api/openapi-tool-routes.test.ts (16614 characters)
- part 1: src/api/openapi-tool-routes.ts (8708 characters)
- part 1: src/api/people-openapi.test.ts (647 characters)
- part 1: src/tools/openapi/read.test.ts (13640 characters)
- part 2: src/tools/openapi/read.ts (18282 characters)
- part 2: src/tools/openapi/register.db.test.ts (12477 characters)
- part 2: src/tools/openapi/register.ts (3048 characters)
- part 2: src/tools/openapi/schema.test.ts (9379 characters)
- part 2: src/tools/openapi/schema.ts (7311 characters)
- part 2: openspec/changes/add-http-openapi-tools/tasks.md (7763 characters)

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
| suppressions | skipped | not checked: python only; changed files outside it: src/api/index.ts, src/api/openapi-tool-routes.test.ts, src/api/openapi-tool-routes.ts, src/api/people-openapi.test.ts, src/main.conventions.test.ts (+15 more) |
| tdd history | ok | 7 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 2809 of 2809 base tests pass on the unit's code with its 8 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/api/openapi-tool-routes.test.ts kept at head for the run (task 4.1: unfrozen by Q-001)
- src/api/people-openapi.test.ts kept at head for the run (task 5.1: unfrozen by Q-002)
- src/main.conventions.test.ts kept at head for the run (task 5.1: unfrozen by Q-002)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/api/openapi-tool-routes.test.ts (task 4.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-915da487 | tool-http › readOpenApi lists the operations of an uploaded document and the first exclusion of each › Versions, base paths and document refusals | covered | src.tools.openapi.read.test.ts::C-320b5077 C-915da487 the tools index exports readOpenApi and it reads SHOP_DOC (passed, red_assertion); src.tools.openapi.read.test.ts::C-915da487 B1 server urls give their base path (passed, red_assertion); src.tools.openapi.read.test.ts::C-915da487 B2 a 3.1 documen... | - | - |
| C-a85a9aff | tool-http › readOpenApi lists the operations of an uploaded document and the first exclusion of each › Each exclusion, in order | covered | src.tools.openapi.read.test.ts::C-a85a9aff K1 operations that stay are not excluded (passed, red_assertion); src.tools.openapi.read.test.ts::C-a85a9aff X1 a missing or nameless operationId is no_operation_id (passed, red_assertion); src.tools.openapi.read.test.ts::C-a85a9aff X10 a parameter or body ... | - | - |
| C-8aae211d | tool-http › translateSchema turns an OpenAPI schema into a plain JSON Schema or says why not › Translation vectors | covered | src.tools.openapi.schema.test.ts::C-320b5077 C-8aae211d the tools index exports translateSchema and it translates a string (passed, red_assertion); src.tools.openapi.schema.test.ts::C-8aae211d T1 nullable string becomes a type union that accepts null and string (passed, red_assertion); src.tools.ope... | - | - |
| C-6e0f418b | tool-http › importOpenApi builds one http tool per overlay entry › A tool per overlay entry | covered | src.tools.openapi.import.test.ts::C-320b5077 C-6e0f418b the tools index exports importOpenApi and it imports SHOP_DOC (passed, red_assertion); src.tools.openapi.import.test.ts::C-6e0f418b M1 gives the four tools of SHOP_OVERLAY and digest D_SHOP (passed, red_assertion); src.tools.openapi.import.test... | - | 0.93 |
| C-fb6c45df | tool-http › importOpenApi builds one http tool per overlay entry › Each overlay and size refusal | covered | src.tools.openapi.import.test.ts::C-fb6c45df O1 an overlay that is not an operations object (passed, red_assertion); src.tools.openapi.import.test.ts::C-fb6c45df O2 operations must be an object of 1 to 100 entries (passed, red_assertion); src.tools.openapi.import.test.ts::C-fb6c45df O3 an entry need... | - | 0.89 |
| C-17c28968 | tool-http › build turns arguments into the one request, with path and body independent of the key › Request vectors, refusals and the length bound | covered | src.tools.http.adapter-build.test.ts.httpCallAdapter build::C-17c28968 W1 a templated GET has the path and accept header, with and without a key (passed, red_assertion); src.tools.http.adapter-build.test.ts.httpCallAdapter build::C-17c28968 W2 values are encoded, null is left out and extra arguments... | - | - |
| C-26f73edc | tool-http › answer maps a response to an output or a failure › Answer vectors | covered | src.tools.http.adapter-answer.test.ts.httpCallAdapter answer::C-26f73edc a 2xx that is not a JSON object is not_json (passed, red_assertion); src.tools.http.adapter-answer.test.ts.httpCallAdapter answer::C-26f73edc a 2xx with a JSON object gives the output (passed, red_assertion); src.tools.http.ada... | - | 0.90 |
| C-bdcd9f62 | tool-http › registerOpenApiServerTx and submitOpenApiTx store the imported surface through the adapter seam › Registering, replacing and each refusal | covered | src.tools.openapi.register.db.test.ts::C-bdcd9f62: registerOpenApiServerTx refuses each bad input and writes nothing, rows F1 to F6 (passed, red_assertion); src.tools.openapi.register.db.test.ts::C-bdcd9f62: registerOpenApiServerTx registers shop pending with four tools, row G1 (passed, red_assertio... | - | 0.91 |
| C-1f964937 | tool-http › Three routes preview, register and replace an OpenAPI server › Preview, register, replay and replace | covered | src.api.openapi-tool-routes.test.ts::C-1f964937 P1 carol previews SHOP_DOC and nothing is stored (passed, red_assertion); src.api.openapi-tool-routes.test.ts::C-1f964937 P2 carol registers shop, the replay is the same and a new key or body is refused (passed, red_assertion); src.api.openapi-tool-rou... | - | 0.91 |
| C-7b1bd327 | tool-http › Three routes preview, register and replace an OpenAPI server › Route refusals | covered | src.api.openapi-tool-routes.test.ts::C-7b1bd327 P4 a replace of a missing or fixture server is refused (passed, red_assertion); src.api.openapi-tool-routes.test.ts::C-7b1bd327 P4 alice is forbidden, tenant b is isolated and a huge document is 413 (passed, red_assertion); src.api.openapi-tool-routes.... | - | 0.91 |
| C-320b5077 | tool-http › The engine wires the adapter and the routes and the API document lists them › The index files export the names | covered | src.tools.openapi.import.test.ts::C-320b5077 C-6e0f418b the tools index exports importOpenApi and it imports SHOP_DOC (passed, red_assertion); src.tools.openapi.import.test.ts::C-320b5077 HTTP_EMPTY_OUTPUT is exported by the tools index with additionalProperties false (passed, red_assertion); src.to... | - | 0.61 |
| C-dcacef6b | tool-http › The engine wires the adapter and the routes and the API document lists them › The document and main | covered | src.main.openapi-tools.test.ts::C-dcacef6b main passes the http adapter in calls to createInvokePath (passed, red_assertion); src.main.openapi-tools.test.ts::C-dcacef6b the committed document holds the three OpenAPI tool operations (passed, red_assertion); src.main.openapi-tools.test.ts::C-dcacef6b ... | - | 0.93 |
| C-c13efd06 | tool-http › An OpenAPI tool's request equals its permit › A templated GET, a POST with a body, a url argument and a refused path | covered | src.tools.http.exit13.db.test.ts::C-c13efd06: an OpenAPI tool's request equals its permit, rows E1 to E5 (passed, red_assertion) | - | 0.90 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-http-openapi-tools/.l4/ledger/r-20261122T1911Z-73bc.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-http-openapi-tools/.l4/ledger/r-20261122T2129Z-a20e.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-http-openapi-tools/.l4/ledger/r-20261122T2330Z-2571.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-http-openapi-tools/.l4/ledger/r-20261123T0024Z-5a98.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-http-openapi-tools/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-http-openapi-tools/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/index.ts` | api | relevant | named in the spec |
| `src/api/openapi-tool-routes.test.ts` |  | relevant | new test file |
| `src/api/openapi-tool-routes.ts` | api | relevant | named in the spec |
| `src/api/people-openapi.test.ts` |  | none | imports no module of the repository |
| `src/main.conventions.test.ts` |  | relevant | named in the spec |
| `src/main.openapi-tools.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `src/tools/http/adapter-answer.test.ts` |  | relevant | new test file |
| `src/tools/http/adapter-build.test.ts` |  | relevant | new test file |
| `src/tools/http/adapter.ts` | tools | relevant | named in the spec |
| `src/tools/http/exit13.db.test.ts` |  | relevant | new test file |
| `src/tools/index.ts` | tools | relevant | named in the spec |
| `src/tools/openapi/import.test.ts` |  | relevant | new test file |
| `src/tools/openapi/read.test.ts` |  | relevant | new test file |
| `src/tools/openapi/read.ts` | tools | relevant | named in the spec |
| `src/tools/openapi/register.db.test.ts` |  | relevant | new test file |
| `src/tools/openapi/register.ts` | tools | relevant | named in the spec |
| `src/tools/openapi/schema.test.ts` |  | relevant | new test file |
| `src/tools/openapi/schema.ts` | tools | relevant | named in the spec |
| `test/support/openapi-kit.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/index.ts, src/api/openapi-tool-routes.ts, src/main.ts, src/tools/http/adapter.ts, src/tools/index.ts and 4 more

### Tests

3014 of 3014 passed, 0 failed, 0 errored, 0 skipped.
87 of 87 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-915da487 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-a85a9aff | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-8aae211d | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-6e0f418b | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fb6c45df | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-17c28968 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-26f73edc | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bdcd9f62 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1f964937 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7b1bd327 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-320b5077 | ok | 0.610 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dcacef6b | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c13efd06 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-915da487 | tool-http › readOpenApi lists the operations of an uploaded document and the first exclusion of each › Versions, base paths and document refusals | pass | pass | the judge passed it and a discriminating test passes |
| C-a85a9aff | tool-http › readOpenApi lists the operations of an uploaded document and the first exclusion of each › Each exclusion, in order | pass | pass | the judge passed it and a discriminating test passes |
| C-8aae211d | tool-http › translateSchema turns an OpenAPI schema into a plain JSON Schema or says why not › Translation vectors | pass | pass | the judge passed it and a discriminating test passes |
| C-6e0f418b | tool-http › importOpenApi builds one http tool per overlay entry › A tool per overlay entry | pass | pass | the judge passed it and a discriminating test passes |
| C-fb6c45df | tool-http › importOpenApi builds one http tool per overlay entry › Each overlay and size refusal | pass | pass | the judge passed it and a discriminating test passes |
| C-17c28968 | tool-http › build turns arguments into the one request, with path and body independent of the key › Request vectors, refusals and the length bound | pass | pass | the judge passed it and a discriminating test passes |
| C-26f73edc | tool-http › answer maps a response to an output or a failure › Answer vectors | pass | pass | the judge passed it and a discriminating test passes |
| C-bdcd9f62 | tool-http › registerOpenApiServerTx and submitOpenApiTx store the imported surface through the adapter seam › Registering, replacing and each refusal | pass | pass | the judge passed it and a discriminating test passes |
| C-1f964937 | tool-http › Three routes preview, register and replace an OpenAPI server › Preview, register, replay and replace | pass | pass | the judge passed it and a discriminating test passes |
| C-7b1bd327 | tool-http › Three routes preview, register and replace an OpenAPI server › Route refusals | pass | pass | the judge passed it and a discriminating test passes |
| C-320b5077 | tool-http › The engine wires the adapter and the routes and the API document lists them › The index files export the names | pass | pass | the judge passed it and a discriminating test passes |
| C-dcacef6b | tool-http › The engine wires the adapter and the routes and the API document lists them › The document and main | pass | pass | the judge passed it and a discriminating test passes |
| C-c13efd06 | tool-http › An OpenAPI tool's request equals its permit › A templated GET, a POST with a body, a url argument and a refused path | pass | pass | the judge passed it and a discriminating test passes; its evidence was split over parts 1 and 2 of the diff: follow-up call 1 judged its 4 files of those parts together and answered pass |

## Findings

- [minor, judge] missing whitespace in main.ts assignment (criterion C-dcacef6b): src/main.ts contains `const egress =config.egress;` (no space around `=`), which is valid JavaScript but a style nit inconsistent with the surrounding code.
- [minor, judge] registerOpenApiServerTx origin handling for non-string origin is unspecified (spec gap) (criterion C-bdcd9f62): No scenario pins down a non-string origin. The code throws TOOLS_INVALID { field: "origin", reason: "not_url" } before calling validateOrigin, while another reasonable implementation would delegate to validateOrigin. Two implementations differ here.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.openapi-tool-routes.test.ts::C-1f964937 P1 carol previews SHOP_DOC and nothing is stored` (task 4.1): passed
- `src.api.openapi-tool-routes.test.ts::C-1f964937 P2 carol registers shop, the replay is the same and a new key or body is refused` (task 4.1): passed
- `src.api.openapi-tool-routes.test.ts::C-1f964937 P3 dave replaces the document of shop and the digest changes` (task 4.1): passed
- `src.api.openapi-tool-routes.test.ts::C-7b1bd327 P4 a replace of a missing or fixture server is refused` (task 4.1): passed
- `src.api.openapi-tool-routes.test.ts::C-7b1bd327 P4 alice is forbidden, tenant b is isolated and a huge document is 413` (task 4.1): passed
- `src.api.openapi-tool-routes.test.ts::C-7b1bd327 P4 each body refusal is 400 with its field and nothing is stored` (task 4.1): passed
- `src.api.openapi-tool-routes.test.ts::C-7b1bd327 P4 without a pool each route is 503 AUTHZ_UNAVAILABLE` (task 4.1): passed
- `src.main.openapi-tools.test.ts::C-dcacef6b main passes the http adapter in calls to createInvokePath` (task 5.1): passed
- `src.main.openapi-tools.test.ts::C-dcacef6b the committed document holds the three OpenAPI tool operations` (task 5.1): passed
- `src.main.openapi-tools.test.ts::C-dcacef6b the served document holds the three OpenAPI tool operations` (task 5.1): passed
- `src.tools.http.adapter-answer.test.ts.httpCallAdapter answer::C-26f73edc a 2xx that is not a JSON object is not_json` (task 2.1): passed
- `src.tools.http.adapter-answer.test.ts.httpCallAdapter answer::C-26f73edc a 2xx with a JSON object gives the output` (task 2.1): passed
- `src.tools.http.adapter-answer.test.ts.httpCallAdapter answer::C-26f73edc a 2xx with an empty body gives an empty output` (task 2.1): passed
- `src.tools.http.adapter-answer.test.ts.httpCallAdapter answer::C-26f73edc a status outside 200 to 299 is an upstream failure` (task 2.1): passed
- `src.tools.http.adapter-build.test.ts.httpCallAdapter build::C-17c28968 W1 a templated GET has the path and accept header, with and without a key` (task 2.1): passed
- `src.tools.http.adapter-build.test.ts.httpCallAdapter build::C-17c28968 W2 values are encoded, null is left out and extra arguments are dropped` (task 2.1): passed
- `src.tools.http.adapter-build.test.ts.httpCallAdapter build::C-17c28968 W3 query names and values are percent-encoded` (task 2.1): passed
- `src.tools.http.adapter-build.test.ts.httpCallAdapter build::C-17c28968 W4 a POST sends sorted JSON with a content type, the same with or without a key` (task 2.1): passed
- `src.tools.http.adapter-build.test.ts.httpCallAdapter build::C-17c28968 W5 body keys are sorted at every depth` (task 2.1): passed
- `src.tools.http.adapter-build.test.ts.httpCallAdapter build::C-17c28968 W6 a DELETE sends no body and no content type, only the key` (task 2.1): passed
- `src.tools.http.adapter-build.test.ts.httpCallAdapter build::C-17c28968 W7 a url argument stays in the body unchanged` (task 2.1): passed
- `src.tools.http.adapter-build.test.ts.httpCallAdapter build::C-17c28968 a bad path value is path_param` (task 2.1): passed
- `src.tools.http.adapter-build.test.ts.httpCallAdapter build::C-17c28968 a bad query value is query_param` (task 2.1): passed
- `src.tools.http.adapter-build.test.ts.httpCallAdapter build::C-17c28968 arguments that are not an object are refused` (task 2.1): passed
- `src.tools.http.adapter-build.test.ts.httpCallAdapter build::C-17c28968 path and query of 2048 characters are accepted and 2049 are path_too_long` (task 2.1): passed
- `src.tools.http.exit13.db.test.ts::C-c13efd06: an OpenAPI tool's request equals its permit, rows E1 to E5` (task 3.1): passed
- `src.tools.openapi.import.test.ts::C-320b5077 C-6e0f418b the tools index exports importOpenApi and it imports SHOP_DOC` (task 1.3): passed
- `src.tools.openapi.import.test.ts::C-320b5077 HTTP_EMPTY_OUTPUT is exported by the tools index with additionalProperties false` (task 1.3): passed
- `src.tools.openapi.import.test.ts::C-6e0f418b M1 gives the four tools of SHOP_OVERLAY and digest D_SHOP` (task 1.3): passed
- `src.tools.openapi.import.test.ts::C-6e0f418b M2 overlay values override the defaults` (task 1.3): passed
- `src.tools.openapi.import.test.ts::C-6e0f418b M3 an operation parameter replaces the path-item one` (task 1.3): passed
- `src.tools.openapi.import.test.ts::C-6e0f418b M4 a response without content gives the empty output` (task 1.3): passed
- `src.tools.openapi.import.test.ts::C-6e0f418b M5 a summary of 2001 characters gives no description` (task 1.3): passed
- `src.tools.openapi.import.test.ts::C-fb6c45df O1 an overlay that is not an operations object` (task 1.3): passed
- `src.tools.openapi.import.test.ts::C-fb6c45df O2 operations must be an object of 1 to 100 entries` (task 1.3): passed
- `src.tools.openapi.import.test.ts::C-fb6c45df O3 an entry needs an effect and only known members` (task 1.3): passed
- `src.tools.openapi.import.test.ts::C-fb6c45df O4 a bad member value` (task 1.3): passed
- `src.tools.openapi.import.test.ts::C-fb6c45df O5 an unknown or an excluded operation` (task 1.3): passed
- `src.tools.openapi.import.test.ts::C-fb6c45df O6 a name used twice` (task 1.3): passed
- `src.tools.openapi.import.test.ts::C-fb6c45df O7 lookups read no inherited member` (task 1.3): passed
- `src.tools.openapi.import.test.ts::C-fb6c45df S1 five big tools pass the size bound and four are accepted` (task 1.3): passed
- `src.tools.openapi.read.test.ts::C-320b5077 C-915da487 the tools index exports readOpenApi and it reads SHOP_DOC` (task 1.2): passed
- `src.tools.openapi.read.test.ts::C-915da487 B1 server urls give their base path` (task 1.2): passed
- `src.tools.openapi.read.test.ts::C-915da487 B2 a 3.1 document with an absolute server url of the origin` (task 1.2): passed
- `src.tools.openapi.read.test.ts::C-915da487 B3 a server url that is not a path or of the origin is server_mismatch` (task 1.2): passed
- `src.tools.openapi.read.test.ts::C-915da487 B4 a server url with a variable is server_variables` (task 1.2): passed
- `src.tools.openapi.read.test.ts::C-915da487 B5 an openapi outside 3.0 and 3.1 is openapi_version` (task 1.2): passed
- `src.tools.openapi.read.test.ts::C-915da487 B6 no operation is no_operations` (task 1.2): passed
- `src.tools.openapi.read.test.ts::C-915da487 B7 a document that is not an object is not_object` (task 1.2): passed
- `src.tools.openapi.read.test.ts::C-915da487 B8 one operationId twice is duplicate_operation_id` (task 1.2): passed
