import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import {
  createPolicyEngine,
  defaultSrcDir,
  entityRef,
  toDecimal,
  userEntity,
  type Entity,
  type PolicyEngine,
  type PolicyRequest,
  type PolicySource,
  type PrincipalEntity,
  type ToolArgType,
} from "../pdp/index.ts";
import {
  compileGrant,
  compileGrants,
  type ArgConstraint,
  type GrantRecord,
} from "./index.ts";

const T = "tenant_a";
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

const L = "acme.lookup_vendor@1";
const P = "acme.create_payment@1";

const BASE: GrantRecord = {
  id: "grant_1",
  subject: { kind: "role", role: "author" },
  tool: L,
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
const G3 = grant({
  id: "grant_3",
  tool: P,
  scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
  fingerprints: [FPA],
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

const tempDirs: string[] = [];

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

function engineWith(
  sources: readonly PolicySource[],
  types: Readonly<Record<string, ToolArgType>>,
  srcDir: string,
): Promise<PolicyEngine> {
  return createPolicyEngine({
    srcDir,
    tenantPolicies: sources,
    toolArgs: types,
    clock: fixedClock("2026-11-06T09:00:00.000Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  });
}

function invoke(
  user: string,
  roles: readonly string[],
  node: string,
  tool: string,
  effect: string,
  fingerprint: string,
  args: Record<string, unknown>,
  toolId = `${T}/${tool}`,
): PolicyRequest {
  const principal: PrincipalEntity = { tenantId: T, userId: user, kind: "human", roles, teams: [] };
  const userEntityValue = userEntity(principal);
  const teamId = `${T}/ops`;
  const flowId = `${T}/pay-run`;
  const flowEntity: Entity = {
    uid: { type: "Flow", id: flowId },
    attrs: { tenant: T, owner_team: entityRef("Team", teamId), reviewed: false },
    parents: [],
  };
  const teamEntity: Entity = {
    uid: { type: "Team", id: teamId },
    attrs: { tenant: T },
    parents: [],
  };
  const blockEntity: Entity = {
    uid: { type: "Block", id: `${T}/pay-run/${node}` },
    attrs: { tenant: T, kind: "block", flow: entityRef("Flow", flowId) },
    parents: [],
  };
  const toolTenant = toolId.includes("/") ? toolId.slice(0, toolId.indexOf("/")) : T;
  const toolEntity: Entity = {
    uid: { type: "Tool", id: toolId },
    attrs: { tenant: toolTenant, effect },
    parents: [],
  };
  return {
    principal: userEntityValue.uid,
    action: "invoke_tool",
    resource: blockEntity.uid,
    context: {
      tool: entityRef("Tool", toolId),
      args,
      taint: [],
      run_initiator: entityRef("User", `${T}/${user}`),
      sod_excluded: [],
      approvals: [],
      approvers_by_role: {},
      node_fingerprint: fingerprint,
    },
    entities: [userEntityValue, teamEntity, flowEntity, blockEntity, toolEntity],
  };
}

interface Outcome {
  decision: "allow" | "deny";
  reasons: readonly string[];
}

async function decide(engine: PolicyEngine, request: PolicyRequest): Promise<Outcome> {
  const decision = await engine.check(request);
  assert.deepEqual(decision.errors, [], "the engine reported errors");
  return { decision: decision.decision, reasons: decision.reasons };
}

after(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-dd923c21: compiled grants decide like the grant says", async () => {
  let sources: PolicySource[] | undefined;
  assert.doesNotThrow(() => {
    sources = compileGrants(T, [G4, G2, G1, G3], ARGT);
  }, "compileGrants");
  assert.ok(sources !== undefined, "compileGrants returned no result");
  const compiled = sources;

  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await engineWith(compiled, ARGT, defaultSrcDir());
  }, "createPolicyEngine");
  assert.ok(engine !== undefined, "no engine");
  const pdp = engine;

  assert.deepEqual(
    pdp.policies.filter((policy) => policy.layer === "tenant").map((policy) => policy.id),
    ["grant_1", "grant_2", "grant_3"],
    "the tenant policies are not grant_1 to grant_3",
  );

  const row1 = await decide(pdp, invoke("alice", ["author"], "lookup", L, "read", "", {}));
  assert.deepEqual(row1, { decision: "allow", reasons: ["grant_1"] }, "row 1");

  const row2 = await decide(pdp, invoke("bob", ["approver"], "lookup", L, "read", "", {}));
  assert.deepEqual(row2, { decision: "deny", reasons: [] }, "row 2");

  const bobArgs = { vendor_name: "Acme", limit: 50, exact: true };
  const row3 = await decide(pdp, invoke("bob", ["approver"], "lookup", L, "read", "", bobArgs));
  assert.deepEqual(row3, { decision: "allow", reasons: ["grant_2"] }, "row 3");

  const row4 = await decide(
    pdp,
    invoke("bob", ["approver"], "lookup", L, "read", "", { ...bobArgs, limit: 51 }),
  );
  assert.equal(row4.decision, "deny", "row 4");

  const paid = () => invoke("alice", ["author"], "pay", P, "pay", FPA, { amount: toDecimal(1000.5) });
  const row5 = await decide(pdp, paid());
  assert.deepEqual(row5, { decision: "allow", reasons: ["grant_3"] }, "row 5");

  const row6a = await decide(
    pdp,
    invoke("alice", ["author"], "pay", P, "pay", FPA, { amount: toDecimal(1000.5001) }),
  );
  assert.equal(row6a.decision, "deny", "row 6 (1000.5001)");

  const row6b = await decide(
    pdp,
    invoke("alice", ["author"], "pay", P, "pay", FPA, { amount: toDecimal(9.9999) }),
  );
  assert.equal(row6b.decision, "deny", "row 6 (9.9999)");

  const row7 = await decide(
    pdp,
    invoke("alice", ["author"], "pay", P, "pay", FPB, { amount: toDecimal(10) }),
  );
  assert.equal(row7.decision, "deny", "row 7");

  const row8 = await decide(
    pdp,
    invoke("alice", ["author"], "pay2", P, "pay", FPA, { amount: toDecimal(10) }),
  );
  assert.equal(row8.decision, "deny", "row 8");

  const row9 = await decide(pdp, invoke("alice", ["author"], "pay", P, "pay", FPA, {}));
  assert.equal(row9.decision, "deny", "row 9");

  const row10 = await decide(
    pdp,
    invoke("dan", ["auditor"], "lookup", L, "read", "", { limit: 5 }),
  );
  assert.deepEqual(row10, { decision: "deny", reasons: [] }, "row 10");

  const row11 = await decide(
    pdp,
    invoke(
      "alice",
      ["author"],
      "lookup",
      L,
      "read",
      "",
      {},
      "tenant_b/acme.lookup_vendor@1",
    ),
  );
  assert.deepEqual(row11, { decision: "deny", reasons: [] }, "row 11");
});

test("C-dd923c21: g5 alone decides its three requests", async () => {
  let source: PolicySource | null | undefined;
  assert.doesNotThrow(() => {
    source = compileGrant(T, G5, G5_TYPES);
  }, "compileGrant on g5");
  assert.ok(source !== null && source !== undefined, "no compiled g5 policy");
  const compiled = source;

  const srcDir = await mkdtemp(join(tmpdir(), "grants-engine-"));
  tempDirs.push(srcDir);
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await engineWith([compiled], G5_TYPES, srcDir);
  }, "createPolicyEngine for g5");
  assert.ok(engine !== undefined, "no engine");
  const pdp = engine;

  const allowed = await decide(
    pdp,
    invoke("alice", ["author"], "lookup", L, "read", "", {
      limit: -2,
      in: "x y",
      exact: false,
      url: "https://a.test/x",
    }),
  );
  assert.deepEqual(allowed, { decision: "allow", reasons: ["grant_5"] }, "g5 allows");

  const low = await decide(
    pdp,
    invoke("alice", ["author"], "lookup", L, "read", "", {
      limit: -4,
      in: "x y",
      exact: false,
      url: "https://a.test/x",
    }),
  );
  assert.equal(low.decision, "deny", "g5 denies limit -4");

  const exact = await decide(
    pdp,
    invoke("alice", ["author"], "lookup", L, "read", "", {
      limit: -2,
      in: "x y",
      exact: true,
      url: "https://a.test/x",
    }),
  );
  assert.equal(exact.decision, "deny", "g5 denies exact true");
});
