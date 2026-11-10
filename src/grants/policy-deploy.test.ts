import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { listAuditEvents } from "../audit/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { entityRef, toDecimal, userEntity } from "../pdp/index.ts";
import type { Decision, Entity, PolicyRequest, PrincipalEntity } from "../pdp/index.ts";
import { importCatalogue } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { createPolicyRuntime } from "./policy-runtime.ts";
import type { PolicyRuntime } from "./policy-runtime.ts";
import { currentPolicySet, deployPolicySet, PolicyDeployError, validatePolicySet } from "./policy-sets.ts";
import type { PolicySetRecord } from "./policy-sets.ts";

const T = "tenant_a";
const CLOCK = fixedClock("2026-11-06T09:00:00.000Z");
const LATER = "2026-11-06T10:00:00.000Z";
const LATER2 = "2026-11-06T11:00:00.000Z";
const AT = "2026-11-06T09:00:00.000000Z";
const AT2 = "2026-11-06T10:00:00.000000Z";
const AT3 = "2026-11-06T11:00:00.000000Z";
const VBASE = "599ac6e140250949aa9104d2e02c0da35508a8ec6227aa6cd452187caf2efdd8";
const CAROL = { kind: "user", id: "carol" } as const;
const FP1 = "nf1_" + "a1".repeat(32);
const FP2 = "nf1_" + "b2".repeat(32);

function G(n: number): string {
  return "grant_00000000-0000-7000-8000-" + n.toString(16).padStart(12, "0");
}

const ACME = {
  "acme.lookup_vendor@1": {
    effect: "read",
    input: {
      type: "object",
      properties: {
        vendor_name: { type: "string" },
        limit: { type: "integer" },
        exact: { type: "boolean" },
        tags: { type: "array", items: { type: "string" } },
      },
    },
    output: { type: "object" },
  },
  "acme.create_payment@1": {
    effect: "pay",
    input: {
      type: "object",
      properties: {
        vendor_id: { type: "string" },
        amount: { type: "number" },
        currency: { type: "string" },
      },
    },
    output: { type: "object" },
  },
};
const ARGT = {
  amount: "decimal",
  currency: "String",
  exact: "Bool",
  limit: "Long",
  tags: "Set<String>",
  vendor_id: "String",
  vendor_name: "String",
};
const MEMO = {
  "acme.memo@1": {
    effect: "read",
    input: { type: "object", properties: { memo: { type: "string" } } },
    output: { type: "object" },
  },
};

const SRC_R = `@id("t-a-read-all")\npermit (principal, action == Action::"invoke_tool", resource is Block)\nwhen { context.tool.effect == "read" };\n`;
const SRC_A1 =
  SRC_R +
  `\n@id("t-pay-needs-approval")\nforbid (principal, action == Action::"invoke_tool", resource)\nwhen { context.tool == Tool::"tenant_a/acme.create_payment@1" && context.args has "amount" && context.args["amount"].greaterThan(decimal("1000.0000")) && !(context.approvers_by_role has "approver" && !context.approvers_by_role.approver.isEmpty()) };\n`;
const READ_SELF = (id: string): string =>
  `@id("${id}")\npermit (principal, action == Action::"read_self", resource);\n`;

const tempDirs: string[] = [];

after(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

interface Fixture {
  db: TestDatabase;
  t: TenantContext;
  u: TenantContext;
  srcDir: string;
}

async function withFixture(
  options: { grants?: boolean; blocks?: object },
  run: (f: Fixture) => Promise<void>,
): Promise<void> {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const srcDir = await mkdtemp(join(tmpdir(), "policy-deploy-"));
    tempDirs.push(srcDir);
    const f: Fixture = { db, t: a, u: b, srcDir };
    await importCatalogue(db.appPool, a, (options.blocks ?? ACME) as never, CAROL, { clock: CLOCK });
    if (options.grants !== false) {
      await seedGrant(f, { id: G(0), role: "author", tool: "acme.lookup_vendor@1" });
      await seedGrant(f, {
        id: G(1),
        user: "bob",
        tool: "acme.lookup_vendor@1",
        args: [{ arg: "limit", op: "lte", value: 50 }],
      });
      await seedGrant(f, {
        id: G(2),
        role: "author",
        tool: "acme.create_payment@1",
        node: true,
        args: [{ arg: "amount", op: "lte", value: 2000 }],
      });
    }
    await run(f);
  } finally {
    await db.close();
  }
}

function makeRuntime(f: Fixture, pool: TenantPool): Promise<PolicyRuntime> {
  return createPolicyRuntime({
    pool,
    srcDir: f.srcDir,
    clock: CLOCK,
    ids: sequentialIds(1000),
    logger: createLogger({
      level: "silent",
      destination: {
        write(_line: string): void {},
      },
    }),
  });
}

interface SeedGrant {
  id: string;
  role?: string;
  user?: string;
  tool: string;
  node?: boolean;
  args?: unknown[];
}

async function seedGrant(f: Fixture, g: SeedGrant): Promise<void> {
  await withTenantTx(f.db.appPool, f.t, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare."grant"
         (tenant_id, grant_id, subject_kind, subject_id, tool, scope_kind, flow_id, node_id,
          args, fingerprints, state, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::text[], 'active', 'carol',
               '2026-11-06T09:00:00Z')`,
      [
        T,
        g.id,
        g.user !== undefined ? "user" : "role",
        g.user ?? g.role ?? "author",
        g.tool,
        g.node === true ? "node" : "any_step",
        g.node === true ? "pay-run" : null,
        g.node === true ? "pay" : null,
        JSON.stringify(g.args ?? []),
        g.node === true ? [FP1] : [],
      ],
    );
  });
}

async function revoke(f: Fixture, id: string): Promise<void> {
  await withTenantTx(f.db.appPool, f.t, async (tx) => {
    await tx.query(
      `UPDATE ursitoare."grant" SET state = 'revoked', revoked_by = 'carol',
              revoked_at = '2026-11-06T09:30:00Z' WHERE grant_id = $1`,
      [id],
    );
  });
}

function request(tool: string, effect: string, node: string, fp: string, args: Record<string, unknown>, approved: boolean): PolicyRequest {
  const principal: PrincipalEntity = {
    tenantId: T,
    userId: "alice",
    kind: "human",
    roles: ["author"],
    teams: [],
  };
  const user = userEntity(principal);
  const flowId = `${T}/pay-run`;
  const teamId = `${T}/ops`;
  const entities: Entity[] = [
    user,
    { uid: { type: "Team", id: teamId }, attrs: { tenant: T }, parents: [] },
    {
      uid: { type: "Flow", id: flowId },
      attrs: { tenant: T, owner_team: entityRef("Team", teamId), reviewed: false },
      parents: [],
    },
    {
      uid: { type: "Block", id: `${T}/pay-run/${node}` },
      attrs: { tenant: T, kind: "block", flow: entityRef("Flow", flowId) },
      parents: [],
    },
    { uid: { type: "Tool", id: `${T}/${tool}` }, attrs: { tenant: T, effect }, parents: [] },
  ];
  return {
    principal: user.uid,
    action: "invoke_tool",
    resource: { type: "Block", id: `${T}/pay-run/${node}` },
    context: {
      tool: entityRef("Tool", `${T}/${tool}`),
      args,
      taint: [],
      run_initiator: entityRef("User", `${T}/alice`),
      sod_excluded: [],
      approvals: [],
      approvers_by_role: approved ? { approver: [entityRef("User", `${T}/bob`)] } : {},
      node_fingerprint: fp,
    },
    entities,
  };
}

const L = (): PolicyRequest => request("acme.lookup_vendor@1", "read", "lookup", "", {}, false);
const P = (amount: number, fp: string, approved = false): PolicyRequest =>
  request("acme.create_payment@1", "pay", "pay", fp, { amount: toDecimal(amount) }, approved);

function dec(d: Decision): readonly unknown[] {
  return [d.decision, d.reasons, d.errors, d.policySetVersion];
}

async function deploy(
  rt: PolicyRuntime,
  pool: TenantPool,
  ctx: TenantContext,
  source: string,
  actor: { kind: "user" | "service" | "system"; id: string } = CAROL,
  opts?: { clock?: Clock },
): Promise<PolicySetRecord> {
  let record: PolicySetRecord | undefined;
  await assert.doesNotReject(async () => {
    record = await deployPolicySet(rt, pool, ctx, source, actor, opts);
  }, "deployPolicySet resolves");
  assert.ok(record !== undefined, "deployPolicySet returns a record");
  return record;
}

async function versionOf(rt: PolicyRuntime, f: Fixture, source: string): Promise<string> {
  const v = await validatePolicySet(rt, f.db.appPool, f.t, source);
  assert.equal(v.ok, true, "the source validates");
  return String(v.policySetVersion);
}

interface Row {
  deploy_seq: number;
  version: string;
  current: boolean;
  deployed_at: string;
}

async function rows(f: Fixture): Promise<Row[]> {
  const result = await f.db.ownerPool.query<Row>(
    `SELECT deploy_seq::int AS deploy_seq, version, current,
            to_char(deployed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS deployed_at
       FROM ursitoare.policy_set WHERE tenant_id = 'tenant_a' ORDER BY deploy_seq`,
  );
  return result.rows;
}

async function events(f: Fixture): Promise<number> {
  const list = await listAuditEvents(f.db.appPool, f.t, {
    filter: { eventType: "policy.deployed" },
    order: "asc",
    limit: 50,
  });
  return list.length;
}

test("C-69aa2085: a deploy stores, audits and swaps the tenant's engine", async () => {
  await withFixture({}, async (f) => {
    const rt = await makeRuntime(f, f.db.appPool);
    const requests: [string, PolicyRequest][] = [
      ["L", L()],
      ["P1000", P(1000, FP1)],
      ["P1500", P(1500, FP1)],
      ["P1500 approved", P(1500, FP1, true)],
      ["P1000 FP2", P(1000, FP2)],
    ];
    for (const [name, r] of requests) {
      assert.deepEqual(dec(await rt.engine.check(r)), ["deny", [], [], VBASE], `before: ${name}`);
    }
    assert.deepEqual(await rt.toolArgs(T), {});

    const v1 = await versionOf(rt, f, SRC_A1);
    const r1 = await deploy(rt, f.db.appPool, f.t, SRC_A1);
    const expected = {
      tenantId: T,
      version: v1,
      source: SRC_A1,
      grantIds: [G(0), G(1), G(2)],
      deployedBy: "carol",
      deployedAt: AT,
    };
    assert.deepEqual(r1, expected, "the record");
    assert.deepEqual(await currentPolicySet(f.db.appPool, f.t), expected, "currentPolicySet");
    assert.equal(await currentPolicySet(f.db.appPool, f.u), null, "no set for the other tenant");

    const stored = await f.db.ownerPool.query<{
      current: boolean;
      grant_ids: string[];
      tool_args: unknown;
      tenant_sources: { id: string }[];
    }>(
      "SELECT current, grant_ids, tool_args, tenant_sources FROM ursitoare.policy_set WHERE tenant_id = 'tenant_a'",
    );
    assert.equal(stored.rows.length, 1, "one row");
    assert.equal(stored.rows[0]?.current, true);
    assert.deepEqual(stored.rows[0]?.tool_args, ARGT);
    assert.deepEqual(
      stored.rows[0]?.tenant_sources.map((s) => s.id),
      [`grants/${G(0)}`, `grants/${G(1)}`, `grants/${G(2)}`, "tenant/source"],
    );

    const audit = await listAuditEvents(f.db.appPool, f.t, {
      filter: { eventType: "policy.deployed" },
      order: "asc",
      limit: 10,
    });
    assert.equal(audit.length, 1, "one audit event");
    assert.deepEqual(audit[0]?.actor, { kind: "user", id: "carol" });
    assert.deepEqual(audit[0]?.target, { kind: "policy_set", id: v1 });
    assert.deepEqual(audit[0]?.payload, { version: v1, grantIds: [G(0), G(1), G(2)] });
    assert.equal(audit[0]?.at, AT);

    assert.deepEqual(await rt.toolArgs(T), ARGT, "toolArgs after");
    assert.equal(rt.engine.policySetVersion, VBASE, "the base engine stays");
    const after: [PolicyRequest, unknown[]][] = [
      [L(), ["allow", [G(0), "t-a-read-all"], [], v1]],
      [P(1000, FP1), ["allow", [G(2)], [], v1]],
      [P(1500, FP1), ["deny", ["t-pay-needs-approval"], [], v1]],
      [P(1500, FP1, true), ["allow", [G(2)], [], v1]],
      [P(1000, FP2), ["deny", [], [], v1]],
    ];
    for (const [r, want] of after) {
      assert.deepEqual(dec(await rt.engine.check(r)), want);
    }
  });
});

test("C-29fb3606: a repeat, an invalid source and a failing store leave the store as it was", async () => {
  await withFixture({}, async (f) => {
    const rt = await makeRuntime(f, f.db.appPool);
    const r1 = await deploy(rt, f.db.appPool, f.t, SRC_A1);

    const repeat = await deploy(rt, f.db.appPool, f.t, SRC_A1, CAROL, { clock: fixedClock(LATER) });
    assert.deepEqual(repeat, r1, "the repeat is the stored record");
    assert.equal((await rows(f)).length, 1);
    assert.equal(await events(f), 1);

    await assert.rejects(
      deployPolicySet(rt, f.db.appPool, f.t, READ_SELF("platform-read-self"), CAROL),
      (error: unknown) => {
        assert.ok(error instanceof PolicyDeployError);
        assert.equal(error.code, "POLICY_INVALID");
        assert.deepEqual(error.problems, [{ stage: "policy", ids: ["platform-read-self"], message: "" }]);
        return true;
      },
    );
    await assert.rejects(
      deployPolicySet(rt, f.db.appPool, f.t, "permit (principal", CAROL),
      (error: unknown) => {
        assert.ok(error instanceof PolicyDeployError);
        assert.deepEqual(error.problems, [
          { stage: "parse", ids: ["tenant/source"], message: "unexpected end of input" },
        ]);
        return true;
      },
    );
    assert.equal((await rows(f)).length, 1);
    assert.equal(await events(f), 1);
    assert.equal((await rt.engine.check(L())).policySetVersion, r1.version);

    const failing = {
      async connect(): Promise<never> {
        throw new Error("store down");
      },
    } as unknown as TenantPool;
    await assert.rejects(deployPolicySet(rt, failing, f.t, "", CAROL), { message: "store down" });
    await assert.rejects(validatePolicySet(rt, failing, f.t, ""), { message: "store down" });
    await assert.rejects(
      deployPolicySet(rt, f.db.appPool, f.t, "", { kind: "user", id: "car\u0001ol" }),
      (error: unknown) => {
        const e = error as { code?: string; details?: unknown };
        assert.equal(e.code, "AUDIT_EVENT_INVALID");
        assert.deepEqual(e.details, { reason: "bad_actor" });
        return true;
      },
    );
    assert.equal((await rows(f)).length, 1);
    assert.equal(await events(f), 1);
    assert.equal((await currentPolicySet(f.db.appPool, f.t))?.version, r1.version);
  });
});

test("C-29fb3606: an older version and the same version again insert new rows", async () => {
  await withFixture({}, async (f) => {
    const rt = await makeRuntime(f, f.db.appPool);
    const r1 = await deploy(rt, f.db.appPool, f.t, SRC_A1);
    const r2 = await deploy(rt, f.db.appPool, f.t, "", CAROL, { clock: fixedClock(LATER) });
    assert.equal(r2.source, "");
    assert.match(r2.version, /^[0-9a-f]{64}$/);
    assert.notEqual(r2.version, r1.version);
    assert.equal(r2.deployedAt, AT2);
    assert.deepEqual(r2.grantIds, r1.grantIds);
    assert.deepEqual(
      (await rows(f)).map((r) => [r.deploy_seq, r.version, r.current]),
      [
        [1, r1.version, false],
        [2, r2.version, true],
      ],
    );
    assert.equal(await events(f), 2);
    assert.deepEqual(dec(await rt.engine.check(L())), ["allow", [G(0)], [], r2.version]);

    const r3 = await deploy(rt, f.db.appPool, f.t, SRC_A1, CAROL, { clock: fixedClock(LATER2) });
    assert.equal(r3.version, r1.version);
    assert.equal(r3.deployedAt, AT3);
    assert.deepEqual(
      (await rows(f)).map((r) => [r.deploy_seq, r.version, r.current]),
      [
        [1, r1.version, false],
        [2, r2.version, false],
        [3, r1.version, true],
      ],
    );
    assert.equal(await events(f), 3);
    assert.deepEqual(dec(await rt.engine.check(L())), ["allow", [G(0), "t-a-read-all"], [], r1.version]);
  });
});

test("C-29fb3606: A, B, A at one instant give deploy_seq 1, 2, 3 with A current", async () => {
  await withFixture({ grants: false }, async (f) => {
    const rt = await makeRuntime(f, f.db.appPool);
    const clock = fixedClock(LATER);
    const va = await versionOf(rt, f, "");
    const vb = await versionOf(rt, f, SRC_R);
    const a1 = await deploy(rt, f.db.appPool, f.t, "", CAROL, { clock });
    const b = await deploy(rt, f.db.appPool, f.t, SRC_R, CAROL, { clock });
    const a2 = await deploy(rt, f.db.appPool, f.t, "", CAROL, { clock });
    assert.equal(a1.deployedAt, AT2);
    assert.equal(b.deployedAt, AT2);
    assert.equal(a2.deployedAt, AT2);
    assert.equal(a2.version, va);
    assert.deepEqual(
      (await rows(f)).map((r) => [r.deploy_seq, r.version, r.current, r.deployed_at]),
      [
        [1, va, false, "2026-11-06T10:00:00.000Z"],
        [2, vb, false, "2026-11-06T10:00:00.000Z"],
        [3, va, true, "2026-11-06T10:00:00.000Z"],
      ],
    );
    assert.equal(await events(f), 3);
    assert.equal((await currentPolicySet(f.db.appPool, f.t))?.version, va);
    await deploy(rt, f.db.appPool, f.t, "", CAROL, { clock });
    assert.equal((await rows(f)).length, 3, "a fourth A writes nothing");
  });
});

test("C-29fb3606: two concurrent deploys leave one current row, the highest", async () => {
  await withFixture({}, async (f) => {
    const rt = await makeRuntime(f, f.db.appPool);
    await deploy(rt, f.db.appPool, f.t, SRC_A1);
    const c1 = READ_SELF("c-1");
    const c2 = READ_SELF("c-2");
    const v1 = await versionOf(rt, f, c1);
    const v2 = await versionOf(rt, f, c2);
    let results: PolicySetRecord[] = [];
    await assert.doesNotReject(async () => {
      results = await Promise.all([
        deployPolicySet(rt, f.db.appPool, f.t, c1, CAROL, { clock: fixedClock("2026-11-06T12:00:00.000Z") }),
        deployPolicySet(rt, f.db.appPool, f.t, c2, CAROL, { clock: fixedClock("2026-11-06T12:00:01.000Z") }),
      ]);
    });
    assert.deepEqual(results.map((r) => r.version), [v1, v2], "each result carries its own version");
    const all = await rows(f);
    assert.deepEqual(all.map((r) => r.deploy_seq), [1, 2, 3]);
    assert.deepEqual(all.filter((r) => r.current).map((r) => r.deploy_seq), [3]);
    const current = await currentPolicySet(f.db.appPool, f.t);
    assert.ok(current !== null && [v1, v2].includes(current.version));
    assert.equal((await rt.engine.check(L())).policySetVersion, current.version);
  });
});

test("C-29fb3606: a failing reload rejects, keeps the row and the next check allows", async () => {
  await withFixture({}, async (f) => {
    const state = { down: false };
    const flaky = {
      async connect() {
        if (state.down) throw new Error("store down");
        return f.db.appPool.connect();
      },
    } as unknown as TenantPool;
    const rf = await makeRuntime(f, flaky);
    state.down = true;
    // the deploy itself uses the healthy pool; only the runtime's reload meets the failing store
    await assert.rejects(deployPolicySet(rf, f.db.appPool, f.t, "", CAROL), { message: "store down" });
    const current = await currentPolicySet(f.db.appPool, f.t);
    assert.deepEqual(current?.grantIds, [G(0), G(1), G(2)]);
    assert.equal(await events(f), 1, "the event stays");
    state.down = false;
    assert.deepEqual(dec(await rf.engine.check(L())), ["allow", [G(0)], [], current?.version]);
  });
});

test("C-29fb3606: a repeat on a runtime holding an older engine reloads it", async () => {
  await withFixture({}, async (f) => {
    const ra = await makeRuntime(f, f.db.appPool);
    const rb = await makeRuntime(f, f.db.appPool);
    assert.deepEqual(dec(await rb.engine.check(L())), ["deny", [], [], VBASE]);
    const r = await deploy(ra, f.db.appPool, f.t, "");
    assert.deepEqual(dec(await rb.engine.check(L())), ["deny", [], [], VBASE], "rb is still old");
    const again = await deploy(rb, f.db.appPool, f.t, "");
    assert.deepEqual(again, r);
    assert.equal((await rows(f)).length, 1);
    assert.equal(await events(f), 1);
    assert.deepEqual(dec(await rb.engine.check(L())), ["allow", [G(0)], [], r.version]);
  });
});

test("C-29fb3606: a block that adds an argument type is a new version", async () => {
  await withFixture({ grants: false, blocks: ACME }, async (f) => {
    const rt = await makeRuntime(f, f.db.appPool);
    const first = await deploy(rt, f.db.appPool, f.t, "");
    await importCatalogue(f.db.appPool, f.t, MEMO as never, CAROL, { clock: CLOCK });
    const v = await versionOf(rt, f, "");
    assert.notEqual(v, first.version);
    const second = await deploy(rt, f.db.appPool, f.t, "", CAROL, { clock: fixedClock(LATER) });
    assert.equal(second.version, v);
    assert.equal((await rows(f)).length, 2);
    assert.equal((await rt.toolArgs(T))["memo"], "String");
  });
});

test("C-e98c4e07: a revoked grant is denied at the next check after a deploy", async () => {
  await withFixture({}, async (f) => {
    const rt = await makeRuntime(f, f.db.appPool);
    const r1 = await deploy(rt, f.db.appPool, f.t, SRC_A1);
    await revoke(f, G(0));
    assert.deepEqual(
      dec(await rt.engine.check(L())),
      ["allow", [G(0), "t-a-read-all"], [], r1.version],
      "the engine still allows by the revoked grant",
    );
    const r2 = await deploy(rt, f.db.appPool, f.t, "", CAROL, {
      clock: fixedClock("2026-11-06T13:00:00.000Z"),
    });
    assert.deepEqual(r2.grantIds, [G(1), G(2)]);
    assert.notEqual(r2.version, r1.version);
    assert.deepEqual(dec(await rt.engine.check(L())), ["deny", [], [], r2.version]);
    assert.deepEqual(dec(await rt.engine.check(P(1000, FP1))), ["allow", [G(2)], [], r2.version]);
  });
});
