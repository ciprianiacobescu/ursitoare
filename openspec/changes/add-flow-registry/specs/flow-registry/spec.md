## Purpose

The flow registry stores each tenant's flows under an owner team and every saved text as an immutable version keyed by its content hash, with its last validation result, and serves them over `/api/v1/flows` to the owner team only.

## ADDED Requirements

### Requirement: Flow tables are tenant tables with narrow privileges
Migration `0270_flow_registry.sql` SHALL create `ursitoare.flow` and `ursitoare.flow_version`, tenant-leading, with forced row-level security, and SHALL grant the app role no delete and no update of a version's text or hash.

#### Scenario: Objects, isolation and privileges
- **WHEN** tenant A has team `finance`, user `alice`, the flow `rf-1-core` owned by `finance` and one version; the app role, as A, updates `flow_version.source_text`, deletes from `flow_version`, updates `flow.owner_team`, deletes from `flow`, then updates the version's `state`, `validation` and `validated_at` and the flow's `last_no`, and inserts a version with `content_hash` `sha256:abc` and one with `version_no` 0; as B it selects from both tables; `deleteTeam` removes `finance`
- **THEN** `to_regclass` finds both tables and the ledger holds version 270 named `flow_registry`; `relrowsecurity` and `relforcerowsecurity` are true; the first four reject with `{ code: "42501" }`; the later updates succeed; the two inserts reject with `{ code: "23514" }`; B sees 0 rows in each table and A 1; `checkTenancyCatalog` returns `[]`; `deleteTeam` rejects with an `RbacError` of `code` `RBAC_IN_USE`

### Requirement: A flow has an owner team and a tenant-unique name
`POST /api/v1/flows` SHALL create a flow named by `name` (its id) under `ownerTeam`, `GET /api/v1/flows/{flowId}` SHALL read it and `GET /api/v1/flows` SHALL list the flows owned by the caller's teams, with U14's cursor contract.

#### Scenario: Create, read, replay, conflict
- **WHEN** alice (author, team `finance`) posts `{ name: "rf-1-core", ownerTeam: "finance" }` with `Idempotency-Key` `k1`, again with `k1`, `{ name: "rf-1-b", ownerTeam: "finance" }` with `k1`, the same name with `k2`, `{ name: "Bad_Name", ownerTeam: "finance" }`, `{ name: "x-2", ownerTeam: "Fin ance" }` and `{ name: "x-1", ownerTeam: "finance", tenantId: "tenant_b" }`, then reads `/api/v1/flows/rf-1-core` and `/api/v1/flows/ghost`; `createFlow` is called with `rf-1-core` again and with a new name and `ownerTeam` `nope`
- **THEN** the first post answers 201 `{ flowId: "rf-1-core", ownerTeam: "finance", createdBy: <alice's user id>, createdAt: "2026-10-25T09:00:00.000000Z", versionCount: 0, latest: null }`; the replay answers the same with header `Idempotent-Replayed: true`; `rf-1-b` with `k1` is 422 `IDEMPOTENCY_KEY_REUSED`; the `k2` post is 409 `ALREADY_EXISTS`; the last three are 400 `VALIDATION_FAILED`; the read is 200 with the first body and `ghost` is 404 `NOT_FOUND`; `createFlow` rejects with `FlowError` codes `FLOW_EXISTS` and, for `nope`, `FLOW_UNKNOWN_TEAM`; one `flow.created` event exists for `rf-1-core`

#### Scenario: Lists show only the caller's teams and page with the cursor contract
- **WHEN** tenant A holds `alpha`, `beta`, `gamma` (owned by `finance`) and `ops-one` (owned by `ops`), tenant B holds `b-one` (owned by its `finance`); alice (team `finance`), dave (`ops`), carol (`tenant_admin`, no team) and mallory (tenant B, team `finance`) list; alice lists with `limit=2`, follows `next_cursor`, then sends that cursor with one character changed and to `/api/v1/flows/alpha/versions`; a second server with `engineKey: null` gets alice's list with `limit=3`, with `limit=2` and with a `cursor`
- **THEN** alice's `flowId`s are `["alpha", "beta"]` with a `next_cursor`, then `["gamma"]` with `next_cursor` null; dave's are `["ops-one"]`, carol's `[]`, mallory's `["b-one"]`; the edited and the foreign-scope cursors are 400 `CURSOR_INVALID`; the keyless server answers 200 for `limit=3` and 503 `ENGINE_KEY_REQUIRED` for `limit=2` and for the cursor

### Requirement: Edit and read are scoped to the owner team
The fragment `src/registry/policy/flows.cedar` SHALL permit `edit_flow` on a `Flow` to a principal with the role `author` who is a member of the flow's owner team, `read_flow` on a `Flow` to any member of its owner team, and `read_flow` on the `Tenant` for the list.

#### Scenario: Who may call
- **WHEN** the engine loads `defaultSrcDir()`; `rf-1-core` is owned by `finance`; alice (author, finance), bob (approver, finance), dave (author, ops), carol (`tenant_admin`, no team) and mallory (author, team `finance` of tenant B, which has no `rf-1-core`) call `GET /api/v1/flows/rf-1-core`, `POST /api/v1/flows/rf-1-core/versions` with a valid text, `POST /api/v1/flows` with `{ name: "ops-flow", ownerTeam: "ops" }` and with `{ name: "ghost-flow", ownerTeam: "nope" }`
- **THEN** in call order, alice: 200, 201, 403, 403; bob: 200, 403, 403, 403; dave: 403, 403, 201, 403; carol: 403 on every call; mallory: 404 `NOT_FOUND` for the read and the save, 403 for both creates; each 403 is `FORBIDDEN` with `details.decisionId` and appends one `authz.denied` event, no `flow.*` event and no row

### Requirement: Saving text stores an immutable version keyed by its content hash
`POST /api/v1/flows/{flowId}/versions` SHALL parse the text with `parseFlowText`, require an object whose `flow` equals the flow id, and store a version keyed by `contentHash` of the parsed document; the same content saved again in the tenant SHALL answer the existing version.

#### Scenario: Save, deduplicate, number, read
- **WHEN** alice saves the YAML text `T1` of `rf-1-core` (flow `other` also exists in `finance`); saves `T1` again; saves the same document as JSON text with other key order; saves `T2` (`T1` with one description changed) with key `s1` and again with `s1`; lists versions with `limit=1`, follows the cursor and sends it to flow `other`; reads version 1 and its hash under flow `other`; bob (`finance`) reads version 1
- **THEN** the first save is 201 `{ version: { flowId: "rf-1-core", number: 1, hash: contentHash(parsed T1), state: "draft", surface: "yaml", author: <alice>, requestedBy: null, validatedAt: null, validationOk: null, ... }, created: true }`; the second and third are 200 with the same `version` and `created: false` (`surface` stays `"yaml"`); `T2` is 201 with `number` 2, its replay that 201 with `Idempotent-Replayed: true`; the list holds `[2]` with a cursor, then `[1]`, and under `other` it is 400 `CURSOR_INVALID`; the read of version 1 is 200 with that summary plus `text` equal to `T1`, `canonical` equal to `canonicalizeFlow` of the parsed `T1` (`contentHash(canonical)` equals `hash`) and `result` null; the other flow gives 404 `NOT_FOUND`; bob's read is 200; the flow shows `versionCount` 2 and `latest.number` 2

#### Scenario: Text that is not a flow document is refused
- **WHEN** alice saves `"a: [1"` as yaml, `"{"` as json, `"[1]"` as yaml, `"# only a comment"` as yaml, a text whose `flow` is `other`, one without `flow` and `"# \u0000\n"` plus `T1`; sends a save with the property `author`; sends 1,100,000 characters; and `saveFlowVersion` gets a yaml text of 1,048,577 bytes
- **THEN** the first two are 422 `FLOW_TEXT_INVALID` with `details` `{ reason: "parse", code: "FORMAT_YAML_SYNTAX", message: <string>, line: <number>, column: <number> }` and `{ reason: "parse", code: "FORMAT_JSON_SYNTAX", message: <string> }`; the next two have `reason` `"not_object"` and the two after `"name_mismatch"`, the last `{ reason: "parse", code: "FORMAT_NOT_JSON" }`; `author` is 400 `VALIDATION_FAILED`; the large body is 413 `PAYLOAD_TOO_LARGE`; `saveFlowVersion` rejects with a `FlowError` of `code` `FLOW_TEXT_INVALID` and `details.code` `FORMAT_TOO_LARGE`; the flow's `versionCount` is still 0 and no `flow.version_saved` event exists

#### Scenario: Concurrent saves
- **WHEN** two connections of the app pool call `saveFlowVersion` with the same new text at once, then two call it with two different new texts at once
- **THEN** the first pair gives one `created: true` and one `created: false`, both `number` 1, and one event; the second pair gives `number` 2 and 3, each once

### Requirement: Validation is stored with the version as a point in time
`POST /api/v1/flows/{flowId}/versions/{hash}/validate` SHALL run `validateFlow` on the version's canonical document against the tenant's catalogue, store the `ValidationResult` and the time, and set the state to `validated` only when `ok` is true; a block imported afterwards SHALL change nothing until the next validation.

#### Scenario: Validate and promote
- **WHEN** `catalogueFor` returns `loadTestCatalogue()`; alice validates version 1 (`rf-1-core`) and a version of flow `demo-flow` whose node `a` uses `nope.missing@1`, reads both, and a second server without `catalogueFor` and with an empty registry validates `rf-1-core`
- **THEN** the first answer is 200 `{ version: { ..., state: "validated", validatedAt: "2026-10-25T09:00:00.000000Z", validationOk: true }, result }` where `result` deep-equals `validateFlow(canonicalizeFlow(version.canonical), loadTestCatalogue())` and its `ok` is true; the second has `state` `"draft"`, `validationOk` false and at least one issue in `result.errors`; each read returns the same `result` and `validatedAt`; the second server's `result.ok` is false

#### Scenario: A later validation replaces the earlier one
- **WHEN** version 1 of `rf-1-core` was validated with `loadTestCatalogue()`; `catalogueFor` is switched to `emptyCatalogue` and the clock advances 60 seconds; alice reads version 1, then validates it again
- **THEN** the read still shows `state` `"validated"`, `validationOk` true and the old `validatedAt`; the new validation answers `state` `"draft"`, `validationOk` false, `validatedAt` `"2026-10-25T09:01:00.000000Z"` and a read shows the new `result`; `hash`, `text` and `canonical` are unchanged; two `flow.version_validated` events exist

#### Scenario: Validation failures change nothing
- **WHEN** `catalogueFor` rejects and alice validates version 1; she validates an unknown well-formed hash, and version 1's hash under flow `other`; `validateVersion` gets `sha256:zz`
- **THEN** the first is 500 `INTERNAL` with no driver or catalogue text, the version still has `validatedAt` null and no event exists; the next two are 404 `NOT_FOUND`; `validateVersion` rejects with a `FlowError` of `code` `FLOW_INVALID`

### Requirement: Every change is audited in its own transaction
`createFlow`, `saveFlowVersion` and `validateVersion` SHALL append `flow.created`, `flow.version_saved` and `flow.version_validated` in the transaction of the change, and nothing is appended for a read or an existing version.

#### Scenario: Events, deduplication and rollback
- **WHEN** alice creates `rf-1-core`, saves `T1` twice, validates version 1, reads it, then saves `T2` through a pool wrapper that rejects statements mentioning `audit_`
- **THEN** the chain holds, in order, `flow.created` (target `{ kind: "flow", id: "rf-1-core" }`, payload `{ ownerTeam: "finance" }`), `flow.version_saved` (target `{ kind: "flow_version", id: <hash> }`, actor `{ kind: "user", id: <alice> }`, payload `{ flowId: "rf-1-core", number: 1, surface: "yaml" }`) and `flow.version_validated` (payload `{ flowId: "rf-1-core", ok: true, errors: 0, warnings: <result.warnings.length>, state: "validated" }`); the failing save answers 500 `INTERNAL` and `versionCount` stays 1

### Requirement: The routes are session routes under the flow actions
The seven routes SHALL be defined with `auth: { kind: "session" }` and the actions of design.md § Interfaces, and the engine SHALL serve them and list them in `docs/api/openapi.json`.

#### Scenario: The route table and the real engine
- **WHEN** `registerFlowRoutes` is called on a server with the PEP and `listDefinedRoutes` is read; a request without a cookie and a `POST` with a cookie but no `x-csrf-token` are sent; `main` starts with no database and `inspectServers`, and `docs/api/openapi.json` is parsed
- **THEN** the rows `method url action` are exactly `GET /api/v1/flows read_flow`, `POST /api/v1/flows edit_flow`, `GET /api/v1/flows/:flowId read_flow`, `GET /api/v1/flows/:flowId/versions read_flow`, `POST /api/v1/flows/:flowId/versions edit_flow`, `GET /api/v1/flows/:flowId/versions/:hash read_flow`, `POST /api/v1/flows/:flowId/versions/:hash/validate edit_flow`, each with auth `session` and, in its `errors`, at least the codes of design.md § Interfaces; the first request is 401 `UNAUTHENTICATED` and the second 403 `CSRF_INVALID`; the public server of `main` defines the same seven routes, `unregisteredRouteErrors` over them is `[]`, and the document holds the paths `/api/v1/flows`, `/api/v1/flows/{flowId}`, `/api/v1/flows/{flowId}/versions`, `/api/v1/flows/{flowId}/versions/{hash}` and `/api/v1/flows/{flowId}/versions/{hash}/validate`

### Requirement: The flow text refusal is a registered code
`ERROR_CODES` SHALL hold `FLOW_TEXT_INVALID` with status 422, and `flowApiError` SHALL map each `FlowError` to an `ApiError` of a registered code, passing every other error through.

#### Scenario: The mapping
- **WHEN** `flowApiError` gets `FlowError`s of `FLOW_INVALID`, `FLOW_NOT_FOUND`, `FLOW_EXISTS`, `FLOW_UNKNOWN_TEAM`, `FLOW_TEXT_INVALID` (details `{ reason: "parse", code: "FORMAT_YAML_SYNTAX" }`) and `FLOW_TENANT_MISMATCH`, `new Error("boom")` and the string `"x"`
- **THEN** the first five are `ApiError`s `400 VALIDATION_FAILED`, `404 NOT_FOUND`, `409 ALREADY_EXISTS`, `422 OPERATION_REFUSED` with `details` `{ reason: "unknown_team" }`, and `422 FLOW_TEXT_INVALID` with message `Flow text is not a readable flow document` and the given details; the last three are returned strictly equal (`===`); `ERROR_CODES.FLOW_TEXT_INVALID` equals `{ status: 422, message: "Flow text is not a readable flow document" }`
