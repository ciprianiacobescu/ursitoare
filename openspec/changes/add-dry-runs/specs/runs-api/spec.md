## ADDED Requirements

### Requirement: A decision view shows the recorded permit and nothing else
`toDecisionView(record)` SHALL give exactly `decisionId`, `decidedAt`, `nodeId`, `resource`, `decision`, `reasons` (a copy), `policySetVersion` and `permit`, in that order, and `permit` SHALL be `null` for a record without one and otherwise an object of exactly `method`, `host`, `path`, `bodyDigest`, `serviceId` and `ttlSeconds`, or `null` when one of them is missing or has the wrong type.

#### Scenario: Allow, deny, extra and malformed permits
- **WHEN** `toDecisionView` runs on the records V1 to V5 of `test-plan.md` § Decision views
- **THEN** V1 equals its listed view, V2 (a deny) has `permit` `null` and `reasons` `[]`, V3 (an extra member `x`) has the six members only, V4 (no `ttlSeconds`) and V5 (`"60"`) have `permit` `null`, every view has the eight keys in order, and changing a view's `reasons` leaves the record's unchanged

### Requirement: The readers of a run list its policy decisions
`GET /api/v1/runs/{runId}/decisions` SHALL be a `session` route of action `read_run` on the `Run` (`runResource`), answer the run's decisions in `asc` order through `listPolicyDecisions` filtered by `runId` as `toDecisionView` items of a page (`limit` 1 to 100, default 50; scope `run_decisions`; cursor position `[runId, decidedAt, decisionId]`), and answer 404 for a run of another tenant or an unknown run, 400 `CURSOR_INVALID` for a cursor minted for another run, 503 `ENGINE_KEY_REQUIRED` when no engine key is set and a `cursor` is sent or more rows exist than fit (`src/api/audit-routes.ts:425-432`), and 503 `RUNS_UNAVAILABLE` without a pool.

#### Scenario: The owner team and the initiator read; pages are bound to the run
- **WHEN** a run of `tenant_a` (owner team `finance`, initiator alice) has the decisions DEC1 to DEC3 of `test-plan.md` § Decision rows and alice, bob, dave, carol and mallory read it; then alice reads with `limit=2` and its cursor, `limit=200`, `cursor=abc` and the first run's cursor on a second run, and a server without an engine key reads with `limit=2`, `cursor=abc` and no limit
- **THEN** alice and bob get 200 with the three items in order (permits on the two allows, `null` on the deny) and `next_cursor` `null`; dave and carol 403; mallory and an unknown run 404; `limit=2` gives `[DEC1, DEC2]` and a cursor, then `[DEC3]` and `null`; `limit=200` is 400 at `querystring/limit`; `cursor=abc` and the foreign cursor are 400 `CURSOR_INVALID`; without a key `limit=2` and `cursor=abc` are 503 `ENGINE_KEY_REQUIRED` and no limit is 200; a run with no decision gives `{ items: [], next_cursor: null }`

### Requirement: The OpenAPI document lists both routes and describes the hooks audit digest
The `200` response schema of `GET /api/v1/runs/{runId}/steps` (the `pageSchema(STEP_VIEW_SCHEMA)` object in `src/api/run-routes.ts`) SHALL gain the `description` `Steps of the run. hooks.inputOriginalRef is the audit digest of the input before the pre-hooks changed it; the payload route does not serve it`, while `STEP_VIEW_SCHEMA` and its `inputOriginalRef` (`{ type, pattern }`, pinned by add-hook-trace) stay unchanged, and `docs/api/openapi.json` SHALL equal the served document and list the dry-run operation (`x-ursitoare-action` `dry_run_flow`, `x-ursitoare-auth` `session`, 202 `{ run }`) and the decisions operation (`read_run`, `session`, 200 page of decision views).

#### Scenario: The committed document holds both operations and the description
- **WHEN** `docs/api/openapi.json` is parsed after `node test/support/openapi-docs.ts`
- **THEN** `paths["/api/v1/flows/{flowId}/versions/{hash}/dry-run"].post` has `x-ursitoare-action` `dry_run_flow`, `x-ursitoare-auth` `session` and `x-ursitoare-errors` containing `RUNS_UNAVAILABLE`, `VALIDATION_FAILED`, `OPERATION_REFUSED`, `IDEMPOTENCY_KEY_REUSED`; `paths["/api/v1/runs/{runId}/decisions"].get` has `read_run`, `session` and `x-ursitoare-errors` containing `CURSOR_INVALID`, `ENGINE_KEY_REQUIRED`, `NOT_FOUND`; the steps operation's 200 schema `description` is the text above, and the `inputOriginalRef` schema in its items still has exactly `type` (`string` and `null`, sorted) and `pattern` `^[0-9a-f]{64}$`; `src/main.conventions.test.ts::C-d150bfa4` passes
