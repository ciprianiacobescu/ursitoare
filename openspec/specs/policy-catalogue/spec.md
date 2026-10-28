# policy-catalogue Specification

## Purpose
The Phase-1 policy catalogue on the Cedar engine: the named actions with their typed contexts, the Cedar schema built from them, the platform policy layer loaded from code (cross-tenant forbid, untrusted-egress forbid, agent-consequential forbid, read-self permit), per-module policy fragments, and the capability probe behind `GET /api/v1/me`.

## Requirements

### Requirement: The action catalogue lists the Phase-1 actions
`ACTIONS` and `ACTION_NAMES` SHALL hold exactly the 25 Phase-1 actions, each with its Cedar schema fragment, its resource types and whether it is a capability, and no Phase-2 action.

#### Scenario: The 25 actions
- **WHEN** `ACTION_NAMES` and `Object.keys(ACTIONS)` are read
- **THEN** both equal `["activate_flow","approve_task","approve_tool_surface","author_flow","debug_run","deploy_policy","dry_run_flow","edit_flow","edit_profile","invoke_llm","invoke_tool","manage_credentials","manage_tenant","manage_triggers","manage_users_roles","read_audit","read_context","read_flow","read_registry","read_run","read_self","register_context_source","register_tool_server","start_run","test_flow"]`

#### Scenario: Phase-2 actions are absent
- **WHEN** `Object.hasOwn(ACTIONS, name)` is read for `import_skill`, `load_skill`, `read_trace`, `propose_change`, `apply_change`, `run_eval` and `read_holdout_items`
- **THEN** every result is `false`

#### Scenario: Entries
- **WHEN** `ACTIONS.read_self`, `ACTIONS.start_run`, `ACTIONS.invoke_tool` and `ACTIONS.invoke_llm` are read
- **THEN** `ACTIONS.read_self` equals `{ cedar: 'action read_self appliesTo { principal: User, resource: Tenant, context: {} };', resources: ["Tenant"], capability: true, context: {} }`; `ACTIONS.start_run.cedar` is `action start_run appliesTo { principal: User, resource: [Tenant, Flow], context: { trigger_type?: String } };`; `ACTIONS.invoke_tool.resources` is `["Block"]` and `ACTIONS.invoke_llm.resources` is `["Tenant","Block"]`

#### Scenario: Capability flags
- **WHEN** the names whose `capability` is `false` are collected
- **THEN** they are exactly `["activate_flow","approve_task","invoke_llm","invoke_tool"]`, and the other 21 entries have `"Tenant"` in `resources`

### Requirement: The Cedar schema is built from the catalogue
`buildSchema` SHALL return one Cedar schema text holding the entity types of design.md decision 3 and the fragment of every action in name order, and SHALL accept extra tool argument names with a declared Cedar type.

#### Scenario: The default schema loads
- **WHEN** `createPdp` runs with `schema: buildSchema()` and `policies: []`
- **THEN** it resolves with `pdp.actions` equal to `ACTION_NAMES`

#### Scenario: One fragment per action, in order
- **WHEN** `buildSchema()` is split into lines
- **THEN** each `ACTIONS[name].cedar` is one line, those 25 lines appear in `ACTION_NAMES` order, the text ends with a newline and contains the line `type ToolArgs = { "url"?: String, "url_host"?: String };`

#### Scenario: Extra tool arguments
- **WHEN** `buildSchema({ toolArgs: { tags: "Set<String>", amount: "decimal" } })` runs and its text is loaded by `createPdp`
- **THEN** it contains the line `type ToolArgs = { "amount"?: decimal, "tags"?: Set<String>, "url"?: String, "url_host"?: String };` and `createPdp` resolves

#### Scenario: Bad tool arguments
- **WHEN** `toolArgs` has the name `url_host`, `url`, `Bad-Name` or `1a`, the type `"Foo"`, 257 names, or is `null`
- **THEN** each call throws `PdpError` with code `PDP_OPTIONS_INVALID` and `details.reason` `tool_args`

### Requirement: Principals and tenants become Cedar entities
`userEntity` and `tenantEntity` SHALL build the principal and tenant entities of the schema with tenant-namespaced ids, and `isPrincipalEntity` SHALL accept only well-formed principals.

#### Scenario: A user entity
- **WHEN** `userEntity` runs for tenant `tenant_a`, user `alice`, kind `human`, roles `["author","approver","author"]`, teams `["finance"]`
- **THEN** it equals `{ uid: { type: "User", id: "tenant_a/alice" }, attrs: { tenant: "tenant_a", kind: "human", roles: [entityRef("Role","approver"), entityRef("Role","author")], teams: [entityRef("Team","tenant_a/finance")] }, parents: [{ type: "Role", id: "approver" }, { type: "Role", id: "author" }, { type: "Team", id: "tenant_a/finance" }] }`

#### Scenario: A tenant entity and a scoped id
- **WHEN** `tenantEntity("tenant_a")` and `scopedId("tenant_a", "x")` run
- **THEN** the first equals `{ uid: { type: "Tenant", id: "tenant_a" }, attrs: { tenant: "tenant_a" }, parents: [] }` and the second is `"tenant_a/x"`

#### Scenario: Principal validation
- **WHEN** `isPrincipalEntity` runs for `alice`, and for alice with `tenantId` `"bad tenant!"`, `userId` `""`, `userId` of 129 characters, `userId` holding NUL, `kind` `"robot"`, 65 roles, a role `""`, `teams` `"x"`, a `roles` getter that throws, then `null` and `"alice"`
- **THEN** the first is `true` and every other result is `false`

### Requirement: Policy fragments are loaded from module directories
`loadPolicyFragments` SHALL return every `<srcDir>/<module>/policy/*.cedar` file as a platform-layer source in sorted id order, and SHALL refuse a directory or file it cannot use rather than skip it.

#### Scenario: Sorted order and scope
- **WHEN** `srcDir` holds `zeta/policy/b.cedar`, `alpha/policy/z.cedar`, `alpha/policy/a.cedar` (texts `TB`, `TZ`, `TA`), `alpha/policy/notes.txt`, `alpha/other/x.cedar` and `root.cedar`
- **THEN** the result equals `[{id:"alpha/policy/a.cedar",text:"TA",layer:"platform"},{id:"alpha/policy/z.cedar",text:"TZ",layer:"platform"},{id:"zeta/policy/b.cedar",text:"TB",layer:"platform"}]`

#### Scenario: Nothing to load
- **WHEN** `srcDir` is empty, or holds `alpha/policy/` with no file and `beta/` with no `policy`
- **THEN** the result is `[]`

#### Scenario: A missing or wrong srcDir
- **WHEN** `srcDir` is a missing path, a regular file, or the number 5
- **THEN** each call rejects with `PdpError` code `PDP_OPTIONS_INVALID` and `details.reason` `src_dir`

#### Scenario: A file that cannot be a source is refused
- **WHEN** `alpha/policy/has space.cedar` exists, and separately `alpha/policy/dir.cedar` is a directory
- **THEN** each call rejects `PDP_OPTIONS_INVALID` with `details.reason` `fragment_name` and `details.ids` the id of that entry

#### Scenario: The default source directory
- **WHEN** `defaultSrcDir()` runs and its result is passed to `loadPolicyFragments`
- **THEN** its basename is `src`, and the result is an array in which every source has layer `platform`

### Requirement: The policy engine composes the layers
`createPolicyEngine` SHALL load the schema, the platform layer, the fragments and the tenant sources into one `Pdp` that also answers `allowedActions`, and SHALL refuse a source that claims a layer it may not.

#### Scenario: Layers
- **WHEN** an engine has fragment `m/policy/a.cedar` with `@id("m-a") permit (principal, action == Action::"read_flow", resource);` and tenant source `t-src` with `@id("t-1") permit (principal, action == Action::"read_audit", resource);`
- **THEN** `engine.actions` equals `ACTION_NAMES` and the entries of `engine.policies` with id `m-a`, `platform-cross-tenant-forbid` or `t-1` are `[{id:"m-a",layer:"platform"},{id:"platform-cross-tenant-forbid",layer:"platform"},{id:"t-1",layer:"tenant"}]`

#### Scenario: The tenant layer is empty by default
- **WHEN** an engine has no `tenantPolicies` and `sampleRequest("read_flow")` is checked
- **THEN** no policy has layer `tenant`, and the decision is `deny / [] / []`

#### Scenario: A fragment or tenant source cannot reuse an id
- **WHEN** a fragment holds `@id("platform-cross-tenant-forbid") permit (principal, action, resource);`, and separately two fragments both hold `@id("dup")`
- **THEN** the first rejects `PDP_DUPLICATE_ID` with `details.ids` `["platform-cross-tenant-forbid"]`, the second with `["dup"]`

#### Scenario: A tenant source cannot claim another layer
- **WHEN** `tenantPolicies` holds a source with layer `platform`, and separately `tenantPolicies` is `"x"`
- **THEN** the first rejects `PDP_OPTIONS_INVALID` with `details.reason` `layer`, the second with `policies`

#### Scenario: An invalid fragment is named, not quoted
- **WHEN** fragment `m/policy/bad.cedar` holds `permit (principal,` , and separately `@id("m-bad") permit (principal, action == Action::"reed", resource);`
- **THEN** the first rejects `PDP_POLICY_INVALID` with `details.stage` `parse` and `details.ids` `["m/policy/bad.cedar"]`, the second with `stage` `validate` and `ids` `["m-bad"]`; no message contains `reed`

#### Scenario: A fragment guards a resource type
- **WHEN** fragment `x/policy/own.cedar` holds `@id("x-own") permit (principal, action == Action::"edit_flow", resource is Flow) when { principal in resource.owner_team };`, and separately the same policy with `@id("x-bad")` and `resource` instead of `resource is Flow`
- **THEN** the first engine loads with `x-own` in `engine.policies`, the second rejects `PDP_POLICY_INVALID` with `ids` `["x-bad"]`

#### Scenario: Tool arguments reach policies
- **WHEN** a fragment holds `@id("m-amt") permit (principal, action == Action::"invoke_tool", resource) when { context.args has amount && context.args.amount.greaterThan(decimal("1.0000")) };`, with `toolArgs` `{ amount: "decimal" }` and without; and, separately, two engines without that fragment, with and without that `toolArgs`
- **THEN** the first loads, the second rejects `PDP_POLICY_INVALID` with `details.ids` `["m-amt"]`, and the two other engines have different `policySetVersion`

### Requirement: The platform forbids cross-tenant requests
The platform layer SHALL contain `platform-cross-tenant-forbid`, which denies every action when `principal.tenant` differs from `resource.tenant`, even when a tenant policy permits it (exit test 18, Cedar half).

#### Scenario: Every action, both tenants
- **WHEN** on a permit-all engine, for each name in `ACTION_NAMES`, `sampleRequest(name)` is checked, then `sampleRequest(name, { principalTenant: "tenant_a", resourceTenant: "tenant_b" })`
- **THEN** the first is `allow`, with `errors` `[]` and `reasons` containing `t-all`, and the second is `deny / ["platform-cross-tenant-forbid"] / []`

#### Scenario: The other direction
- **WHEN** `sampleRequest("read_self", { principalTenant: "tenant_b", resourceTenant: "tenant_a" })` is checked on an engine without tenant policies
- **THEN** the decision is `deny / ["platform-cross-tenant-forbid"] / []`

### Requirement: The platform forbids untrusted data reaching write, send and pay
The platform layer SHALL contain `platform-forbid-untrusted-egress`, which denies `invoke_tool` when `context.taint` contains `untrusted` and the tool effect is `write`, `send` or `pay`.

#### Scenario: Write, send and pay are denied
- **WHEN** on a permit-all engine `invokeToolRequest({ effect, taint: ["untrusted"], blockKind: "code" })` is checked for `write`, `send` and `pay`
- **THEN** each decision is `deny / ["platform-forbid-untrusted-egress"] / []`

#### Scenario: Read stays allowed
- **WHEN** the same request is checked with effect `read` on a permit-all engine, and then on an engine without tenant policies
- **THEN** the first is `allow / ["t-all"] / []`, the second `deny / [] / []`

#### Scenario: Other taint labels
- **WHEN** a `write` is checked with taint `[]`, with `["extracted"]` and with `["extracted","untrusted"]` on a permit-all engine
- **THEN** the first two are `allow` and the third is `deny / ["platform-forbid-untrusted-egress"] / []`

### Requirement: The platform forbids agent blocks from consequential tools
The platform layer SHALL contain `platform-forbid-agent-consequential`, which denies `invoke_tool` when the block kind is `agent` and the tool effect is `send` or `pay`.

#### Scenario: An agent picks send or pay
- **WHEN** on a permit-all engine `invokeToolRequest({ effect, taint: [], blockKind: "agent" })` is checked for `send` and `pay`
- **THEN** each decision is `deny / ["platform-forbid-agent-consequential"] / []`

#### Scenario: Other combinations
- **WHEN** the effect is `write` or `read` with kind `agent`, and `send` with kind `code`, on a permit-all engine
- **THEN** each decision is `allow`

#### Scenario: Both forbids
- **WHEN** an `agent` block with effect `send` and taint `["untrusted"]` is checked on a permit-all engine
- **THEN** the decision is `deny / ["platform-forbid-agent-consequential","platform-forbid-untrusted-egress"] / []`

### Requirement: Any principal may read itself
The platform layer SHALL contain `platform-read-self`, which permits `read_self`, and `PLATFORM_SOURCE` SHALL hold exactly the four platform policies.

#### Scenario: read_self without any role
- **WHEN** on an engine without tenant policies `sampleRequest("read_self")` and `sampleRequest("author_flow")` are checked
- **THEN** the first is `allow / ["platform-read-self"] / []` and the second `deny / [] / []`

#### Scenario: The platform source
- **WHEN** `PLATFORM_SOURCE` is read and an engine over an empty `srcDir` lists its platform policies
- **THEN** `PLATFORM_SOURCE.id` is `pdp/platform`, its layer is `platform`, `PLATFORM_POLICY_IDS` equals `["platform-cross-tenant-forbid","platform-forbid-agent-consequential","platform-forbid-untrusted-egress","platform-read-self"]`, and the engine's platform entries equal those ids with layer `platform`

### Requirement: allowedActions lists the capabilities of a principal
`PolicyEngine.allowedActions` SHALL return, in the order given and without repeats, the capability actions that the engine allows for the principal on its own tenant, and SHALL return fewer actions, never reject, when anything fails.

#### Scenario: No roles
- **WHEN** `allowedActions(alice, ACTION_NAMES)` runs on an engine without tenant policies
- **THEN** it resolves to `["read_self"]`

#### Scenario: Policies and roles
- **WHEN** the tenant sources permit `read_flow` to everyone and `manage_users_roles` to `principal in Role::"tenant_admin"`, for alice, for alice with roles `["tenant_admin"]`, and for `kind` `service`
- **THEN** the results are `["read_flow","read_self"]`, `["manage_users_roles","read_flow","read_self"]` and `["read_flow","read_self"]`

#### Scenario: A permit-all engine
- **WHEN** `allowedActions(alice, ACTION_NAMES)` runs on a permit-all engine
- **THEN** the result is the 21 capability actions in `ACTION_NAMES` order, without `activate_flow`, `approve_task`, `invoke_llm` and `invoke_tool`

#### Scenario: Order, repeats and unknown names
- **WHEN** `actions` is `["read_self","read_self","nope","constructor","__proto__","read_self"]`, then `[]`, then not an array
- **THEN** the results are `["read_self"]`, `[]` and `[]` on a permit-all engine

#### Scenario: A hostile principal
- **WHEN** the principal has 65 roles, or `userId` `""`, or `tenantId` `"bad tenant!"`, or a `roles` getter that throws, or is `null`
- **THEN** each result is `[]` and one log line with message `pdp capability principal invalid` is written per call

#### Scenario: The probe request
- **WHEN** `probeRequest(alice, "read_self")`, `probeRequest(alice, "invoke_tool")` and `probeRequest` for a principal of `tenant_b` and `read_flow` run
- **THEN** the first equals `{ principal: { type: "User", id: "tenant_a/alice" }, action: "read_self", resource: { type: "Tenant", id: "tenant_a" }, context: {}, entities: [userEntity(alice), tenantEntity("tenant_a")] }`, the second is `null`, and the third has `resource` `{ type: "Tenant", id: "tenant_b" }`

#### Scenario: A policy that errors
- **WHEN** a permit-all engine also has the tenant source `x-ovf` with `@id("x-ovf") forbid (principal, action == Action::"read_flow", resource) when { 9223372036854775807 + 1 > 0 };`
- **THEN** `allowedActions(alice, ["read_flow","read_self"])` is `["read_self"]`

#### Scenario: A failing dependency
- **WHEN** the engine's `IdSource` throws on `next`, and `allowedActions(alice, ["read_self","read_flow"])` runs
- **THEN** it resolves to `[]` and one log line with message `pdp capability probe failed` is written per action

#### Scenario: Concurrent calls
- **WHEN** 50 calls of `allowedActions(alice, ACTION_NAMES)` run at once on a permit-all engine
- **THEN** all 50 results equal the 21 capability actions
