Names this change takes from main@3daa5c35 (`…` elides unused members), each read against the file named. Units: `add-tenancy-foundation`, `add-identity-model`, `add-policy-catalogue`, `add-api-pep`, `add-api-conventions`, `add-roles-and-memberships`, `add-web-shell`, `add-web-admin`.

```ts
// src/identity/users.ts:9, :13-20, :40, :62-65, :150-166
export type UserKind = "human" | "service";
export interface User { readonly userId: string; readonly kind: UserKind; readonly ownerUserId: string | null; readonly displayName: string; readonly email: string | null; readonly state: UserState }
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;   // module-internal; UserState is "active" | "disabled"
async function assertTenantMatches(tx: TenantTx, ctx: TenantContext): Promise<void>   // module-internal: IDENTITY_TENANT_MISMATCH unless current_setting('app.tenant_id', true) is ctx.tenantId
export async function getUser(tx: TenantTx, ctx: TenantContext, userId: string): Promise<User | null>   // tenant check, IDENTITY_INVALID for a bad id, then SELECT … WHERE tenant_id = $1 AND user_id = $2
// src/identity/errors.ts:1-10, :12-16, :33-36
export class IdentityError extends Error { readonly code: IdentityErrorCode }   // codes include "IDENTITY_INVALID" and "IDENTITY_TENANT_MISMATCH"
export function identityError(code: IdentityErrorCode): IdentityError           // in errors.ts, not exported by index.ts
// src/tenancy/tx.ts:6-18, src/tenancy/context.ts:5-10
export type TenantTx = Pick<pg.PoolClient, "query">;
export type TenantPool = Pick<pg.Pool, "connect">;
export async function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>
export interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile }   // "solo" | "team"
// src/api/pep.ts:12-17, src/api/route.ts:41-51, :280, src/api/errors.ts:16
export interface PepDeps { pool: TenantPool | null; engine: PolicyEngine | null; clock: Clock; publicBaseUrl: string }
export interface RouteDef { method: "GET" | …; url: string; auth: AuthKind; action?: ActionName; resource?: …; listFilter?: …; schema: FastifySchema; errors: readonly string[]; handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown> }
export function defineRoute(server: FastifyInstance, def: RouteDef): void
export class ApiError extends Error { constructor(status: number, code: string, message: string, details?: unknown) }
// src/api/types.ts:28-32, src/identity/oidc/principal.ts:3-11
interface FastifyRequest { principal?: Principal; tenant?: TenantContext; sessionContext?: SessionContext }
export interface Principal { tenantId: string; userId: string; kind: "human" | "service"; sessionId?: string; roles: string[]; teams: string[]; actorChain: string[] }
// web/src/api/client.ts:13-17, :36-50; web/src/admin/shared.ts:13
export class ApiRequestError extends Error { readonly status: number; readonly code: string; readonly details: unknown; readonly requestId: string | null }
export interface RequestOptions { query?: Readonly<Record<string, string | number | boolean | undefined>>; headers?: Readonly<Record<string, string>>; signal?: AbortSignal; body?: unknown }
export interface ApiClient { get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T>; … }   // base "/api/v1"
export type Api<K extends keyof ApiClient> = Pick<ApiClient, K>;
// web/src/api/client.ts:52-55, :89
export interface ApiClientOptions { baseUrl?: string; fetch?: typeof globalThis.fetch }
export function createApiClient(opts?: ApiClientOptions): ApiClient   // no argument: base "/api/v1", fetch is globalThis.fetch read at call time (:148); reads nothing from window; no 401 handling
```

Behaviour relied on:
- `src/api/me.ts:50-80`: `defineRoute` with `auth { kind: "session" }`, `action: "read_self"`, `errors: []`; the handler throws 503 `AUTHZ_UNAVAILABLE` when `deps.pool` or the request context is missing, reads `getUser` in `withTenantTx`, and throws 401 `UNAUTHENTICATED` "Authentication required" when the row is missing or `state !== "active"` (`:72-78`).
- `src/api/route.ts:185`, `:264`, `:395-397`: authentication runs in `onRequest` and sets `cache-control: no-store`; the decision runs in `preHandler`, after validation; a non-public route has no HEAD; `impliedErrors` adds `UNAUTHENTICATED`, `FORBIDDEN`, `AUTHZ_UNAVAILABLE`.
- `src/api/errors.ts:80-100`: a validation failure is 400 `VALIDATION_FAILED` with `details.fields` `[{ field: "querystring/ids", message }]`.
- `src/pdp/platform.ts:16-17`: `permit (principal, action == Action::"read_self", resource);` in the platform layer.
- `src/identity/rbac/memberships.ts:34-38`: `teams` is a sorted set of the team ids of an active user; `principal.ts:7-27` refuses more than 64.
- `src/db/migrations/0100_identity.sql:1-14`, `:32-34`, `:42-43`: `user.display_name` is 1-200 characters and equals `btrim`; forced row-level security with policy `user_isolation` on `tenant_id = current_setting('app.tenant_id', true)`; the app role has `SELECT, INSERT` on `user`. `0170_rbac.sql:7`: `team_id` matches `^[a-z][a-z0-9_-]{0,63}$`.
- `web/src/api/client.ts:153-179`: an `AbortError` is rethrown as is; another fetch failure is `ApiRequestError(0, "NETWORK_ERROR")`; a non-2xx keeps its envelope `code`.
- `web/src/auth/session-fetch.ts:47-70` (`withSessionEnd`), wrapped only around `browserSession.api` (`session-client.ts`): a 401 `UNAUTHENTICATED` assigns `/sign-in?error=SESSION_ENDED&return_to=<path+search>` (`return-to.ts:84-92`). The plain `createApiClient()` has no such wrapper.
- `web/src/flows/flows.ts:31`: `OWNER_TEAM_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/`.
- Test support: `test/support/api-session.ts:13-17` `createTestSession(db, ctx, subject, clock): Promise<{ cookie; userId; csrfToken }>` (display name = `subject`); `test/support/tenants.ts:8-10` `seedTwoTenants(db): Promise<{ a; b }>`; `test/support/pg.ts:208-215` `TestDatabase` (`ownerPool`, `appPool`); `test/support/openapi-docs.ts:13,29` `OPENAPI_FILE`, `servedOpenApiText()`.
