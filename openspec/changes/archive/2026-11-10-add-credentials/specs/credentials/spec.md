## Purpose

Credential references for tool servers: write-only provision and rotate through the Mintkey vault, the service resolver, the admin routes, the proof that a value reaches no sink and the e2e part that seeds `acme`.

## ADDED Requirements

### Requirement: Credential references are stored per tenant and hold no value
Migration `0480_credentials.sql` SHALL create `credential_ref` as design.md § The table says: forced row level security, no column that can hold a value, SELECT, INSERT and UPDATE of `(key_version, rotated_at)` only for the app role, at most one row per tool server and per service id, a foreign key to `tool_server` and checks on the scheme, header, host-only `target_origin` and `key_version`.

#### Scenario: Migration 0480 stores references and no value
- **WHEN** the migrations run and the 21 rows of test-plan.md § Migration rows run in order
- **THEN** `schema_migration` holds version 480 named `credentials`, `checkTenancyCatalog` returns `[]`, the columns are exactly the eleven of design.md § The table, each row ends with its listed outcome and constraint (`23505` rows 2-4, `23503` row 5, `23514` rows 6-14, `42501` rows 16-20) and `tenant_b` sees 0 rows where `tenant_a` sees 1

### Requirement: The vault codec writes seven request fields and reads the key version
`encodePutCredentialRequest` SHALL write protobuf fields 1, 2, 3, 4, 6 (when `headerName` is not null), 8 and 9 in that order and never 5 or 7. `decodePutCredentialResponse` SHALL return field 1 as `keyVersion`, skip other fields by wire type and throw `GatewayError` `GATEWAY_UNAVAILABLE` `{ stage: "vault" }` for a message without a version in 1 to 2147483647 or a malformed one.

#### Scenario: The codec matches hand-written byte vectors and never sends field 7
- **WHEN** `encodePutCredentialRequest` runs on `IN1`, `IN2`, `IN3` and `decodePutCredentialResponse` on the 6 accepted and 8 refused messages of test-plan.md § Codec
- **THEN** `IN1` and `IN2` give `ENC1` and `ENC2` byte for byte with fields `[1, 2, 3, 4, 6, 8, 9]` and `[1, 2, 3, 4, 8, 9]`, `IN3` holds `22ac02` + 300 × `61`, the accepted messages give 1, 300, 1, 2, 3 and 2147483647, and each refused one throws `GATEWAY_UNAVAILABLE` `{ stage: "vault" }`

### Requirement: The vault writer puts one credential over h2c gRPC and maps what the vault answers
`createVaultWriter(vault, deps).putCredential(input)` SHALL send one framed `PutCredential` request with the vault token and identity as metadata and return `{ keyVersion }` for `grpc-status` 0 with one valid frame; throw `GATEWAY_TOKEN_REFUSED` `{ status }` for 16 or 7, `GATEWAY_INVALID` `{ reason: "vault_refused" }` for 3 and `GATEWAY_UNAVAILABLE` `{ stage: "vault" }` for anything else; and log no value, token or identity.

#### Scenario: The writer stores through the fake vault, counts key versions and maps every refusal
- **WHEN** the rows of test-plan.md § Writer run against U45's fake vault and a test-local h2c stub
- **THEN** the key versions are 1 (direct), 2, 1 and 1 with the three `credentials()` entries listed; the stub saw the body `00` `0000008f` (143 bytes) `ENC1`; the refusals are `GATEWAY_TOKEN_REFUSED` `{ status: "7" }` and `{ status: "16" }`, `GATEWAY_INVALID` `{ reason: "vault_refused" }` and `GATEWAY_UNAVAILABLE`, the stub answers map as listed, an `https:` URL against the plaintext stub gives `GATEWAY_UNAVAILABLE` and no stub request, and the log holds one line per call, none with a value, a token or the identity

### Requirement: Provisioning writes the vault first, then the reference and the audit event, and leaves nothing behind on failure
`provisionCredential` and `provisionCredentialTx` (the same in the caller's transaction) SHALL check the input, find the server (`CREDENTIALS_NOT_FOUND`), refuse a second credential for the server or the service id (`CREDENTIALS_EXISTS`; an insert that loses the race maps by constraint: 23505 `CREDENTIALS_EXISTS` with `toolServerId` or `serviceId`, 23503 `CREDENTIALS_NOT_FOUND`), call the writer with the server's origin as `targetUrl` and only then insert the row and append `credentials.provisioned` `{ serviceId, authScheme, keyVersion, targetOrigin }`. The record SHALL have exactly the ten members of `CredentialRecord`. A vault failure SHALL throw `CredentialsError` `CREDENTIALS_VAULT` with `details.reason` `token_refused`, `vault_refused` or `unavailable` and write no row and no event; another error SHALL pass unchanged. A failure after the put SHALL leave the vault secret unreferenced (an orphan when no `serviceId` was given); a transaction of another tenant than `ctx` SHALL give `CREDENTIALS_NOT_FOUND`.

#### Scenario: Provision puts first, stores the reference and refuses what is invalid, unknown or taken
- **WHEN** `provisionCredential` runs P1 to P3 and the 20 refusals of test-plan.md § Provision with a recording writer
- **THEN** P1 returns `REC1` (`keyVersion` 1) and P2 `REC2`; the recorder saw `tenantId` `d7f4eeba-9f57-8892-b4bb-591d220496d4`, `targetUrl` `https://tools.fake.test` and 0 rows; the audit holds three `credentials.provisioned` events; each refusal throws its listed code and `details` (for example `CREDENTIALS_INVALID` `{ field: "headerName", reason: "reserved" }`) and leaves rows, events and fake entries at 3

#### Scenario: Vault and insert failures write nothing and a later put counts on
- **WHEN** the rows F1 to F11 (F5b included) of test-plan.md § Provision failures run
- **THEN** F1 to F3 throw `CREDENTIALS_VAULT` with `token_refused`, `vault_refused` and `unavailable`, F4 rethrows `boom`, F5 rejects with `injected`, F6 with `abort`, F7 with `db down`; none of F1 to F7 leaves a row or event, the fake holds version 1 after F5 and F6, and the repeat of F5 returns `keyVersion` 2 while F5b's stores a new service and orphans the first; of two concurrent provisions (F8 one server, F9 one service id) one returns a record and the other throws `CREDENTIALS_EXISTS` with `toolServerId` or `serviceId`; F10 maps 23503 on the server key to `CREDENTIALS_NOT_FOUND`, F11 passes other constraints unchanged

### Requirement: Rotation, listing and the resolver
`rotateCredential` SHALL validate the value, lock the row (`CREDENTIALS_NOT_FOUND` `{ credentialId }` when absent or another tenant's), put on its service, scheme, header and origin, set `key_version` to the vault's answer and `rotated_at` and append `credentials.rotated` `{ serviceId, keyVersion }`; a vault failure SHALL leave the row unchanged. `listCredentials(pool, ctx)` SHALL return the tenant's records ordered by id. `createServiceResolver(pool).resolve(ctx, toolServerId)` SHALL return `{ serviceId, origin }` from the tenant's reference or `null`; a database failure SHALL reject. `seedServiceId(tenantId, toolServerId)` SHALL be the UUIDv8 of the SHA-256 of `ursitoare-service:<tenantId>/<toolServerId>`.

#### Scenario: Rotate moves the key version, refusals change nothing, list shows metadata
- **WHEN** `REC1` and `REC2` exist and the rows of test-plan.md § Rotate and list run
- **THEN** rotating `REC1` returns `keyVersion` 2 and `rotatedAt` `2026-11-06T10:00:01.000000Z`, the fake holds version 2 with caller `u_dave`, and the event payload is `{ serviceId: "00000000-0000-7000-8000-000000000001", keyVersion: 2 }`; the four refusals throw `CREDENTIALS_NOT_FOUND` twice, `CREDENTIALS_INVALID` and `CREDENTIALS_VAULT` and change no row; two concurrent rotations end at version 4; the list is `[]` for `T_B`

#### Scenario: The resolver answers per tenant and seedServiceId matches its vectors
- **WHEN** `resolve` runs for the rows of test-plan.md § Resolver and `seedServiceId` for its two vectors
- **THEN** `acme` gives `{ serviceId: "00000000-0000-7000-8000-000000000001", origin: "https://tools.fake.test" }` before and after a rotation, `gamma`, `nope` and `acme` for `T_B` give `null`, a down pool rejects with `db down`, and `seedServiceId("tenant_a", "acme")` is `87caf624-f579-8435-9540-24d6eb57aeff`

### Requirement: The routes provision, rotate and list for tenant admins and answer 503 without a vault
`POST /api/v1/credentials` (201) SHALL run `provisionCredentialTx` in the idempotency transaction with a digest that never holds the value; it and `POST /api/v1/credentials/{id}/rotate` (200) SHALL answer 503 `EGRESS_UNAVAILABLE` `{ reason: "vault_not_configured" }` when `vault` is null (design.md § Routes); `GET /api/v1/credentials` SHALL page the records. Without `manage_credentials` the answer SHALL be 403 `FORBIDDEN`; the request schemas SHALL mark `value` `writeOnly`. The fragment `src/credentials/policy/credentials.cedar` SHALL hold exactly the permit `credentials-manage-admin` for `principal in Role::"tenant_admin"`, the action `manage_credentials` and any resource.

#### Scenario: Carol provisions and rotates, replays follow the key, alice is refused and tenant_b sees nothing
- **WHEN** with real fragments, carol, alice and mallory (`tenant_admin` of `tenant_b`), the requests H1 to H11 of test-plan-routes.md § Route rows run in order, and `allowedActions` runs for carol, alice and ada (`auditor`) and an engine over `defaultSrcDir()` lists its policy ids
- **THEN** `k1` answers 201 `REC1`, its replay the same body with `Idempotent-Replayed: true` and no second vault call, another value under `k1` 422 `IDEMPOTENCY_KEY_REUSED`, `k2` 409 `ALREADY_EXISTS`, each 400 row its one-item `fields` (for example `body/headerName` `reserved`, and `body/serviceId` `must NOT have additional properties` for a body naming a service id: `src/api/errors.ts:56-72` appends the extra member to Ajv's empty `instancePath`), alice 403, mallory 404 on rotate and `{ items: [], next_cursor: null }` on the list, rotation 200 with `keyVersion` 2; H10 answers 503 `EGRESS_UNAVAILABLE` `{ reason: "vault_not_configured" }`, H11 503 `{ reason: "unavailable" }` with no row, again on a same-key retry, H11b `token_refused` and `vault_refused`; carol's capabilities hold `manage_credentials`, alice's and ada's do not, and the ids starting `credentials-` are `["credentials-manage-admin"]`

#### Scenario: Null dependencies answer as the block routes do
- **WHEN** the rows N1 to N4 of test-plan-routes.md § Null dependency rows run
- **THEN** a null PEP pool answers every request 503 `AUTHZ_UNAVAILABLE`; with only the deps' pool null carol gets that 503 and alice 403; with no engine key provisioning, replay and rotation work, a further page or a `cursor` is 503 `ENGINE_KEY_REQUIRED`, a list that fits is 200, and a replay through a re-registered server is 422 `IDEMPOTENCY_KEY_REUSED` with no vault call

### Requirement: A credential value reaches no log, row, audit payload, response, error, trace or document
Across provisioning, replay, rotation, refusal and vault failure, the value SHALL appear in no log line, table column (the idempotency table included), audit event, HTTP body, error message or details, span, fake-egress record or OpenAPI text; the stored idempotency digest SHALL differ from the digest of the plain body.

#### Scenario: A canary value is found in no sink
- **WHEN** the canary `CANARY-5f1d9c3a-77e2-4b6c-a0d8-2b9e4c61f3a7` of test-plan-routes.md § Canary is provisioned, replayed, rotated and refused with a working, a refusing and a closed vault, and its seven sinks are searched
- **THEN** each sink holds 0 occurrences while the control holds at least 1; the stored `request_digest` of `k1` is not the `requestDigestOf` of the plain body

### Requirement: A stored credential is injected as the one credential header on the proxied call
After provisioning, a call through the fake proxy with a token for the credential's service SHALL reach the upstream with the value in the scheme's header (`API_KEY_HEADER`: the named header; `BEARER_TOKEN`: `Authorization: Bearer <value>`), while the fake's records show `[credential]` and never the value.

#### Scenario: The echo shows the injected header and the fake never shows the value
- **WHEN** `acme` and `beta` are provisioned against U45's fake egress routed to an echo upstream and `requestToken` then `send` run for each (test-plan.md § Echo)
- **THEN** the echo's `x-fake-tools-key` is `kv-secret-7f3a` for `acme` and its `authorization` `Bearer bt-secret-9c1d` for `beta`, `requests()` holds two records with `[credential]`, and `credentials()`, `events()` and `issued()` hold neither value

### Requirement: The gateway has one more inventoried caller, main wires the routes and the document lists them
This change SHALL add `src/credentials/vault-call.ts` to the frozen egress inventory, leaving it `["src/credentials/vault-call.ts", "src/main.ts"]`; a later caller adds itself in a named task. `main` SHALL register the credential routes after the tool-server routes with `vault` from `createVaultWriter` over `config.egress.vault` when set, else null, `ids` `systemIds`, `clock` the PEP clock and `engineKey` `config.engineKey`. `docs/api/openapi.json` SHALL be the document the real engine serves and SHALL list the three operations, only the two POST ones declaring `EGRESS_UNAVAILABLE`, with `value` `writeOnly` in both POST bodies and exactly the ten record properties in the responses.

#### Scenario: The inventory names the credentials module once
- **WHEN** `checkEgressSites` runs on `readSnapshot()` with `["src/main.ts"]`
- **THEN** the violations whose file starts `src/credentials/` are exactly one `ARCH_EGRESS_SITE`, for `src/credentials/vault-call.ts`, and `test/arch/egress-sites.test.ts::C-76ead8ea` passes on `["src/credentials/vault-call.ts", "src/main.ts"]`

#### Scenario: Main registers the routes and the document agrees
- **WHEN** `main` starts with a config without a database and `docs/api/openapi.json` is read
- **THEN** the public server defines `POST /api/v1/credentials`, `POST /api/v1/credentials/:id/rotate` and `GET /api/v1/credentials` with action `manage_credentials`; the document holds `get_api_v1_credentials`, `post_api_v1_credentials` and `post_api_v1_credentials_id_rotate`, the two POST operations list `EGRESS_UNAVAILABLE` in `x-ursitoare-errors` and the GET does not, both POST bodies have `properties.value` as design.md § Routes' `VALUE` (`writeOnly: true`, no `example`, `examples` or `default`), the responses have exactly the ten record properties, the file holds no canary, and `src/main.conventions.test.ts::C-d150bfa4` stays green

#### Scenario: Main wires the vault, the ids and the engine key
- **WHEN** the rows M1 to M3 of test-plan-routes.md § Main rows run `main` over a database with a config whose `egress.vault` points at U45's fake, then with `vault: null`, then with no `egress`
- **THEN** carol's provision is 201 with a `systemIds` id and the fake holds one entry for `mintkeyTenantId("tenant_a")` under the configured vault identity with carol as caller, `limit=1` over two records gives a `next_cursor`; with `vault: null` or no `egress` the provision is 503 `EGRESS_UNAVAILABLE` `{ reason: "vault_not_configured" }`, the fake is unchanged and the list is 200

### Requirement: The tool-servers part seeds the journey's pending acme server and its credential
The part `tool-servers` (`parts/52-tool-servers.ts`, after `50-tools`) SHALL, on `start`, require the database, egress and tools parts and return `env` `{}`; on `seed`, for each tenant routed to the fake issuer, register `acme` when absent (`pending`) and provision its credential when absent (design.md § The error code and the part). A re-seed SHALL change nothing; a seed after a database reset SHALL give the same service id and the next key version; it SHALL run in a crash cluster with no engine.

#### Scenario: The part seeds once, re-seeds idempotently, survives a reset and runs in the crash cluster
- **WHEN** the rows PT1 to PT6 of test-plan.md § Part run
- **THEN** PT1 rejects with `STACK_PART_MISSING` naming `database`, `egress`, `tools`; the first seed gives tenant A (the e2e default tenant `ten_00000000-0000-7000-8000-000000000001`) `acme` `pending` and a credential (service `1b62133b-f0cc-8a7a-9a3c-fa9f7cd93c22`, `key_version` 1), tenant B the same with `78edb038-ec1b-82b0-8002-8efed8152e65`, tenant C nothing; a proxied call reaches the tools fake with `keyHeaderSeen` true; the second seed changes nothing; after the reset `key_version` is 2 for the same service id; the crash cluster seeds `acme` and its credential
