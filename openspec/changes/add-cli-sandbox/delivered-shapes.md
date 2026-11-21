# Delivered shapes taken by add-cli-sandbox

Declarations from main@3daa5c35 (`file:line`; `…` elides unused members), each read in the file named. Every unit named in `proposal.md` § Impact is merged and archived.

```ts
// src/cli (U20, U35b)
cli/registry.ts:8-12   interface CliOption { type: "string" | "boolean"; summary: string; required?: boolean }
cli/registry.ts:19-27  interface CliCall { args: Readonly<Record<string, string | boolean>>; env: Env; stdout: CliOutput; stderr: CliOutput; clock: Clock; ids: IdSource; owner: OwnerAccess | null }
cli/registry.ts:29-35  interface CliCommand { summary: string; details?: string; options: Readonly<Record<string, CliOption>>; database: boolean; run(call: CliCall): Promise<number> }
cli/registry.ts:65     createCommandRegistry(): CommandRegistry   // registerCommand(name, command), find, list
cli/output.ts:1-3      interface CliOutput { write(text: string): void }
cli/main.ts:19         cliMain(argv: readonly string[], deps: Partial<CliDeps> = {}): Promise<number>   // CliDeps (run.ts:15) holds env, stdout, stderr, registry, clock?, ids?, readSecret?, connectOwner?
cli/run.ts:91-105,180  report(error, stderr): a ConfigError prints CLI_CONFIG_INVALID; an error without a CLI_/RBAC_/IDENTITY_/AUDIT_/TENANT_ code prints `CLI_INTERNAL: command failed`, exit 1; CLI_USAGE exits 2   runCli(argv, deps) catches every throw of dispatch through report
cli/run.ts:169-177     a command with database false is called with owner null, clock deps.clock ?? systemClock, ids deps.ids ?? systemIds
cli/builtin.ts:6       createDefaultRegistry() registers admin bootstrap-admin, grant-role, list-users, revoke-role, verify-audit, flow test, flow validate (cli/flow/index.ts: registerFlowCommands uses `flowTestCommand`)
// src/cli/flow/test.ts (U35b), the file this unit edits
test.ts:136-161        runFlow(call, flow, catalogue, mocks, input): Promise<number> builds `const deps: InterpreterDeps = { store, durable: null, loadVersion, catalogueFor, invokerFor: testRunInvokers(store), effects: NO_EFFECT_GATE, clock: call.clock, ids: call.ids }` (no sandbox) and `runId = call.ids.next("run")` (:162)
test.ts:165-188        startRun(deps, tenant, { flowId, hash, mode: "mock", input, mocks, principal: { userId: "cli", kind: "human" }, actorChain: ["cli"], runId }); an InterpreterError prints `FAILED <code> -` and one `  <key>: <value>` line per detail, returns 1; anything else is rethrown
test.ts:189-226        executeRun(memoryWorkflowOps(runId), deps, tenant, runId); one stdout write of the step lines + `COMPLETED <terminal>` or `FAILED <code> <node>`, or of the JSON line; returns 0 when state is "completed" else 1
test.ts:228-293        export const flowTestCommand: CliCommand = { summary: "run a flow offline against mocks", options: OPTIONS, database: false, async run(call) {…} }   // run: reads --file, --mocks, --catalogue, --input; INVALID (:251-266) and MOCKS (:272-280) print and return 1 before runFlow, the `--input` parse is :282-289; usage problems throw CliError("CLI_USAGE", …); the last line is `return runFlow(call, flow, catalogue, checked.mocks, input)` (:291)
// src/sandbox (U38)
sandbox/types.ts:25-30   interface SandboxLimits { timeoutMs: number; memoryBytes: number; maxStackBytes: number; maxOutputBytes: number }
sandbox/types.ts:32-37   interface SandboxOptions { seed: string; nowIso: string; binding: "input" | "ctx"; result: "object" | "object_or_null" }
sandbox/types.ts:44-47   type SandboxResult = { ok: true; value: { [key: string]: SandboxJson } | null; stats } | { ok: false; fault: { code: SandboxFaultCode; message: string }; stats }   // stats { ms: number; memBytes: number }
sandbox/types.ts:48-58   interface WorkerSandbox { readonly size: number; readonly respawns: number; run(code: string, input: SandboxJson, limits: SandboxLimits, options: SandboxOptions): Promise<SandboxResult>; close(): Promise<void> }
sandbox/types.ts:60-67   interface WorkerSandboxOptions { size?: number; graceMs?: number; stackSizeMb?: number; stackCapBytes?: number; maxOldGenerationSizeMb?: number; workerFactory?: (url: URL, options: WorkerOptions) => Worker }
sandbox/limits.ts:5-10   DEFAULT_SANDBOX_LIMITS = Object.freeze({ timeoutMs: 1000, memoryBytes: 32 * 1048576 (33554432), maxStackBytes: 262144, maxOutputBytes: 1048576 })
sandbox/pool.ts:376      createWorkerSandbox(opts?: WorkerSandboxOptions): WorkerSandbox   // size 1 to 16 (readNumeric :102), the constructor creates no worker (:144-153), a worker is spawned when a run needs one (:207) and unref'd (:220); close() is idempotent (closePromise, :332-336)
sandbox/index.ts:3-27    exports the types above, DEFAULT_SANDBOX_LIMITS and createWorkerSandbox
// src/interpreter (U33, U39, U42)
interpreter/types.ts:125-136   interface InterpreterDeps { store; durable; loadVersion; catalogueFor; invokerFor; effects; clock; ids; sandbox?: WorkerSandbox; hookObserver? }   (NodeServices.sandbox? :101)
interpreter/runtimes/code.ts:9-15,38-45,71-76  CODE_LIMITS = frozen copy of DEFAULT_SANDBOX_LIMITS; codeSeed(ctx) = `${ctx.runId}:${ctx.nodeId}:${ctx.attempt}`; no sandbox → InterpreterError("INTERPRETER_NO_SANDBOX", …, nodeId); sandbox.run(node.source, input, CODE_LIMITS, { seed, nowIso: ctx.now.toISOString(), binding: "input", result: "object" }); a throw of run → INTERPRETER_CODE_FAILED fault "sandbox_unavailable"; a not-ok result → INTERPRETER_CODE_FAILED with fault.code (message `code node "<id>" failed (<fault>)`, details { fault })
interpreter/hooks/pipeline.ts:135-141  a code hook with deps.sandbox undefined → InterpreterError("INTERPRETER_NO_SANDBOX", …, nodeId, { hook })
interpreter/hooks/pipeline.ts:337      a hook returning action "fail" → InterpreterError("HOOK_FAILED", …, nodeId)
interpreter/start.ts:33 startRun(deps, ctx, req); interpreter/execute.ts:185 executeRun(ops, deps, ctx, runId); mocks.ts checkMocks(flow, catalogue, mocks); testRunInvokers(store)   runs/store/memory-store.ts:46 createMemoryRunStore()
// src/core
core/clock.ts:11   fixedClock(iso: string): Clock   core/ids.ts:63 sequentialIds(seed = 0): IdSource   // next("run") → `run_00000000-0000-7000-8000-000000000000`, then …0001
// test/arch (U04)
arch/sources.ts:9-12     interface ModuleRule { allowed: string[]; egress?: "tools" | "oidc" | "otlp" }
arch/modules.ts:3        export const MODULES: Record<string, ModuleRule>   // `cli` is the last key (:132-): the 26 names of `api` in the same order, no sandbox
arch/rules.ts:52         checkGraphIntegrity(modules = MODULES): Violation[]
arch/rules.ts:205-208    checkModuleGraph(s: Snapshot, modules = MODULES): Violation[]   // ARCH_MODULE_EDGE `<from> may not import <to>; allowed: <list|none> (test/arch/modules.ts)`, ARCH_DEEP_IMPORT `import <to> through src/<to>/index.ts`, ARCH_UNKNOWN_MODULE, ARCH_ROOT_FILE, ARCH_DYNAMIC_IMPORT
arch/sources.ts:39-47    interface SourceFile { path: string; text: string }   interface Snapshot { files: SourceFile[]; srcDirs: string[] }
arch/sources.ts:62,103   snapshotOf(files: Record<string, string>): Snapshot   readSnapshot(root = REPO_ROOT): Snapshot
arch/sources.ts:129-134,162  interface ImportRef { specifier: string | null; line: number; typeOnly: boolean; dynamic: boolean }   collectImports(file: SourceFile): ImportRef[]
arch/modules.test.ts:41-93   the frozen test: `assert.deepEqual(ruleOf(MODULES, "cli").allowed, apiAllowed)` (:81) is its one `cli` assertion; helpers `answer`, `ruleOf`, `copyOf`, `expectGraphViolation` (:6-39) are file-local
// test/support fixtures
support/crash/pay-once.ts:19,32,36  PAY_ONCE_INPUT = { vendor: "Acme", invoice: "inv-1", amount: 120 }; PAY_ONCE_PAID_OUTPUT = { payment_id: "pay-1", status: "paid" }; payOnceVersion(): LoadedVersion   // flow pay-once: lookup (block) → route (switch on lookup status; active → pay, default rejected) → pay (block) → done; no code node
support/catalogue/document.ts:11   TEST_CATALOGUE_PATH: string (the test catalogue JSON)
support/code-pay.ts:5,73     CODE_PAY_TEXT (YAML); codePayVersion(): LoadedVersion   // nodes lookup (block erp.lookup_vendor@1, with vendor_name) → normalize (code, language js, input { amount, currency }, source `return { amount: Math.round(input.amount * 100) / 100, currency: input.currency.toUpperCase(), is_large: input.amount > 1000 };`, output_schema object with amount, currency, is_large required) → pay (block erp.create_payment@1) → done (end completed, output { payment_id })
support/hook-runs/index.ts:19,26,39,43  hookRunNames(): string[]; readHookRunText(name): string (throws CatalogueDataError CATALOGUE_UNKNOWN_FLOW for an unknown name); hookRunVersion(name)
support/hook-runs/flows/mutate.yaml    lookup (block, pre code hook `trim_name`: returns { action: "continue", input: { vendor_name: ctx.input.vendor_name.trim() } }) → normalize (code node returning { amount, currency }; post code hook `upper_currency`: returns { action: "continue", output: { amount: ctx.output.amount, currency: ctx.output.currency.toUpperCase() } }) → pay (block, reference "inv-1") → done; inputs vendor, amount, currency (all required)
support/hook-runs/flows/fail.yaml      lookup (block, post code hook `no_blocked`: `if (ctx.output.status === "blocked") return { action: "fail", reason: "vendor blocked" };`) → normalize (code node) → pay → done; same inputs
```

Probe facts (scratch copy, Node 24.22.2): on unedited main the `flow test` run of `CODE_PAY_TEXT` with mocks `M` prints `0 lookup block completed\n1 normalize code failed\nFAILED INTERPRETER_NO_SANDBOX normalize\n` (exit 1), and `mutate` and `fail` print `FAILED INTERPRETER_NO_SANDBOX lookup\n` (exit 1). Main's own `src/main.ts` builds its pool with the same seam shape (`deps.createSandbox ?? createWorkerSandbox`, :150 and :384).
