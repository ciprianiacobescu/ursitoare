## Why

An author's flow text is untrusted until something decides whether the engine may store and run it. The Phase-0 spike proved a three-layer validator (schema, registry, data flow) with 47 error and 5 warning codes. M3 needs it in the engine so the registry (U27) can validate saved versions, the editor (U28) shows diagnostics beside the text, and an operator can check a file from a terminal. One thing changes in the port: the spike had its own taint lattice and relabelled `code` output as `extracted` (the defect of architecture §8.7: a flow passes validation, then is denied at run time); this validator takes every taint decision from `add-taint-static`.

Observable result: `validateFlowText(text, "yaml", catalogue)` returns `{ ok, errors, warnings, layers_run }` with coded diagnostics (`layer`, `code`, `node`, JSON-Pointer `path`, `message`); RF-1 against the test catalogue has no error and one warning, `W_LETHAL_TRIFECTA`; each of the 47 error codes is produced by a shipped case file; `docs/authoring/diagnostics.md` documents every code under an anchor U28 can link; and `node src/cli/main.ts flow validate --file rf-1.yaml --catalogue blocks.v0.json` prints `OK rf-1.yaml (layers run: L1 L2 L3) 0 error(s), 1 warning(s)` and exits 0, or lists the errors and exits 1.

## What Changes

- New `src/authoring/validate/` (`types`, `codes`, `schema`, `jsonschema`, `graph`, `l1`, `l2`, `l3`, `taint-checks`, `validate`, `diagnostics`, `catalogue-file`, `index`), ported from the read-only `seed/format` without the lattice and the `code` relabelling: taint errors and the trifecta warning come from `analyzeTaint` and `flowCapabilities`. Rules: `design.md`, `codes.md`.
- New `src/cli/flow/`: `ursitoare flow validate --file <path> [--catalogue <path>] [--json]`, registered by `registerFlowCommands`, called from `createDefaultRegistry()` in `src/cli/builtin.ts`.
- New `docs/authoring/diagnostics.md`, the exact output of `renderDiagnosticsDoc()`; anchors are `#<code in lower case>`.
- New `test/support/flow-cases/`: 157 case files (the seed's `test/fixtures` under another name, edits in `codes.md`) and a loader; the seed's 221 tests become table-driven tests over them plus the scenarios.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. The scaffold installs `ajv` 8.20.0 and `acorn` 8.19.0, exact (MIT, allowed by `test/arch/licence-policy.ts`; no install script), and gives `FLOW_ERROR_CODES`, `FLOW_WARNING_CODES`, `FLOW_RESERVED_CODES` and `DIAGNOSTICS` as empty arrays and `DIAGNOSTICS_DOC_PATH` as `""`, which this change fills. Not scaffolded, because they change existing files: the line `export * from "./validate/index.ts";` in `src/authoring/index.ts` (the scaffold has only `export type { Layer, Issue, ValidationResult }` from it there, for add-flow-registry's stubs; keep it) (created by `add-flow-format-model`, also edited by `add-taint-static`), the optional member `delegateWorkflows` of `Catalogue` in `src/authoring/format/catalogue.ts`, the call `registerFlowCommands(registry)` in `src/cli/builtin.ts`, and the changed expectation of one existing test (task 5.2). Not scaffolded: the case files and the tests.
- **Depends on:** `add-admin-cli` (U20, merged, not archived: the command registry, output helpers and exit codes of `src/cli`), `add-flow-format-model` (U22: types, `Catalogue`, parser, references), `add-taint-static` (U23: `analyzeTaint`, `flowCapabilities`), `add-test-catalogue` (U24: the catalogue and RF-1 the tests validate against). U22 to U24 are written, not merged; their names are restated below.
- **Files created:** the modules above, `docs/authoring/diagnostics.md`, `test/support/flow-cases/**`, a `*.test.ts` per task. **Changed:** `src/authoring/index.ts`, `src/authoring/format/catalogue.ts`, `src/cli/builtin.ts`, `src/cli/main.test.ts`. `test/arch/modules.ts` needs no change (`authoring` imports only itself and npm packages; `cli` may import `authoring`).
- **Migrations, tables, endpoints, env, audit events:** none. **Codes:** the 47 error, 5 warning and the reserved `INTERNAL_ERROR` codes of `codes.md` are library diagnostics, not API codes (`ERROR_CODES` is untouched). **CLI exit codes:** 0 valid (warnings allowed), 1 invalid, 2 usage or unreadable file.

**Interfaces given** (declarations omit `export`; the same text as the block in design.md § Interfaces)

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

`FLOW_ERROR_CODES` lists the 47 codes in the order of `codes.md` (19 `L1_`, 16 `L2_`, 12 `L3_`), `FLOW_WARNING_CODES` the five `W_` codes, `FLOW_RESERVED_CODES` is `["INTERNAL_ERROR"]`, `DIAGNOSTICS_DOC_PATH` is `"docs/authoring/diagnostics.md"`, `diagnosticAnchor(code)` is `code.toLowerCase()`, `diagnosticLink(code)` is `DIAGNOSTICS_DOC_PATH + "#" + diagnosticAnchor(code)` for a code of the three lists, else `null`. `delegateWorkflows(target)` lists the workflows a target offers, `undefined` when it does not exist; a catalogue without it still works (design D4). Issues are sorted by layer, path, code, message; `layers_run` names the layers that ran (a skipped layer is not a pass).

**Interfaces taken** (each restated as the giving change defines it)

- from `add-flow-format-model` (all via `src/authoring/index.ts`): `type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }`; `type JsonSchema = { [key: string]: JsonValue }`; `type Effect = "read" | "write" | "send" | "pay"`; `interface BlockDef { effect: Effect; description?: string; input: JsonSchema; output: JsonSchema; untrusted_fields?: string[]; data_class?: "public" | "private"; untrusted_result?: boolean; unsafe_to_retry?: boolean }`; `interface Catalogue { block(ref: string): BlockDef | undefined; modelProfile(ref: string): ModelProfileDef | undefined; role(name: string): RoleDef | undefined; delegateTarget(target: string, workflow: string): DelegateTargetDef | undefined; flow(ref: string, major: number): FlowSignature | undefined }`; `interface ModelProfileDef { ref: string }`; `interface RoleDef { name: string }`; `interface DelegateTargetDef { effect: Effect; untrusted_result: boolean }`; `interface FlowSignature { input: JsonSchema; output: JsonSchema }`; `const emptyCatalogue: Catalogue`; `interface Flow { ursitoare: string; flow: string; version: string; description?: string; inputs: JsonSchema; start: string; nodes: { [id: string]: FlowNode }; hooks?: HookRule[]; expose?: "mcp" }`; `function parseVersionedRef(ref: string): { name: string; major: number } | undefined`; `type FlowFormat = "yaml" | "json"`; `type ParseResult = { ok: true; doc: unknown } | { ok: false; error: ParseError }`; `interface ParseError { code: FormatErrorCode; message: string; line?: number; column?: number; path?: string }`; `function parseFlowText(text: string, format: FlowFormat, limits?: Partial<ParseLimits>): ParseResult`; `function formatOf(fileName: string): FlowFormat`; `type Ref = { root: "inputs"; path: string[] } | { root: "node"; id: string; field: "output" | "outcome"; path: string[] } | { root: "item"; path: string[] } | { root: "hook"; scope: HookScope; path: string[] }`; `type Seg = { type: "text"; text: string } | { type: "ref"; raw: string; ref?: Ref; error?: string }`; `function scanTemplate(text: string): Seg[]`; `function isSingleRef(segs: Seg[]): boolean`; `function refToString(ref: Ref): string`; `function suspiciousInterpolation(text: string): string | null`; `function walkStrings(value: unknown, path: string, visit: (text: string, path: string) => void): void`; `function escapePointer(segment: string): string`; `interface ValueField { field: string; value: unknown }`; `function valueFields(node: unknown): ValueField[]`; `interface SuccessorField { path: string; id: unknown; producesOutput: boolean }`; `function successorFields(node: unknown): SuccessorField[]`; `function requiredSuccessorFields(kind: string): string[]`.
- from `add-taint-static` (via `src/authoring/index.ts`): `type TaintLabel = "extracted" | "untrusted"`; `type Taint = readonly TaintLabel[]`; `interface TaintEdge { to: string; path: string; ref: string; from: string | null; taint: Taint; resolved: boolean; hook: string | null }`; `interface TaintAnalysis { nodes: { [id: string]: NodeTaint }; edges: TaintEdge[] }`; `class TaintError extends Error { readonly code: TaintErrorCode; constructor(code: TaintErrorCode, message: string) }`; `function analyzeTaint(flow: Flow, catalogue: Catalogue): TaintAnalysis`; `interface FlowCapabilities { reads_untrusted: boolean; reads_private: boolean; has_send_or_pay: boolean }`; `interface CapabilitySite { at: string; tool: string }`; `interface CapabilityEvidence { reads_untrusted: CapabilitySite[]; reads_private: CapabilitySite[]; has_send_or_pay: CapabilitySite[]; unknown: CapabilitySite[] }`; `function capabilityEvidence(flow: Flow, catalogue: Catalogue): CapabilityEvidence`; `function flowCapabilities(flow: Flow, catalogue: Catalogue): FlowCapabilities`.
- from `add-test-catalogue` (test code only): `function loadTestCatalogue(path?: string): TestCatalogue`; `interface TestCatalogue extends Catalogue { blockRefs(): string[]; modelProfileRefs(): string[]; roleNames(): string[] }`; `function loadTestFlow(name: string): Flow` (`rf-1-invoice-intake`, `rf-1-core`, `rf-1-core-approval`); the files `test/support/catalogue/blocks.v0.json` and `test/support/catalogue/flows/rf-1-invoice-intake.yaml`.
- from `add-admin-cli` (merged; `src/cli/index.ts`; declarations in `delivered-shapes.md`): `CliOption`, `CliCall`, `CliCommand`, `CommandRegistry`, `CliOutput`, `CliError`, `safeText`, `safeJson`, `createDefaultRegistry`, `cliMain`, `CliDeps`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3142c5f, checked line by line).

## Out of scope

The hook grammar and its codes (`H_*`, `W_NO_MATCH`: `add-hook-checker`; this schema takes `hooks`, `pre`, `post` and the v0.2 tuning fields only as arrays and objects); the other four "validator rules to add" of architecture §7 (design D12); taint of references inside hooks; storing a result and the registry's catalogue (`add-flow-registry`, `add-block-registry`); the editor and graph screens; the seed's rubric checker; positional arguments in the command runner; a catalogue that can list its contents.
