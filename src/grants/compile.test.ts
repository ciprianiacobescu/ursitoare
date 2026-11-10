import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import {
  createPolicyEngine,
  defaultSrcDir,
  type PolicySource,
  type ToolArgType,
} from "../pdp/index.ts";
import {
  compileGrant,
  compileGrants,
  type ArgConstraint,
  type GrantRecord,
} from "./index.ts";

const AT = "2026-11-06T09:00:00.000000Z";

const ARGT: Readonly<Record<string, ToolArgType>> = {
  amount: "decimal",
  currency: "String",
  exact: "Bool",
  limit: "Long",
  tags: "Set<String>",
  vendor_id: "String",
  vendor_name: "String",
};

const FPA = "nf1_f24d1bc261f70ccadd830e24b3acb40edec5066462531278c03adc516dfeb51d";
const FPB = "nf1_20f87c5365e1cb05fe773dd9e4200d18670a144581e85b9f1c17918f7fda9868";

const BASE: GrantRecord = {
  id: "grant_1",
  subject: { kind: "role", role: "author" },
  tool: "acme.lookup_vendor@1",
  scope: { kind: "any_step" },
  args: [],
  fingerprints: [],
  state: "active",
  createdBy: "carol",
  createdAt: AT,
  revokedBy: null,
  revokedAt: null,
};

function grant(overrides: Partial<GrantRecord> = {}): GrantRecord {
  return { ...BASE, ...overrides };
}

function constraint(arg: string, op: ArgConstraint["op"], value: unknown): ArgConstraint {
  return { arg, op, value: value as ArgConstraint["value"] };
}

function nodeGrant(overrides: Partial<GrantRecord> = {}): GrantRecord {
  return grant({
    tool: "acme.create_payment@1",
    scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
    fingerprints: [FPA],
    ...overrides,
  });
}

const G1 = grant();
const G2 = grant({
  id: "grant_2",
  subject: { kind: "user", userId: "bob" },
  args: [
    constraint("vendor_name", "eq", "Acme"),
    constraint("limit", "lte", 50),
    constraint("exact", "eq", true),
  ],
});
const G3 = nodeGrant({
  id: "grant_3",
  args: [constraint("amount", "gte", 10), constraint("amount", "lte", 1000.5)],
});
const G4 = grant({
  id: "grant_4",
  subject: { kind: "role", role: "auditor" },
  args: [constraint("limit", "gte", -3), constraint("limit", "eq", 5)],
  state: "revoked",
  revokedBy: "carol",
  revokedAt: AT,
});

const G5 = grant({
  id: "grant_5",
  args: [
    constraint("limit", "gte", -3),
    constraint("in", "eq", "x y"),
    constraint("exact", "eq", false),
    constraint("url", "eq", "https://a.test/x"),
  ],
});
const G5_TYPES: Readonly<Record<string, ToolArgType>> = {
  limit: "Long",
  in: "String",
  exact: "Bool",
};

const G6 = nodeGrant({
  id: "grant_6",
  fingerprints: [FPA, FPB],
});

const G1_TEXT = [
  '@id("grant_1")',
  'permit (principal in Role::"author", action == Action::"invoke_tool", resource is Block)',
  'when { context.tool == Tool::"tenant_a/acme.lookup_vendor@1" };',
].join("\n");

const G2_TEXT = [
  '@id("grant_2")',
  'permit (principal == User::"tenant_a/bob", action == Action::"invoke_tool", resource is Block)',
  'when { context.tool == Tool::"tenant_a/acme.lookup_vendor@1" && context.args has "vendor_name" && context.args["vendor_name"] == "Acme" && context.args has "limit" && context.args["limit"] <= 50 && context.args has "exact" && context.args["exact"] == true };',
].join("\n");

const G3_TEXT = [
  '@id("grant_3")',
  'permit (principal in Role::"author", action == Action::"invoke_tool", resource == Block::"tenant_a/pay-run/pay")',
  `when { context.tool == Tool::"tenant_a/acme.create_payment@1" && ["${FPA}"].contains(context.node_fingerprint) && context.args has "amount" && context.args["amount"].greaterThanOrEqual(decimal("10.0000")) && context.args has "amount" && context.args["amount"].lessThanOrEqual(decimal("1000.5000")) };`,
].join("\n");

const G5_TEXT = [
  '@id("grant_5")',
  'permit (principal in Role::"author", action == Action::"invoke_tool", resource is Block)',
  'when { context.tool == Tool::"tenant_a/acme.lookup_vendor@1" && context.args has "limit" && context.args["limit"] >= -3 && context.args has "in" && context.args["in"] == "x y" && context.args has "exact" && context.args["exact"] == false && context.args has "url" && context.args["url"] == "https://a.test/x" };',
].join("\n");

const G6_TEXT = [
  '@id("grant_6")',
  'permit (principal in Role::"author", action == Action::"invoke_tool", resource == Block::"tenant_a/pay-run/pay")',
  `when { context.tool == Tool::"tenant_a/acme.create_payment@1" && ["${FPA}", "${FPB}"].contains(context.node_fingerprint) };`,
].join("\n");

const G1_TENANT_B_TEXT = G1_TEXT.replace(
  'Tool::"tenant_a/acme.lookup_vendor@1"',
  'Tool::"tenant_b/acme.lookup_vendor@1"',
);

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

function expectInvalid(run: () => unknown, details: Record<string, string>): void {
  assert.throws(run, (error: unknown) => {
    const actual = error as { code?: unknown; details?: unknown };
    assert.equal(actual.code, "GRANTS_INVALID");
    assert.deepEqual(actual.details, details);
    return true;
  });
}

function expectCompiles(run: () => PolicySource | null): PolicySource | null {
  let result: PolicySource | null | undefined;
  assert.doesNotThrow(() => {
    result = run();
  }, "compileGrant");
  assert.ok(result !== undefined, "compileGrant returned no result");
  assert.ok(result !== null, "compileGrant refused a value it should write");
  return result;
}

test("C-a72e1359: compileGrants sorts by id and writes the listed policy text", () => {
  let sources: PolicySource[] | undefined;
  assert.doesNotThrow(() => {
    sources = compileGrants("tenant_a", [G4, G2, G1, G3], ARGT);
  }, "compileGrants");
  assert.ok(sources !== undefined, "compileGrants returned no result");
  assert.deepEqual(
    sources.map((source) => source.id),
    ["grants/grant_1", "grants/grant_2", "grants/grant_3"],
  );
  assert.deepEqual(
    sources.map((source) => source.layer),
    ["tenant", "tenant", "tenant"],
  );
  assert.equal(sources[0]?.text, G1_TEXT, "grant_1 text");
  assert.equal(sources[1]?.text, G2_TEXT, "grant_2 text");
  assert.equal(sources[2]?.text, G3_TEXT, "grant_3 text");
  for (const source of sources) assert.ok(!source.text.endsWith("\n"), `${source.id} has a final newline`);
});

test("C-a72e1359: compileGrant covers revoked, empty, tenant scoping, g5 and g6", () => {
  let revoked: PolicySource | null | undefined;
  assert.doesNotThrow(() => {
    revoked = compileGrant("tenant_a", G4, ARGT);
  }, "compileGrant on g4");
  assert.equal(revoked, null, "a revoked grant compiles to a policy");

  let empty: PolicySource[] | undefined;
  assert.doesNotThrow(() => {
    empty = compileGrants("tenant_a", [], ARGT);
  }, "compileGrants on an empty list");
  assert.deepEqual(empty, [], "the empty list compiles to policies");

  let tenantB: PolicySource | null | undefined;
  assert.doesNotThrow(() => {
    tenantB = compileGrant("tenant_b", G1, ARGT);
  }, "compileGrant for tenant_b");
  assert.equal(tenantB?.text, G1_TENANT_B_TEXT, "the tenant_b text");

  const g5 = expectCompiles(() => compileGrant("tenant_a", G5, G5_TYPES));
  assert.equal(g5?.text, G5_TEXT, "grant_5 text");

  const g6 = expectCompiles(() => compileGrant("tenant_a", G6, ARGT));
  assert.equal(g6?.text, G6_TEXT, "grant_6 text");
});

test("C-26e11940: identifier refusals name the field and boundaries split", () => {
  expectInvalid(() => compileGrant('tenant"a', G1, ARGT), {
    reason: "identifier",
    field: "tenant",
  });
  expectInvalid(() => compileGrant("tenant_a", grant({ subject: { kind: "role", role: 'a"b' } }), ARGT), {
    reason: "identifier",
    field: "role",
  });
  expectInvalid(() => compileGrant("tenant_a", grant({ subject: { kind: "user", userId: "a/b" } }), ARGT), {
    reason: "identifier",
    field: "user",
  });
  expectInvalid(
    () => compileGrant("tenant_a", grant({ tool: 'x@1" || true' }), ARGT),
    { reason: "identifier", field: "tool" },
  );
  expectInvalid(
    () =>
      compileGrant(
        "tenant_a",
        nodeGrant({ scope: { kind: "node", flowId: "Pay", nodeId: "pay" } }),
        ARGT,
      ),
    { reason: "identifier", field: "flow" },
  );
  expectInvalid(
    () =>
      compileGrant(
        "tenant_a",
        nodeGrant({ scope: { kind: "node", flowId: "pay-run", nodeId: "a-b" } }),
        ARGT,
      ),
    { reason: "identifier", field: "node" },
  );
  expectInvalid(
    () => compileGrant("tenant_a", nodeGrant({ fingerprints: ["nf1_aa"] }), ARGT),
    { reason: "identifier", field: "fingerprint" },
  );
  expectInvalid(() => compileGrant("tenant_a", grant({ id: 'grant_1") permit' }), ARGT), {
    reason: "identifier",
    field: "id",
  });
  expectInvalid(
    () => compileGrant("tenant_a", grant({ args: [constraint("A b", "eq", "x")] }), ARGT),
    { reason: "identifier", field: "arg" },
  );

  expectInvalid(() => compileGrant("tenant_a", grant({ subject: { kind: "role", role: "a".repeat(33) } }), ARGT), {
    reason: "identifier",
    field: "role",
  });
  expectCompiles(() =>
    compileGrant("tenant_a", grant({ subject: { kind: "role", role: "a".repeat(32) } }), ARGT),
  );

  expectInvalid(() => compileGrant("tenant_a", grant({ subject: { kind: "user", userId: "a".repeat(65) } }), ARGT), {
    reason: "identifier",
    field: "user",
  });
  expectCompiles(() =>
    compileGrant("tenant_a", grant({ subject: { kind: "user", userId: "a".repeat(64) } }), ARGT),
  );

  for (const flowId of ["a--b", "a-", "a".repeat(65)]) {
    expectInvalid(
      () => compileGrant("tenant_a", nodeGrant({ scope: { kind: "node", flowId, nodeId: "pay" } }), ARGT),
      { reason: "identifier", field: "flow" },
    );
  }
  expectCompiles(() =>
    compileGrant(
      "tenant_a",
      nodeGrant({ scope: { kind: "node", flowId: "a-b1", nodeId: "pay" } }),
      ARGT,
    ),
  );

  for (const nodeId of ["Ab", "1a"]) {
    expectInvalid(
      () => compileGrant("tenant_a", nodeGrant({ scope: { kind: "node", flowId: "pay-run", nodeId } }), ARGT),
      { reason: "identifier", field: "node" },
    );
  }
  expectCompiles(() =>
    compileGrant(
      "tenant_a",
      nodeGrant({ scope: { kind: "node", flowId: "pay-run", nodeId: "a_1" } }),
      ARGT,
    ),
  );

  for (const name of ["Ab", "a".repeat(65)]) {
    expectInvalid(
      () => compileGrant("tenant_a", grant({ args: [constraint(name, "eq", "x")] }), ARGT),
      { reason: "identifier", field: "arg" },
    );
  }
  expectCompiles(() =>
    compileGrant("tenant_a", grant({ args: [constraint("a".repeat(64), "eq", "x")] }), ARGT),
  );

  expectInvalid(() => compileGrant("a".repeat(65), G1, ARGT), {
    reason: "identifier",
    field: "tenant",
  });
  expectCompiles(() => compileGrant("a".repeat(64), G1, ARGT));

  for (const tool of ["A@1", "x@01", "x@1234567890"]) {
    expectInvalid(() => compileGrant("tenant_a", grant({ tool }), ARGT), {
      reason: "identifier",
      field: "tool",
    });
  }
  for (const tool of ["x@0", "x@123456789"]) {
    expectCompiles(() => compileGrant("tenant_a", grant({ tool }), ARGT));
  }
});

test("C-26e11940: value refusals refuse unwritable text, types, ranges and precision", () => {
  expectInvalid(
    () => compileGrant("tenant_a", nodeGrant({ fingerprints: [] }), ARGT),
    { reason: "no_fingerprint" },
  );

  for (const value of ['a"b', "a\\b", "x".repeat(257), "é", "a\t"]) {
    expectInvalid(
      () => compileGrant("tenant_a", grant({ args: [constraint("limit", "eq", value)] }), ARGT),
      { reason: "value_invalid" },
    );
  }
  expectCompiles(() =>
    compileGrant("tenant_a", grant({ args: [constraint("limit", "eq", "x".repeat(256))] }), ARGT),
  );

  expectInvalid(
    () => compileGrant("tenant_a", grant({ args: [constraint("limit", "lte", "x")] }), ARGT),
    { reason: "arg_type" },
  );
  expectInvalid(
    () => compileGrant("tenant_a", grant({ args: [constraint("limit", "eq", {})] }), ARGT),
    { reason: "arg_type" },
  );

  for (const [argName, value] of [
    ["amount", 1e15],
    ["limit", 2 ** 53],
    ["limit", Number.NaN],
  ] as const) {
    expectInvalid(
      () => compileGrant("tenant_a", grant({ args: [constraint(argName, "lte", value)] }), ARGT),
      { reason: "number_range" },
    );
  }

  expectInvalid(
    () => compileGrant("tenant_a", grant({ args: [constraint("amount", "lte", 1.00001)] }), ARGT),
    { reason: "decimal_precision" },
  );
});

test("C-26e11940: mistyped g2 texts compile but the strict validator refuses them", async () => {
  const variants: [string, Readonly<Record<string, ToolArgType>>][] = [
    [
      "without vendor_name",
      {
        amount: "decimal",
        currency: "String",
        exact: "Bool",
        limit: "Long",
        tags: "Set<String>",
        vendor_id: "String",
      },
    ],
    ["vendor_name as Set String", { ...ARGT, vendor_name: "Set<String>" }],
    ["limit as String", { ...ARGT, limit: "String" }],
  ];

  for (const [label, types] of variants) {
    let source: PolicySource | null | undefined;
    assert.doesNotThrow(() => {
      source = compileGrant("tenant_a", G2, types);
    }, `compileGrant ${label}`);
    assert.ok(source !== null && source !== undefined, `no compiled policy ${label}`);
    const compiled = source;
    await assert.rejects(
      createPolicyEngine({
        srcDir: defaultSrcDir(),
        tenantPolicies: [compiled],
        toolArgs: types,
        clock: fixedClock("2026-11-06T09:00:00.000Z"),
        ids: sequentialIds(),
        logger: silentLogger(),
      }),
      { code: "PDP_POLICY_INVALID", details: { stage: "validate", ids: ["grant_2"] } },
      `strict validation ${label}`,
    );
  }
});
