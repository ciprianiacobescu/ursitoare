## Context

Mintkey holds each tool server's secret; Ursitoare keeps a reference. The value goes to the vault under Ursitoare's own identity (ADR-06) and nowhere else.

## Decisions

### Layout and the egress site
`src/credentials/` (no logger) imports `core`, `db`, `tenancy`, `audit`, `gateway`. Files: `types.ts`, `provision.ts`, `rotate.ts`, `store.ts`, `resolver.ts`, internal `validate.ts` and `vault-call.ts`. **`vault-call.ts` is the only new `src/` file that value-imports `src/gateway/index.ts`** (`GatewayError`, `mintkeyTenantId`); the others use `import type`, and `src/main.ts` is already inventoried. It exports `putVerified(deps, ctx, input)`: the put with `tenantId` = `mintkeyTenantId(ctx.tenantId)`, turning a `GatewayError` into `CredentialsError` `CREDENTIALS_VAULT` with `details.reason` `token_refused` (`GATEWAY_TOKEN_REFUSED`), `vault_refused` (`GATEWAY_INVALID`) or `unavailable` (`GATEWAY_UNAVAILABLE`); other errors pass unchanged.

### The table
`credential_ref` (0480): `tenant_id` (FK `tenant`), `credential_id` (`^cred_<uuid>$`), `tool_server_id`, `mintkey_service_id` (lower-case UUID), `auth_scheme`, `header_name` (null exactly for `BEARER_TOKEN`; `^[A-Za-z0-9-]{1,64}$`, in any case none of U46's refused request headers `authorization`, `x-ursitoare-call`, `host`, `cookie`, `proxy-authorization`, `connection`, `content-length`, `transfer-encoding`, `upgrade`, `te`, `trailer`; the CHECK and `validate.ts`'s `reserved` use this list), `target_origin` (`^https?://[^/?#@[:space:]]+$`: host only, ADR-06), `key_version` (at least 1), `provisioned_by`, `provisioned_at`, `rotated_at`. PK `credential_ref_pkey` `(tenant_id, credential_id)`; UNIQUE `credential_ref_server_key` `(tenant_id, tool_server_id)` and `credential_ref_service_key` `(tenant_id, mintkey_service_id)`; FK `credential_ref_tool_server_fkey` `(tenant_id, tool_server_id)` to `tool_server` (U47's 0470); these four names are explicit in the DDL (§ Provision maps by them). Forced RLS; the app role: SELECT, INSERT, `UPDATE (key_version, rotated_at)`.

### Codec and writer
`encodePutCredentialRequest` writes fields 1 `tenant_id`, 2 `service_id`, 3 `auth_scheme` (varint 1 or 3), 4 `value`, 6 `header_name` (when not null), 8 `caller_actor_id`, 9 `target_url`; never 5 or 7. `decodePutCredentialResponse` reads field 1 (varint), skips others by wire type, and throws `GATEWAY_UNAVAILABLE` `{ stage: "vault" }` for an empty or truncated message, a wrong wire type on field 1 or a version outside 1 to 2147483647 (the `integer` column). `createVaultWriter` opens one `node:http2` session per call (`http:` h2c, `https:` TLS), POSTs `/mintkey.vault.v1.VaultAdapter/PutCredential` with `content-type: application/grpc`, `te: trailers`, `x-mintkey-service-token`, `x-mintkey-service-identity` and one frame (`00`, 4-byte big-endian length, message), and reads `grpc-status` from the trailers or, trailers-only, the headers. Status 0 needs `:status` 200 and one frame of at most 65536 bytes; 16 or 7 is `GATEWAY_TOKEN_REFUSED` `{ status }`, 3 `GATEWAY_INVALID` `{ reason: "vault_refused" }`; all else (transport error, oversize, `timeoutMs`, default 10000) is `GATEWAY_UNAVAILABLE` `{ stage: "vault" }`.

### Provision, rotate, resolve
`validate.ts` (first failure wins, `CREDENTIALS_INVALID` `{ field, reason }`): `toolServerId` `^[a-z][a-z0-9_]{0,31}$`, `authScheme` (`bad_value`); `headerName` (`API_KEY_HEADER`: `required`, the pattern, then `reserved`; `BEARER_TOKEN`: `not_allowed`); `value` 1 to 4096 characters (`size`), each in `\x21-\x7e` (`bad_value`); `serviceId` a lower-case UUID. `provisionCredentialTx`: `SELECT origin FROM ursitoare.tool_server WHERE tenant_id = $1 AND tool_server_id = $2` in `tx` (the columns U47's card declares for 0470; no row: `CREDENTIALS_NOT_FOUND` `{ toolServerId }`), so no second pool connection is needed; a `SELECT` in `tx` for a credential of the server (`CREDENTIALS_EXISTS` `{ toolServerId }`) or of the given service id (`{ serviceId }`); the service id is the given one or `ids.next("svc")` after `svc_`; `putVerified` with `targetUrl` = the server's origin and `callerActorId` = `actor.id`; `ids.next("cred")`; the `INSERT`, whose pg error maps by `code` and `constraint`: 23505 on `credential_ref_server_key` is `CREDENTIALS_EXISTS` `{ toolServerId }`, on `credential_ref_service_key` `CREDENTIALS_EXISTS` `{ serviceId }` (two provisions that both passed the `SELECT`: the loser's insert waits for the winner's commit, then fails), and 23503 on `credential_ref_tool_server_fkey` is `CREDENTIALS_NOT_FOUND` `{ toolServerId }`; any other error, other constraints included, passes unchanged; `appendAudit` `credentials.provisioned`, target `{ kind: "credential", id }`, payload `{ serviceId, authScheme, keyVersion, targetOrigin }` (no key matches the secret scan). The put runs in the caller's transaction (U49 R2), open at most the vault timeout. A failure after it (a lost insert race, a failed commit, a rollback) leaves a live vault secret no row references: a given `serviceId` is reused by a repeat (version + 1), but the route never gives one, so each attempt draws a new `svc_` id and the earlier secret is an orphan (revoking is out of scope, M8). A `tx` of another tenant than `ctx` does not see the server row (forced row level security) and throws `CREDENTIALS_NOT_FOUND` `{ toolServerId }` before any put; there is no `TOOLS_TENANT_MISMATCH` analogue. `rotateCredential` (one transaction; a rotation may safely repeat, so it needs no idempotency record) validates `value`, `SELECT … FOR UPDATE` the row (`CREDENTIALS_NOT_FOUND` `{ credentialId }`), puts on its service, scheme, header and origin, updates `key_version` and `rotated_at`, appends `credentials.rotated` `{ serviceId, keyVersion }`; the lock serialises rotations. `provisionCredential` wraps the Tx form in `withTenantTx`. `listCredentials` orders by `credential_id COLLATE "C"` (the route pages in memory with `pageRows`); timestamps are `formatAt` texts. `resolve` reads one row; a database failure rejects, so U50 fails closed. `seedServiceId` sets version 8 and variant `10` on the first 16 bytes of the SHA-256 (as `mintkeyTenantId`).

### Routes
Session auth, action `manage_credentials`; the actor is `{ kind: principal.kind === "service" ? "service" : "user", id: principal.userId }` (`src/api/flow-routes.ts:85-88`; session auth gives `"human"`, so `user`). A bad body's `field` is `body` + Ajv `instancePath`, plus `/<missingProperty>` for `required` and `/<additionalProperty>` for `additionalProperties` (`src/api/errors.ts:56-72`, frozen `errors.test.ts:95-118`), `message` Ajv's text; `server.ts:43` sets `removeAdditional: false, allErrors: false` (an extra member is refused; only the first failure is reported). Schemas are `type: "object"`, `additionalProperties: false`; `VALUE` is `{ type: "string", minLength: 1, maxLength: 4096, writeOnly: true }` with no `example`, `examples` or `default`:
- provision body: `required: ["toolServerId", "authScheme", "value"]`; `toolServerId` `{ type: "string", minLength: 1, maxLength: 32 }`; `authScheme` `{ type: "string", enum: ["API_KEY_HEADER", "BEARER_TOKEN"] }`; `headerName` `{ type: "string", minLength: 1, maxLength: 64 }`, optional and not nullable (omitted is `null` in the domain call; a JSON `null` is coerced to `""` and fails `minLength`); `value` `VALUE`. The domain then answers `headerName` `required` (`API_KEY_HEADER` without it), `not_allowed` (`BEARER_TOKEN` with it), `reserved`, `bad_value`. `serviceId` is never read from a request, only the seed part passes it. The optional `Idempotency-Key` header (`IDEMPOTENCY_HEADER_SCHEMA`, `idempotency.ts:14-19`) belongs to this POST only.
- rotate: params `{ id: { type: "string", minLength: 1, maxLength: 128 } }`, body `required: ["value"]`, `value` `VALUE`.
- responses: the record has the ten `CredentialRecord` members, all `required` (`headerName`, `rotatedAt` `["string", "null"]`, `authScheme` the enum, `keyVersion` integer, the rest string); the list is `{ items: record[], next_cursor: string | null }`, its query `PAGE_QUERY_SCHEMA` (as `registerBlockRoutes`).

Handler order, after the schema and the PEP decision (a non-admin is 403 first): `pool` null (503 `AUTHZ_UNAVAILABLE`), for the two POSTs `vault` null (503 `EGRESS_UNAVAILABLE` `{ reason: "vault_not_configured" }`), then the domain function (provision inside the idempotency transaction); a null PEP pool answers every request 503 before validation (`route.ts:187-189`). The list is `pageRows(await listCredentials(pool, tenant), page, { key, tenantId, scope: "credentials" }, (record) => [record.id])`, `key` being `deriveCursorKey(engineKey)` or null for a null `engineKey`: then a `cursor` or more records than `limit` is 503 `ENGINE_KEY_REQUIRED` (`admin-page.ts:72-73`) and a list that fits is 200. `CredentialsError` maps to 400 `VALIDATION_FAILED` `fields` `[{ field: "body/<field>", message: <reason> }]`, 404 `NOT_FOUND`, 409 `ALREADY_EXISTS` (both with the details `{ toolServerId }` or `{ credentialId }`) and 503 `EGRESS_UNAVAILABLE` `{ reason }`; only the two POSTs declare `EGRESS_UNAVAILABLE`. `main` passes `vault` = `createVaultWriter(config.egress.vault, { logger })` when `config.egress?.vault` is set, else null, `ids: systemIds`, `clock: pep.clock`, `engineKey: config.engineKey`.
**No stored hash of the secret.** `respondIdempotent` stores `requestDigestOf` of the whole body in `idempotency_key.request_digest`, an unsalted SHA-256 from which a short value could be guessed. The provision route calls `withIdempotency` itself (same claim, replay, 422 and `Idempotent-Replayed` rules) with the digest of the body whose `value` is replaced by its HMAC-SHA-256 (hex) under 32 bytes: HKDF-SHA-256 of the engine key text (empty salt, as `deriveCursorKey`) with info `ursitoare-credential-digest-v1`, so a replay after a restart with the same engine key replays; without an engine key the 32 bytes are random, drawn when `registerCredentialRoutes` runs, and a replay after a re-registration is 422 `IDEMPOTENCY_KEY_REUSED`, never a wrong replay. Another value under the same key is 422; a replay never calls the vault.

### The error code and the part
`ERROR_CODES.EGRESS_UNAVAILABLE` is `{ status: 503, message: "The egress broker or vault is unavailable" }`. `tool-servers-part.ts` follows `catalogue-part.ts`: `start` resolves `databaseApi`, `egressApi`, `toolsApi` in that order and returns `{ env: {}, close }`; no `beforeReset`. `seed` lists the tenants routed to the fake issuer (that file's query) over an owner pool closed in `finally`; per tenant it registers `acme` when `getToolServer` finds none (`fixture`, `FAKE_TOOLS_ORIGIN`, `local` false, `fixtureSurface(SEED_TOOL_SERVER.refs, { untrustedResult: { "erp.lookup_vendor@1": false, "erp.create_payment@1": false } })`, actor `{ kind: "system", id: "e2e-seed" }`; it stays `pending` for the journey's admin) and, when `listCredentials` shows none for it, calls `provisionCredential` (deps: that owner pool, `systemIds`, `systemClock` and a `createLogger({ level: "silent" })` for the writer, since `PartContext` carries no ids, clock or logger) with `serviceId: seedServiceId(tenantId, "acme")`, `API_KEY_HEADER`, `FAKE_TOOLS_KEY_HEADER`, `randomBytes(16).toString("hex")` and a `createVaultWriter` over `{ url: fake.vaultUrl, identity: fake.vaultAdmin.identity, token: new Secret(fake.vaultAdmin.token) }`. A reset recreates the database but the fake keeps its credentials, so the re-put gives `key_version` + 1.

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists what is not scaffolded. Merged shapes: `delivered-shapes.md`.

```ts
// src/gateway/vault.ts (exported from src/gateway/index.ts)
export type VaultAuthScheme = "API_KEY_HEADER" | "BEARER_TOKEN";
export interface PutCredentialInput {
  tenantId: string;        // a UUID: mintkeyTenantId(ctx.tenantId)
  serviceId: string;       // a UUID
  authScheme: VaultAuthScheme; value: Uint8Array; headerName: string | null;
  callerActorId: string; targetUrl: string;   // the tool server's origin
}
export interface VaultWriter { putCredential(input: PutCredentialInput): Promise<{ keyVersion: number }> }
export function createVaultWriter(vault: NonNullable<EgressConfig["vault"]>, deps: { logger: Logger; timeoutMs?: number }): VaultWriter;
  // refusals and failures: design.md § Codec and writer
export function encodePutCredentialRequest(input: PutCredentialInput): Uint8Array;
export function decodePutCredentialResponse(message: Uint8Array): { keyVersion: number };
// src/credentials/types.ts (exported from src/credentials/index.ts)
export interface CredentialRecord {
  id: string; toolServerId: string; serviceId: string; authScheme: VaultAuthScheme; headerName: string | null;
  targetOrigin: string; keyVersion: number; provisionedBy: string; provisionedAt: string; rotatedAt: string | null;
}
export interface ServiceTarget { serviceId: string; origin: string }
export interface ServiceResolver { resolve(ctx: TenantContext, toolServerId: string): Promise<ServiceTarget | null> }
export type CredentialsErrorCode = "CREDENTIALS_INVALID" | "CREDENTIALS_NOT_FOUND" | "CREDENTIALS_EXISTS" | "CREDENTIALS_VAULT";
export class CredentialsError extends Error { readonly code: CredentialsErrorCode; readonly details: Readonly<Record<string, string>>; }
export interface CredentialDeps { pool: TenantPool; vault: VaultWriter; ids: IdSource; clock: Clock }
// src/credentials/provision.ts (exported from src/credentials/index.ts)
export function provisionCredential(deps: CredentialDeps, ctx: TenantContext, input: { toolServerId: string; authScheme: VaultAuthScheme; headerName: string | null; value: string; serviceId?: string }, actor: AuditEventInput["actor"]): Promise<CredentialRecord>;
export function provisionCredentialTx(tx: TenantTx, deps: CredentialDeps, ctx: TenantContext, input: { toolServerId: string; authScheme: VaultAuthScheme; headerName: string | null; value: string; serviceId?: string }, actor: AuditEventInput["actor"]): Promise<CredentialRecord>;
// src/credentials/rotate.ts (exported from src/credentials/index.ts)
export function rotateCredential(deps: CredentialDeps, ctx: TenantContext, credentialId: string, value: string, actor: AuditEventInput["actor"]): Promise<CredentialRecord>;
// src/credentials/store.ts (exported from src/credentials/index.ts)
export function listCredentials(pool: TenantPool, ctx: TenantContext): Promise<CredentialRecord[]>;
// src/credentials/resolver.ts (exported from src/credentials/index.ts)
export function createServiceResolver(pool: TenantPool): ServiceResolver;
export function seedServiceId(tenantId: string, toolServerId: string): string;   // UUIDv8 of sha256(`ursitoare-service:${tenantId}/${toolServerId}`)
// src/api/credential-routes.ts (exported from src/api/index.ts)
export interface CredentialApiDeps { pool: TenantPool | null; vault: VaultWriter | null; ids: IdSource; clock: Clock; engineKey: KeyMaterial | null }
export function registerCredentialRoutes(server: FastifyInstance, deps: CredentialApiDeps): void;
// test/support/e2e-stack/tool-servers-part.ts (parts/52-tool-servers.ts re-exports it as `part`)
export const toolServersPart: E2eStackPart;   // name "tool-servers"
export const SEED_TOOL_SERVER: Readonly<{ id: string; origin: string; refs: readonly string[] }>;
  // { id: "acme", origin: FAKE_TOOLS_ORIGIN, refs: ["erp.lookup_vendor@1", "erp.create_payment@1"] }
```

## Failure cases and security

The value reaches the vault writer only (spec: no log, row, payload, error or span holds it; the logger redacts key names only, `src/observability/logger.ts`; validation errors carry no data, `src/api/errors.ts`). A vault failure leaves no row, event or idempotency record (the claim is released).

## Verification

The head of `test-plan.md` lists what ran and what is derived. Also run: `validateEvent` on both audit events; `writeOnly` through Fastify and `buildOpenApiDocument`; the `seedServiceId` vectors in Node and Python; on 2026-11-07 (Node 26.8.1) a Fastify probe with `server.ts:43`'s options and the schemas of § Routes for the Ajv messages marked (m) in `test-plan-routes.md`. The loopback stub proves the framing only against this unit's reading of it (circular: D16).

## Risks

The real vault-adapter may refuse the hand-rolled framing (D16): the first M8 stack run includes a credential write; the fallback is `@grpc/grpc-js`.

## Decisions made while writing

- `AuditActor` becomes `AuditEventInput["actor"]` (R3); the per-file headers split `src/credentials`; `provisionCredentialTx` is an addition (R2, the `registerToolServerTx` precedent).
- The card's `value` rule (1-4096 characters, no U+0000) is tightened to visible ASCII: the value becomes a header and the fake vault refuses anything else. A `headerName` on a bearer credential is refused, not dropped.
- The inventory gains `vault-call.ts`, not the card's example files.
