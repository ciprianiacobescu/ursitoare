# Delivered shapes taken by add-flow-test-cli

Merged names, as declared on main (e06fdb3), without `export`. The sibling shapes are copied word for word from their folders (`add-mock-test-runs`, `add-interpreter-core`, `add-envelope-store`).

```ts
// src/cli (add-admin-cli, add-flow-validator)
interface CliOption { type: "string" | "boolean"; summary: string; required?: boolean; }  // registry.ts:8
interface CliCall { args: Readonly<Record<string, string | boolean>>; env: Env; stdout: CliOutput; stderr: CliOutput; clock: Clock; ids: IdSource; owner: OwnerAccess | null; }  // registry.ts:19
interface CliCommand { summary: string; details?: string; options: Readonly<Record<string, CliOption>>; database: boolean; run(call: CliCall): Promise<number>; }  // registry.ts:29
interface CommandRegistry { registerCommand(name: string, command: CliCommand): void; find(words: readonly string[]): { name: string; command: CliCommand; rest: string[] } | null; list(): { name: string; command: CliCommand }[]; }  // registry.ts:37
function createCommandRegistry(): CommandRegistry  // registry.ts:65
class CliError extends Error { readonly code: CliErrorCode; constructor(code: CliErrorCode, message: string); }  // errors.ts:20
function safeText(text: string): string; function safeJson(value: unknown): string  // output.ts:23,32
interface CliDeps { env: Env; stdout: CliOutput; stderr: CliOutput; registry: CommandRegistry; clock?: Clock; ids?: IdSource; readSecret?: SecretReader; connectOwner?: ...; }  // run.ts:15
function cliMain(argv: readonly string[], deps?: Partial<CliDeps>): Promise<number>  // main.ts:17
function createDefaultRegistry(): CommandRegistry; function registerFlowCommands(registry: CommandRegistry): void  // builtin.ts:6; flow/index.ts:6
// src/authoring (add-flow-format-model, add-flow-validator)
function validateFlowText(text: string, format: FlowFormat, catalogue: Catalogue): ValidationResult  // validate/validate.ts:72; ValidationResult { ok; errors: Issue[]; warnings: Issue[]; layers_run }, Issue { layer; code; node: string | null; path; message }
function catalogueFromJson(text: string): Catalogue  // validate/catalogue-file.ts:101; class CatalogueFileError extends Error { readonly code: "CATALOGUE_FILE_INVALID"; constructor(message: string) }  // catalogue-file.ts:14; `catalogueFromJson` throws it with messages such as `invalid JSON` (flow validate prints `CLI_USAGE: --catalogue is not a usable catalogue file: <message>`, validate.ts:55-72)
function parseFlowText(text: string, format: FlowFormat, limits?: Partial<ParseLimits>): ParseResult  // format/parse.ts:125; { ok: true; doc: unknown } | { ok: false; error: ParseError }
function formatOf(fileName: string): FlowFormat; function contentHash(doc: unknown): string  // parse.ts:138; hash.ts:14
const emptyCatalogue: Catalogue  // format/catalogue.ts:44
// test/support/catalogue/document.ts:11
const TEST_CATALOGUE_PATH: string
// add-mock-test-runs
function checkMocks(flow: Flow, catalogue: Catalogue, mocks: unknown): { mocks: TestMocks | null; problems: MockProblem[] };
function createMockInvoker(mocks: TestMocks): ToolInvoker;
function testRunInvokers(store: RunStore): InterpreterDeps["invokerFor"];
interface MockProblem { nodeId: string; index: number | null; reason: "missing" | "unknown_node" | "not_a_block" | "schema" | "shape"; detail: string; }
// add-interpreter-core
function startRun(deps: InterpreterDeps, ctx: TenantContext, req: StartRunRequest): Promise<RunRecord>;
function executeRun(ops: WorkflowOps, deps: InterpreterDeps, ctx: TenantContext, runId: string): Promise<RunRecord>;
function memoryWorkflowOps(workflowId: string, recorded?: readonly JsonValue[]): MemoryWorkflowOps;
const NO_EFFECT_GATE: EffectGate;
interface StartRunRequest { flowId: string; hash: string; mode: EffectMode; input: JsonValue; mocks: JsonValue | null; principal: RunPrincipal; actorChain: readonly string[]; runId?: string; }
// add-envelope-store
function createMemoryRunStore(): RunStore;
interface RunStore { createRun(...); getRun(...); transition(...); recordStep(...); listSteps(ctx: TenantContext, runId: string, q: { limit: number; afterSeq?: number }): Promise<{ steps: StepRecord[]; next: number | null }>; getPayload(ctx: TenantContext, sha256: string): Promise<StoredPayload | null>; }
```

## Facts from the merged code

- `src/cli/run.ts:26,96-103`: `KNOWN_CODE = /^(CLI|RBAC|IDENTITY|AUDIT|TENANT)_[A-Z0-9_]+$/`; any other thrown error prints `CLI_INTERNAL: command failed` and exits 1; `CLI_USAGE` and `CLI_UNKNOWN_COMMAND` exit 2. `run.ts:139`: a missing required option throws `CLI_USAGE` `missing required option --<name>`. `run.ts:35-39`: help prints `${name}  ${summary}` per `registry.list()` entry, which `registry.ts:99-102` sorts by name. `run.ts:30-35,44-58,132`: `--help` on a command prints `usage: node src/cli/main.ts <name>` followed by each option as `--x <string>` (required) or `[--x <string>]` / `[--x]`, in declaration order on one line; then the summary line, the `details` lines if any, and one line `  <option as above>  <option summary>` per option (`writeUsage`, run.ts:44-58).
- `src/cli/registry.ts:44-58`: the group `flow` is accepted by `registerCommand`. `src/cli/flow/index.ts:6-8`: `registerFlowCommands` registers `"flow validate"`; `src/cli/builtin.ts:6-11` calls it from `createDefaultRegistry`.
- `src/cli/flow/validate.ts:33-53,94-117`: file reads refuse a missing file, a directory, a non-file and more than 1,048,576 bytes with `CLI_USAGE` `cannot read <option> (<ENOENT|EISDIR|not a regular file|too large>)`; the command is `database: false` and returns 1 for an invalid flow.
- `src/cli/main.test.ts:110`: the frozen test expects the default registry's names to equal `[...ADMIN_COMMANDS, "flow validate"]`.
- `src/authoring/validate/validate.ts:72-98`: `validateFlowText` returns only the result, not the document; `src/authoring/format/hash.ts:14`: `contentHash(doc)` hashes the canonical JSON of the parsed document.
- `test/arch/modules.ts`: `cli` may import `interpreter`, `runs`, `authoring`, `durable`; `src/cli/main.ts:17-29`: `cliMain` takes `registry`, `clock`, `ids` from its `deps` when given.
