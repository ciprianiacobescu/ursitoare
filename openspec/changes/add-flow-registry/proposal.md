## Why

The editor, the graph (U28, U29) and later test runs, review and publishing need one registry: who owns a flow, which exact text is a version, what the validator last said about it.

Observable result: an author of team `finance` creates the flow `rf-1-core` and saves YAML or JSON text; only new content makes a new numbered `draft` version (the same content, in any surface or key order, answers the existing one). Validating a version stores the validator's result with it, and the state becomes `validated` only when the result is `ok`. Members of `finance` list and read the flow and its versions; other teams, tenants and non-authors cannot edit or read it (403, 404). Text that is not a readable flow document is refused with a position. Every change is audited.

## What Changes

- `src/registry/flows/`, migration `0270_flow_registry.sql` and `src/registry/policy/flows.cedar` (`edit_flow`, `read_flow` scoped to the owner team).
- `src/api/flow-*.ts` (seven routes, the code `FLOW_TEXT_INVALID`), the call in `src/main.ts`, `docs/api/openapi.json`, and `test/support/flow-actors.ts` (test seeding).

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded (existing files or data): the exports of `src/registry/index.ts` and `src/api/index.ts` (each task adds its own), the `ERROR_CODES` entry, the call in `src/main.ts`, `docs/api/openapi.json`, the migration and `flows.cedar`. No new dependency.
- **Depends on**: `add-audit-chain` (U08), `add-api-pep` (U13), `add-api-conventions` (U14), `add-roles-and-memberships` (U17), `add-flow-validator` (U25), `add-block-registry` (U26; it also edits `src/registry/index.ts`, `src/api/index.ts` and `src/main.ts`, so this change waits for it) and, beyond the roadmap row, `add-flow-format-model` (U22), `add-test-catalogue` (U24, tests only), `add-policy-catalogue`, `add-oidc-login` and `add-identity-model`. `test/arch/modules.ts` needs no change.
- **Changed:** `src/registry/index.ts`, `src/api/{index,error-codes}.ts`, `src/main.ts`, `docs/api/openapi.json`, and the frozen test `src/api/error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message` (`EXPECTED_CODES` holds 22 entries and gains `FLOW_TEXT_INVALID`; its requirement is modified in `specs/api-conventions/spec.md`).
- **Migrations:** `0270_flow_registry.sql`; **tables** `ursitoare.flow`, `ursitoare.flow_version`; **endpoints** 7; **audit events** `flow.created`, `flow.version_saved`, `flow.version_validated`; **error code** `FLOW_TEXT_INVALID` 422.

**Interfaces given** (exact shapes in `design.md` § Interfaces; declarations omit `export`)

```ts
// src/registry/flows/{errors,flows,versions,validate}.ts (exported by src/registry/index.ts)
type FlowErrorCode = "FLOW_INVALID" | "FLOW_NOT_FOUND" | "FLOW_EXISTS" | "FLOW_UNKNOWN_TEAM" | "FLOW_TEXT_INVALID" | "FLOW_TENANT_MISMATCH"
interface FlowTextDetails { reason: "parse" | "not_object" | "name_mismatch"; code?: FormatErrorCode; message?: string; line?: number; column?: number }
class FlowError extends Error { readonly code: FlowErrorCode; readonly details: FlowTextDetails | null; constructor(code: FlowErrorCode, message: string, details?: FlowTextDetails) }
interface FlowActor { kind: "user" | "service"; userId: string }
interface FlowOptions { clock?: Clock }
type VersionState = "draft" | "validated" | "tested" | "reviewed" | "published" | "deprecated"
interface VersionSummary { flowId: string; number: number; hash: string; state: VersionState; surface: FlowFormat; author: string; requestedBy: string | null; createdAt: string; validatedAt: string | null; validationOk: boolean | null }
interface VersionDetail extends VersionSummary { text: string; canonical: unknown; result: ValidationResult | null }
interface FlowRecord { flowId: string; ownerTeam: string; createdBy: string; createdAt: string; versionCount: number; latest: VersionSummary | null }
function createFlow(tx: TenantTx, ctx: TenantContext, input: { name: string; ownerTeam: string }, actor: FlowActor, opts?: FlowOptions): Promise<FlowRecord>
function getFlow(tx: TenantTx, ctx: TenantContext, flowId: string): Promise<FlowRecord | null>
function flowOwnerTeam(tx: TenantTx, ctx: TenantContext, flowId: string): Promise<string | null>
function listFlows(tx: TenantTx, ctx: TenantContext, q: { limit: number; after?: string | undefined; filter: { sql: string; values: unknown[] } }): Promise<{ flows: FlowRecord[]; next: string | null }>
function saveFlowVersion(tx: TenantTx, ctx: TenantContext, input: { flowId: string; format: FlowFormat; text: string; requestedBy?: string | null | undefined }, actor: FlowActor, opts?: FlowOptions): Promise<{ version: VersionSummary; created: boolean }>
function getVersion(tx: TenantTx, ctx: TenantContext, flowId: string, hash: string): Promise<VersionDetail | null>
function listVersions(tx: TenantTx, ctx: TenantContext, q: { flowId: string; limit: number; after?: number | undefined }): Promise<{ versions: VersionSummary[]; next: number | null }>
function validateVersion(tx: TenantTx, ctx: TenantContext, input: { flowId: string; hash: string; catalogue: Catalogue }, actor: FlowActor, opts?: FlowOptions): Promise<{ version: VersionSummary; result: ValidationResult }>
// src/api/{flow-errors,flow-routes}.ts (exported by src/api/index.ts)
function flowApiError(error: unknown): unknown
interface FlowApiDeps { pool: TenantPool | null; clock: Clock; engineKey: KeyMaterial | null; catalogueFor?: ((ctx: TenantContext) => Promise<Catalogue>) | undefined }
function registerFlowRoutes(server: FastifyInstance, deps: FlowApiDeps): void
// test/support/flow-actors.ts
interface FlowActorSpec { subject: string; roles: readonly string[]; teams: readonly string[] }
function seedFlowActors(db: TestDatabase, ctx: TenantContext, actors: readonly FlowActorSpec[], clock: Clock): Promise<{ [subject: string]: string }>
// ERROR_CODES gains FLOW_TEXT_INVALID 422 "Flow text is not a readable flow document"
```

Endpoints under `/api/v1`, all `session` (actions and declared codes: `design.md` § Interfaces); lists answer `{ items, next_cursor }`; JSON is camelCase except `next_cursor` and `layers_run`; timestamps are UTC with six fraction digits. `Flow` is `FlowRecord`, `Summary` `VersionSummary`, `Detail` `VersionDetail`, `Result` `ValidationResult`.

- `GET /flows?limit&cursor` (`read_flow`): `{ items: Flow[], next_cursor }`, the caller's teams' flows by id.
- `POST /flows` (`edit_flow`, `Idempotency-Key`): `{ name, ownerTeam }`; 201 `Flow`; 409 `ALREADY_EXISTS`.
- `GET /flows/{flowId}` (`read_flow`): `Flow`.
- `GET /flows/{flowId}/versions?limit&cursor` (`read_flow`): `{ items: Summary[], next_cursor }`, newest first.
- `POST /flows/{flowId}/versions` (`edit_flow`, `Idempotency-Key`): `{ format: "yaml" | "json", text }`; 201 `{ version: Summary, created: true }`, or 200 `{ version, created: false }` for existing content; 422 `FLOW_TEXT_INVALID` with `details` `{ reason: "parse" | "not_object" | "name_mismatch", code?, message?, line?, column? }`.
- `GET /flows/{flowId}/versions/{hash}` (`read_flow`): `Detail` (`Summary` plus `text`, `canonical`, `result`: `Result` or null).
- `POST /flows/{flowId}/versions/{hash}/validate` (`edit_flow`, no body): 200 `{ version: Summary, result: Result }`.

`hash` is U22's `contentHash`; `state` is `draft` or `validated` here; `author` is the saving user and `requestedBy` is null here. A stored `result` is the validator's answer at `validatedAt`, not a live check.

**Interfaces taken:**

- From `add-flow-format-model`: `type FormatErrorCode = "FORMAT_TOO_LARGE" | "FORMAT_TOO_DEEP" | "FORMAT_ALIAS_LIMIT" | "FORMAT_YAML_SYNTAX" | "FORMAT_JSON_SYNTAX" | "FORMAT_DUPLICATE_KEY" | "FORMAT_UNSUPPORTED_TAG" | "FORMAT_NOT_JSON"`; `function parseFlowText(text: string, format: FlowFormat, limits?: Partial<ParseLimits>): ParseResult`; `function canonicalizeFlow(doc: unknown): unknown`; `function contentHash(doc: unknown): string`; `type FlowFormat = "yaml" | "json"`; `interface Catalogue { block(ref: string): BlockDef | undefined; modelProfile(ref: string): ModelProfileDef | undefined; role(name: string): RoleDef | undefined; delegateTarget(target: string, workflow: string): DelegateTargetDef | undefined; flow(ref: string, major: number): FlowSignature | undefined }`; `const emptyCatalogue: Catalogue`; all exported by `src/authoring/index.ts`.
- From `add-flow-validator` (`src/authoring/index.ts`): `type Layer = "L1" | "L2" | "L3"`; `interface Issue { layer: Layer; code: string; node: string | null; path: string; message: string }`; `interface ValidationResult { ok: boolean; errors: Issue[]; warnings: Issue[]; layers_run: Layer[] }`; `function validateFlow(doc: unknown, catalogue: Catalogue): ValidationResult`.
- From `add-block-registry` (`src/registry/index.ts`): `function loadRegistryCatalogue(pool: TenantPool, ctx: TenantContext): Promise<Catalogue>`.
- From `add-test-catalogue` (tests only): `function loadTestCatalogue(path?: string): TestCatalogue`; `function readTestFlowText(name: string): string`.
- From merged code (`delivered-shapes.md`): the `src/api` route, PEP, cursor and idempotency names (U13, U14), `appendAudit` (U08), the identity and RBAC functions of the test helper (U10, U12, U17), `entityRef`, `scopedId`, the policy engine (U11, U11b), the tenancy names (U03), the test-support helpers.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3142c5f, checked line by line).

## Out of scope

The states after `validated` and `run_as`; diff, `parent_hash`, forking; test runs; the LLM author; a stateless `POST /flows/validate`; renaming, moving or deleting a flow; blocks (U26); the screens (U28, U29); re-validation after a block import.
