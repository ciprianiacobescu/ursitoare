## Why

M7 lets an admin add a tool whose body is code. `add-tool-adapters` (U47b) gives the seam: the `code_block` adapter, the `code` call kind, `permit: null` and the injected `CodeRunner`. Nothing yet builds a code-block surface, checks a source, registers a server over HTTP, runs the code in the sandbox pool or refuses a credential for a server that sends nothing.

Observable result: carol registers `snips` with the tool `word_count` through `POST /api/v1/tool-registrations/code` (201, origin `sandbox`, pending digest `D_WC`); a source that does not parse is 400 at `body/tools/0/source`; a granted dry run of `fetch` then `count` runs `count` in the sandbox with permit `null`, one token issued (the read) and output `{ words: 23 }`, and its `count` and `done` rows carry the taint `["untrusted"]`, so a trusted code block cannot launder an untrusted input; `POST /api/v1/credentials` for `snips` is 422 `OPERATION_REFUSED` `{ reason: "no_credential_needed" }` before any vault call.

Batch `m7-tools` (U47b, U35c, U27b, U54b, U53, U54, U55, U56, U56b, U56c in plan order; closing unit `add-web-tool-journeys`, journey `e2e/test_m7_tools.py`) delivers M7: an admin adds an HTTP/OpenAPI, MCP or code-block tool, approves its surface and stores its credential; a flow calls it (F9). This unit's part: code-block tools. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

New: `src/tools/code/register.ts`, `src/authoring/validate/code-source.ts`, `src/runtimes/invoke/code.ts`, `src/api/code-block-routes.ts`, tests. Edited in named tasks: `src/credentials/types.ts` (one union member), `src/credentials/provision.ts`, `src/credentials/validate.ts`, `src/credentials/rotate.ts`, `src/api/credential-routes.ts`, migration `0550_credential_scheme.sql`, the export lines of `src/tools/index.ts`, `src/authoring/index.ts`, `src/runtimes/index.ts` and `src/api/index.ts`, `src/main.ts` (shared), `docs/api/openapi.json` (regenerated, shared). New capability `tool-code`; `credentials`: ADDED requirements and one MODIFIED (the app role's column grants). Rotation also takes an optional scheme and header name (lens C11: a credential stored with the wrong scheme could never be corrected). One migration, `0550` (one `GRANT UPDATE (auth_scheme, header_name)`), allowed by ruling D6a (a third M7 migration, numbered 0550 after U54's 0540; no other M7 unit uses it). No part, API error code, interpreter error code, policy action, dependency, module edge, egress site or web change; `src/authoring/validate/l1.ts` is not edited, so `VALIDATOR_VERSION` does not change (R5: no validator layer is stricter).

Rules (D20, R1, D8): a code block has effect `read`, `untrusted_result` false and a source of at most 65,536 characters; its origin is `sandbox`; a credential is refused; a fault is `INTERPRETER_TOOL_FAILED` with stage `code`; a call is policy-checked, recorded with `permit: null` and sends nothing. The source is not part of the block ref: a re-approved source applies to every flow using the ref, as for MCP and HTTP tools (flag for the wiki: architecture §8.4 "behaviour is pinned").

## Impact

- **Scaffold:** stubs of the interfaces below are on the base branch. Not scaffolded: the value and type export lines of `src/tools/index.ts` (`CodeBlockToolInput` type-only; `codeBlockSurface`, `registerCodeBlockServerTx`, `submitCodeBlocksTx`), `src/authoring/index.ts` (`codeSourceProblems`), `src/runtimes/index.ts` (`createCodeRunner`) and `src/api/index.ts` (`CodeBlockApiDeps` type-only, `registerCodeBlockRoutes`); the member `CREDENTIALS_REFUSED` of `CredentialsErrorCode`; migration `0550_credential_scheme.sql`; the optional `authScheme` and `headerName` of the rotate body and the sixth parameter of `rotateCredential`; the refusal in `provisionCredentialTx`; the `CREDENTIALS_REFUSED` case of `apiErrorOf` and `OPERATION_REFUSED` in the `errors` of `POST /api/v1/credentials`; the `src/main.ts` edits; `docs/api/openapi.json`.
- **Depends on:** `add-tool-adapters` (U47b: the seam), `add-validator-version` (U27b: shares `src/authoring/index.ts`), U53 `add-http-openapi-tools` and U54 `add-mcp-client` (share `src/main.ts`, `docs/api/openapi.json` and the export lines of `src/tools/index.ts`, `src/api/index.ts`; this unit's edits come after theirs), and the merged `add-flow-format-model`, `add-flow-validator`, `add-code-sandbox`, `add-code-node-runtime`, `add-tool-registry`, `add-tool-registry-followup-1`, `add-credentials`, `add-api-conventions`, `add-api-pep`, `add-grants-model`, `add-policy-deploy`, `add-tool-invocation`, `add-dry-runs`.
- **Changed:** no frozen test is edited. These hold: `src/main.credentials.test.ts` (reads `x-ursitoare-errors` with `includes`), the three egress inventories (no file here imports the gateway), `src/main.conventions.test.ts::C-d150bfa4` (guards the document, which tasks 4.1, 4.2 and 6.1 regenerate) and `src/api/tool-server-routes.test.ts` (the generic routes are untouched), `src/credentials/schema.test.ts` (rows 16 to 20 still hold: `target_origin`, `mintkey_service_id`, `provisioned_by` and `DELETE` stay refused), `src/credentials/rotate.test.ts` (its calls have five arguments and its event payload is unchanged without a change), `src/credentials/provision.test.ts`.

**Interfaces given** (`design.md` § Interfaces)

```ts
// src/tools/code/register.ts (exported from src/tools/index.ts)
export interface CodeBlockToolInput { name: string; description?: string; input: JsonSchema; output: JsonSchema; source: string }
export function codeBlockSurface(tools: readonly CodeBlockToolInput[]): ToolSurface;
  // each tool: effect "read", untrusted_result false, unsafe_to_retry false, call { kind: "code", source }
export function registerCodeBlockServerTx(tx: TenantTx, ctx: TenantContext, input: { id: string; tools: readonly CodeBlockToolInput[] }, actor: AuditEventInput["actor"], opts?: { clock?: Clock }): Promise<ToolServerRecord>;
export function submitCodeBlocksTx(tx: TenantTx, ctx: TenantContext, serverId: string, tools: readonly CodeBlockToolInput[], actor: AuditEventInput["actor"], opts?: { clock?: Clock }): Promise<ToolServerRecord>;
// src/authoring/validate/code-source.ts (exported from src/authoring/index.ts)
export function codeSourceProblems(source: string): { code: "L1_CODE_SYNTAX" | "L1_CODE_NO_RETURN"; message: string }[];   // L1's checks of a code source, pure
// src/runtimes/invoke/code.ts (exported from src/runtimes/index.ts)
export function createCodeRunner(sandbox: () => WorkerSandbox | null): CodeRunner;
// src/api/code-block-routes.ts (exported from src/api/index.ts)
export interface CodeBlockApiDeps { pool: TenantPool | null; clock: Clock; engineKey: KeyMaterial | null }
export function registerCodeBlockRoutes(server: FastifyInstance, deps: CodeBlockApiDeps): void;
// src/credentials/validate.ts (new export; checkProvision calls it)
export function checkScheme(authScheme: unknown, headerName: unknown): void;   // CredentialsError CREDENTIALS_INVALID { field: "authScheme" | "headerName", reason }: the scheme and header rules of checkProvision, unchanged
// src/credentials/rotate.ts (rotateCredential exists; it gains a sixth, optional parameter)
export interface CredentialChange { authScheme?: VaultAuthScheme; headerName?: string }
export function rotateCredential(deps: CredentialDeps, ctx: TenantContext, credentialId: string, value: string, actor: AuditEventInput["actor"], change?: CredentialChange): Promise<CredentialRecord>;
```

**Interfaces taken:** From `add-tool-adapters`: `CodeCallSpec`, `CodeRunner`, `CODE_BLOCK_ORIGIN`, `MAX_CODE_SOURCE_CHARS`, `checkAdapterSurface`, `registerAdapterServerTx`, `submitAdapterSurfaceTx`, `kitSurface`. The merged names of `delivered-shapes.md`. Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3daa5c35, checked line by line).

## Out of scope

The generic `POST /api/v1/tool-servers` and `PUT .../surface` (U47b leaves them fixture-only and refuses a `code_block` server with `adapter_mismatch`); the web pages (U56, U56b); a live-mode run of a custom flow in the test harness (its `FlowKey` is fixed); L1 and the validator version; the sandbox limits (`CODE_LIMITS` is U39's); a size bound inside the sandbox.
