## Purpose

Tool servers, surfaces, approval (self-approval audited when solo), bound block versions, the directory and the drift rule.

## ADDED Requirements

### Requirement: Tool servers and surfaces are stored per tenant, and only `approveSurface` sets the approval columns
Migration `0470_tool_registry.sql` SHALL create `tool_server` (primary key `(tenant_id, tool_server_id)`) and `tool_surface` (primary key `(tenant_id, tool_server_id, surface_digest)`, foreign key to `tool_server`) with the columns, types, nullability and CHECKs of design.md § Tables, both with forced row level security on `app.tenant_id`; the app role SHALL hold SELECT and INSERT on both, UPDATE only on `tool_server (state, approved_digest)` and `tool_surface (approved_by, approved_at, self_approved)`, and no DELETE. Among this module's functions only `approveSurface` sets `approved_digest` and a surface's `approved_by`, `approved_at` and `self_approved`; `submitSurface` only inserts a surface and moves an approved server to `drifted`. No trigger enforces this; rows 11, 12 and 14 exercise the grants. A server's `state` SHALL be `pending`, `approved` or `drifted` and `pending` exactly when its `approved_digest` is null, and the three approval columns of a surface SHALL be all set or all null.

#### Scenario: Migration 0470 stores servers and surfaces with narrow update rights
- **WHEN** the migrations run on a fresh database and the 25 statements of test-plan.md § Migration rows run in order
- **THEN** `schema_migration` holds version 470 named `tool_registry`, `checkTenancyCatalog` returns `[]`, every row ends with its listed outcome (state `other` is refused by `23514`), and `tenant_b` sees 0 rows where `tenant_a` sees 2 servers and 1 surface

### Requirement: validateOrigin accepts public https origins and refuses unsafe ones
`validateOrigin(url, { local })` SHALL return `{ ok: true, origin }` (`scheme://host[:port]`, lower case, no trailing dot, default port or slash) or `{ ok: false, reason }` by the order and classes of design.md § validateOrigin, with no DNS lookup; an IPv6 literal host that no class refuses SHALL be `ipv6` (design.md § validateOrigin). Names under `fake.test` SHALL be ordinary public names.

#### Scenario: Each of 55 inputs is accepted or refused with its reason
- **WHEN** `validateOrigin(url, { local })` runs for the 55 rows of test-plan.md § Origins
- **THEN** each result deep-equals its row (`https://2130706433` is `loopback`)

### Requirement: The surface digest is canonical, fixtureSurface builds fixture surfaces, and block refs are chosen by content
`surfaceDigest(surface)` SHALL ignore the order of tools and of `untrusted_fields`, treat absent optional members as their defaults and change when any field of any tool changes (design.md § The digest and fixtureSurface). `fixtureSurface(refs, opts)` SHALL return one tool per test-catalogue ref and throw for an unknown ref or two refs of one tool name. `surfaceRefs(serverId, surface, taken)` SHALL give each tool `${serverId}.${name}@${major}` for the lowest major from 1 whose ref is absent from `taken` or held there with the tool's block content hash, and SHALL read no database.

#### Scenario: The digest ignores order and fills defaults, fixtureSurface matches the catalogue, and refs take the lowest fitting major
- **WHEN** `surfaceDigest` runs on the surfaces of test-plan.md § Digests, `fixtureSurface` on the five argument lists listed there, and `surfaceRefs("acme", …)` on the 11 rows of § Refs
- **THEN** `surfaceDigest(SMALL)` is `sha256:244a8eeaac0eaa92b0f9f37583383b828cfd1f4aaa3028ab7052e0d013ef2c0c`, its reordered and explicit-defaults forms give the same, and its eleven one-field variants and one-tool form give 12 digests differing from it and each other; `fixtureSurface` results equal the values of § Digests (`D_A`, `D_A_DEFAULT`, the tool names of the four-ref call) and the unknown ref and duplicate name throw `unknown test block nope.x@1` and `duplicate tool name get`; each `surfaceRefs` result deep-equals its row; `test/support/README.md` has exactly the one `tool-surface.ts` line of § Digests

### Requirement: Registering a server stores it pending with its first surface
`registerToolServer` and `registerToolServerTx` (in the caller's transaction) SHALL check the id, the adapter (an unknown value is `TOOLS_INVALID`, any but `fixture` `TOOLS_REFUSED` `adapter_unavailable`), the origin and the surface (design.md § The surface check) in that order, then store the server `pending` with the `origin` that `validateOrigin` returned (never the input text), its surface and the event `tools.server_registered`. An existing id SHALL be `TOOLS_EXISTS`; a transaction of another tenant than `ctx` SHALL be `TOOLS_TENANT_MISMATCH` before any write. A record's `pendingDigest` SHALL be that of the newest submitted surface while it is unapproved, else null, and its `pendingSubmittedBy` that surface's `submitted_by`, else null; its `tools` those of the approved surface with refs, or of the pending one with null refs.

#### Scenario: Register stores a pending server and refuses what is invalid, taken or foreign
- **WHEN** `registerToolServer` registers `acme` (`SURF_A`) as ALICE, again, then the 6 inputs and 16 surfaces of test-plan.md § Register rows, then `loc` and `beta`; `registerToolServerTx` runs in a transaction opened for `T_B` with context `T_A`; `getToolServer` and `listToolServers` read as `T_A` and `T_B`
- **THEN** the first call returns `REC_PENDING`; `beta` (origin `HTTPS://Tools.Fake.Test:443`) is returned and stored as `https://tools.fake.test`; the second throws `TOOLS_EXISTS` `{ id: "acme" }` and each row throws its listed code and `details`; the foreign transaction throws `TOOLS_TENANT_MISMATCH` and writes nothing; `getToolServer` of `nope` and of `acme` as `T_B` is `null`; the list of `T_A` is `["acme", "beta", "loc"]`, of `T_B` `[]`; the tables hold 3 servers and 3 surfaces and the audit 3 `tools.server_registered` events

### Requirement: Approval needs another admin in a team and an explicit, audited self-approval when solo
`approveSurface` SHALL refuse, in order, an unknown server (`TOOLS_NOT_FOUND`), then with `TOOLS_REFUSED` and `details.reason`: `nothing_pending`, `digest_mismatch`, `approver_is_submitter` (team, the submitter approving) and `self_approval_required` (solo, the submitter, `selfApproval` not `true`); a refusal decided before the import SHALL write nothing (the recheck's `digest_mismatch` is below). The submitter's flagged solo approval SHALL set `self_approved` true and append `tools.surface_self_approved`; any other approval sets it false and appends `tools.surface_approved`; payloads are `{ digest, refs }`.

#### Scenario: A team refuses the submitter, a solo tenant needs the flag, and every refusal writes nothing
- **WHEN** `acme` and `beta` are registered by ALICE and `approveSurface` runs the calls of test-plan.md § Approval calls in order
- **THEN** the first four calls throw `approver_is_submitter`, `digest_mismatch`, `self_approval_required` and `TOOLS_NOT_FOUND` `{ id: "nope" }`, after which `block_version` holds no `acme.*` or `beta.*` row and the audit no `tools.surface_*` event; ALICE's flagged approval makes `beta` `approved` with `self_approved` true and the event `tools.surface_self_approved`; DAVE's returns `REC_APPROVED_A` with blocks `["acme.create_payment@1", "acme.lookup_vendor@1"]`, `self_approved` false and the event `tools.surface_approved`; a repeat throws `nothing_pending`

### Requirement: Approval writes immutable bound block versions and a failure between its two steps leaves them inert
Approval SHALL call `importCatalogue` with the refs of `surfaceRefs` and, per tool, its block with `binding` `{ server, tool }` (design.md § The block of a tool), then in one transaction lock the server row first and re-check that the newest surface is still the digest approved, else `TOOLS_REFUSED` `digest_mismatch`, this transaction writing nothing and the imported blocks staying inert; then set the approval columns, the server's `state` `approved` and `approved_digest`, and append the audit event. A `REGISTRY_CONFLICT` SHALL be `TOOLS_REFUSED` `ref_conflict`. Blocks stay inert until the server is `approved`, so a repeat after a failure finds them `unchanged` and completes.

#### Scenario: Approval imports bound blocks, and a repeat completes after a failed second step
- **WHEN** the 20 test blocks are imported unbound into `T_A`, DAVE approves `acme` in a team, then `gamma` (`SURF_ONE`) is approved through a pool whose client rejects the statement `UPDATE ursitoare.tool_surface`, and again through the real pool
- **THEN** `block_version` holds 22 rows after `acme` and 25 at the end (`gamma`, the rival `delta` and `zeta` add one each): `acme.lookup_vendor@1` has binding `{ server: "acme", tool: "lookup_vendor" }`, `imported_by` `u_dave`, hash `H_LV_F`, `acme.create_payment@1` hash `H_PAY`, and the 20 originals keep binding null and their hashes; the failed call rejects with the injected error, `gamma` is `pending` with its block already stored; the repeat returns `approved` and writes no second `registry.block_imported` event for that ref; `delta`, approved through a pool that, before its client's first statement naming `ursitoare:block_import:`, imports `delta.lookup_vendor@1` with another definition through the owner pool, rejects with `TOOLS_REFUSED` `{ reason: "ref_conflict" }` and stays `pending`; `zeta`, approved through a pool that, before its first statement matching `ursitoare.tool_server` and `FOR UPDATE`, inserts `SURF_ONE_T` as a newer surface through the owner pool, rejects with `TOOLS_REFUSED` `{ reason: "digest_mismatch" }` and stays `pending` on `D_ONE_T` (row `zeta` of test-plan.md); the `resolve` results of `gamma` and `zeta` are the directory scenario's

### Requirement: A changed surface disables the server until its new digest is approved
`submitSurface` SHALL throw `TOOLS_NOT_FOUND` for an unknown server and check the surface as at registration; the approved digest or the newest unapproved digest SHALL change nothing; any other stored digest SHALL be `TOOLS_REFUSED` `surface_known`; a new digest SHALL be stored as the newest surface, set an `approved` server to `drifted` (digest and tools unchanged) and append `tools.surface_submitted` `{ digest, drift }` (`drift` true when the server has an approved digest).

#### Scenario: A submitted surface drifts an approved server and re-approval restores it
- **WHEN** `acme` is approved on `SURF_A` and `beta` on `SURF_ONE` (ALICE, solo, flagged), `gamma` is registered; DAVE submits, advancing `CLOCK` by 1000 ms before each, the six surfaces of test-plan.md § Submit calls for `acme`, then `SURF_ONE_T` for `beta` and for `gamma`; CAROL approves `D_B` in a team; `SURF_A` is submitted again
- **THEN** the six calls return `REC_APPROVED_A`, `REC_DRIFTED` three times, then throw `TOOLS_INVALID` `method_without_body` and `TOOLS_NOT_FOUND` `{ id: "nope" }`; `beta` is `drifted` and `gamma` `pending`, both with `pendingDigest` `D_ONE_T`, `gamma` with `approvedDigest` null; the three `tools.surface_submitted` payloads are `{ digest: D_B, drift: true }`, `{ digest: D_ONE_T, drift: true }`, `{ digest: D_ONE_T, drift: false }`; CAROL's approval returns `REC_APPROVED_B` with blocks `["acme.create_payment@1", "acme.lookup_vendor@2"]`; the last call throws `TOOLS_REFUSED` `{ reason: "surface_known" }`

### Requirement: The directory resolves a ref only to the approved definition of a bound tool
`createToolDirectory(pool).resolve(ctx, ref)` SHALL return `null` unless the block version has a binding of exactly `{ server, tool }` (two strings), `ref` starts with `${server}.${tool}@`, the server has an approved digest, the approved surface holds the tool, and the block that tool yields has the version's content hash; otherwise a `ToolBinding` with the server's `state` (`drifted` included). A database failure SHALL reject, never answer `null`.

#### Scenario: The directory answers an approved tool, a drifted one with its state, and null for everything else
- **WHEN** `resolve` runs for the rows of test-plan.md § Directory rows, each after the step it names, and on a pool whose `connect` rejects `db down`
- **THEN** each result deep-equals its row (`acme.lookup_vendor@1` is `null` once `D_B` is approved; unbound, unknown, foreign-prefix and malformed-binding refs, the ref for `T_B` and the refs of `gamma` and `zeta` while pending are `null`); the failing pool rejects with message `db down`

### Requirement: Tenant admins may register tool servers and approve surfaces
The fragment `src/tools/policy/tools.cedar` SHALL hold exactly the permits `tools-register-admin` and `tools-approve-admin`, for `principal in Role::"tenant_admin"` and the actions `register_tool_server` and `approve_tool_surface` on any resource.

#### Scenario: Only tenant admins of the tenant hold the two actions
- **WHEN** an engine over copies of `identity/policy/roles.cedar` and `tools/policy/tools.cedar` runs `allowedActions` for carol (`tenant_admin`), alice (`author`), bob (`approver`), ada (`auditor`) and mallory (`tenant_admin` of `tenant_b`) and `check` for both actions on `tenant_a`; an engine over `defaultSrcDir()` lists its policy ids
- **THEN** carol's capabilities are `["approve_tool_surface", "manage_tenant", "manage_users_roles", "read_audit", "read_self", "register_tool_server"]`, alice's and bob's `["read_self"]`, ada's `["read_audit", "read_self"]`; both checks allow carol (reasons `tools-register-admin` and `tools-approve-admin`), deny alice, bob and ada, and deny mallory with reason `platform-cross-tenant-forbid`; the ids starting `tools-` are `["tools-approve-admin", "tools-register-admin"]`

### Requirement: The routes register, list, read, submit and approve for tenant admins only
`POST /api/v1/tool-servers` (action `register_tool_server`, `respondIdempotent`) SHALL answer 201 with the record through `registerToolServerTx`; `GET /api/v1/tool-servers` (scope `tool_servers`) a page; `GET /api/v1/tool-servers/{id}` the record with `approvedSurface` and `pendingSurface` or 404; `PUT /api/v1/tool-servers/{id}/surface` 200 with the record of `submitSurface`; `POST /api/v1/tool-servers/{id}/surface/approve` (action `approve_tool_surface`) 200 `{ server, blocks }` of `approveSurface`. The `{id}` parameter and the bodies SHALL follow the schemas of design.md § Routes: `additionalProperties: false` on the `POST` and approve bodies, `local` an optional boolean (`false` when omitted, `true` from any caller the route admits), the `{id}` pattern; a bad request is 400 `VALIDATION_FAILED` whose `field` is the rule of `src/api/errors.ts:56-72`. The audit actor SHALL be that of design.md § Routes. `ToolsError` SHALL map by design.md § Routes to 400 `VALIDATION_FAILED` with `details.fields`, 409 `ALREADY_EXISTS`, 422 `OPERATION_REFUSED` with `details.reason` and 404 `NOT_FOUND`; a principal without the action SHALL get 403 `FORBIDDEN`. A null `pool` or `engineKey` SHALL behave as in `registerBlockRoutes` (design.md § Failure cases and security).

#### Scenario: Carol registers and reads, alice is refused and tenant_b sees nothing
- **WHEN** with real fragments, carol (`tenant_admin`), alice (`author`) and mallory (`tenant_admin` of `tenant_b`), the requests of test-plan-routes.md § Route rows (register, read, `local`) and § Malformed rows run
- **THEN** each request answers its row (§ Route rows, § Malformed rows); the audit holds 3 `tools.server_registered` events, each with actor kind `user` and carol's user id

#### Scenario: Approval over HTTP follows the tenant's profile and the approved blocks show as bound
- **WHEN** carol registered `acme` and `beta`, the registry holds the 20 unbound test blocks, and the approve, `PUT` and blocks requests of test-plan-routes.md § Route rows run, the tenant set to `team` and back to `solo`
- **THEN** each request answers its row (team: carol 422 `approver_is_submitter`, alice 403, dave 200; solo: carol 422 `self_approval_required`, flagged 200, repeated 422 `nothing_pending`); the blocks list shows the three tool refs `bound` true and the 20 test refs `bound` false

#### Scenario: A null pool or engine key answers as the block routes do
- **WHEN** `registerToolServerRoutes` is called with `pool: null` under a PEP with and without a pool, then with the real pool and `engineKey: null`, and the requests of test-plan-routes.md § Null dependency rows run
- **THEN** no call throws and each request answers its row (503 `AUTHZ_UNAVAILABLE` `Authorization is unavailable` under a null PEP pool or, for carol's post, a null deps pool; 503 `ENGINE_KEY_REQUIRED` for a `cursor` or a further page without a key; 200 otherwise)

### Requirement: The committed OpenAPI document lists the tool-server routes
`docs/api/openapi.json` SHALL be the document the real engine serves, which holds the five tool-server operations because `src/main.ts` registers the routes after the block routes; the request body of the register operation SHALL be the `POST` schema of design.md § Routes.

#### Scenario: The committed document holds the five operations with their actions
- **WHEN** `docs/api/openapi.json` is read
- **THEN** its `paths` hold the four paths and five operation ids of test-plan-routes.md § OpenAPI rows; every `x-ursitoare-action` is `register_tool_server` except `approve_tool_surface` on the approve operation, whose `x-ursitoare-errors` include `OPERATION_REFUSED`, `FORBIDDEN` and `NOT_FOUND`; the body schema of `post_api_v1_tool_servers` has `additionalProperties` false, `required` `id`, `adapter`, `origin`, `surface` and `local` of type `boolean`; `src/main.conventions.test.ts::C-d150bfa4 the committed OpenAPI document equals the text the real engine serves` stays green
