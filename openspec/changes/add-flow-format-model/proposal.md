## Why

M3 turns flow text into validated, versioned definitions, and every unit of it (taint, test catalogue, validator, registry, web editor and graph) needs the same base: what a flow document is, how text becomes one safely, which single string stands for it, and how `${{ }}` references are read. Without it each unit would parse YAML its own way and hash a different serialisation, and the content hash that pins a published version would not be stable.

Observable result: any code in the engine can call `parseFlowText(text, "yaml" | "json")` and get either a plain JSON document or one `FORMAT_*` error with a position (oversized, too deeply nested, alias-bombed, duplicate-keyed, tagged or non-JSON text is refused before use); `canonicalJson(doc)` and `contentHash(doc)` give the same string and the same `sha256:` hash for the YAML and the JSON form of a flow, for any key order and for any spacing inside `${{ }}`, and a different hash for any real change; `parseRef` and `scanTemplate` read the reference grammar once; the `Catalogue` interface is fixed for the units that fill it; and `docs/authoring/format.md` documents the format, with a test that fails when a field, kind, code or limit is missing from it.

## What Changes

- New code in `src/authoring/format/` (`types.ts`, `catalogue.ts`, `errors.ts`, `json-value.ts`, `parse.ts`, `canonical.ts`, `hash.ts`, `refs.ts`, `nodes.ts`, `doc-terms.ts`, `index.ts`) and `src/authoring/index.ts`: format v0 types with the v0.2 fields (`hooks`, `profile`, `skills`, `context`, `expose`), the `Catalogue` interface with an empty implementation, safe YAML and JSON parsing with size, depth and alias limits, canonical JSON and `contentHash`, the reference parser (with the `hook` root), and node helpers (value fields, successor fields).
- New `docs/authoring/format.md`, checked by a Node test.
- Ported from the read-only `seed/format` (`types.ts`, `io.ts`, `canonical.ts`, `refs.ts`, `graph.ts` successor tables), with three seed defects fixed (design.md Context). Validation (L1 to L3, the 47 codes) is U25's, not here.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. The scaffold also installs the one new dependency, `yaml` at exactly `2.9.1` (licence ISC, allowed by `test/arch/licence-policy.ts`; ships its own types; no install script). Not scaffolded: the internal `json-value.ts`, `docs/authoring/format.md` and the tests. Nothing existing is changed, so there are no calls or re-exports in existing files to add. `ajv` and `acorn` are U25's.
- **Depends on:** none. No unit of M3 is needed and nothing is imported from `src/core` (the code is pure: no clock, ids or I/O). `test/arch/modules.ts` needs no change: `authoring` already exists with `allowed: ["core"]`, and this code imports only `yaml` and `node:crypto`.
- **Files implemented** (stubs): those of § What Changes. **Created:** a `*.test.ts` per task, `json-value.ts`, `docs/authoring/format.md`. **Changed:** none.
- **Migrations, tables, endpoints, env, audit events:** none. **Error codes:** the eight `FORMAT_*` codes below (library codes; none is an API code, so `ERROR_CODES` is untouched; U25 maps a `ParseError` to its `L1_PARSE`).

**Interfaces given** (declarations omit `export`; the same text as the first block of design.md § Interfaces)

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

Also given, with their fields in the second block of design.md § Interfaces: `Values`, `NodeKind`, `FLOW_TOP_LEVEL_FIELDS`, `FORMAT_ERROR_CODES`, `FlowNode` and its 14 node types (`BlockNode` to `EndNode`, one per kind), `NodeBase`, `LlmTuning`, `ContextSource`, `HookSelector`, `HookWhen`, `CodeHook`, `BlockHook`, `HookDef`, `HookRule`, `HookScope`, `BlockDef`, `ModelProfileDef`, `RoleDef`, `DelegateTargetDef`, `FlowSignature`, `ValueField`, `SuccessorField`, `documentedTerms`, `missingDocTerms`. `DEFAULT_PARSE_LIMITS` is `{ maxBytes: 1048576, maxDepth: 64, maxAliasCount: 20 }`; the content hash is `sha256:` plus 64 lowercase hex digits over the canonical JSON of the whole document.

**Interfaces taken:** none from another change.

## Out of scope

Validation of any kind (JSON Schema, registry, data-flow and taint checks, the 47 error and 5 warning codes, `ursitoare flow validate`): `add-flow-validator`. Taint labels and `flowCapabilities`: `add-taint-static`. A catalogue with content: `add-test-catalogue` and the registry units. Storing a flow version: `add-flow-registry`. The hooks checker and runtime, the TypeScript call-list surface, the authority differ, and any web or API surface. Reading a file: callers read the text and call `parseFlowText`.
