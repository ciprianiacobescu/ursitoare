# Verification: openspec:add-mcp-client: PASS (round 1)

traceability: 18/18 criteria covered by a discriminating test

- Base: `280bcad2ae81063ae27d40c73c3467e29f770d4b`
- Head: `3611b4138c4f15a15242aafd5a3aa713198ba1fd`
- Implementer profiles: deepseek-free, claude-sonnet, beam
- Judge: hy4-judge, 9 call(s), judged in 2 parts, prompt sha256 `5b4f7907c6f2da5c5ad507a8983f12d237dd2db4e04ef009d27bf7778c599fd3`
  - part 1: 18 file(s), 118041 characters, profile nemotron-judge, reply retried
  - part 2: 11 file(s), 112517 characters, profile hy4-judge, reply retried
- Judge replies of hy4-judge (this unit, all rounds): valid 0, repaired 0, retried 1, discarded 0; this round: retried
- independence: declared (unverified): hy4-judge tencent (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool), beam reflection (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base merged: main@280bcad2ae as 3611b4138c (2 commits) |
| 1 | integrity | ok | 854.1 | 11 sub-checks (+4 unfrozen by human answers); scope: 42 changed file(s) |
| 2 | build | ok | 32.3 |  |
| 3 | tests | ok | 457.2 |  |
| 4 | traceability | ok | 0.2 | 18/18 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/idempotency.ts, src/api/index.ts, src/api/mcp-tool-routes.ts, src/main.ts, src/tools/index.ts and 5 more |
| 8 | s1 judge | ok | 1.3 | 13/18 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 2837.2 | 9 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261123T1848Z-ff77/018-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261123T1848Z-ff77/019-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261123T1848Z-ff77/020-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261123T1848Z-ff77/021-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261123T1848Z-ff77/022-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261123T1848Z-ff77/023-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261123T1848Z-ff77/024-e2e.log |

## Files by part

- part 1: src/db/migrations/0540_mcp_servers.sql (1018 characters)
- part 1: src/tools/mcp/adapter.test.ts (9808 characters)
- part 1: src/tools/mcp/adapter.ts (2968 characters)
- part 1: src/tools/mcp/discover.db.test.ts (18318 characters)
- part 1: src/tools/mcp/discover.ts (9075 characters)
- part 1: src/tools/mcp/discover-fakes.db.test.ts (19340 characters)
- part 1: src/credentials/egress-site.test.ts (463 characters)
- part 1: src/tools/mcp/egress-site.test.ts (1622 characters)
- part 1: test/arch/egress-sites.test.ts (453 characters)
- part 1: src/api/idempotency.ts (2203 characters)
- part 1: src/api/idempotency-stored.db.test.ts (7027 characters)
- part 1: src/api/index.ts (730 characters)
- part 1: src/tools/index.ts (1348 characters)
- part 1: src/main.conventions.test.ts (921 characters)
- part 1: src/main.mcp.test.ts (9855 characters)
- part 1: src/main.ts (2418 characters)
- part 1: src/api/mcp-discover-route.db.test.ts (20055 characters)
- part 1: src/api/mcp-register-route.db.test.ts (10419 characters)
- part 2: src/api/mcp-tool-routes.ts (11123 characters)
- part 2: docs/api/openapi.json (16043 characters)
- part 2: src/api/people-openapi.test.ts (647 characters)
- part 2: src/tools/mcp/register.db.test.ts (13402 characters)
- part 2: src/tools/mcp/register.ts (4723 characters)
- part 2: src/runtimes/invoke/request.test.ts (457 characters)
- part 2: src/tools/mcp/surface.test.ts (22907 characters)
- part 2: src/tools/mcp/surface.ts (16941 characters)
- part 2: openspec/changes/add-mcp-client/tasks.md (8839 characters)
- part 2: src/tools/mcp/wire.test.ts (10519 characters)
- part 2: src/tools/mcp/wire.ts (6916 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 5 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 9 task(s): red and green compared (+4 unfrozen by a delegate or an agent) |
| test path freeze | ok | 9 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/idempotency-stored.db.test.ts, src/api/idempotency.ts, src/api/index.ts, src/api/mcp-discover-route.db.test.ts, src/api/mcp-register-route.db.test.ts (+21 more) |
| tdd history | ok | 10 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 2889 of 2889 base tests pass on the unit's code with its 11 test and support files at the base (base: base worktree) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/api/mcp-discover-route.db.test.ts kept at head for the run (task 5.2: unfrozen by Q-007)
- src/api/people-openapi.test.ts kept at head for the run (task 5.3: unfrozen by Q-010)
- src/tools/mcp/discover.db.test.ts kept at head for the run (task 4.1: unfrozen by Q-006)
- src/tools/mcp/register.db.test.ts kept at head for the run (task 3.1: unfrozen by Q-002)
- src/tools/mcp/surface.test.ts kept at head for the run (task 2.1: unfrozen by Q-001)
- src.credentials.egress-site.test.ts::C-0c230dcb the credentials module is one inventoried egress site (named by the task text, plan:m7@b2ee40def4896c70)
- src.main.conventions.test.ts::C-d150bfa4 the committed OpenAPI document equals the text the real engine serves (named by the task text, plan:m7@b2ee40def4896c70)
- src.runtimes.invoke.request.test.ts::C-2a04f1cb only request ts is an egress site of runtimes (named by the task text, plan:m7@b2ee40def4896c70)
- test.arch.egress-sites.test.ts::C-76ead8ea the engine's egress sites are exactly the inventory (named by the task text, plan:m7@b2ee40def4896c70)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/tools/mcp/surface.test.ts (task 2.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))
- src/tools/mcp/register.db.test.ts (task 3.1, unfrozen by Q-004 (delegate_override, claude-fable-5-1))
- src/tools/mcp/discover.db.test.ts (task 4.1, unfrozen by Q-006 (delegate_override, claude-fable-5-1))
- src/api/mcp-discover-route.db.test.ts (task 5.2, unfrozen by Q-008 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-2a04f1cb | tool-invocation › The gateway has one more inventoried caller › Only request.ts is an egress site of runtimes | covered | src.runtimes.invoke.request.test.ts::C-2a04f1cb only request ts is an egress site of runtimes (passed, red_assertion); src.tools.mcp.egress-site.test.ts::C-2a04f1cb the four path inventory keeps request ts the only runtimes site (passed, red_assertion) | - | 0.89 |
| C-387709ea | tool-mcp › The wire form of an MCP request and reply is fixed › Body, header and reply vectors | covered | src.tools.mcp.wire.test.ts.mcpBody::C-387709ea W1 a modern tools call is 305 bytes with the fixed digest (passed, red_assertion); src.tools.mcp.wire.test.ts.mcpBody::C-387709ea W10 arguments sort at every depth so their order does not matter (passed, red_assertion); src.tools.mcp.wire.test.ts.mcpBod... | - | - |
| C-41c968f2 | tool-mcp › mcpCallAdapter builds one tools/call POST and maps each answer › A call is one POST with fixed bytes and each answer maps | covered | src.tools.mcp.adapter.test.ts.mcpCallAdapter answer::C-41c968f2 A1 and A10 a structured result gives structuredContent over JSON or SSE (passed, red_assertion); src.tools.mcp.adapter.test.ts.mcpCallAdapter answer::C-41c968f2 A2 a text result joins the text items with a newline (passed, red_assertion... | - | - |
| C-4b2ad49a | tool-mcp › A server's hints never decide an effect or retry safety › find_vendor with readOnlyHint is write until the overlay says read | covered | src.tools.mcp.surface.test.ts.mcpSurface hints and defaults::C-4b2ad49a M1 a server hint never decides the effect or retry safety (passed, red_assertion); src.tools.mcp.surface.test.ts.mcpSurface hints and defaults::C-4b2ad49a M2 an overlay effect alone leaves retry safety set (passed, red_assertion... | - | 0.83 |
| C-59806dca | tool-mcp › A tool that is left out is reported with its reason › Left-out tools are listed and overlays checked | covered | src.tools.mcp.surface.test.ts.mcpSurface left-out tools::C-59806dca M10 and M17 too many tools are refused (passed, red_assertion); src.tools.mcp.surface.test.ts.mcpSurface left-out tools::C-59806dca M10b an unlisted overlay entry is reported and its shape is checked first (passed, red_assertion); s... | - | - |
| C-8557e582 | tool-mcp › A tool that is left out is reported with its reason › Schemas are normalised first | covered | src.tools.mcp.surface.test.ts.mcpSurface schemas::C-8557e582 M11 the draft-07 and 2020-12 declarations are dropped to one surface (passed, red_assertion); src.tools.mcp.surface.test.ts.mcpSurface schemas::C-8557e582 M12 tuple items, another schema declaration and a non-string one are invalid (passed... | - | 0.92 |
| C-900c01f8 | tool-mcp › Registration stores the endpoint once and refuses what the gateway would › The endpoint is immutable and a URL becomes an origin and an endpoint | covered | src.tools.mcp.register.db.test.ts::C-900c01f8: mcpEndpointOf returns the stored endpoint (passed, red_assertion); src.tools.mcp.register.db.test.ts::C-900c01f8: migration 0540 stores mcp_server per tenant and applies the endpoint check, rows G1 to G4 (passed, red_assertion); src.tools.mcp.register.d... | - | 0.87 |
| C-1673addc | tool-mcp › Discovery is decided, recorded and sent one request at a time › discoveryRequest is the API's request and the real engine allows an admin | covered | src.tools.mcp.discover.db.test.ts::C-1673addc Q1 carol is allowed and the permit is the egress of the API's request (passed, red_assertion); src.tools.mcp.discover.db.test.ts::C-1673addc Q2 to Q5 alice, tenant B, no egress and a bad path (passed, red_assertion) | - | 0.93 |
| C-7c08ae13 | tool-mcp › Discovery is decided, recorded and sent one request at a time › Modern and legacy discovery through the fakes | covered | src.tools.mcp.discover-fakes.db.test.ts::C-7c08ae13 F1 modern discovery records two decisions through the fake egress (passed, pre_satisfied); src.tools.mcp.discover-fakes.db.test.ts::C-7c08ae13 F2 legacy discovery initialises and lists through the fakes (passed, pre_satisfied); src.tools.mcp.discov... | - | 0.93 |
| C-a94a62c6 | tool-mcp › Discovery is decided, recorded and sent one request at a time › A legacy server that issues a session id is refused | covered | src.tools.mcp.discover-fakes.db.test.ts::C-a94a62c6 F3 a legacy session server is refused after initialize (passed, pre_satisfied) | - | 0.93 |
| C-85421c4d | tool-mcp › Discovery is decided, recorded and sent one request at a time › Each refusal sends nothing or stops at the failing request | covered | src.tools.mcp.discover.db.test.ts::C-85421c4d D1 pages are followed with request ids 1 to 3 and the third is W7 (passed, red_assertion); src.tools.mcp.discover.db.test.ts::C-85421c4d D10 no service target is credential_missing before any decision (passed, red_assertion); src.tools.mcp.discover.db.te... | - | - |
| C-912eaa9b | tool-mcp › Discovery is decided, recorded and sent one request at a time › Rediscovery drifts an approved server, a hint change alone included | covered | src.tools.mcp.discover-fakes.db.test.ts::C-912eaa9b F5 rediscovery drifts an approved server for a changed hint and description (passed, pre_satisfied) | - | 0.94 |
| C-edca43a8 | tool-mcp › The routes register a server by URL and discover its tools › Register by URL | covered | src.api.mcp-register-route.db.test.ts::C-edca43a8 T1 carol registers docs by URL and one event and row are stored (passed, red_assertion); src.api.mcp-register-route.db.test.ts::C-edca43a8 T2 replay returns the same body and stores one row (passed, red_assertion); src.api.mcp-register-route.db.test.... | - | 0.95 |
| C-df36af10 | tool-mcp › The routes register a server by URL and discover its tools › Discover, refuse and replay | covered | src.api.mcp-discover-route.db.test.ts::C-df36af10 T10 a server with only an excluded tool yields no_tools (passed, red_assertion); src.api.mcp-discover-route.db.test.ts::C-df36af10 T11 colliding tool names are refused (passed, red_assertion); src.api.mcp-discover-route.db.test.ts::C-df36af10 T12 an ... | - | - |
| C-730958a6 | tool-mcp › A stored idempotent reply can be read without running the handler › The stored reply is read, not run | covered | src.api.idempotency-stored.db.test.ts::C-730958a6 S1 and S2 a stored done reply is read and a missing row is null (passed, red_assertion); src.api.idempotency-stored.db.test.ts::C-730958a6 S3 to S5 another digest is refused and another principal or tenant is null (passed, red_assertion); src.api.ide... | - | 0.93 |
| C-452a9a48 | tool-mcp › A live MCP call equals its permit › Exit 13 for MCP | covered | src.tools.mcp.discover-fakes.db.test.ts::C-452a9a48 L1 a live MCP call sends exactly what its permit allows (passed, pre_satisfied) | - | 0.89 |
| C-dbc74b9d | tool-mcp › discover.ts is the one MCP egress site › discover.ts is an inventoried site and no other file is added | covered | src.tools.mcp.egress-site.test.ts::C-dbc74b9d discover ts is the one MCP egress site and the four path inventory is clean (passed, red_assertion) | - | 0.87 |
| C-32af4b42 | tool-mcp › main wires the routes and the document lists them › Main serves the routes and discovery works through it | covered | src.main.mcp.test.ts::C-32af4b42 main defines the MCP routes and both operations are documented (passed, red_assertion); src.main.mcp.test.ts::C-32af4b42 main discovers an MCP server through the wired routes and the fake egress (passed, red_assertion) | - | 0.90 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mcp-client/.l4/ledger/r-20261123T0131Z-0c2d.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mcp-client/.l4/ledger/r-20261123T0346Z-0270.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mcp-client/.l4/ledger/r-20261123T0509Z-33fe.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mcp-client/.l4/ledger/r-20261123T0636Z-f199.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mcp-client/.l4/ledger/r-20261123T0717Z-6989.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mcp-client/.l4/ledger/r-20261123T0928Z-3bb6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mcp-client/.l4/ledger/r-20261123T1043Z-0357.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mcp-client/.l4/ledger/r-20261123T1314Z-846d.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mcp-client/.l4/ledger/r-20261123T1523Z-e57b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mcp-client/.l4/ledger/r-20261123T1700Z-c746.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mcp-client/.l4/ledger/r-20261123T1726Z-c688.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mcp-client/.l4/ledger/r-20261123T1848Z-ff77.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mcp-client/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mcp-client/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/idempotency-stored.db.test.ts` |  | relevant | new test file |
| `src/api/idempotency.ts` | api | relevant | named in the spec |
| `src/api/index.ts` | api | relevant | named in the spec |
| `src/api/mcp-discover-route.db.test.ts` |  | relevant | new test file |
| `src/api/mcp-register-route.db.test.ts` |  | relevant | new test file |
| `src/api/mcp-tool-routes.ts` | api | relevant | named in the spec |
| `src/api/people-openapi.test.ts` |  | none | imports no module of the repository |
| `src/credentials/egress-site.test.ts` |  | relevant | named in the spec |
| `src/db/migrations/0540_mcp_servers.sql` | db | relevant | named in the spec |
| `src/main.conventions.test.ts` |  | relevant | named in the spec |
| `src/main.mcp.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `src/runtimes/invoke/request.test.ts` |  | relevant | named in the spec |
| `src/tools/index.ts` | tools | relevant | named in the spec |
| `src/tools/mcp/adapter.test.ts` |  | relevant | new test file |
| `src/tools/mcp/adapter.ts` | tools | relevant | named in the spec |
| `src/tools/mcp/discover-fakes.db.test.ts` |  | relevant | new test file |
| `src/tools/mcp/discover.db.test.ts` |  | relevant | new test file |
| `src/tools/mcp/discover.ts` | tools | relevant | named in the spec |
| `src/tools/mcp/egress-site.test.ts` |  | relevant | new test file |
| `src/tools/mcp/register.db.test.ts` |  | relevant | new test file |
| `src/tools/mcp/register.ts` | tools | relevant | named in the spec |
| `src/tools/mcp/surface.test.ts` |  | relevant | new test file |
| `src/tools/mcp/surface.ts` | tools | relevant | named in the spec |
| `src/tools/mcp/wire.test.ts` |  | relevant | new test file |
| `src/tools/mcp/wire.ts` | tools | relevant | named in the spec |
| `test/arch/egress-sites.test.ts` |  | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/idempotency.ts, src/api/index.ts, src/api/mcp-tool-routes.ts, src/main.ts, src/tools/index.ts and 5 more

### Tests

3101 of 3101 passed, 0 failed, 0 errored, 0 skipped.
87 of 87 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-2a04f1cb | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-387709ea | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-41c968f2 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-4b2ad49a | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-59806dca | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-8557e582 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-900c01f8 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1673addc | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7c08ae13 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a94a62c6 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-85421c4d | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-912eaa9b | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-edca43a8 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-df36af10 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-730958a6 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-452a9a48 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dbc74b9d | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-32af4b42 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-2a04f1cb | tool-invocation › The gateway has one more inventoried caller › Only request.ts is an egress site of runtimes | pass | pass | the judge passed it and a discriminating test passes |
| C-387709ea | tool-mcp › The wire form of an MCP request and reply is fixed › Body, header and reply vectors | pass | pass | the judge passed it and a discriminating test passes |
| C-41c968f2 | tool-mcp › mcpCallAdapter builds one tools/call POST and maps each answer › A call is one POST with fixed bytes and each answer maps | pass | pass | the judge passed it and a discriminating test passes |
| C-4b2ad49a | tool-mcp › A server's hints never decide an effect or retry safety › find_vendor with readOnlyHint is write until the overlay says read | pass | pass | the judge passed it and a discriminating test passes |
| C-59806dca | tool-mcp › A tool that is left out is reported with its reason › Left-out tools are listed and overlays checked | pass | pass | the judge passed it and a discriminating test passes |
| C-8557e582 | tool-mcp › A tool that is left out is reported with its reason › Schemas are normalised first | pass | pass | the judge passed it and a discriminating test passes |
| C-900c01f8 | tool-mcp › Registration stores the endpoint once and refuses what the gateway would › The endpoint is immutable and a URL becomes an origin and an endpoint | pass | pass | the judge passed it and a discriminating test passes |
| C-1673addc | tool-mcp › Discovery is decided, recorded and sent one request at a time › discoveryRequest is the API's request and the real engine allows an admin | pass | pass | the judge passed it and a discriminating test passes |
| C-7c08ae13 | tool-mcp › Discovery is decided, recorded and sent one request at a time › Modern and legacy discovery through the fakes | pass | pass | the judge passed it and a discriminating test passes |
| C-a94a62c6 | tool-mcp › Discovery is decided, recorded and sent one request at a time › A legacy server that issues a session id is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-85421c4d | tool-mcp › Discovery is decided, recorded and sent one request at a time › Each refusal sends nothing or stops at the failing request | pass | pass | the judge passed it and a discriminating test passes |
| C-912eaa9b | tool-mcp › Discovery is decided, recorded and sent one request at a time › Rediscovery drifts an approved server, a hint change alone included | pass | pass | the judge passed it and a discriminating test passes |
| C-edca43a8 | tool-mcp › The routes register a server by URL and discover its tools › Register by URL | pass | pass | the judge passed it and a discriminating test passes |
| C-df36af10 | tool-mcp › The routes register a server by URL and discover its tools › Discover, refuse and replay | pass | pass | the judge passed it and a discriminating test passes |
| C-730958a6 | tool-mcp › A stored idempotent reply can be read without running the handler › The stored reply is read, not run | pass | pass | the judge passed it and a discriminating test passes |
| C-452a9a48 | tool-mcp › A live MCP call equals its permit › Exit 13 for MCP | pass | pass | the judge passed it and a discriminating test passes |
| C-dbc74b9d | tool-mcp › discover.ts is the one MCP egress site › discover.ts is an inventoried site and no other file is added | pass | pass | the judge passed it and a discriminating test passes |
| C-32af4b42 | tool-mcp › main wires the routes and the document lists them › Main serves the routes and discovery works through it | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] empty-string description is reported as an exclusion (spec gap) (criterion C-59806dca): wellFormedText requires value.length >= 1, so a tool with description "" loses the description and is listed in excluded with reason "description". The requirement reserves that treatment for a description over 2,000 characters or not well-formed, and no M16 row pins the empty string down; another implementation could silently omit it.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.idempotency-stored.db.test.ts::C-730958a6 S1 and S2 a stored done reply is read and a missing row is null` (task 5.0): passed
- `src.api.idempotency-stored.db.test.ts::C-730958a6 S3 to S5 another digest is refused and another principal or tenant is null` (task 5.0): passed
- `src.api.idempotency-stored.db.test.ts::C-730958a6 S6 and S7 an older row is null and a bad key is refused` (task 5.0): passed
- `src.api.mcp-discover-route.db.test.ts::C-df36af10 T10 a server with only an excluded tool yields no_tools` (task 5.2): passed
- `src.api.mcp-discover-route.db.test.ts::C-df36af10 T11 colliding tool names are refused` (task 5.2): passed
- `src.api.mcp-discover-route.db.test.ts::C-df36af10 T12 an overlay entry for a missing tool is not_listed` (task 5.2): passed
- `src.api.mcp-discover-route.db.test.ts::C-df36af10 T13 a gateway that is unavailable returns 503` (task 5.2): passed
- `src.api.mcp-discover-route.db.test.ts::C-df36af10 T14 null dependencies return discovery_not_configured` (task 5.2): passed
- `src.api.mcp-discover-route.db.test.ts::C-df36af10 T14b a null pool is AUTHZ_UNAVAILABLE on both routes` (task 5.2): passed
- `src.api.mcp-discover-route.db.test.ts::C-df36af10 T15 an idempotent replay reads the stored body` (task 5.2): passed
- `src.api.mcp-discover-route.db.test.ts::C-df36af10 T6 discover returns a modern surface and a second overlay changes the digest` (task 5.2): passed
- `src.api.mcp-discover-route.db.test.ts::C-df36af10 T6b an idempotent replay sends nothing extra` (task 5.2): passed
- `src.api.mcp-discover-route.db.test.ts::C-df36af10 T7 a non-mcp server is refused as adapter_mismatch` (task 5.2): passed
- `src.api.mcp-discover-route.db.test.ts::C-df36af10 T8 a missing service is credential_missing` (task 5.2): passed
- `src.api.mcp-discover-route.db.test.ts::C-df36af10 T9 a session-issuing legacy server is refused` (task 5.2): passed
- `src.api.mcp-register-route.db.test.ts::C-edca43a8 T1 carol registers docs by URL and one event and row are stored` (task 5.1): passed
- `src.api.mcp-register-route.db.test.ts::C-edca43a8 T2 replay returns the same body and stores one row` (task 5.1): passed
- `src.api.mcp-register-route.db.test.ts::C-edca43a8 T3 bad urls are 400 with body/url and nothing is stored` (task 5.1): passed
- `src.api.mcp-register-route.db.test.ts::C-edca43a8 T4 a taken id is 409 ALREADY_EXISTS` (task 5.1): passed
- `src.api.mcp-register-route.db.test.ts::C-edca43a8 T5 alice is forbidden and tenant b is isolated` (task 5.1): passed
- `src.main.mcp.test.ts::C-32af4b42 main defines the MCP routes and both operations are documented` (task 5.3): passed
- `src.main.mcp.test.ts::C-32af4b42 main discovers an MCP server through the wired routes and the fake egress` (task 5.3): passed
- `src.tools.mcp.adapter.test.ts.mcpCallAdapter answer::C-41c968f2 A1 and A10 a structured result gives structuredContent over JSON or SSE` (task 1.2): passed
- `src.tools.mcp.adapter.test.ts.mcpCallAdapter answer::C-41c968f2 A2 a text result joins the text items with a newline` (task 1.2): passed
- `src.tools.mcp.adapter.test.ts.mcpCallAdapter answer::C-41c968f2 A3 a status outside 2xx is an upstream status failure` (task 1.2): passed
- `src.tools.mcp.adapter.test.ts.mcpCallAdapter answer::C-41c968f2 A4 an rpc error is upstream with a null status and no server text` (task 1.2): passed
- `src.tools.mcp.adapter.test.ts.mcpCallAdapter answer::C-41c968f2 A5 and A6 a non-JSON body and an SSE without a reply are response failures` (task 1.2): passed
- `src.tools.mcp.adapter.test.ts.mcpCallAdapter answer::C-41c968f2 A7 input_required and an unknown result type are response failures` (task 1.2): passed
- `src.tools.mcp.adapter.test.ts.mcpCallAdapter answer::C-41c968f2 A8 a tool error is upstream and leaks no server text` (task 1.2): passed
- `src.tools.mcp.adapter.test.ts.mcpCallAdapter answer::C-41c968f2 A9 a structured call without an object structuredContent is not_object` (task 1.2): passed
- `src.tools.mcp.adapter.test.ts.mcpCallAdapter build::C-41c968f2 B1 and B2 a structured call is one POST with W1 bytes, a key only adds a header` (task 1.2): passed
- `src.tools.mcp.adapter.test.ts.mcpCallAdapter build::C-41c968f2 B3 and B5 a legacy call has its endpoint and version, a text call has W12 bytes` (task 1.2): passed
- `src.tools.mcp.adapter.test.ts.mcpCallAdapter build::C-41c968f2 B4 arguments that are not an object are args_not_object` (task 1.2): passed
- `src.tools.mcp.discover-fakes.db.test.ts::C-452a9a48 L1 a live MCP call sends exactly what its permit allows` (task 4.2): passed
- `src.tools.mcp.discover-fakes.db.test.ts::C-7c08ae13 F1 modern discovery records two decisions through the fake egress` (task 4.2): passed
- `src.tools.mcp.discover-fakes.db.test.ts::C-7c08ae13 F2 legacy discovery initialises and lists through the fakes` (task 4.2): passed
- `src.tools.mcp.discover-fakes.db.test.ts::C-7c08ae13 F4 SSE replies give the modern result` (task 4.2): passed
- `src.tools.mcp.discover-fakes.db.test.ts::C-912eaa9b F5 rediscovery drifts an approved server for a changed hint and description` (task 4.2): passed
- `src.tools.mcp.discover-fakes.db.test.ts::C-a94a62c6 F3 a legacy session server is refused after initialize` (task 4.2): passed
- `src.tools.mcp.discover.db.test.ts::C-1673addc Q1 carol is allowed and the permit is the egress of the API's request` (task 4.1): passed
- `src.tools.mcp.discover.db.test.ts::C-1673addc Q2 to Q5 alice, tenant B, no egress and a bad path` (task 4.1): passed
- `src.tools.mcp.discover.db.test.ts::C-85421c4d D1 pages are followed with request ids 1 to 3 and the third is W7` (task 4.1): passed
- `src.tools.mcp.discover.db.test.ts::C-85421c4d D10 no service target is credential_missing before any decision` (task 4.1): passed
- `src.tools.mcp.discover.db.test.ts::C-85421c4d D11 a failed recording sends nothing and a later deny stops after one send` (task 4.1): passed
- `src.tools.mcp.discover.db.test.ts::C-85421c4d D2 an error -32601 on server discover is modern and goes on` (task 4.1): passed
- `src.tools.mcp.discover.db.test.ts::C-85421c4d D3 unsupported protocol answers stop after one send` (task 4.1): passed
- `src.tools.mcp.discover.db.test.ts::C-85421c4d D4 a legacy server is initialised and listed with W8` (task 4.1): passed
- `src.tools.mcp.discover.db.test.ts::C-85421c4d D5 a legacy answer version is used afterwards and an unknown one is refused` (task 4.1): passed
- `src.tools.mcp.discover.db.test.ts::C-85421c4d D6 a failing request is discovery_failed with its stage and status` (task 4.1): passed
- `src.tools.mcp.discover.db.test.ts::C-85421c4d D7 an eleventh page is never asked for` (task 4.1): passed

## Guard events

- guard.violation: src/tools/index.ts
