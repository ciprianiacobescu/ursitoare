# Test plan: add-code-block-tools

Digests and runner numbers were computed on 2026-11-17 (Node 24.22.2, scratch calls into main@3daa5c35; surface digests with a scratch `normalizeTool` as U47b's requirement "The surface digest covers the call and every M6 vector holds" says (its `call` members: code `{ kind, source }`), whose `D_CODE` the `FIXED` digest equals). Digests are `sha256:` plus hex. Test files start with `assert.equal(typeof <function under test>, "function")`, wrap stub calls (async: `p.then((v) => v, (e: unknown) => e)`) and close pools, servers and databases in `finally`.

## Fixtures

`IN_T` `{ type: "object", properties: { text: { type: "string" } }, required: ["text"] }`; `OUT_W` `{ type: "object", properties: { words: { type: "integer" } }, required: ["words"] }`; `SRC_WC` `return { words: input.text.trim().split(/\s+/).length };`.

- `WC` `{ name: "word_count", description: "Count the words.", input: IN_T, output: OUT_W, source: SRC_WC }`; `WC2` is `WC` with source `return { words: input.text.split(' ').length };`; `FIXED` is `WC` with source `return { words: 3 };`; `EX` `{ name: "explode", description: "Always fails.", input: IN_T, output: OUT_W, source: "throw new Error('secret_text');" }`.
- `D_WC` `59d11c4654e2eeb76542d2e1fcc814eb8fa1abc9c38debe573a09afa5d1d5a61`, `D_WC2` `e014904e0bd3fa801c703f0fd769c1f5d39d773b4d8d428bc895d572ca058ed6`, `D_FIXED` `ca47766a9e363b72b7a9bdd8c301d900593cd1a63b310c0cb6eeb9a37a1c0513`, `D_EX` `288b36835755713b6707e8ab3c3e45eb7059e42fcfac7b5bedd0f1e991c5f39f`, `D_NODESC` (`WC` without `description`) `1ef528cafb3b5dc04a8a6c27a7d19382183261bb41df2fa9eb4b4e85b05f08e7`.
- `BIG_OK` is `"return {};"` plus 65,526 spaces (65,536 characters), `BIG` the same with 65,527 (65,537); both parse and return.

## Surface rows (`src/tools/code/register.test.ts`, no database)

B1 `codeBlockSurface([WC])` deep-equals `{ tools: [{ name: "word_count", description: "Count the words.", effect: "read", input: IN_T, output: OUT_W, untrusted_result: false, unsafe_to_retry: false, call: { kind: "code", source: SRC_WC } }] }`, digest `D_WC`. B2 `WC` without `description`: no own `description`, digest `D_NODESC`. B3 `[FIXED]`: digest `D_FIXED`. B4 a deeply frozen `[WC]` is accepted and `WC` deep-equals its copy afterwards. B5 `[]`: `{ tools: [] }`. B6 `checkAdapterSurface("code_block", codeBlockSurface([WC]))` returns the same object.

## Store rows (`src/tools/code/register.db.test.ts`; `withTestDatabase`, `seedTwoTenants`, tenant `a`, `fixedClock("2026-11-06T10:00:00Z")`; `u_carol` registers and approves, `u_dave` submits; each call in `withTenantTx`)

- R1 `registerCodeBlockServerTx({ id: "snips", tools: [WC] })`: `{ id: "snips", adapter: "code_block", origin: "sandbox", local: false, state: "pending", registeredBy: "u_carol", registeredAt: "2026-11-06T10:00:00.000000Z", approvedDigest: null, pendingDigest: D_WC, pendingSubmittedBy: "u_carol", tools: [{ name: "word_count", effect: "read", ref: null }] }`; one event `tools.server_registered` `{ adapter: "code_block", origin: "sandbox" }`.
- R2 `approveSurface(pool, ctx, "snips", { digest: D_WC, selfApproval: true }, { userId: "u_carol", kind: "user" }, { clock })`: `server.state` `approved`, `approvedDigest` `D_WC`, `blocks` `["snips.word_count@1"]`.
- R3 `submitCodeBlocksTx("snips", [WC2])` by `u_dave`: `drifted`, `approvedDigest` `D_WC`, `pendingDigest` `D_WC2`, `pendingSubmittedBy` `u_dave`, event `tools.surface_submitted` `{ digest: D_WC2, drift: true }`; approving `D_WC2` gives `blocks` `["snips.word_count@1"]`. R4 `[WC2]` again: the same record, no new event.
- Refusals add 0 rows to `tool_server`, `tool_surface` and `audit_event` (`TOOLS_INVALID` `{ field, reason }`): F1 `[WC, WC]`: `tools/1/name`, `duplicate`. F2 `[]`: `tools`, `size`. F3 `BIG`: `tools/0/call/source`, `bad_value` (`BIG_OK` registers pending). F4 source `return { a: 'x\u0000y' };` (a real U+0000) and F5 `return { a: '\ud800' };` (a lone surrogate): the same as F3. F6 id `Snips`: `id`, `bad_value`. F7 `snips` again: `TOOLS_EXISTS`. F8 `input` `{ type: "nope" }`: `tools/0/input`, `schema_invalid`.
- Submit refusals (0 rows): G1 `ghost`: `TOOLS_NOT_FOUND`. G2 fixture server `acme` (`registerToolServer` with `fixtureSurface(["erp.lookup_vendor@1"], { untrustedResult: { "erp.lookup_vendor@1": false } })`, origin `https://tools.fake.test`): `TOOLS_REFUSED` `{ reason: "adapter_mismatch" }`. G3 server `shop` (`registerAdapterServerTx`, `http_openapi`, origin `https://shop.fake.test`, `kitSurface("http")`): `TOOLS_INVALID` `tools/0/call/kind`, `kind_mismatch`.

## Source rows (`src/authoring/validate/code-source.test.ts`)

L1 side: `validateFlowText(JSON.stringify(flow), "json", loadTestCatalogue())` with `flow` `{ ursitoare: "0.1", flow: "probe", version: "1.0.0", inputs: { type: "object" }, start: "c", nodes: { c: { kind: "code", language: "js", input: {}, source, output_schema: { type: "object" }, next: "d" }, d: { kind: "end", status: "completed" } } }`, keeping the `errors` whose `code` starts `L1_CODE` as `{ code, message }`. `SYN` is `code source does not parse (line N): Unexpected token`, `NOR` is ``code source never returns a value; it must `return` an object``.

| # | source | problems |
|---|---|---|
| P1, P2 | `return { words: 3 };`; `return { a: typeof fetch };` | `[]` |
| P3 | `return {` | `L1_CODE_SYNTAX` `SYN`, N 2 |
| P4 | `const x = ;` newline `return { a: 1 };` | `L1_CODE_SYNTAX` `SYN`, N 1 |
| P5 to P8 | `const x = 1;`; `function f() { return 1; }` newline `f();`; `""`; `const f = () => { return 1; };` | `L1_CODE_NO_RETURN` `NOR` |
| P9, P10 | `await 1; return {};`; `return 5 5;` | `L1_CODE_SYNTAX` `SYN`, N 1 |
| P11 | `return { a: 1 } \ud800 ;` (a lone surrogate) | one `L1_CODE_SYNTAX`, message `code source does not parse (line 1): Unexpected character '` U+FFFD `'`, `isWellFormed()` true |
| P12 | `return ` U+0000 `;` | the P11 message, no U+0000 |

P1 to P10 equal the L1 side; P11 and P12 are not run through L1.

## Runner rows (`src/runtimes/invoke/code.test.ts`; `pool = createWorkerSandbox({ size: 1 })`, wrapped to record `run` arguments)

`CTX` is a `StepContext` `{ tenant: { tenantId: "tenant_a", reviewProfile: "solo" }, runId: "r_1", lineageId: "r_1", flowId: "count-words", flowHash: "sha256:" + 64 times "b", nodeId: "count", kind: "block", mode: "live", attempt: 1, effect: "read", unsafeToRetry: false, idemKey: null, principal: { userId: "u_alice", kind: "human" }, now: new Date("2026-11-06T10:00:00.000Z") }`.

- O1 source `SRC_WC`, args `{ text: "a b c" }`: `{ output: { words: 3 } }`; the recorded `run`: `[SRC_WC, { text: "a b c" }, { timeoutMs: 1000, memoryBytes: 33554432, maxStackBytes: 262144, maxOutputBytes: 1048576 }, { seed: "r_1:count:1", nowIso: "2026-11-06T10:00:00.000Z", binding: "input", result: "object" }]`.
- O2 source `return { r: Math.random(), t: new Date().toISOString(), n: Date.now() };`, args `{ text: "a" }`: attempt 1 twice `{ r: 0.7660308103077114, t: "2026-11-06T10:00:00.000Z", n: 1793959200000 }`; attempt 2 `r` 0.2398981919977814 and the same `t`, `n`.
- Faults (args `{ text: "a" }`; each rejects `InterpreterError` `INTERPRETER_TOOL_FAILED`, message `node execution failed`, node `count`, details `{ stage: "code", fault }`, and `JSON.stringify({ message, node, details })` has no `secret_text`): E1 `throw new Error('secret_text');` `runtime_error`; E2 `return {` `syntax_error`; E3 `return 5;` `output_invalid`; E4 `return { s: 'x'.repeat(2000000) };` `output_too_large`; E5 `while (true) {}` `timeout` (the sandbox's deadline; no elapsed-time assertion); E6 `function f() { return f() + 1; } return { v: f() };` `stack_overflow`.
- N1 `createCodeRunner(() => current)` with `current` null: rejects `INTERPRETER_NO_SANDBOX`, message `no sandbox is available for tool call of "count"`, node `count`, details `{}`; after `current = pool` the same runner resolves O1's output. N2 a pool closed before the call: `{ stage: "code", fault: "sandbox_unavailable" }`.

## Live rows (`src/runtimes/invoke/code-block.db.test.ts`)

`Live` setup: `pool`, `runner = createCodeRunner(() => pool)`, `seen: string[]`, `code = (call, args, ctx) => { seen.push(call.source); return runner(call, args, ctx); }`, `h = await invokeHarness({ code })` (U47b's `code` member), `clock = fixedClock("2026-11-06T10:00:00Z")`. In `withTenantTx(h.pool, h.ctx, …)` register `snips` with `[WC]` and `boom` with `[EX]` as `{ kind: "user", id: "u_carol" }`, then `approveSurface` each (`D_WC`, `D_EX`, `selfApproval: true`). `G_GET`, `G_COUNT`, `G_EX` are `{ subject: { kind: "role", role: "author" }, tool, scope: { kind: "any_step" }, args: [] }` for `acme.get@1`, `snips.word_count@1`, `boom.explode@1`, made with `h.grant` after the approvals, then `h.deploy("")`. `dry = await dryHarness(h)` and `dry.save` stores three flows (`ursitoare` `0.1`, `version` `1.0.0`):

- `count-invoice` (input `invoice_id`): `fetch` block `acme.get@1` with `invoice_id` `${{ inputs.invoice_id }}`, next `count`; `count` block `snips.word_count@1` with `text` `${{ nodes.fetch.output.raw_text }}`, next `done`; `done` end `completed` with output `{ words: "${{ nodes.count.output.words }}" }`.
- `explode-invoice`: the same, the node `count` named `explode` with block `boom.explode@1`, and `done` reading `nodes.explode.output.words`.
- `count-text` (input `text`): start node `count` with `text` `${{ inputs.text }}`, then `done` as above.

Each run is `dry.post({ input, fakes: {} }, flow)` (202, `run.id`), then `dry.execute(run.id)`; the last step row of a node is its final one.

- V1 `count-invoice`, `{ invoice_id: "INV-1001" }`: `run.mode` `stub`; the run `completed`, `terminalNode` `done`, output `{ words: 23 }` (the fake's `INV-1001` text has 23 words). `dry.decisions` has 2 rows: `fetch` `allow` with a permit whose `method`, `host`, `path`, `serviceId` and `ttlSeconds` are `POST`, `tools.fake.test`, `/blocks/invoices.get@1`, `87caf624-f579-8435-9540-24d6eb57aeff` and 60 (its `bodyDigest` is not asserted); `count` `allow`, action `invoke_tool`, principal `User::"tenant_a/alice"`, resource `Block::"tenant_a/count-invoice/count"`, reasons `[G_COUNT.id]`, errors `[]`, `permit` `null`. `GET /api/v1/runs/<id>/decisions` gives the second item `permit` `null`. `h.gateway.calls` ops `["requestToken","send"]`, `h.egress.issued()` 1 token, `h.tools.calls()` 1 call (ref `invoices.get@1`), `seen` `[SRC_WC]`. Last step rows: `fetch` `[]`, `count` `["untrusted"]`, `done` `["untrusted"]`.
- V3 `count-text`, `{ text: "a b c" }`, after V1: `completed`, output `{ words: 3 }`; last step rows `count` `[]`, `done` `[]`; one decision row for `count`, permit `null`; `h.gateway.calls` still 2 ops, `h.egress.issued()` still 1 token.
- V4 `explode-invoice`: the run `failed`, `error` `{ code: "INTERPRETER_TOOL_FAILED", node: "explode", details: { stage: "code", fault: "runtime_error" } }`; 2 decision rows (`fetch`, then `explode` `allow`, permit `null`); no `secret_text` in the JSON of the run, `dry.steps`, `dry.decisions` and `h.logs()`.
- V5 a second harness with `snips` approved, `h.deploy("")` and no grant; `count-text`: the run `failed`, `INTERPRETER_TOOL_DENIED`, node `count`, details `{ reason: "policy", decisionId }` with the id of the one decision row (`deny`, reasons `[]`); `seen` `[]`.

## Route rows (`src/api/code-block-routes.test.ts`)

Harness: that of `src/api/tool-server-routes.test.ts`, `fixedClock("2026-11-09T10:00:00Z")`, `registerToolServerRoutes` and `registerCodeBlockRoutes`; sessions carol (`tenant_admin`), alice (`author`), mallory (`tenant_admin`, tenant B).

- H1 carol `POST /api/v1/tool-registrations/code`, key `k1`, `{ id: "snips", tools: [WC] }`: 201, `{ id: "snips", adapter: "code_block", origin: "sandbox", local: false, state: "pending", registeredBy: carol.userId, registeredAt: "2026-11-09T10:00:00.000000Z", approvedDigest: null, pendingDigest: D_WC, pendingSubmittedBy: carol.userId, tools: [{ name: "word_count", effect: "read", ref: null }] }`; `k1` again: 201, same body, `idempotent-replayed: true`; key `k2`: 409 `ALREADY_EXISTS`; `GET /api/v1/tool-servers/snips`: `pendingSurface` deep-equals `codeBlockSurface([WC])`. `{ id: "big", tools: [{ ...WC, source: BIG_OK }] }`: 201.
- H2 carol `PUT /api/v1/tool-servers/snips/code`, `{ tools: [WC2] }`: 200, `pendingDigest` `D_WC2`, `state` `pending`, `approvedDigest` null; again: the same body.
- 400 `VALIDATION_FAILED`, `error.details.fields` one entry, no server and no idempotency row (X1 to X4 also on the PUT, same field): X1 `return {`: `body/tools/0/source`, `code source does not parse (line 2): Unexpected token`. X2 `const x = 1;`: `body/tools/0/source`, ``code source never returns a value; it must `return` an object``. X3 `[{ ...WC, source: "const x = 1;" }, { ...EX, source: "return {" }]`: only `body/tools/0/source`, the X2 message. X4 `[WC, { ...EX, source: "return {" }]`: `body/tools/1/source`, the X1 message. X5 `BIG` and X6 `return { a: '\ud800' };`: `body/tools/0/source`, `bad_value`. X7 `[WC, WC]`: `body/tools/1/name`, `duplicate`. X8 id `Snips`: `body/id`, `bad_value`. X9 `tools: []`: `body/tools`, `must NOT have fewer than 1 items`. X10 a tool with `effect: "write"`: `body/tools/0/effect`, `must NOT have additional properties`; `source: 5`: `body/tools/0/source`, `must be string`.
- U1 carol `PUT …/ghost/code`: 404 `NOT_FOUND`. U2 fixture server `acme` (made by the generic `POST /api/v1/tool-servers`): 422 `OPERATION_REFUSED` `{ reason: "adapter_mismatch" }`. U3 server `shop` (`registerAdapterServerTx` with `kitSurface("http")`): the same 422. U4 mallory `PUT …/snips/code`: 404. U5 alice `POST`, U6 alice `PUT`: 403 `FORBIDDEN`. Z1 `registerCodeBlockRoutes` with `pool: null`, carol `POST`: 503 `AUTHZ_UNAVAILABLE`.

## Main rows (`src/main.codeblocks.test.ts`; M1 uses the pattern of `src/main.dryruns.test.ts`: `main` with the test database and `config.egress` with the broker at `http://127.0.0.1:1`)

- M1 the public server defines `POST /api/v1/tool-registrations/code` and `PUT /api/v1/tool-servers/:id/code` (auth `{ kind: "session" }`, action `register_tool_server`); `unregisteredRouteErrors` of all defined routes is `[]`; `POST /api/v1/credentials` lists `OPERATION_REFUSED`; the committed document lists `/api/v1/tool-registrations/code` and `/api/v1/tool-servers/{id}/code` and equals `servedOpenApiText()`.
- M2 `src/main.ts` is read as text (the precedent of U53: `main` is the composition root; N1 proves the getter's behaviour): between `createInvokePath({` and the next line `        });` the line `code: createCodeRunner(() => sandbox),` occurs once, `sandbox` is declared (`let sandbox`) before that call, and `registerCodeBlockRoutes(server, {` occurs once, after `registerToolServerRoutes(`.
