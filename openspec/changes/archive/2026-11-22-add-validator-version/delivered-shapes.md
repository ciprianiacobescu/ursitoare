# Delivered shapes taken by add-validator-version

Declarations from the merged code, main@3daa5c35, checked line by line (`file:line`; `…` elides unused members). Every name here is merged code; nothing is taken from an unmerged folder. U47b `add-tool-adapters` also edits `src/interpreter/types.ts`; no name of it is used.

```ts
// src/interpreter (U33, U35)
types.ts:111-117  interface LoadedVersion { flowId: string; hash: string; state: VersionState; ownerTeam: string; flow: Flow }   // this unit adds `readonly stale?: true`
types.ts:119-123  type VersionLoader = (ctx: TenantContext, flowId: string, hash: string) => Promise<LoadedVersion | null>
errors.ts:68-82   class InterpreterError extends Error { code; node: string | null; details: Readonly<Record<string, string | string[]>>; constructor(code, message, node?, details?) }   // errors.ts:3 holds "INTERPRETER_VERSION_NOT_RUNNABLE"
start.ts:33-52    startRun(deps: InterpreterDeps, ctx: TenantContext, req: StartRunRequest): Promise<RunRecord>   // :38 loadVersion, :39-44 not found (INTERPRETER_VERSION_NOT_FOUND), :45-52 draft (details { reason: "draft" }), :53 unsupportedKinds, then missingBlocks, checkSchema, runId, createRun, enqueue
execute.ts:142    executeRun loads the version through deps.loadVersion(tenant, run.flowId, run.flowHash) and reads neither state nor stale
// src/runtimes/invoke/path.ts:75  the invoke path loads it the same way (reads `flow` and the catalogue only)
// src/registry (U27)
flows/flows.ts:17-24  type VersionState = "draft" | "validated" | "tested" | "reviewed" | "published" | "deprecated"
flows/validate.ts:17-77  validateVersion(tx: TenantTx, ctx: TenantContext, input: { flowId; hash; catalogue }, actor: FlowActor, opts?: FlowOptions): Promise<{ version: VersionSummary; result: ValidationResult }>
  :29-31 SELECT … FOR UPDATE; :38 validateFlow(canonicalizeFlow(row.canonical), catalogue); :41-44 state becomes validated or draft only when it was draft or validated (a reviewed or later state is kept);
  :45-49 UPDATE ursitoare.flow_version SET state = $4, validation = $5::jsonb, validated_at = $6 WHERE tenant_id = $1 AND flow_id = $2 AND content_hash = $3   // [ctx.tenantId, flowId, hash, state, JSON.stringify(result), now]
  :50-65 appendAudit "flow.version_validated" payload { flowId, ok, errors, warnings, state }
flows/versions.ts:185  getVersion(tx, ctx, flowId, hash): Promise<VersionDetail | null>   // 13 keys: flowId number hash state surface author requestedBy createdAt validatedAt validationOk text canonical result
index.ts  exports createFlow, flowOwnerTeam, getFlow, listFlows, getVersion, listVersions, saveFlowVersion, validateVersion   // this unit adds `isValidationStale`, `validatorVersionOf`
// src/db/migrations
0270_flow_registry.sql:12-33  flow_version(tenant_id, content_hash, flow_id, version_no, source_surface, source_text, canonical, state, author, requested_by, created_at, validation, validated_at); RLS forced (:35-37)
0270_flow_registry.sql:38  GRANT SELECT, INSERT ON TABLE ursitoare.flow, ursitoare.flow_version TO ursitoare_app
0270_flow_registry.sql:40  GRANT UPDATE (state, validation, validated_at) ON TABLE ursitoare.flow_version TO ursitoare_app   // the only grant on flow_version; no other migration names the table (grep)
// src/db/migrate.ts:155-182 verifyLedger (every applied row needs its file); :268-273 applies every file whose version is not in the ledger, in file order
// src/authoring (U22, U25)
validate/schema.ts:81-85  start: ref("nodeId"); nodes: { type: "object", minProperties: 1, propertyNames: ref("nodeId"), additionalProperties: ref("node") }   // ref("nodeId") is also next, on_timeout, default and cases values (:121-244)
validate/schema.ts:89  hooks: objectArray ({ type: "array", items: { type: "object" } })
validate/schema.ts:92  nodeId: { type: "string", pattern: "^[a-z][a-z0-9_]*$" }
validate/l1.ts:160-181  schemaErrors (propertyNames branch :167-176): for keyword propertyNames the message is `node id "<name>" is invalid: ids are snake_case and match [a-z][a-z0-9_]*` when instancePath is "/nodes", else `name "<name>" is invalid: name does not match the required pattern`; every other `pattern` failure is L1_PATTERN with Ajv's message (`must match pattern "<pattern>"`)
format/refs.ts:25  const NODE_ID = /^[a-z][a-z0-9_]*$/;   :43  if (!NODE_ID.test(id)) return { error: `invalid node id "${id}" in reference` }   (:145 suspiciousInterpolation's heuristic regex has the same unbounded class; it only warns and stays)
validate/validate.ts:52-68  validateFlow: L1; L2 only when no error; L3 only when none; layer H only when none and declaresHooks(doc)
validate/types.ts:5-11  interface Issue { layer; code; node: string | null; path: string; message: string }
hooks/check.ts:24,66-73,108  SELECTOR_MEMBERS = ["kind","effect","nodes","tags"]; a nodes entry is valid only if typeof entry === "string" && Object.hasOwn(scan.nodes, entry), else H_SCHEMA `invalid entry in selector member nodes`; `when.from` and `when.next` use the same checkSelector
// src/api (U35, U49)
test-run-routes.ts:64-79  mapStartRunError: INTERPRETER_VERSION_NOT_RUNNABLE gives 422 OPERATION_REFUSED "Operation is refused" details { reason: "version_not_runnable", cause: <error.details.reason or "not_runnable">, blocks? }
test-run-routes.ts:111-130  registryVersionLoader(pool: TenantPool): VersionLoader   // withTenantTx; getVersion, flowOwnerTeam (null owner gives null); builds { flowId, hash, state: version.state, ownerTeam, flow: version.canonical as Flow }
flow-versions.ts:195-215  POST /api/v1/flows/:flowId/versions/:hash/validate (action edit_flow) calls validateVersion with deps.catalogueFor or loadRegistryCatalogue
grant-routes.ts:37  const NODE_PATTERN = "^[a-z][a-z0-9_]*$";   :74  nodeId: { type: "string", pattern: NODE_PATTERN }   // SCOPE_SCHEMA, used by the create body and every grant response
// the bound already held where a node id is stored
runs/store/validate.ts:23,95  NODE_ID_PATTERN = /^[a-z][a-z0-9_]{0,127}$/ (a step with a longer id is RUN_DATA_INVALID)   0340_effect_intent.sql:5 same CHECK   0110_policy_decision.sql:6 char_length 1..128   0490_grants.sql:9 grant.node_id text, no bound
// docs
docs/authoring/format.md:21  "- `nodes` maps node ids to node objects."   :46-47  "A `hooks` entry is a hook rule with an `id`, a `match` selector and optional `pre` and `post` hook definitions."
docs/api/openapi.json  5 properties named nodeId carry "pattern": "^[a-z][a-z0-9_]*$" (the grants list items, create body, 201, revoke and confirm records)
```

Test support used (all on main): `seedMockRunFlows(db, ctx, clock): Promise<{ validated; draft; llm }>` (`test/support/mock-run-seed.ts:27`), `payOnceVersion()`, `payOnceCatalogue()`, `withTestDatabase()`, `seedTwoTenants`, `seedFlowActors`, `createTestSession`, `emptyCatalogue`, `loadRegistryCatalogue`, and the four route registrars.
