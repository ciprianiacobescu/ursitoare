## Why

Every later M3 unit and the mocked runs of M5 to M12 need the same small, known world to test against: twenty named blocks with effects and taint sources, an invoice flow (RF-1) and two smaller variants of it, a role list that matches the roles the engine really creates, and a set of hook flows. Without one shared copy each unit would paste its own catalogue and its own flow, and a role such as `finance-approver`, which the engine never creates, would sit in test data and make every validation of RF-1 fail on an unknown role.

Observable result: test code can call `loadTestCatalogue()` and get a `Catalogue` (U22's interface) that knows the 20 mock blocks, the roles `tenant_admin`, `author`, `approver` and `auditor` (exactly `DEFAULT_ROLES` of the identity module), the model profiles `default`, `fast` and `careful`, the delegate target `n8n` with its three workflows, and the flow `notify-customer` at major 1; can call `loadTestFlow("rf-1-core")` (also `"rf-1-invoice-intake"` and `"rf-1-core-approval"`) and `loadHookFlow("s09-onion")` (45 hook flows) and get plain flow documents that parse with `parseFlowText`; and can ask `unresolvedReferences(flow, catalogue)` which names a flow uses that the catalogue lacks, which is the empty list for all 48 shipped flows.

## What Changes

- New test-support code in `test/support/catalogue/` (`errors.ts`, `document.ts`, `loader.ts`, `references.ts`, `flows.ts`) and `test/support/hook-flows/index.ts`; their own tests are `*.test.ts` beside them.
- New data: `test/support/catalogue/blocks.v0.json` (the seed's catalogue with two changes: the roles line, and `data_class` on the nine `read` blocks), `test/support/catalogue/flows/` with `rf-1-invoice-intake.yaml`, `rf-1-core.yaml` and `rf-1-core-approval.yaml`, and `test/support/hook-flows/flows/` with 36 hook flows and `flows/static/` with 9.
- Ported from the read-only `seed/shared/catalogue/blocks.v0.json`, `seed/shared/flows/rf-1-invoice-intake.yaml`, `seed/node-hooks/flows/` and `loadCatalogue` of `seed/format/src/validate.ts`. Every change to seed data (the `finance-approver` rename and the `data_class` markers included) is listed in design.md (Decisions made while writing).
- `rf-1-core` has no approval step and no delegate (`pay` goes to `done`); `rf-1-core-approval` puts the approval step before every payment and uses the role `approver`. The seed's `finance-approver` is renamed to `approver` in every shipped flow. How the two variants are made: `derived-flows.md` in this folder.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. No dependency is added (`yaml` comes with `add-flow-format-model`). Not scaffolded: the data files (the JSON and the 48 YAML files) and the tests.
- **Depends on:** `add-roles-and-memberships` (U17, merged and archived; capability `identity-rbac`; evidence: the roles come from `DEFAULT_ROLES` in `src/identity/rbac/names.ts`, exported by `src/identity/index.ts`, used by one test to prove the catalogue's role list equals it) and `add-flow-format-model` (U22, written, not merged; capability `flow-format`; evidence: the `Catalogue` interface and its definition types, `parseFlowText`, `parseVersionedRef`, `successorFields`, `contentHash`, all exported by `src/authoring/index.ts`). Nothing else is imported. `test/arch/modules.ts` needs no row: its graph covers `src/` only, and imports from test code into `src/` are allowed.
- **Files created:** the code and data above, one `*.test.ts` per task. **Changed:** none (`test/support/README.md` already lists `catalogue/` and `hook-flows/`).
- **Migrations, tables, endpoints, env vars, audit events:** none. **Error codes:** four test-support codes below; none is an API code, so `ERROR_CODES` is untouched.

**Interfaces given** (declarations omit `export`; the same text as the first block of design.md § Interfaces)

```ts
// test/support/catalogue/errors.ts
type CatalogueDataErrorCode = "CATALOGUE_READ" | "CATALOGUE_INVALID" | "CATALOGUE_UNKNOWN_FLOW" | "CATALOGUE_FLOW_PARSE"
class CatalogueDataError extends Error { readonly code: CatalogueDataErrorCode; constructor(code: CatalogueDataErrorCode, message: string) }
// test/support/catalogue/document.ts
const TEST_CATALOGUE_PATH: string
interface CatalogueDocument { catalogue: string; version: string; notes?: string; blocks: { [ref: string]: BlockDef }; model_profiles: string[]; roles: string[]; delegate_targets: { [target: string]: string[] }; flows_registry: { [ref: string]: { inputs: JsonSchema; outputs: JsonSchema } } }
function parseCatalogueDocument(text: string): CatalogueDocument
function readCatalogueDocument(path?: string): CatalogueDocument
// test/support/catalogue/loader.ts
interface TestCatalogue extends Catalogue { blockRefs(): string[]; modelProfileRefs(): string[]; roleNames(): string[] }
function catalogueFromDocument(doc: CatalogueDocument): TestCatalogue
function loadTestCatalogue(path?: string): TestCatalogue
// test/support/catalogue/references.ts
function unresolvedReferences(flow: unknown, catalogue: Catalogue): string[]
function canReach(flow: unknown, target: string, avoid?: string): boolean
// test/support/catalogue/flows.ts
type TestFlowName = "rf-1-invoice-intake" | "rf-1-core" | "rf-1-core-approval"
const TEST_FLOW_NAMES: readonly TestFlowName[]
function testFlowPath(name: string): string
function readTestFlowText(name: string): string
function parseCatalogueFlow(text: string, label: string): Flow
function loadTestFlow(name: string): Flow
// test/support/hook-flows/index.ts
type HookFlowGroup = "scenario" | "static"
function hookFlowNames(group?: HookFlowGroup): string[]
function hookFlowPath(name: string): string
function readHookFlowText(name: string): string
function hookFlowTitle(name: string): string
function loadHookFlow(name: string): Flow
```

Also given, as files: `test/support/catalogue/blocks.v0.json`; `test/support/catalogue/flows/rf-1-invoice-intake.yaml` (flow id `invoice-intake`), `.../flows/rf-1-core.yaml` (flow id `rf-1-core`) and `.../flows/rf-1-core-approval.yaml` (flow id `rf-1-core-approval`); `test/support/hook-flows/flows/<name>.yaml` (36 scenario flows) and `test/support/hook-flows/flows/static/<name>.yaml` (9 flows for the static checker). Every module is imported by its own path (there is no barrel). The catalogue answers: roles `tenant_admin`, `author`, `approver`, `auditor`; model profiles `default`, `fast`, `careful`; delegate target `n8n` with `archive-invoice`, `sync-crm`, `generate-report`, each `{ effect: "send", untrusted_result: true }`; flow `notify-customer` major 1. `readCatalogueDocument()` keeps the seed's shape, so a unit that imports blocks (for example `add-block-registry`) reads `blocks`, and the e2e part `parts/35-catalogue.ts` of `add-web-flow-editor` seeds from `blockRefs()` and `block(ref)`.

**Interfaces taken** (each restated as `add-flow-format-model` defines it; all exported by `src/authoring/index.ts`)

- from `add-flow-format-model`: `type Effect = "read" | "write" | "send" | "pay"`; `type JsonSchema = { [key: string]: JsonValue }`; `interface BlockDef { effect: Effect; description?: string; input: JsonSchema; output: JsonSchema; untrusted_fields?: string[]; data_class?: "public" | "private"; untrusted_result?: boolean; unsafe_to_retry?: boolean }`; `interface ModelProfileDef { ref: string }`; `interface RoleDef { name: string }`; `interface DelegateTargetDef { effect: Effect; untrusted_result: boolean }`; `interface FlowSignature { input: JsonSchema; output: JsonSchema }`; `interface Catalogue { block(ref: string): BlockDef | undefined; modelProfile(ref: string): ModelProfileDef | undefined; role(name: string): RoleDef | undefined; delegateTarget(target: string, workflow: string): DelegateTargetDef | undefined; flow(ref: string, major: number): FlowSignature | undefined }`; `interface Flow { ursitoare: string; flow: string; version: string; description?: string; inputs: JsonSchema; start: string; nodes: { [id: string]: FlowNode }; hooks?: HookRule[]; expose?: "mcp" }`; `type FlowFormat = "yaml" | "json"`; `type ParseResult = { ok: true; doc: unknown } | { ok: false; error: ParseError }`; `interface ParseError { code: FormatErrorCode; message: string; line?: number; column?: number; path?: string }`; `function parseFlowText(text: string, format: FlowFormat, limits?: Partial<ParseLimits>): ParseResult`; `function parseVersionedRef(ref: string): { name: string; major: number } | undefined`; `interface SuccessorField { path: string; id: unknown; producesOutput: boolean }`; `function successorFields(node: unknown): SuccessorField[]`; `function contentHash(doc: unknown): string`; `function isContentHash(value: unknown): value is string`.
- from `add-roles-and-memberships` (merged): `const DEFAULT_ROLES: readonly string[]` exported by `src/identity/index.ts` (value `["tenant_admin", "author", "approver", "auditor"]`).

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3142c5f, checked line by line).

## Out of scope

Validating any of these flows (L1 to L3, taint, hooks checks): `add-flow-validator`, `add-taint-static` and `add-hook-checker`. The mock tool servers that answer the 20 blocks over HTTP: `add-fake-tools`. The e2e part that seeds the blocks into a stack: `add-web-flow-editor`. A catalogue backed by the registry: `add-block-registry`. Running any flow. Changing the seed (read-only). The Phase-0 harness flows `seed/shared/harness/flows/`.
