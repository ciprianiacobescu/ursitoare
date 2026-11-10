import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { BlockDef, JsonSchema, JsonValue } from "../authoring/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import {
  createPolicyEngine,
  entityRef,
  toDecimal,
  userEntity,
  type Entity,
  type PolicyEngine,
  type PolicyRequest,
  type PolicySource,
  type PrincipalEntity,
  type ToolArgType,
  type ToolArgs,
} from "../pdp/index.ts";
import { toCedarArgs, toolArgTypes, type CedarArgs } from "./args.ts";

const T = "tenant_a";

const ARGT: Readonly<Record<string, ToolArgType>> = {
  amount: "decimal",
  currency: "String",
  exact: "Bool",
  limit: "Long",
  tags: "Set<String>",
  vendor_id: "String",
  vendor_name: "String",
};

const STRING: JsonValue = { type: "string" };

function block(input: JsonSchema): BlockDef {
  return { effect: "read", input, output: { type: "object" } };
}

function withProperties(properties: JsonValue): BlockDef {
  return block({ type: "object", properties });
}

const D1 = withProperties({
  vendor_name: { type: "string" },
  limit: { type: "integer" },
  exact: { type: "boolean" },
  tags: { type: "array", items: { type: "string" } },
});

const D2 = withProperties({
  vendor_id: { type: "string" },
  amount: { type: "number" },
  currency: { type: "string" },
});

const D3 = withProperties({
  vendor_name: { type: "string" },
  url: { type: "string" },
  url_host: { type: "string" },
  Bad: { type: "string" },
  "a-b": { type: "string" },
  "9x": { type: "string" },
  limit: { type: "number" },
  memo: { type: ["string", "null"] },
  nested: { type: "object" },
  nums: { type: "array", items: { type: "number" } },
});

const D4 = block({ type: "object" });
const D5 = withProperties(5);
const D6 = withProperties({ z: null, y: 5, w: { type: "string" } });
const D7 = withProperties(
  JSON.parse('{"__proto__":{"type":"string"},"ok_name":{"type":"string"}}') as JsonValue,
);

const D8_PROPERTIES: Record<string, JsonValue> = {};
for (let index = 0; index < 300; index += 1) {
  D8_PROPERTIES[`p${String(index).padStart(3, "0")}`] = STRING;
}
const D8 = withProperties(D8_PROPERTIES);

const ARGT_WITHOUT_LIMIT: Readonly<Record<string, ToolArgType>> = {
  amount: "decimal",
  currency: "String",
  exact: "Bool",
  tags: "Set<String>",
  vendor_id: "String",
  vendor_name: "String",
};

function argTypes(blocks: readonly BlockDef[]): Readonly<Record<string, ToolArgType>> {
  let result: Readonly<Record<string, ToolArgType>> | undefined;
  assert.doesNotThrow(() => {
    result = toolArgTypes(blocks);
  }, "toolArgTypes");
  assert.ok(result !== undefined, "toolArgTypes returned no result");
  return result;
}

function cedar(args: JsonValue, types: Readonly<Record<string, ToolArgType>> = ARGT): CedarArgs {
  let result: CedarArgs | undefined;
  assert.doesNotThrow(() => {
    result = toCedarArgs(args, types);
  }, "toCedarArgs");
  assert.ok(result !== undefined, "toCedarArgs returned no result");
  return result;
}

test("C-95d926c4 toolArgTypes derives the listed vectors", () => {
  assert.deepEqual(argTypes([]), {});
  assert.deepEqual(argTypes([D1, D2]), ARGT);
  assert.deepEqual(argTypes([D1, D2, D3]), ARGT_WITHOUT_LIMIT);
  assert.deepEqual(argTypes([D4, D5, D6]), { w: "String" });
  assert.deepEqual(argTypes([D7]), { ok_name: "String" });

  const names = argTypes([D8]);
  const keys = Object.keys(names);
  assert.equal(keys.length, 256, "the name list is capped at 256");
  assert.equal(keys[0], "p000");
  assert.equal(keys[255], "p255");
  assert.equal(names["p256"], undefined);
  assert.equal(names["p000"], "String");
});

test("C-48db6043 toCedarArgs converts the typed arguments", () => {
  const first = cedar({
    vendor_name: "Acme",
    limit: 5,
    exact: true,
    tags: ["a", "b"],
    amount: 1000.5,
    currency: "EUR",
    extra: 1,
    other: [1],
  });
  assert.ok(first.ok, "the full input converts");
  assert.deepEqual(first.args, {
    amount: toDecimal(1000.5),
    currency: "EUR",
    exact: true,
    limit: 5,
    tags: ["a", "b"],
    vendor_name: "Acme",
  });
  assert.deepEqual(Object.keys(first.args), [
    "amount",
    "currency",
    "exact",
    "limit",
    "tags",
    "vendor_name",
  ]);
  assert.deepEqual(first.unconstrained, ["extra", "other"]);

  for (const [value, text] of [
    [5, "5.0000"],
    [-3, "-3.0000"],
    [922337203685477, "922337203685477.0000"],
  ] as const) {
    const result = cedar({ amount: value });
    assert.ok(result.ok, `the amount ${value} converts`);
    assert.deepEqual(result.args, { amount: { __extn: { fn: "decimal", arg: text } } });
  }

  const url = cedar({ url: "https://Api.Acme.test/x?y=1", vendor_name: "A" });
  assert.ok(url.ok, "the url input converts");
  assert.deepEqual(url.args, {
    url: "https://Api.Acme.test/x?y=1",
    url_host: "api.acme.test",
    vendor_name: "A",
  });
  assert.deepEqual(url.unconstrained, []);

  const noHost = cedar({ url: "mailto:x@y.test" });
  assert.ok(noHost.ok, "the mailto url converts");
  assert.deepEqual(noHost.args, { url: "mailto:x@y.test", url_host: "" });

  const loose = cedar({ zeta: 1, alpha: 2 });
  assert.ok(loose.ok, "the untyped input converts");
  assert.deepEqual(loose.args, {});
  assert.deepEqual(loose.unconstrained, ["alpha", "zeta"]);

  const inherited = cedar(JSON.parse('{"__proto__":1,"constructor":2,"limit":3}') as JsonValue);
  assert.ok(inherited.ok, "the own-key input converts");
  assert.deepEqual(inherited.args, { limit: 3 });
  assert.deepEqual(inherited.unconstrained, ["__proto__", "constructor"]);
  assert.equal(Object.getPrototypeOf(inherited.args), Object.prototype);
  assert.equal(({} as { limit?: unknown }).limit, undefined);
});

test("C-48db6043 toCedarArgs names the first argument it cannot convert", () => {
  for (const value of [1.00001, 0.30000000000000004, 1e15]) {
    assert.deepEqual(cedar({ amount: value }), {
      ok: false,
      arg: "amount",
      reason: "precision",
    });
  }

  assert.deepEqual(cedar({ url: "not a url" }), { ok: false, arg: "url", reason: "type" });
  assert.deepEqual(cedar({ url: 5 }), { ok: false, arg: "url", reason: "type" });
  assert.deepEqual(cedar({ url_host: "evil.test" }), {
    ok: false,
    arg: "url_host",
    reason: "reserved",
  });
  assert.deepEqual(cedar({ amount: "5", url_host: "evil.test" }), {
    ok: false,
    arg: "url_host",
    reason: "reserved",
  });

  const mistyped: [JsonValue, string][] = [
    [{ limit: 1.5 }, "limit"],
    [{ limit: "5" }, "limit"],
    [{ limit: 2 ** 53 }, "limit"],
    [{ tags: [1] }, "tags"],
    [{ tags: "a" }, "tags"],
    [{ exact: "true" }, "exact"],
    [{ vendor_name: null }, "vendor_name"],
  ];
  for (const [args, arg] of mistyped) {
    assert.deepEqual(cedar(args), { ok: false, arg, reason: "type" }, `the ${arg} refusal`);
  }

  const notObjects: JsonValue[] = [[1], null, "x"];
  for (const args of notObjects) {
    assert.deepEqual(cedar(args), { ok: false, arg: "", reason: "type" });
  }
});

const SRC_ARGS = [
  '@id("t-args")',
  'permit (principal, action == Action::"invoke_tool", resource is Block)',
  'when { context.args has "url_host" && context.args["url_host"] == "api.acme.test" && context.args has "tags" && context.args["tags"].contains("a") && context.args has "amount" && context.args["amount"].greaterThan(decimal("999.0000")) };',
].join("\n");

const SOURCES: readonly PolicySource[] = [
  { id: "tenant/source", layer: "tenant", text: SRC_ARGS },
];

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

function engineOver(srcDir: string): Promise<PolicyEngine> {
  return createPolicyEngine({
    srcDir,
    tenantPolicies: SOURCES,
    toolArgs: ARGT,
    clock: fixedClock("2026-11-06T09:00:00.000Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  });
}

function invoke(args: ToolArgs): PolicyRequest {
  const principal: PrincipalEntity = {
    tenantId: T,
    userId: "alice",
    kind: "human",
    roles: ["author"],
    teams: [],
  };
  const user = userEntity(principal);
  const teamId = `${T}/ops`;
  const flowId = `${T}/pay-run`;
  const flow: Entity = {
    uid: { type: "Flow", id: flowId },
    attrs: { tenant: T, owner_team: entityRef("Team", teamId), reviewed: false },
    parents: [],
  };
  const team: Entity = { uid: { type: "Team", id: teamId }, attrs: { tenant: T }, parents: [] };
  const blockEntity: Entity = {
    uid: { type: "Block", id: `${T}/pay-run/lookup` },
    attrs: { tenant: T, kind: "block", flow: entityRef("Flow", flowId) },
    parents: [],
  };
  const toolId = `${T}/acme.lookup_vendor@1`;
  const tool: Entity = {
    uid: { type: "Tool", id: toolId },
    attrs: { tenant: T, effect: "read" },
    parents: [],
  };
  return {
    principal: user.uid,
    action: "invoke_tool",
    resource: blockEntity.uid,
    context: {
      tool: entityRef("Tool", toolId),
      args,
      taint: [],
      run_initiator: entityRef("User", `${T}/alice`),
      sod_excluded: [],
      approvals: [],
      approvers_by_role: {},
      node_fingerprint: "",
    },
    entities: [user, team, flow, blockEntity, tool],
  };
}

const tempDirs: string[] = [];

after(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-48db6043 toCedarArgs feeds the engine loaded with SRC_ARGS", async () => {
  const srcDir = await mkdtemp(join(tmpdir(), "args-"));
  tempDirs.push(srcDir);
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await engineOver(srcDir);
  }, "createPolicyEngine");
  assert.ok(engine !== undefined, "no engine");
  const pdp = engine;

  async function decide(args: JsonValue): Promise<[string, string[], string[]]> {
    const converted = cedar(args);
    assert.ok(converted.ok, "the arguments convert");
    const decision = await pdp.check(invoke(converted.args));
    return [decision.decision, decision.reasons, decision.errors];
  }

  assert.deepEqual(
    await decide({ url: "https://Api.Acme.test/x?y=1", tags: ["a", "b"], amount: 1000.5, extra: 1 }),
    ["allow", ["t-args"], []],
  );
  for (const args of [
    { amount: 999 },
    { amount: 922337203685477 },
    { amount: -922337203685477 },
    { url: "mailto:x@y.test" },
  ]) {
    assert.deepEqual(await decide(args), ["deny", [], []], `the refusal of ${JSON.stringify(args)}`);
  }
});
