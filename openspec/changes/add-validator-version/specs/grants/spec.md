## ADDED Requirements

### Requirement: A grant's node id is at most 128 characters at the API
`NODE_PATTERN` in `src/api/grant-routes.ts` SHALL be `^[a-z][a-z0-9_]{0,127}$`, so `POST /api/v1/grants` answers 400 `VALIDATION_FAILED` at `body/scope/nodeId` for a `scope.nodeId` of 129 characters or more, and accepts one of 128 characters whose node exists in the flow, because layer L1 accepts the same length.

#### Scenario: A 128-character node id is granted and a 129-character one is refused
- **WHEN** carol (`tenant_admin`) posts the bodies G1 to G4 of `test-plan.md` § Grant rows: a node of 128 characters in a validated flow, the same id for a flow that lacks it, a 129-character id, and `"Pay"`
- **THEN** G1 is 201 with `scope.nodeId` the 128-character id, `state` `"active"` and one `nf1_` fingerprint; G2 is 422 `OPERATION_REFUSED` with `details` `{ reason: "node_unknown" }`; G3 and G4 are 400 `VALIDATION_FAILED` with `details.fields` `[{ field: "body/scope/nodeId", message: "must match pattern \"^[a-z][a-z0-9_]{0,127}$\"" }]`; after the four posts the grant table holds exactly 1 grant

### Requirement: The OpenAPI document carries the node-id bound
`docs/api/openapi.json` SHALL equal the served document, and every `nodeId` schema under the grant routes (the create body, the 201 record, the list items, the revoke and confirm records) SHALL have the `pattern` `^[a-z][a-z0-9_]{0,127}$`.

#### Scenario: The committed document holds the bound five times
- **WHEN** the test parses `docs/api/openapi.json` after `pnpm run test test/support/openapi-docs.ts` and collects every property named `nodeId` that has a `pattern`
- **THEN** there are exactly 5, at the grants list items, the create body, the 201 record, the revoke record and the confirm record, and each `pattern` is `^[a-z][a-z0-9_]{0,127}$`; `src/main.conventions.test.ts::C-d150bfa4` still passes
