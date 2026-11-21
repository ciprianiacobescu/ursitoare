## Why

An admin can register an MCP server, an OpenAPI upload or a code block, and store its credential, only through the API (U53 to U55, U48). This change adds the pages, hardens the grant form and words the stale refusal.

Observable result: carol registers the MCP server `crm`, lands on its detail reading "No credential stored.", stores a secret and reads "Credential stored (key version 1)." with the secret in no page text. She registers an OpenAPI document with `createPayment` set to `pay`, later replaces it from the server detail, and edits a code block there; a code-block server has no credential form.

Batch `m7-tools` (U47b, U35c, U27b, U54b, U53, U54, U55, U56, U56b, U56c in plan order; closing unit `add-web-tool-journeys`, journey `e2e/test_m7_tools.py`) delivers M7: an admin adds an HTTP/OpenAPI, MCP or code-block tool, approves its surface and stores its credential; a flow calls it (F9). This unit's part: the registration and credential pages and the grant-form hardening. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- `web-tools`: ADDED requirements and one MODIFIED ("The calls use the right routes and headers and refuse unreadable answers"); `web-runs`: one ADDED. New: `web/src/tools/{register,credentials}.ts`, `RegisterPage.tsx`, `CredentialSection.tsx`, `ReplaceSection.tsx`, `web/src/runs/stale.ts`, `web/src/features/67-admin-tool-register.tsx`, the tests, `e2e/test_m7_tool_registration.py`. Edited in tasks: `grants.ts`, `GrantsPage.tsx`, `ServersPage.tsx`, `web/src/runs/test-run.ts`, two tests of `calls.test.ts`. No API, migration, dependency, `servers.ts`, `messages.ts` or CSS change: the pages use the kit and token utilities (design 8).

## Impact

- **Scaffold:** stubs of the interfaces below are on the base branch. Not scaffolded: `loadToolRefs`'s result, the two `1024` of `grants.ts`, the `.tsx` files, the feature file and the `refusedTest` branch.
- **Depends on:** `add-web-shell`, `add-web-ui-kit`, `add-web-data-kit`, `add-web-sign-in`, `add-tool-registry`, `add-credentials`, `add-grants-model`, `add-web-grants`, `add-web-dry-runs` (merged), M6b (merged): U15c add-ui-foundation, U15d restyle-web-kit, U07b add-app-shell, U21b restyle-admin-pages, U37b add-run-inputs-form, U18b add-people-lookup (its `/api/v1/people` is mocked); and in plan `add-validator-version`, `add-http-openapi-tools`, `add-mcp-client`, `add-code-block-tools`, `add-tool-adapters`. Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations and the M6b kit and pages from main@386e6b6d, as `path:line`).
- **Changed (frozen):** `web/src/tools/calls.test.ts::C-78ea404d loadToolRefs returns the bound refs over two requests` and `::C-78ea404d loadToolRefs stops after ten pages without failing` (task 2.1).
- **Deviations from the card:** no `servers.ts` edit (design 2) and no `messages.ts` edit (design 5); `CredentialSection.tsx` and `ReplaceSection.tsx` are new; ten seam additions and four changed members (marked below); 14 scenarios against 9 to 11, four of them in a browser.

**Interfaces given** (the block of `design.md` § Interfaces); `// (addition)` marks a name the card's seam does not list.

```ts
// web/src/tools/register.ts
export type RegisterKind = "mcp" | "openapi" | "code";
export interface McpDraft { id: string; url: string; local: boolean }
export interface OpenApiDraft { id: string; origin: string; local: boolean; documentText: string; effects: Readonly<Record<string, "" | "read" | "write" | "send" | "pay">> }
export interface CodeDraft { id: string; name: string; description: string; inputText: string; outputText: string; source: string } // description added
export type RegistrationRequest = { ok: true; path: string; body: unknown } | { ok: false; field: string; message: string };
export function mcpRegistration(d: McpDraft): RegistrationRequest;
export function previewRequest(d: OpenApiDraft): RegistrationRequest;
export function openApiRegistration(d: OpenApiDraft): RegistrationRequest;
export function codeRegistration(d: CodeDraft): RegistrationRequest;
export function openApiReplacement(serverId: string, d: OpenApiDraft): RegistrationRequest; // (addition) PUT /tool-servers/<id>/openapi
export function codeReplacement(serverId: string, d: CodeDraft): RegistrationRequest; // (addition) PUT /tool-servers/<id>/code
export interface OperationRowView { operationId: string | null; name: string | null; method: string; path: string; excluded: string | null } // name added
export function parsePreview(raw: unknown): { basePath: string; operations: OperationRowView[] } | null;
export function previewOperations(api: Api<"post">, req: Extract<RegistrationRequest, { ok: true }>, signal?: AbortSignal): Promise<{ basePath: string; operations: OperationRowView[] }>;
export function replaceServer(api: Api<"put">, req: Extract<RegistrationRequest, { ok: true }>): Promise<{ id: string }>; // (addition)
export function prefillEffects(tools: readonly { name: string; effect: string }[], operations: readonly OperationRowView[]): Record<string, "" | "read" | "write" | "send" | "pay">; // (addition)
export function codeDraftOf(id: string, surface: unknown): CodeDraft | null; // (addition)
export function loadCodeDraft(api: Api<"get">, serverId: string, signal?: AbortSignal): Promise<CodeDraft | null>; // (addition)
export function registerServer(api: Api<"post">, req: Extract<RegistrationRequest, { ok: true }>, key: string): Promise<{ id: string }>;
export const REGISTER_PAGE: Readonly<{ id: string; file: string; path: string; capability: string; title: string }>;
export const REGISTER_NAMES: Readonly<Record<string, string>>;
export function registrationFormErrors(kind: RegisterKind, error: unknown): FormErrors; // (addition)
// web/src/tools/credentials.ts
export interface CredentialView { id: string; toolServerId: string; authScheme: "API_KEY_HEADER" | "BEARER_TOKEN"; headerName: string | null; keyVersion: number }
export function parseCredential(raw: unknown): CredentialView | null;
export interface CredentialDraft { authScheme: "API_KEY_HEADER" | "BEARER_TOKEN"; headerName: string; value: string }
export function credentialBody(serverId: string, d: CredentialDraft): { ok: true; body: unknown } | { ok: false; field: "headerName" | "value"; message: string };
export function credentialText(c: CredentialView | null, adapter: string): string;
export function loadServerCredential(api: Api<"get">, serverId: string, signal?: AbortSignal): Promise<CredentialView | null>;
export function storeCredential(api: Api<"post">, body: unknown, key: string): Promise<CredentialView>;
export function rotateServerCredential(api: Api<"post">, credentialId: string, draft: CredentialDraft): Promise<CredentialView>; // value replaced by draft
export const CREDENTIAL_NAMES: Readonly<Record<string, string>>;
export function credentialErrors(error: unknown): FormErrors; // (addition)
// web/src/tools/grants.ts
export interface ToolRefs { refs: string[]; complete: boolean } // (addition)
export function loadToolRefs(client: Api<"get">, signal?: AbortSignal): Promise<ToolRefs>; // changed result, not scaffolded
export function toolListNote(list: ToolRefs): string | null; // (addition)
// web/src/runs/stale.ts
export function staleVersionText(details: unknown): string | null;
```

**Interfaces taken:**

- From `add-tool-adapters`: `ToolCallSpec` (the surface tool's `call`, which the servers parser ignores).
- The routes and answers of U53 to U55 and the 422 cause of U27b: `delivered-shapes.md`.

## Out of scope

Discovery, effect settings, surface review, drift diff, the table "Calls" and the journeys (U56c); screens for the per-server `PUT` routes.
