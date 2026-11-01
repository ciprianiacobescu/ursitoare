## Context

`validateFlow` decides whether a flow document may be stored and run, in three gated layers: L1 schema and string checks, L2 registry and graph, L3 data flow (references, dominance, types, taint). It ports `seed/format` (`validate.ts`, `codes.ts`, `graph.ts`, `jsonschema.ts`, the flow schema; nothing is imported from `seed/`) onto U22 and U23. It is pure (no clock, ids, I/O or database) and imports `ajv`, `acorn`, `../format/index.ts` and `../taint/index.ts`. The rule of every code is in `codes.md`; this file fixes what the table cannot. The repo's lint forbids `any`: the seed's `any` becomes `unknown` with narrowing helpers.

## Interfaces

Declarations omit `export`. `src/authoring/validate/index.ts` exports all but the test-support block; `src/authoring/index.ts` re-exports it. This block is the proposal's "Interfaces given" word for word. Names taken from U20 to U24 are restated in proposal.md and `delivered-shapes.md`. Internal, not given: `FLOW_SCHEMA` in `schema.ts`; `l1.ts`, `l2.ts`, `l3.ts` each export one layer function; tests reach them only through `validateFlowText`.

```ts
// src/authoring/validate/ (all re-exported by src/authoring/index.ts)
type Layer = "L1" | "L2" | "L3"
interface Issue { layer: Layer; code: string; node: string | null; path: string; message: string }
interface ValidationResult { ok: boolean; errors: Issue[]; warnings: Issue[]; layers_run: Layer[] }
function validateFlow(doc: unknown, catalogue: Catalogue): ValidationResult
function validateFlowText(text: string, format: FlowFormat, catalogue: Catalogue): ValidationResult
function jsonSchemaProblem(schema: unknown): string | null
const FLOW_ERROR_CODES: readonly string[]
const FLOW_WARNING_CODES: readonly string[]
const FLOW_RESERVED_CODES: readonly string[]
const DIAGNOSTICS_DOC_PATH: string
function diagnosticAnchor(code: string): string
function diagnosticLink(code: string): string | null
interface DiagnosticInfo { code: string; layer: Layer | null; severity: "error" | "warning"; summary: string; fix: string }
const DIAGNOSTICS: readonly DiagnosticInfo[]
function renderDiagnosticsDoc(): string
function catalogueFromJson(text: string): Catalogue
class CatalogueFileError extends Error { readonly code: "CATALOGUE_FILE_INVALID"; constructor(message: string) }
// src/authoring/format/catalogue.ts: Catalogue (U22) gains one optional member
delegateWorkflows?(target: string): readonly string[] | undefined
// src/cli/flow/
const flowValidateCommand: CliCommand
function registerFlowCommands(registry: CommandRegistry): void
// test/support/flow-cases/index.ts
type CaseGroup = "invalid" | "valid" | "warnings"
interface FlowCase { group: CaseGroup; name: string; path: string; text: string; format: FlowFormat; expect: string[]; expectWarnings: string[] }
function flowCases(group: CaseGroup, namePrefix?: string): FlowCase[]
function caseCatalogue(): Catalogue
```

## Decisions

**D1. Pipeline.** `validateFlowText` calls `parseFlowText(text, format)`; on `{ ok: false, error }` it returns `ok: false`, `layers_run: ["L1"]`, no warning and one `L1_PARSE` issue (node null, path `error.path ?? ""`, message `<error.code>: <error.message>`, plus ` (line L, column C)` when both exist); otherwise `validateFlow(result.doc, catalogue)`. `validateFlow` runs L1; L2 only if L1 produced no error; L3 only if L2 produced none. Issues are sorted by layer, path, code, message (UTF-16 order), warnings are de-duplicated on code, path and message, and `ok` is `errors.length === 0`. The result does not depend on the order of the `nodes` keys.

**D2. Never throws.** Each layer runs in a guard. A throw (a catalogue that raises, a bug, U23's `TaintError`) becomes one issue of that layer: code `INTERNAL_ERROR`, node null, path `""`, message `validator crashed: <message>` (for `TaintError` its own message, `taint analysis limit exceeded: ...`); the result is `ok: false`. `validateFlow` accepts any value as `doc`.

**D3. L1.** A cached `Ajv2020` with `{ allErrors: true, strict: true, strictRequired: false, discriminator: true }` (load it with `createRequire` as the seed does if the default import fails the type check) compiles `FLOW_SCHEMA`, the seed schema as a TypeScript constant with three changes: (a) `role` matches `^[a-z][a-z0-9_]{0,31}$`, U17's role id rule, so `tenant_admin` passes; (b) `ursitoare` stays `const "0.1"` (`0.2-draft` flows get `L1_CONST` until `add-hook-checker` widens it); (c) v0.2 members are accepted by shape only: top-level `expose` (`const "mcp"`) and `hooks` (array of objects); on every node `tags` (unique non-empty strings), `pre`, `post` (arrays of objects); on `llm.*` and `agent` nodes `profile` (non-empty string), `skills` (unique non-empty strings), `skill_mode` (`bound`|`catalog`), `context` (array of objects), `context_budget` (object). The seed's mapping from Ajv keyword to code is kept (`anyOf`/`not` give `L1_FOREACH_BODY`, `propertyNames` gives `L1_PATTERN` on the node id, `if` and `oneOf` errors are dropped, a missing or extra property gets its own path, duplicates are removed, an unmapped keyword is an internal error). Static checks then run in the same layer on any object document: `jsonSchemaProblem` on embedded schemas; reference syntax and `W_SUSPICIOUS_INTERPOLATION` over `valueFields(node)` with `walkStrings` and `scanTemplate`; `L1_REF_NOT_ALLOWED`; the acorn checks of `codes.md`. Hook members are not walked.

**D4. L2.** As the seed, over the interface: blocks by `catalogue.block(ref)`, flows by `parseVersionedRef` then `catalogue.flow(name, major)` (`.input` is the `with` schema), roles, model profiles. The seed's "(available: ...)" lists are dropped: `Catalogue` cannot list. A delegate whose `catalogue.delegateTarget(target, workflow)` is `undefined` is `L2_UNKNOWN_DELEGATE_WORKFLOW` when `catalogue.delegateWorkflows?.(target)` returns a list, else `L2_UNKNOWN_DELEGATE_TARGET` (a catalogue without the member reports the pair under the target code). Edges, reachability, cycles and `L2_NO_END` use `successorFields` and a local `graph.ts` (`buildEdges`, `reachableFrom`, `findCycles`, `topoOrder`, `availability`, ported unchanged).

**D5. L3 values.** As the seed minus its labels. Output schema of a node for reference paths: `block` the block's `output`; `code`, `llm.extract`, `llm.generate`, `agent` their `output_schema`; `human.form` its `form_schema`; `llm.decide` `{ outcome: string enum of the outcomes, rationale: string }`; `human.approval` `{ decision: enum approved|rejected, approver, comment }`; `foreach` `{ results: array of the per-item output }`; `subflow` the flow's `output`; `delegate` `{ correlation_id: string, result: object }`; `switch`, `wait`, `end` none. `typeSet`, `deref` and `compat` stop at depth 16 and answer "unknown", so a self-referencing schema cannot overflow the stack (the seed crashes on it). Lookups use own-property tests.

**D6. L3 taint.** After the reference pass `analyzeTaint(flow, catalogue)` runs once. For each `TaintEdge e` with `e.hook === null`, `e.resolved`, `"untrusted"` in `e.taint` and no `L3_REF_*` or `L3_ITEM_OUTSIDE_FOREACH` error at `e.path`, with `n` the node `e.to`: (a) `n` is a `block`, or a `foreach` with `uses`, `e.path` starts with `/nodes/<id>/with/` and that block's effect is not `read`: `L3_TAINT_TO_CONSEQUENTIAL`; (b) `n` is an `agent`, `e.path` starts with `/nodes/<id>/input/` and one of its tools has an effect other than `read`: `L3_TAINT_TO_AGENT_WITH_EFFECTS`; (c) `n` is a `subflow`, a `delegate` or a `foreach` with `subflow`, and `e.path` starts with `/nodes/<id>/with/`: warning `W_TAINT_TO_OPAQUE_CALL`. `extracted` alone never raises. The issue's node is `e.to`, its path `e.path`, its message names `e.ref`, the producer `e.from` (`foreach items` when null) and the fix (pass it through `llm.extract` first). Then `flowCapabilities` all true gives `W_LETHAL_TRIFECTA`. Hook edges are ignored: whether a hook may send untrusted data is for `add-hook-checker`.

**D7. `jsonSchemaProblem`.** `null` when `schema` is a plain object that the same `Ajv2020` settings' `validateSchema` accepts; else one line: `schema must be a JSON object` for an array, null, boolean or scalar, otherwise `ajv.errorsText(errors, { dataVar: "schema" })` or the first line of the exception (a `$schema` other than 2020-12 throws). It checks the meta-schema, not compilation, so vendor keywords and unresolved `$ref`s pass.

**D8. Diagnostics document.** `DIAGNOSTICS` has one entry per code of the three lists, in that order (`layer` null for `INTERNAL_ERROR`); `summary` and `fix` are non-empty single lines written from `codes.md`. `renderDiagnosticsDoc()` returns the whole file: a title, a line saying it is generated by this function and how to regenerate it, an intro, then per entry the heading `### <CODE>` (only the code, so GitHub's slug is the lower-cased code, the anchor), a line `<layer> error|warning`, the summary and `Fix: <fix>`; one final newline.

**D9. CLI.** `flowValidateCommand`: options `file` (string, required), `catalogue` (string), `json` (boolean); `database: false`. It reads `--file` as UTF-8 after `statSync` (over 1,048,576 bytes: `cannot read --file (too large)`; a directory `(EISDIR)`; another non-regular file `(not a regular file)`; `--catalogue` likewise), takes the format from `formatOf(file)`, loads the catalogue (`catalogueFromJson` of the `--catalogue` file, else `emptyCatalogue`), calls `validateFlowText`, prints, and returns 0 when `ok`, else 1. Text output through `safeText`: `OK|INVALID <file> (layers run: <layers joined by space>) <n> error(s), <m> warning(s)`, then per error `  <layer> <code> <path or "/">[ [<node>]]: <message>` and per warning the same with `  warning ` before the layer. With `--json`: `safeJson({ file, ...result })` and a newline. An unreadable file or catalogue throws `CliError("CLI_USAGE", ...)` with `cannot read --file (<errno code>)`, `cannot read --catalogue (<errno code>)` or `--catalogue is not a usable catalogue file: <safeText(message)>` (the runner prints a message raw); the runner prints it and exits 2. `registerFlowCommands` registers `"flow validate"`; `createDefaultRegistry()` calls it after `registerAdminCommands`. 

**D10. Catalogue file.** `catalogueFromJson(text)` reads the JSON shape of U24's catalogue document (`blocks`, `model_profiles`, `roles`, `delegate_targets`, `flows_registry`; each optional, extra keys ignored). First problem wins, as `CatalogueFileError("CATALOGUE_FILE_INVALID", "<pointer>: <reason>")`: the text is JSON (else `invalid JSON`) and an object (`/: must be an object`); `blocks` an object of objects with `effect` in `read|write|send|pay` and `input`, `output` objects; `model_profiles`, `roles` arrays of strings; `delegate_targets` an object of string arrays; `flows_registry` an object of objects with `inputs`, `outputs` objects. Lookups use `Object.hasOwn`; `block(ref)` returns the block as written (`untrusted_fields`, `data_class`, `untrusted_result` included); a listed delegate pair answers `{ effect: "send", untrusted_result: true }` (U22 Decision 9), `delegateWorkflows(target)` the list, `flow(ref, major)` the key `<ref>@<major>` as `{ input: inputs, output: outputs }`.

**D11. Case files.** `test/support/flow-cases/{invalid,valid,warnings}/*.yaml` hold the 157 files of `codes.md`. `flowCases(group, namePrefix?)` lists the group's `.yaml` files sorted by name, keeps names starting with `namePrefix`, and returns the absolute `path`, the text, `format: "yaml"`, `expect` (sorted codes after `# expect:`, else `[]`) and `expectWarnings` (after `# expect-warnings:`). `caseCatalogue()` wraps `loadTestCatalogue()` (`test/support/catalogue/loader.ts`) and adds `delegateWorkflows`, answering `["archive-invoice", "sync-crm", "generate-report"]` for `n8n` (U24's delegate target) and `undefined` otherwise.

**D12. Architecture §7 "Validator rules to add".** In scope: the first only, the shared taint algebra. Out of scope, owned later: the abstain outcome of an unattended `llm.decide` (`add-llm-node-runtimes`), the 10-skill bound of `catalog` mode, context `scope` naming model output, and model-capability matching (the units that define `skills`, `context` and profiles; this schema only accepts the members).

## Failure cases

- Bad input: unparseable text is one `L1_PARSE`; a non-object document, a missing field or a wrong type is an L1 error, never a throw; an unknown block, role, flow, profile or successor is an L2 error; no later layer runs after an earlier layer's errors.
- Absence: an empty catalogue makes every block `L2_UNKNOWN_BLOCK` (no `--catalogue` means the empty catalogue); a catalogue without `delegateWorkflows` still works (D4).
- Dependencies: a throwing catalogue or `TaintError` is `INTERNAL_ERROR` (D2). Concurrency: pure functions; the Ajv instances are built once and not mutated.

## Security

1. No endpoint and no PEP action: a library plus a local command with no database.
2. No table or query; no two-tenant test applies.
3. The input is untrusted flow text. U22's parser bounds size, depth and aliases first; the validator never evaluates a `code` source (acorn parses it) and never fetches a `$ref`; every flow or catalogue string that reaches the terminal goes through `safeText` or `safeJson`.
4. No secret is read or logged; the command reads no environment variable.
5. Abuse and its scenario: laundering through `code` ("Code no longer launders"); a recursive schema or random mutation that crashes the validator ("Crashes, limits and mutations"); a node id with an escape sequence printed raw ("flow validate prints a verdict"); unparseable or hostile text ("Parse failures become L1_PARSE").

## Test plan

Node tests beside the code, `node:assert/strict`, no database or network. Layer tests run each case file through `validateFlowText(text, "yaml", caseCatalogue())`; CLI tests call `cliMain(argv, { env: {}, stdout, stderr })` with in-memory outputs and temporary files under `os.tmpdir()`. At red the scaffold's stubs throw `new Error("not implemented")`, so each test calls the function inside `assert.doesNotThrow(() => { r = f(x); })` and asserts on `r`; a test that reads case files or `docs/authoring/diagnostics.md` first asserts `existsSync` of it, so red fails by assertion. Names contain no `.`, `[` or `::`. Files in `src/authoring/validate/`: `codes`, `jsonschema`, `validate`, `cases-l1`, `cases-l2`, `cases-l3`, `taint`, `whole`, `diagnostics`, `catalogue-file` (each `<name>.test.ts`), plus `src/cli/flow/validate.test.ts`.

## Decisions made while writing

- **`INTERNAL_ERROR` is reserved, not a 48th code**, for crashes and `TaintError` (no spare code among the 47).
- **What the dropped lattice changes:** `code` output keeps its input's taint, so `L3_TAINT_TO_CONSEQUENTIAL` now fires through a `code` node; a block's output inherits its input's taint (union); `W_LETHAL_TRIFECTA` is U23's flow-level capability test (delegates and subflows are untrusted, a block hook counts, an unmarked `read` is private, `kb.search@1` is public); the other taint codes keep the seed's sinks.
