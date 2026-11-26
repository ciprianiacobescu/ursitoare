## MODIFIED Requirements

### Requirement: The action catalogue lists the Phase-1 actions
`ACTIONS` and `ACTION_NAMES` SHALL hold exactly the 25 Phase-1 actions and the sink action `emit_audit` (26 names, in name order), each with its Cedar schema fragment, its resource types and whether it is a capability, and no Phase-2 action. `emit_audit` SHALL apply to `Tenant` and SHALL NOT be a capability, so `GET /api/v1/me` never lists it.

#### Scenario: The 25 actions
- **WHEN** `ACTION_NAMES` and `Object.keys(ACTIONS)` are read
- **THEN** both are the 26 names, in this order, equal to `["activate_flow","approve_task","approve_tool_surface","author_flow","debug_run","deploy_policy","dry_run_flow","edit_flow","edit_profile","emit_audit","invoke_llm","invoke_tool","manage_credentials","manage_tenant","manage_triggers","manage_users_roles","read_audit","read_context","read_flow","read_registry","read_run","read_self","register_context_source","register_tool_server","start_run","test_flow"]`

#### Scenario: Phase-2 actions are absent
- **WHEN** `Object.hasOwn(ACTIONS, name)` is read for `import_skill`, `load_skill`, `read_trace`, `propose_change`, `apply_change`, `run_eval` and `read_holdout_items`
- **THEN** every result is `false`

#### Scenario: Entries
- **WHEN** `ACTIONS.read_self`, `ACTIONS.start_run`, `ACTIONS.invoke_tool` and `ACTIONS.invoke_llm` are read
- **THEN** `ACTIONS.read_self` equals `{ cedar: 'action read_self appliesTo { principal: User, resource: Tenant, context: {} };', resources: ["Tenant"], capability: true, context: {} }`; `ACTIONS.start_run.cedar` is `action start_run appliesTo { principal: User, resource: [Tenant, Flow], context: { trigger_type?: String } };`; `ACTIONS.invoke_tool.resources` is `["Block"]` and `ACTIONS.invoke_llm.resources` is `["Tenant","Block"]`

#### Scenario: Capability flags
- **WHEN** the names whose `capability` is `false` are collected
- **THEN** they are exactly `["activate_flow","approve_task","emit_audit","invoke_llm","invoke_tool"]` (`ACTIONS.emit_audit` equals `{ cedar: 'action emit_audit appliesTo { principal: User, resource: Tenant, context: {} };', resources: ["Tenant"], capability: false, context: {} }`), and the other 21 entries have `"Tenant"` in `resources`

### Requirement: The Cedar schema is built from the catalogue
`buildSchema` SHALL return one Cedar schema text holding the entity types of design.md decision 3 and the fragment of every action in name order, and SHALL accept extra tool argument names with a declared Cedar type.

#### Scenario: The default schema loads
- **WHEN** `createPdp` runs with `schema: buildSchema()` and `policies: []`
- **THEN** it resolves with `pdp.actions` equal to `ACTION_NAMES`

#### Scenario: One fragment per action, in order
- **WHEN** `buildSchema()` is split into lines
- **THEN** each `ACTIONS[name].cedar` is one line, those 26 lines appear in `ACTION_NAMES` order, the text ends with a newline and contains the line `type ToolArgs = { "url"?: String, "url_host"?: String };`

#### Scenario: Extra tool arguments
- **WHEN** `buildSchema({ toolArgs: { tags: "Set<String>", amount: "decimal" } })` runs and its text is loaded by `createPdp`
- **THEN** it contains the line `type ToolArgs = { "amount"?: decimal, "tags"?: Set<String>, "url"?: String, "url_host"?: String };` and `createPdp` resolves

#### Scenario: Bad tool arguments
- **WHEN** `toolArgs` has the name `url_host`, `url`, `Bad-Name` or `1a`, the type `"Foo"`, 257 names, or is `null`
- **THEN** each call throws `PdpError` with code `PDP_OPTIONS_INVALID` and `details.reason` `tool_args`
