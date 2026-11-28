import assert from "node:assert/strict";
import { test } from "node:test";

import { ACTIONS, ACTION_NAMES, SINK_ACTION } from "./actions.ts";

const PHASE_ONE_ACTIONS = [
  "activate_flow",
  "approve_task",
  "approve_tool_surface",
  "author_flow",
  "debug_run",
  "deploy_policy",
  "dry_run_flow",
  "edit_flow",
  "edit_profile",
  "invoke_llm",
  "invoke_tool",
  "manage_credentials",
  "manage_tenant",
  "manage_triggers",
  "manage_users_roles",
  "read_audit",
  "read_context",
  "read_flow",
  "read_registry",
  "read_run",
  "read_self",
  "register_context_source",
  "register_tool_server",
  "start_run",
  "test_flow",
];

test("C-6cc6bc38 C-f057eba6 the 25 actions and no Phase-2 actions", () => {
  const names = ACTION_NAMES.filter((name: string) => name !== SINK_ACTION);
  assert.deepEqual([...names], PHASE_ONE_ACTIONS);
  assert.deepEqual(Object.keys(ACTIONS).filter((name: string) => name !== SINK_ACTION), PHASE_ONE_ACTIONS);

  for (const name of [
    "import_skill",
    "load_skill",
    "read_trace",
    "propose_change",
    "apply_change",
    "run_eval",
    "read_holdout_items",
  ]) {
    assert.equal(Object.hasOwn(ACTIONS, name), false, name);
  }

  assert.equal(SINK_ACTION, "emit_audit");
});

test("C-f6a4aaaf entries", () => {
  assert.deepEqual(ACTIONS.read_self, {
    cedar: "action read_self appliesTo { principal: User, resource: Tenant, context: {} };",
    resources: ["Tenant"],
    capability: true,
    context: {},
  });
  assert.equal(
    ACTIONS.start_run.cedar,
    "action start_run appliesTo { principal: User, resource: [Tenant, Flow], context: { trigger_type?: String } };",
  );
  assert.deepEqual([...ACTIONS.invoke_tool.resources], ["Block"]);
  assert.deepEqual([...ACTIONS.invoke_llm.resources], ["Tenant", "Block"]);
});

test("C-6b24d8a6 capability flags", () => {
  const names = ACTION_NAMES.filter((name: string) => name !== SINK_ACTION);
  const notCapable = names.filter((name) => !ACTIONS[name].capability);
  assert.deepEqual([...notCapable], [
    "activate_flow",
    "approve_task",
    "invoke_llm",
    "invoke_tool",
  ]);

  const capable = names.filter((name) => ACTIONS[name].capability);
  assert.equal(capable.length, 21);
  for (const name of capable) {
    assert.ok(ACTIONS[name].resources.includes("Tenant"), name);
  }

  assert.equal(SINK_ACTION, "emit_audit");
});
