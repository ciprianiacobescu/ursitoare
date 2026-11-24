## Purpose

Code-block tools: a tool server whose tools are pure sandboxed functions. An admin registers sources, approves the surface and grants the tools; a flow calls one like any block, the call is policy-checked and recorded with no permit, and nothing leaves the engine.

## ADDED Requirements

### Requirement: A code-block surface fixes the trust flags and is registered through the adapter seam
`codeBlockSurface(tools)` SHALL answer `{ tools }` with, per input in order, exactly `name`, `description` (only when given), `effect` `read`, `input`, `output`, `untrusted_result` false, `unsafe_to_retry` false and `call` `{ kind: "code", source }`, and SHALL not change its argument. `registerCodeBlockServerTx` SHALL call `registerAdapterServerTx` with adapter `code_block`, origin `CODE_BLOCK_ORIGIN` (`sandbox`), `local` false and that surface, and `submitCodeBlocksTx` SHALL call `submitAdapterSurfaceTx`, so every refusal of the seam applies (`TOOLS_INVALID` `{ field, reason }`, `TOOLS_EXISTS`, `TOOLS_NOT_FOUND`, `TOOLS_REFUSED` `adapter_mismatch`) and a refusal writes nothing. A changed source SHALL change the surface digest, drift an approved server and keep the tool's block ref (the ref does not hold the call).

#### Scenario: The builder fixes the flags and the digest covers the source
- **WHEN** `codeBlockSurface` runs on rows B1 to B6 of `test-plan.md` § Surface rows
- **THEN** B1 gives the one tool with its seven members and digest `D_WC`; B2 (no `description`) has no own `description` member and digest `D_NODESC`; B3 (`FIXED`) has digest `D_FIXED`, which equals U47b's `D_CODE`; B4 leaves a deeply frozen argument as it was; B5 gives `{ tools: [] }`; B6 passes `checkAdapterSurface("code_block", …)` and is returned as the same object

#### Scenario: A server registers pending, a changed source drifts it and each refusal writes nothing
- **WHEN** rows R1 to R4, F1 to F8 and G1 to G3 of `test-plan.md` § Store rows run
- **THEN** R1 gives the record of its row (origin `sandbox`, `pendingDigest` `D_WC`, `tools` `[{ name: "word_count", effect: "read", ref: null }]`) and the event `tools.server_registered` `{ adapter: "code_block", origin: "sandbox" }`; R2 approves it with block `snips.word_count@1`; R3 gives `drifted`, `approvedDigest` `D_WC`, `pendingDigest` `D_WC2` and the event `{ digest: D_WC2, drift: true }`, and approving `D_WC2` lists the same block `snips.word_count@1`; R4 changes nothing; each of F1 to F8 and G1 to G3 throws the code, `field` and `reason` of its row and adds no `tool_server`, `tool_surface` or audit row

### Requirement: codeSourceProblems reports what L1 reports about a code source
`codeSourceProblems(source)` SHALL parse `(function (input) {\n<source>\n})` with acorn (`ecmaVersion` latest, `sourceType` script) and answer `[]` for a source that parses and returns, one `L1_CODE_SYNTAX` problem `code source does not parse (line N): <acorn message without its (line:column)>` (`N` the source's own line) when it does not parse, and one `L1_CODE_NO_RETURN` problem `code source never returns a value; it must \`return\` an object` when no `return` sits in the function's own body (a nested function's `return` does not count). It SHALL report no warning, never throw, and replace U+0000 and any lone surrogate of acorn's message by U+FFFD. Its problems SHALL equal the `L1_CODE_*` errors of L1 for the same source; L1 is not edited.

#### Scenario: The problems equal L1's and a quoted bad character is made well-formed
- **WHEN** `codeSourceProblems` and `validateFlowText` (a flow with one code node holding the source) run on rows P1 to P10 of `test-plan.md` § Source rows, and `codeSourceProblems` on P11 and P12
- **THEN** P1 and P2 (`typeof fetch`, which L1 only warns about) give `[]`; P3 gives `L1_CODE_SYNTAX` `code source does not parse (line 2): Unexpected token`, P4, P9 and P10 the same text with `line 1`, P5 to P8 `L1_CODE_NO_RETURN`; each of P1 to P10 equals the `L1_CODE_*` errors of L1; P11 and P12 give `L1_CODE_SYNTAX` with `Unexpected character '�'` (the character U+FFFD) and no lone surrogate or U+0000 in the message

### Requirement: The code runner runs one source in the sandbox pool and maps every fault
`createCodeRunner(sandbox)` SHALL return a `CodeRunner` that reads `sandbox()` on every call. A null pool SHALL throw `InterpreterError` `INTERPRETER_NO_SANDBOX`, message `no sandbox is available for tool call of "<ctx.nodeId>"`, node `ctx.nodeId`, details `{}`. Otherwise it SHALL call `run(call.source, args, CODE_LIMITS, { seed: codeSeed(ctx), nowIso: ctx.now.toISOString(), binding: "input", result: "object" })` and resolve `{ output: value }`; a rejection of `run`, a fault result and a null value SHALL throw `INTERPRETER_TOOL_FAILED`, message `node execution failed`, node `ctx.nodeId`, details `{ stage: "code", fault }` with `fault` `sandbox_unavailable`, the fault's own code or `output_invalid`. No fault message, source text or argument SHALL reach a message or a detail.

#### Scenario: The output, the seed and the clock are the step's, and every failure has fixed details
- **WHEN** rows O1, O2, E1 to E6, N1 and N2 of `test-plan.md` § Runner rows run on a real pool
- **THEN** O1 resolves `{ output: { words: 3 } }` and the pool saw one `run` with the source, `{ text: "a b c" }`, the limits `{ timeoutMs: 1000, memoryBytes: 33554432, maxStackBytes: 262144, maxOutputBytes: 1048576 }` and the options `{ seed: "r_1:count:1", nowIso: "2026-11-06T10:00:00.000Z", binding: "input", result: "object" }`; O2 resolves `{ r: 0.7660308103077114, t: "2026-11-06T10:00:00.000Z", n: 1793959200000 }` twice at attempt 1 and `r` 0.2398981919977814 at attempt 2; E1 to E6 reject `INTERPRETER_TOOL_FAILED` `node execution failed` at node `count` with `{ stage: "code", fault }` for `runtime_error`, `syntax_error`, `output_invalid`, `output_too_large`, `timeout`, `stack_overflow`, and no error JSON contains `secret_text`; N1 rejects `INTERPRETER_NO_SANDBOX` with the message of its row and, once the pool exists, resolves O1's output through the same runner; N2 (a closed pool) rejects `{ stage: "code", fault: "sandbox_unavailable" }`

### Requirement: A granted code block runs through the invoke path with no permit, no token and no egress
A call to an approved code-block tool SHALL be authorised like any tool: the policy point decides `invoke_tool` with the call's run, node, principal and taint, the decision row is recorded, and without a grant the call is `INTERPRETER_TOOL_DENIED` `policy` and the runner is not called. An allowed call SHALL record `permit` null (U47b, R1), request no token, send nothing and answer the runner's output; a fault SHALL fail the node with the runner's error.

#### Scenario: A granted code block runs in a dry run and nothing leaves the engine
- **WHEN** after the `Live` setup of `test-plan.md` § Live rows, rows V1 and V4 run
- **THEN** V1 completes with output `{ words: 23 }`, records for `count` one `allow` row with reasons `[G_COUNT]` and permit `null`, the gateway sees `["requestToken","send"]` (the read of `fetch` only), `h.egress.issued()` has 1 token and the runner saw `SRC_WC` once; V4 fails at `explode` with `INTERPRETER_TOOL_FAILED` `{ stage: "code", fault: "runtime_error" }` and no JSON of the run, steps, decisions or log contains `secret_text`

#### Scenario: An ungranted code block is denied before its code runs
- **WHEN** row V5 of `test-plan.md` § Live rows runs on a harness with the policy deployed and no grant
- **THEN** the run fails at `count` with `INTERPRETER_TOOL_DENIED` `{ reason: "policy", decisionId }`, one `deny` row with reasons `[]` exists, and the runner saw no call

### Requirement: A trusted code block cannot launder taint
A code block SHALL produce output with the taint of its input: the step rows of the node and of a node that reads its output SHALL carry `["untrusted"]` when the input came from an untrusted read and `[]` when it came from a trusted input, so the policy point sees the input's taint after the block. (`producedTaint` gives a block with `untrusted_result` false the input taint; `codeBlockSurface` sets it false.)

#### Scenario: An untrusted input gives an untrusted output at runtime
- **WHEN** rows V1 and V3 of `test-plan.md` § Live rows run
- **THEN** in V1 (`fetch` reads `acme.get@1`, an untrusted result, and its `raw_text` feeds `count`) the last step rows are `fetch` `[]`, `count` `["untrusted"]` and `done` `["untrusted"]`; in V3 (the trusted input `text` feeds `count`) they are `count` `[]` and `done` `[]`

### Requirement: The routes register and update a code-block server for tenant admins
`POST /api/v1/tool-registrations/code` (action `register_tool_server`, session auth, `respondIdempotent`) SHALL take `{ id, tools }` (`tools` 1 to 100 of `{ name, description?, input, output, source }`, no other member), check each source with `codeSourceProblems` in index order before the transaction and answer the first problem as 400 `VALIDATION_FAILED` at `body/tools/<i>/source` with its message, register through `registerCodeBlockServerTx` and answer 201 with the server record. `PUT /api/v1/tool-servers/:id/code` SHALL take `{ tools }` and answer 200 with the record of `submitCodeBlocksTx`. Seam refusals SHALL map: `TOOLS_INVALID` field `tools/<i>/call/source` to `body/tools/<i>/source`, `tools/<i>/<k>` to `body/tools/<i>/<k>`, `tools` and `surface` to `body/tools`, any other field to `body/<field>`, message the reason; a `kind_mismatch` and `TOOLS_REFUSED` to 422 `OPERATION_REFUSED` `{ reason }` (`adapter_mismatch` for a server that is not a code-block server); `TOOLS_EXISTS` to 409 `ALREADY_EXISTS`; `TOOLS_NOT_FOUND` to 404 `NOT_FOUND`. A null pool SHALL be 503 `AUTHZ_UNAVAILABLE`; without `register_tool_server` the answer SHALL be 403 `FORBIDDEN`.

#### Scenario: Carol registers and updates, a replay follows its key and each bad body has one fixed field
- **WHEN** rows H1, H2 and X1 to X10 of `test-plan.md` § Route rows run
- **THEN** H1 is 201 with the record of its row, its replay 201 with `idempotent-replayed` `true`, a second key 409 `ALREADY_EXISTS`, and `GET /api/v1/tool-servers/snips` shows `pendingSurface` equal to `codeBlockSurface([WC])`; H2 is 200 with `pendingDigest` `D_WC2`; each X row is 400 with the one `{ field, message }` of its row and leaves no server or idempotency row

#### Scenario: Who may use the routes, and each refusal of an existing server
- **WHEN** rows U1 to U6 and Z1 of `test-plan.md` § Route rows run
- **THEN** U1 (a missing server) is 404 `NOT_FOUND`; U2 (fixture server `acme`) and U3 (HTTP server `shop`) are 422 `OPERATION_REFUSED` `{ reason: "adapter_mismatch" }`; U4 (mallory, tenant B, `snips`) is 404; U5 and U6 (alice, `author`) are 403 `FORBIDDEN` for POST and PUT; Z1 (null pool) is 503 `AUTHZ_UNAVAILABLE`

### Requirement: main wires the runner and the routes and the document lists them
`main` SHALL pass `code: createCodeRunner(() => sandbox)` to `createInvokePath` (the getter, because the pool is created after the path) and register `registerCodeBlockRoutes` with the PEP pool, the clock and the engine key. `docs/api/openapi.json` SHALL list both routes with action `register_tool_server` and equal the served document.

#### Scenario: main registers the routes, passes the pool getter and the document lists the routes
- **WHEN** rows M1 and M2 of `test-plan.md` § Main rows run
- **THEN** M1 finds `POST /api/v1/tool-registrations/code` and `PUT /api/v1/tool-servers/:id/code` defined with session auth and action `register_tool_server`, every route error registered, `POST /api/v1/credentials` listing `OPERATION_REFUSED`, and the committed document listing `/api/v1/tool-registrations/code` and `/api/v1/tool-servers/{id}/code` and equal to the served text; M2 finds in the text of `src/main.ts` the line `code: createCodeRunner(() => sandbox),` once, inside the `createInvokePath` call, and `registerCodeBlockRoutes(` once, after `registerToolServerRoutes(`
