## Context

Format v0 (`ursitoare: "0.1"`) with the v0.2 extensions (hooks, profile, skills, context, `expose`) is the one canonical flow form: validation, diff, review and execution run only on it, and an immutable `flow_version` is keyed by the hash of its canonical JSON. This unit is the shared base of M3 in `src/authoring/format`: typed documents, a safe parser, one canonical form and hash, one reference grammar, the `Catalogue` interface. It is pure (no I/O, clock or ids), imports only `yaml` and `node:crypto`, and ports `seed/format` (`types.ts`, `io.ts`, `canonical.ts`, `refs.ts`; nothing is imported from `seed/`). Seed defects fixed (checked against `yaml` 2.9.1): its YAML options admit `!!binary`, `!!set`, `!!omap`, `!!timestamp` and `.nan`; its key sort assigns `out[key]` and drops a `__proto__` key; its types are `any`.

## Interfaces

Declarations omit `export`; everything is exported by `src/authoring/format/index.ts` and re-exported by `src/authoring/index.ts`. The first block is the proposal's "Interfaces given" word for word; the second gives the types it names. Document types describe a document that passed U25's schema layer (nothing here checks it), in the format's snake_case. Internal: `findJsonProblem(value, maxDepth)` in `json-value.ts`, shared by the parser and the canonical walker.

```ts
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
type JsonSchema = { [key: string]: JsonValue }
type Effect = "read" | "write" | "send" | "pay"
const NODE_KINDS: readonly NodeKind[]
interface Flow { ursitoare: string; flow: string; version: string; description?: string; inputs: JsonSchema; start: string; nodes: { [id: string]: FlowNode }; hooks?: HookRule[]; expose?: "mcp" }
interface Catalogue { block(ref: string): BlockDef | undefined; modelProfile(ref: string): ModelProfileDef | undefined; role(name: string): RoleDef | undefined; delegateTarget(target: string, workflow: string): DelegateTargetDef | undefined; flow(ref: string, major: number): FlowSignature | undefined }
const emptyCatalogue: Catalogue
function parseVersionedRef(ref: string): { name: string; major: number } | undefined
type FormatErrorCode = "FORMAT_TOO_LARGE" | "FORMAT_TOO_DEEP" | "FORMAT_ALIAS_LIMIT" | "FORMAT_YAML_SYNTAX" | "FORMAT_JSON_SYNTAX" | "FORMAT_DUPLICATE_KEY" | "FORMAT_UNSUPPORTED_TAG" | "FORMAT_NOT_JSON"
interface ParseError { code: FormatErrorCode; message: string; line?: number; column?: number; path?: string }
class FormatError extends Error { readonly code: FormatErrorCode; readonly path: string | null; constructor(code: FormatErrorCode, message: string, path?: string) }
type FlowFormat = "yaml" | "json"
interface ParseLimits { maxBytes: number; maxDepth: number; maxAliasCount: number }
const DEFAULT_PARSE_LIMITS: ParseLimits
type ParseResult = { ok: true; doc: unknown } | { ok: false; error: ParseError }
function parseFlowText(text: string, format: FlowFormat, limits?: Partial<ParseLimits>): ParseResult
function formatOf(fileName: string): FlowFormat
function canonicalizeFlow(doc: unknown): unknown
function stableStringify(value: unknown): string
function canonicalJson(doc: unknown): string
function canonicalEqual(a: unknown, b: unknown): boolean
function contentHash(doc: unknown): string
function isContentHash(value: unknown): value is string
type Ref = { root: "inputs"; path: string[] } | { root: "node"; id: string; field: "output" | "outcome"; path: string[] } | { root: "item"; path: string[] } | { root: "hook"; scope: HookScope; path: string[] }
type Seg = { type: "text"; text: string } | { type: "ref"; raw: string; ref?: Ref; error?: string }
function parseRef(content: string): { ref?: Ref; error?: string }
function scanTemplate(text: string): Seg[]
function isSingleRef(segs: Seg[]): boolean
function refToString(ref: Ref): string
function suspiciousInterpolation(text: string): string | null
function walkStrings(value: unknown, path: string, visit: (text: string, path: string) => void): void
function escapePointer(segment: string): string
function valueFields(node: unknown): ValueField[]
function hookValueFields(hook: unknown): ValueField[]
function successorFields(node: unknown): SuccessorField[]
function requiredSuccessorFields(kind: string): string[]
```

```ts
// the types and constants the first block names
type HookScope = "input" | "output" | "node" | "next" | "from"
interface BlockDef { effect: Effect; description?: string; input: JsonSchema; output: JsonSchema; untrusted_fields?: string[]; private?: boolean; untrusted_result?: boolean; unsafe_to_retry?: boolean }
interface ModelProfileDef { ref: string }
interface RoleDef { name: string }
interface DelegateTargetDef { effect: Effect; untrusted_result: boolean }
interface FlowSignature { input: JsonSchema; output: JsonSchema }
interface ValueField { field: string; value: unknown }
interface SuccessorField { path: string; id: unknown; producesOutput: boolean }
type Values = { [name: string]: JsonValue }
type NodeKind = "block" | "code" | "llm.extract" | "llm.generate" | "llm.decide" | "agent" | "switch" | "human.approval" | "human.form" | "foreach" | "subflow" | "delegate" | "wait" | "end"
const FLOW_TOP_LEVEL_FIELDS: readonly (keyof Flow)[]
const FORMAT_ERROR_CODES: readonly FormatErrorCode[]
interface HookSelector { kind?: NodeKind[]; effect?: (Effect | "human" | "none")[]; nodes?: string[]; tags?: string[] }
interface HookWhen { from?: HookSelector; next?: HookSelector; outcome?: string[] }
interface CodeHook { id: string; kind: "code"; when?: HookWhen; input?: Values; source: string; routes?: string[]; max_retries?: number; allow_effect_retry?: boolean }
interface BlockHook { id: string; kind: "block"; when?: HookWhen; input?: Values; uses: string; with: Values; on_error?: "fail" | "continue" }
type HookDef = CodeHook | BlockHook
interface HookRule { id: string; match: HookSelector; pre?: HookDef; post?: HookDef }
interface NodeBase { tags?: string[]; pre?: HookDef[]; post?: HookDef[] }
interface LlmTuning { model_profile?: string; profile?: string; skills?: string[]; skill_mode?: "bound" | "catalog"; context?: ContextSource[]; context_budget?: { total_tokens: number } }
interface ContextSource { source: string; tier?: string; scope?: { tenant?: string; role?: string; step?: string }; budget?: { max_tokens?: number; max_age?: string }; on_unanswerable?: string }
type FlowNode = BlockNode | CodeNode | LlmExtractNode | LlmGenerateNode | LlmDecideNode | AgentNode | SwitchNode | HumanApprovalNode | HumanFormNode | ForeachNode | SubflowNode | DelegateNode | WaitNode | EndNode
type NodeOf<K extends NodeKind, F> = NodeBase & { kind: K } & F
type LlmFields = LlmTuning & { input: Values; instructions: string }
type BlockNode = NodeOf<"block", { uses: string; with: Values; next?: string }>
type CodeNode = NodeOf<"code", { language: "js"; source: string; input: Values; output_schema: JsonSchema; next?: string }>
type LlmExtractNode = NodeOf<"llm.extract", LlmFields & { output_schema: JsonSchema; next?: string }>
type LlmGenerateNode = NodeOf<"llm.generate", LlmFields & { output_schema: JsonSchema; next?: string }>
type LlmDecideNode = NodeOf<"llm.decide", LlmFields & { outcomes: string[]; cases: { [outcome: string]: string } }>
type AgentNode = NodeOf<"agent", LlmTuning & { input: Values; goal: string; tools: string[]; max_steps: number; output_schema: JsonSchema; next?: string }>
type SwitchNode = NodeOf<"switch", { on: string; cases: { [key: string]: string }; default: string }>
type HumanApprovalNode = NodeOf<"human.approval", { assignee_role: string; summary: string; timeout: string; cases: { approved: string; rejected: string; timeout: string } }>
type HumanFormNode = NodeOf<"human.form", { assignee_role: string; form_schema: JsonSchema; timeout: string; next?: string; on_timeout: string }>
type ForeachNode = NodeOf<"foreach", { items: string; uses?: string; subflow?: string; with: Values; max_parallel?: number; next?: string }>
type SubflowNode = NodeOf<"subflow", { flow: string; with: Values; next?: string }>
type DelegateNode = NodeOf<"delegate", { target: string; workflow: string; with: Values; callback_timeout: string; next?: string; on_timeout?: string }>
type WaitNode = NodeOf<"wait", { duration: string; next?: string }>
type EndNode = NodeOf<"end", { status: "completed" | "failed"; output?: Values }>
function documentedTerms(): string[]
function missingDocTerms(markdown: string): string[]
```

`DEFAULT_PARSE_LIMITS` is `{ maxBytes: 1048576, maxDepth: 64, maxAliasCount: 20 }`, frozen. `FORMAT_ERROR_CODES` lists the eight codes in the order above.

## Decisions

1. **Parse pipeline** (`parseFlowText` never throws for a string). Strip a leading U+FEFF. If `Buffer.byteLength(text, "utf8") > maxBytes`: `FORMAT_TOO_LARGE`, before parsing. JSON: `JSON.parse`. YAML: `YAML.parseDocument(text, { version: "1.2", schema: "core", customTags: [], uniqueKeys: true, merge: false, strict: true, prettyErrors: true })`; the first of `errors`, then `warnings`, decides; then `doc.toJS({ maxAliasCount })` in try/catch; then `findJsonProblem(doc, maxDepth)` walks the result. Mapping: yaml code `DUPLICATE_KEY` is `FORMAT_DUPLICATE_KEY`, `TAG_RESOLVE_FAILED` is `FORMAT_UNSUPPORTED_TAG`, `RESOURCE_EXHAUSTION` is `FORMAT_TOO_DEEP`, any other (multi-document included) is `FORMAT_YAML_SYNTAX`; a `ReferenceError` from `toJS` is `FORMAT_ALIAS_LIMIT`, a `RangeError` `FORMAT_TOO_DEEP`, any other throw the syntax code of the format. `message` is the first line; `line` and `column` (1-based, `linePos[0]`) are set for YAML errors. Empty YAML text is `{ ok: true, doc: null }`; a scalar or array root is returned (U25 refuses it).
2. **JSON-value walk** (`findJsonProblem`, depth-first, first problem wins). Plain objects (prototype `Object.prototype` or `null`), arrays, strings, finite numbers, booleans and `null` pass. Anything else (`Date`, `Map`, `Set`, typed arrays, class instances, `bigint`, `NaN`, `Infinity`, an array element `undefined`) is `FORMAT_NOT_JSON` with a JSON Pointer `path`, as is a string or key holding U+0000 (JSONB rejects it) or a lone surrogate. Containers nested deeper than `maxDepth` (the root container is depth 1) are `FORMAT_TOO_DEEP`; the walk stops at depth `maxDepth + 1`, so a cycle (`a: &x [*x]`) ends there. `JSON.parse` accepts a million nested brackets, so this walk guards both formats.
3. **Limits.** `maxBytes` 1,048,576: RF-1 is about 5 KB, a 200-node flow about 100 KB. `maxDepth` 64 equals `MAX_DEPTH` in `src/audit/canonical.ts`; flows nest about 10 deep. `maxAliasCount` 20 (seed and library default: 100): aliases only share schema fragments, and the library's weighted count bounds a bomb to about that many times the input. Callers may pass lower limits; a value that is not a non-negative integer is ignored, one above the default is lowered to it. (In `yaml` 2.9.1 one anchor used N-1 times passes with limit N; tests avoid that edge.)
4. **Error shape.** U22 owns the `FORMAT_*` family; U25 maps any `ParseError` to its one `L1_PARSE` diagnostic, keeping `message`. `FormatError` is thrown only by the canonical functions (`FORMAT_NOT_JSON`, `FORMAT_TOO_DEEP`).
5. **Canonical form** (`canonicalizeFlow`). Validate with `findJsonProblem(doc, 64)` (throws `FormatError`), build a new tree (the input is never mutated), normalise references, sort keys at every depth by UTF-16 code unit, keep array order. Objects are built with `Object.fromEntries`, never `out[key] = ...`, so a `__proto__` key stays ordinary data. An `undefined` property is omitted. Normalisation re-prints each reference in value fields as `${{ <ref> }}`: `valueFields(node)` for every node, `hookValueFields(hook)` for every hook (node-level `pre` and `post`, flow-level `hooks[*].pre` and `.post`). Text around references, malformed references, `source`, `instructions`, `goal` and `description` are untouched. `stableStringify` is compact `JSON.stringify` of the sorted tree.
6. **Hash.** `contentHash(doc)` is `"sha256:"` plus 64 lowercase hex digits of SHA-256 over the UTF-8 bytes of `canonicalJson(doc)`: the whole canonical document (`description`, `version`, `hooks`, `expose` included); `run_as` and state live outside the document, so outside the hash. Surface, key order and reference spacing do not change it; anything else does ("an edit makes a new hash", ADR-02). `isContentHash` tests `^sha256:[0-9a-f]{64}$`.
7. **References.** `parseRef` is the seed's plus the root `hook` for block-hook `with` values: `hook.<scope>.<path>`, scope `input`, `output`, `node`, `next` or `from` (the spike's five), at least one path segment. Segments match `[A-Za-z0-9_]+`, node ids `[a-z][a-z0-9_]*`. Renames: `scan` to `scanTemplate`, `escPtr` to `escapePointer`.
8. **Node helpers.** `valueFields` returns the value-holding fields present, in this order: `with` for `block`, `subflow`, `delegate`; `input` for `code`, the `llm.*` kinds and `agent`; `items`, `with` for `foreach`; `summary`, `on`, `output` for `human.approval`, `switch`, `end`; `[]` for a non-object or unknown kind. `hookValueFields`: a hook's `input`, and a `block` hook's `with`. `successorFields` and `requiredSuccessorFields` are the seed's `graph.ts` pair; edges and cycles stay in U25.
9. **`Catalogue` is synchronous**: static analysis is simpler over in-memory lookups; a database-backed implementation (U26, U67, U82, U84) loads a snapshot first. `ModelProfileDef` and `RoleDef` carry existence only; a unit may add optional members in a task naming `catalogue.ts`. `flow(ref, major)` takes the flow name and a numeric major and returns `{ input, output }` (the seed's `inputs`/`outputs`, renamed). `parseVersionedRef` matches `^([a-z][a-z0-9._-]*)@(0|[1-9][0-9]{0,8})$` (`invoices.get@1`, `notify-customer@12`), else `undefined`. `emptyCatalogue` answers `undefined` to everything. U24 gives the seed's delegate targets `effect: "send"` and `untrusted_result: true` (a delegate is a `send` in the hooks design).
10. **Documentation.** `docs/authoring/format.md` documents all of this. `documentedTerms()` is the duplicate-free union of `FLOW_TOP_LEVEL_FIELDS`, `NODE_KINDS`, the node v0.2 fields (`tags`, `pre`, `post`, `profile`, `skills`, `skill_mode`, `context`, `context_budget`), the hook fields, the reference roots and scopes, `FORMAT_ERROR_CODES`, `sha256`, and the limit names and values. `missingDocTerms(markdown)` returns the terms (in that order) that do not occur as an inline code span.

## Failure cases

- Bad, non-JSON, too deep, too large or alias-bombed text: one `ParseError`, before anything else sees the value; a library throw never escapes `parseFlowText`, and the canonical functions throw only `FormatError`.
- Absence: empty text parses to `null`; `emptyCatalogue` and a malformed `parseVersionedRef` give `undefined`; helpers given a non-object return `[]`. Everything is pure; there is no I/O to fail.

## Security

1. No endpoint or PEP action: a library module; callers authenticate first.
2. No table or query; no two-tenant test applies.
3. This is the boundary parser for untrusted flow text: byte, depth and alias limits; no custom tags, `!!binary`, `!!set`, `!!omap`, `!!timestamp` or merge keys; non-JSON values, NUL and lone surrogates refused; `__proto__` stays data; nothing is evaluated. Documents stay untrusted until U25 validates them.
4. No secret is read or logged; messages quote the library's first line only.
5. Abuse: deep nests, a self-referencing alias, an alias bomb, oversized text, `!!binary` and `.nan` are refused (the parser scenarios); flows differing only by a `__proto__` key do not collide ("Canonical JSON keeps real differences and unusual keys"). Accepted: duplicate keys in JSON text are not detected (last wins); an integer above 2^53 loses precision.

## Test plan

Node tests beside the code, `node:assert/strict`, no database, network or clock; every test imports from `src/authoring/format/index.ts` (`hash.test.ts` from `src/authoring/index.ts`), so red does not depend on the stub's file, and test names contain no `.`, `[` or `::`. Each test file declares its own small inline sample flow (a block, an `llm.extract`, a `switch`, an `end`, irregular reference spacing); no helper exists at red. The scaffold's stubs throw `new Error("not implemented")`, so a test calls the function inside `assert.doesNotThrow(() => { r = f(x); })` and asserts on `r`, which fails by assertion at red. Test files: `catalogue`, `refs`, `nodes`, `parse`, `canonical`, `hash` and `doc-terms`, each `<name>.test.ts`; `hash.test.ts` proves the re-exports. `doc-terms.test.ts` first asserts that `docs/authoring/format.md` exists (`existsSync`), so red fails by assertion, not by a read error.

## Decisions made while writing

- `FORMAT_*` codes, not `L1_PARSE`: U25's 47-code test is untouched and U25 maps them.
- `yaml` 2.9.1 exact (the seed's version, licence ISC, allowed by `test/arch/licence-policy.ts`).
- Limits 1 MiB, depth 64, aliases 20, lower-only; a leading BOM is ignored.
- Hash: `sha256:` plus hex over the whole canonical document, nothing excluded.
- `ursitoare` is typed `string` (U25 and U41 decide the accepted values); `expose` is `"mcp"` only.
- The `hook` reference root is here so U41 need not edit this file; `Catalogue` is synchronous.
- `successorFields` and `requiredSuccessorFields` are here because U23 depends only on this unit.
- Dropped from the seed: `readFlowFile`, `pretty`, `canonicalValue`.
