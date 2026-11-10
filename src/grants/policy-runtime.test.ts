import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import {
  PLATFORM_POLICY_IDS,
  PdpError,
  entityRef,
  userEntity,
  type Decision,
  type Entity,
  type PolicyRequest,
  type PrincipalEntity,
} from "../pdp/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { createPolicyRuntime, type PolicyRuntime } from "./policy-runtime.ts";

const T = "tenant_a";
const U = "tenant_b";
const CLOCK = fixedClock("2026-11-06T09:00:00.000Z");
const VBASE = "599ac6e140250949aa9104d2e02c0da35508a8ec6227aa6cd452187caf2efdd8";
const VA = "a06b41c582ccf2e65c778e4a8964dd2f391a3aff59666018d916118044068b63";
const VB = "2a012a8532beaa8ca7ebb464290c10cbbc9ae72d3b892afb09e8b8abcde6790e";

const SRC_R = `@id("t-a-read-all")\npermit (principal, action == Action::"invoke_tool", resource is Block)\nwhen { context.tool.effect == "read" };\n`;
const SRC_S = `@id("t-b-send")\npermit (principal, action == Action::"invoke_tool", resource is Block)\nwhen { context.tool.effect == "send" };\n`;
const SRC_DUP = `@id("platform-read-self")\npermit (principal, action == Action::"read_self", resource);\n`;

const tempDirs: string[] = [];

after(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

async function emptySrcDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "policy-runtime-"));
  tempDirs.push(dir);
  return dir;
}

async function makeRuntime(pool: TenantPool | null, srcDir: string): Promise<PolicyRuntime> {
  return createPolicyRuntime({
    pool,
    srcDir,
    clock: CLOCK,
    ids: sequentialIds(1000),
    logger: silentLogger(),
  });
}

async function startedRuntime(pool: TenantPool | null, srcDir: string): Promise<PolicyRuntime> {
  let runtime: PolicyRuntime | undefined;
  await assert.doesNotReject(async () => {
    runtime = await makeRuntime(pool, srcDir);
  }, "createPolicyRuntime");
  assert.ok(runtime !== undefined, "createPolicyRuntime returns a runtime");
  return runtime;
}

interface PoolState {
  reads: string[];
  down: boolean;
}

function countingPool(inner: TenantPool, state: PoolState): TenantPool {
  const pool = {
    async connect() {
      if (state.down) throw new Error("store down");
      const client = await inner.connect();
      return {
        on(event: string, listener: () => void): void {
          client.on(event as never, listener as never);
        },
        removeListener(event: string, listener: () => void): void {
          client.removeListener(event as never, listener as never);
        },
        release(destroy?: boolean): void {
          client.release(destroy);
        },
        async query(text: string, values?: unknown[]): Promise<unknown> {
          if (state.down) throw new Error("store down");
          if (text.includes("FROM ursitoare.policy_set")) {
            state.reads.push(String(values?.[0]));
          }
          return client.query(text, values as never);
        },
      };
    },
  };
  return pool as unknown as TenantPool;
}

async function seedSet(
  pool: TenantPool,
  ctx: TenantContext,
  version: string,
  source: string,
  toolArgs: Readonly<Record<string, string>> = {},
): Promise<void> {
  await withTenantTx(pool, ctx, async (tx) => {
    await tx.query("UPDATE ursitoare.policy_set SET current = false WHERE current");
    const maximum = await tx.query<{ next: string }>(
      "SELECT COALESCE(MAX(deploy_seq), 0) + 1 AS next FROM ursitoare.policy_set",
    );
    const deploySeq = Number(maximum.rows[0]?.next ?? 1);
    await tx.query(
      `INSERT INTO ursitoare.policy_set
         (tenant_id, deploy_seq, version, source, grant_ids, tenant_sources, tool_args,
          current, deployed_by, deployed_at)
       VALUES ($1, $2, $3, $4, $5::text[], $6::jsonb, $7::jsonb, true, $8, $9::timestamptz)`,
      [
        ctx.tenantId,
        deploySeq,
        version,
        source,
        [],
        JSON.stringify([{ id: "tenant/source", text: source }]),
        JSON.stringify(toolArgs),
        "carol",
        "2026-11-06T09:00:00Z",
      ],
    );
  });
}

interface InvokeOpts {
  user?: string;
  roles?: readonly string[];
  node?: string;
  tool?: string;
  effect?: string;
  fingerprint?: string;
  args?: Record<string, unknown>;
  blockTenant?: string;
  toolId?: string;
}

function invoke(tenant: string, opts: InvokeOpts = {}): PolicyRequest {
  const user = opts.user ?? (tenant === T ? "alice" : "mallory");
  const roles = opts.roles ?? ["author"];
  const node = opts.node ?? "lookup";
  const tool = opts.tool ?? "acme.lookup_vendor@1";
  const effect = opts.effect ?? "read";
  const fingerprint = opts.fingerprint ?? "";
  const args = opts.args ?? {};
  const blockTenant = opts.blockTenant ?? tenant;
  const toolId = opts.toolId ?? `${tenant}/${tool}`;

  const principal: PrincipalEntity = {
    tenantId: tenant,
    userId: user,
    kind: "human",
    roles,
    teams: [],
  };
  const userValue = userEntity(principal);
  const teamId = `${tenant}/ops`;
  const flowId = `${tenant}/pay-run`;
  const flowEntity: Entity = {
    uid: { type: "Flow", id: flowId },
    attrs: { tenant, owner_team: entityRef("Team", teamId), reviewed: false },
    parents: [],
  };
  const teamEntity: Entity = {
    uid: { type: "Team", id: teamId },
    attrs: { tenant },
    parents: [],
  };
  const blockEntity: Entity = {
    uid: { type: "Block", id: `${blockTenant}/pay-run/${node}` },
    attrs: { tenant: blockTenant, kind: "block", flow: entityRef("Flow", flowId) },
    parents: [],
  };
  const toolTenant = toolId.includes("/") ? toolId.slice(0, toolId.indexOf("/")) : tenant;
  const toolEntity: Entity = {
    uid: { type: "Tool", id: toolId },
    attrs: { tenant: toolTenant, effect },
    parents: [],
  };
  return {
    principal: userValue.uid,
    action: "invoke_tool",
    resource: blockEntity.uid,
    context: {
      tool: entityRef("Tool", toolId),
      args,
      taint: [],
      run_initiator: entityRef("User", `${tenant}/${user}`),
      sod_excluded: [],
      approvals: [],
      approvers_by_role: {},
      node_fingerprint: fingerprint,
    },
    entities: [userValue, teamEntity, flowEntity, blockEntity, toolEntity],
  };
}

function A(opts: InvokeOpts = {}): PolicyRequest {
  return invoke(T, opts);
}

function B(opts: InvokeOpts = {}): PolicyRequest {
  return invoke(U, opts);
}

function dec(decision: Decision): readonly unknown[] {
  return [decision.decision, decision.reasons, decision.errors, decision.policySetVersion];
}

async function withFixture(run: (db: TestDatabase, a: TenantContext, b: TenantContext) => Promise<void>): Promise<void> {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await run(db, a, b);
  } finally {
    await db.close();
  }
}

test("C-19bf37d2: a tenant's layer never decides another tenant's request", async () => {
  await withFixture(async (db, a, b) => {
    const srcDir = await emptySrcDir();
    const state: PoolState = { reads: [], down: false };
    const rt = await startedRuntime(countingPool(db.appPool, state), srcDir);

    await seedSet(db.appPool, a, "a".repeat(64), SRC_R);

    assert.deepEqual(
      dec(await rt.engine.check(A())),
      ["allow", ["t-a-read-all"], [], VA],
      "A's read uses A's stored set",
    );
    assert.deepEqual(state.reads, [T], "A's first check reads A's row once");

    assert.deepEqual(
      dec(await rt.engine.check(B())),
      ["deny", [], [], VBASE],
      "B has no row and decides on the base engine",
    );
    assert.deepEqual(state.reads, [T, U], "B's first check reads B's row once");

    assert.deepEqual(
      dec(await rt.engine.check(A({ blockTenant: U, toolId: `${U}/acme.lookup_vendor@1` }))),
      ["deny", ["platform-cross-tenant-forbid"], [], VA],
      "A's tenant layer never allows a request on B",
    );

    await seedSet(db.appPool, b, "b".repeat(64), SRC_S);
    assert.deepEqual(
      dec(await rt.engine.check(B({ tool: "acme.send@1", effect: "send" }))),
      ["deny", [], [], VBASE],
      "B keeps the engine it loaded until reload",
    );

    await rt.reload(U);
    assert.deepEqual(
      dec(await rt.engine.check(B({ tool: "acme.send@1", effect: "send" }))),
      ["allow", ["t-b-send"], [], VB],
      "B's send uses B's reloaded set",
    );
    assert.deepEqual(
      dec(await rt.engine.check(B())),
      ["deny", [], [], VB],
      "B's read stays denied by B's set",
    );
    assert.deepEqual(
      dec(await rt.engine.check(A({ tool: "acme.send@1", effect: "send" }))),
      ["deny", [], [], VA],
      "A's send stays denied by A's set",
    );

    assert.equal(rt.engine.policySetVersion, VBASE, "the runtime's engine stays the base engine");
    assert.deepEqual(
      rt.engine.policies.map((policy) => policy.id),
      PLATFORM_POLICY_IDS,
      "the runtime's policies are the platform ones",
    );

    const readsBefore = state.reads.length;
    const noPrincipal = { ...A(), principal: undefined } as unknown as PolicyRequest;
    assert.deepEqual(
      dec(await rt.engine.check(noPrincipal)),
      ["deny", [], ["PDP_REQUEST_INVALID"], VBASE],
      "a request without a principal is denied by the base engine",
    );
    const noSlash = { ...A(), principal: { type: "User", id: "nosl" } } as PolicyRequest;
    assert.deepEqual(
      dec(await rt.engine.check(noSlash)),
      ["deny", [], ["PDP_ENTITY_MISSING"], VBASE],
      "a principal id without a slash is denied by the base engine",
    );
    assert.deepEqual(await rt.toolArgs("a b"), {}, "toolArgs outside the pattern answers nothing");
    await assert.doesNotReject(() => rt.reload("a b"), "reload outside the pattern resolves");
    const spaced: PrincipalEntity = {
      tenantId: "a b",
      userId: "carol",
      kind: "human",
      roles: ["tenant_admin"],
      teams: [],
    };
    assert.deepEqual(
      await rt.engine.allowedActions(spaced, ["deploy_policy", "read_self"]),
      [],
      "allowedActions outside the pattern answers nothing",
    );
    assert.deepEqual(state.reads.slice(readsBefore), [], "a malformed identifier reads no row");
  });
});

test("C-c43f4f58: load failures deny with an error and are not cached", async () => {
  await withFixture(async (db, a, b) => {
    const srcDir = await emptySrcDir();
    const state: PoolState = { reads: [], down: false };
    const rt = await startedRuntime(countingPool(db.appPool, state), srcDir);
    await seedSet(db.appPool, a, "a".repeat(64), SRC_R);

    assert.deepEqual(
      dec(await rt.engine.check(A())),
      ["allow", ["t-a-read-all"], [], VA],
      "A's first check loads A's set",
    );
    assert.deepEqual(state.reads, [T], "A's first check reads A's row once");

    await Promise.all([rt.engine.check(A()), rt.engine.check(A()), rt.engine.check(A())]);
    assert.deepEqual(state.reads, [T], "three concurrent cached checks read no row");

    assert.deepEqual(dec(await rt.engine.check(B())), ["deny", [], [], VBASE], "B has no row");
    assert.deepEqual(state.reads, [T, U], "B's first check reads B's row once");

    await seedSet(db.appPool, b, "b".repeat(64), SRC_S);
    await rt.reload(U);
    assert.deepEqual(state.reads, [T, U, U], "reload reads B's row again");

    state.down = true;
    assert.deepEqual(
      dec(await rt.engine.check(A())),
      ["allow", ["t-a-read-all"], [], VA],
      "a cached engine survives a failing store",
    );
    await assert.rejects(rt.reload(T), { message: "store down" }, "reload rejects while the store is down");
    const failed = await rt.engine.check(A());
    assert.deepEqual(
      dec(failed),
      ["deny", [], ["POLICY_SET_UNAVAILABLE"], VBASE],
      "a failed load denies with an error",
    );
    assert.equal(failed.decidedAt, "2026-11-06T09:00:00.000Z", "the denial uses the runtime's clock");
    assert.match(failed.decisionId, /^dec_/, "the denial carries a decision id");
    await assert.rejects(rt.toolArgs(T), { message: "store down" }, "toolArgs rejects while the store is down");
    const carol: PrincipalEntity = {
      tenantId: T,
      userId: "carol",
      kind: "human",
      roles: ["tenant_admin"],
      teams: [],
    };
    assert.deepEqual(
      await rt.engine.allowedActions(carol, ["deploy_policy", "read_self"]),
      [],
      "a failed load leaves only the base engine's capabilities",
    );

    state.down = false;
    assert.deepEqual(
      dec(await rt.engine.check(A())),
      ["allow", ["t-a-read-all"], [], VA],
      "A recovers once the store returns",
    );
    assert.deepEqual(
      await rt.engine.allowedActions(carol, ["deploy_policy", "read_self"]),
      ["read_self"],
      "the tenant's set decides its capabilities",
    );

    await seedSet(db.appPool, b, "d".repeat(64), SRC_DUP);
    await assert.rejects(
      rt.reload(U),
      (error: unknown) => {
        assert.ok(error instanceof PdpError, "the corrupt set fails as a PdpError");
        assert.equal(error.code, "PDP_DUPLICATE_ID");
        assert.deepEqual(error.details, { stage: "policy", ids: ["platform-read-self"] });
        return true;
      },
      "a corrupt set rejects on reload",
    );
    assert.deepEqual(
      dec(await rt.engine.check(B())),
      ["deny", [], ["POLICY_SET_UNAVAILABLE"], VBASE],
      "the corrupt set denies B",
    );
    assert.deepEqual(
      dec(await rt.engine.check(A())),
      ["allow", ["t-a-read-all"], [], VA],
      "another tenant is untouched by B's corrupt set",
    );

    const nullRuntime = await startedRuntime(null, srcDir);
    assert.deepEqual(
      dec(await nullRuntime.engine.check(A())),
      ["deny", [], [], VBASE],
      "a null pool decides on the base engine",
    );
    assert.deepEqual(await nullRuntime.toolArgs(T), {}, "a null pool has no stored types");
    await assert.doesNotReject(() => nullRuntime.reload(T), "a null pool reloads");
    assert.equal(nullRuntime.engine.actions.length, 25, "the base engine serves every action");
  });
});
