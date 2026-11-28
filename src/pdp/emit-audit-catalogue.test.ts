import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { ACTIONS, ACTION_NAMES } from "./actions.ts";
import { buildSchema } from "./cedar-schema.ts";
import { createPdp } from "./engine.ts";
import type { Pdp } from "./types.ts";

const ALL_ACTIONS = [
  "activate_flow",
  "approve_task",
  "approve_tool_surface",
  "author_flow",
  "debug_run",
  "deploy_policy",
  "dry_run_flow",
  "edit_flow",
  "edit_profile",
  "emit_audit",
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

const EMIT_AUDIT_FRAGMENT =
  'action emit_audit appliesTo { principal: User, resource: Tenant, context: {} };';

interface CatalogueEntry {
  readonly cedar: string;
  readonly resources: readonly string[];
  readonly capability: boolean;
  readonly context: unknown;
}

const CATALOGUE = ACTIONS as unknown as Record<string, CatalogueEntry | undefined>;

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

function fragmentOf(name: string): string {
  if (name === "emit_audit") {
    return EMIT_AUDIT_FRAGMENT;
  }
  const entry = CATALOGUE[name];
  assert.ok(entry !== undefined, `missing the catalogue entry of ${name}`);
  return entry.cedar;
}

test("C-6cc6bc38 C-6b24d8a6 the catalogue lists 26 actions and emit_audit is no capability", () => {
  assert.deepEqual([...ACTION_NAMES], ALL_ACTIONS, "ACTION_NAMES is not the 26 names in order");
  assert.deepEqual(Object.keys(ACTIONS), ALL_ACTIONS, "ACTIONS is not the 26 names in order");

  assert.deepEqual(
    CATALOGUE["emit_audit"],
    {
      cedar: EMIT_AUDIT_FRAGMENT,
      resources: ["Tenant"],
      capability: false,
      context: {},
    },
    "emit_audit is not a Tenant action with capability false",
  );

  const notCapable = ALL_ACTIONS.filter((name) => CATALOGUE[name]?.capability === false);
  assert.deepEqual(
    notCapable,
    ["activate_flow", "approve_task", "emit_audit", "invoke_llm", "invoke_tool"],
    "the non-capability actions are wrong",
  );

  const capable = ALL_ACTIONS.filter((name) => CATALOGUE[name]?.capability === true);
  assert.equal(capable.length, 21, "the capable action count is wrong");
  for (const name of capable) {
    const entry = CATALOGUE[name];
    assert.ok(entry !== undefined && entry.resources.includes("Tenant"), `${name} lacks Tenant`);
  }
});

test("C-7e0c5960 the schema holds 26 action lines and loads", async () => {
  let schema = "";
  assert.doesNotThrow(() => {
    schema = buildSchema();
  }, "buildSchema()");

  assert.ok(schema.endsWith("\n"), "the text does not end with a newline");
  const lines = schema.split("\n");
  const toolArgsLine = 'type ToolArgs = { "url"?: String, "url_host"?: String };';
  assert.ok(lines.includes(toolArgsLine), `missing the line ${toolArgsLine}`);

  let previousIndex = -1;
  for (const name of ALL_ACTIONS) {
    const fragment = fragmentOf(name);
    assert.ok(!fragment.includes("\n"), `${name} fragment is not one line`);
    const index = lines.indexOf(fragment);
    assert.ok(index !== -1, `missing the fragment line of ${name}`);
    assert.ok(index > previousIndex, `the fragment of ${name} is out of order`);
    previousIndex = index;
  }

  let loaded: Pdp | undefined;
  await assert.doesNotReject(async () => {
    loaded = await createPdp({
      schema,
      policies: [],
      clock: fixedClock("2026-10-25T09:00:00Z"),
      ids: sequentialIds(),
      logger: silentLogger(),
    });
  }, "createPdp on the catalogue schema");
  assert.ok(loaded !== undefined, "createPdp resolved without a pdp");
  assert.deepEqual([...loaded.actions], ALL_ACTIONS, "the loaded actions are not the 26 names");
});
