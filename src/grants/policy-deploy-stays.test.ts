import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { entityRef, tenantEntity, userEntity } from "../pdp/index.ts";
import type { Decision, Entity, PolicyRequest, PrincipalEntity } from "../pdp/index.ts";
import { importCatalogue } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantPool } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { createPolicyRuntime } from "./policy-runtime.ts";
import type { PolicyRuntime } from "./policy-runtime.ts";
import { deployPolicySet, validatePolicySet } from "./policy-sets.ts";
import type { PolicySetRecord } from "./policy-sets.ts";

const T = "tenant_a";
const CLOCK = fixedClock("2026-11-06T09:00:00.000Z");
const CAROL = { kind: "user", id: "carol" } as const;
const VG = "f0c722021d80c6d32d648993da56c7978a89fe0af4a5497ddd7048ff3cae2f09";
const GRANTS_CEDAR = `@id("grants-deploy-admin") permit (principal in Role::"tenant_admin", action == Action::"deploy_policy", resource);\n`;
const G0 = "grant_00000000-0000-7000-8000-000000000000";

const SRC_LOCK = `@id("t-lock")\nforbid (principal, action == Action::"deploy_policy", resource);\n`;
const SRC_ESC = `@id("t-esc")\npermit (principal in Role::"author", action == Action::"deploy_policy", resource);\n`;
const SRC_ALL = `@id("t-all")\nforbid (principal, action, resource);\n`;

const tempDirs: string[] = [];

after(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

const CARL: PrincipalEntity = { tenantId: T, userId: "carol", kind: "human", roles: ["tenant_admin"], teams: [] };
const ALICE: PrincipalEntity = { tenantId: T, userId: "alice", kind: "human", roles: ["author"], teams: [] };

function deployRequest(principal: PrincipalEntity): PolicyRequest {
  const user = userEntity(principal);
  return {
    principal: user.uid,
    action: "deploy_policy",
    resource: { type: "Tenant", id: T },
    context: {},
    entities: [user, tenantEntity(T)],
  };
}

function lookup(): PolicyRequest {
  const user = userEntity(ALICE);
  const flowId = `${T}/pay-run`;
  const teamId = `${T}/ops`;
  const block: Entity = {
    uid: { type: "Block", id: `${T}/pay-run/lookup` },
    attrs: { tenant: T, kind: "block", flow: entityRef("Flow", flowId) },
    parents: [],
  };
  return {
    principal: user.uid,
    action: "invoke_tool",
    resource: block.uid,
    context: {
      tool: entityRef("Tool", `${T}/acme.lookup_vendor@1`),
      args: {},
      taint: [],
      run_initiator: entityRef("User", `${T}/alice`),
      sod_excluded: [],
      approvals: [],
      approvers_by_role: {},
      node_fingerprint: "",
    },
    entities: [
      user,
      { uid: { type: "Team", id: teamId }, attrs: { tenant: T }, parents: [] },
      {
        uid: { type: "Flow", id: flowId },
        attrs: { tenant: T, owner_team: entityRef("Team", teamId), reviewed: false },
        parents: [],
      },
      block,
      { uid: { type: "Tool", id: `${T}/acme.lookup_vendor@1` }, attrs: { tenant: T, effect: "read" }, parents: [] },
    ],
  };
}

function dec(d: Decision): readonly unknown[] {
  return [d.decision, d.reasons, d.errors, d.policySetVersion];
}

test("C-606aa711: a tenant's set can neither take deploying away nor give it away", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const srcDir = await mkdtemp(join(tmpdir(), "policy-stays-"));
    tempDirs.push(srcDir);
    await mkdir(join(srcDir, "grants", "policy"), { recursive: true });
    await writeFile(join(srcDir, "grants", "policy", "grants.cedar"), GRANTS_CEDAR);
    await importCatalogue(
      db.appPool,
      a,
      {
        "acme.lookup_vendor@1": {
          effect: "read",
          input: { type: "object", properties: { limit: { type: "integer" } } },
          output: { type: "object" },
        },
      } as never,
      CAROL,
      { clock: CLOCK },
    );
    await withTenantTx(db.appPool, a, async (tx) => {
      await tx.query(
        `INSERT INTO ursitoare."grant"
           (tenant_id, grant_id, subject_kind, subject_id, tool, scope_kind, state, created_by, created_at)
         VALUES ($1, $2, 'role', 'author', 'acme.lookup_vendor@1', 'any_step', 'active', 'carol',
                 '2026-11-06T09:00:00Z')`,
        [T, G0],
      );
    });
    const state = { down: false };
    const logger = createLogger({ level: "silent", destination: { write(_line: string): void {} } });
    const wrap = (inner: TenantPool): TenantPool =>
      ({
        async connect() {
          if (state.down) throw new Error("store down");
          return inner.connect();
        },
      }) as unknown as TenantPool;
    const makeRt = (pool: TenantPool): Promise<PolicyRuntime> =>
      createPolicyRuntime({ pool, srcDir, clock: CLOCK, ids: sequentialIds(1000), logger });
    const rtG = await makeRt(db.appPool);

    const deploy = async (rt: PolicyRuntime, source: string, at: string): Promise<PolicySetRecord> => {
      let record: PolicySetRecord | undefined;
      await assert.doesNotReject(async () => {
        record = await deployPolicySet(rt, db.appPool, a, source, CAROL, { clock: fixedClock(at) });
      }, "deployPolicySet resolves");
      assert.ok(record !== undefined);
      return record;
    };
    const allowCarol = ["allow", ["grants-deploy-admin"], [], VG];

    // D1
    const lock = await validatePolicySet(rtG, db.appPool, a, SRC_LOCK);
    assert.equal(lock.ok, true);
    assert.match(String(lock.policySetVersion), /^[0-9a-f]{64}$/);
    const first = await deploy(rtG, SRC_LOCK, "2026-11-06T10:00:00.000Z");
    assert.equal(first.version, lock.policySetVersion);

    // D2
    assert.deepEqual(dec(await rtG.engine.check(deployRequest(CARL))), allowCarol);
    assert.deepEqual(await rtG.engine.allowedActions(CARL, ["deploy_policy", "read_self"]), [
      "deploy_policy",
      "read_self",
    ]);

    // D3
    await deploy(rtG, SRC_ALL, "2026-11-06T11:00:00.000Z");
    const denied = await rtG.engine.check(lookup());
    assert.deepEqual([denied.decision, denied.reasons], ["deny", ["t-all"]]);
    assert.deepEqual(dec(await rtG.engine.check(deployRequest(CARL))), allowCarol);
    await deploy(rtG, "", "2026-11-06T12:00:00.000Z");
    const allowed = await rtG.engine.check(lookup());
    assert.deepEqual([allowed.decision, allowed.reasons], ["allow", [G0]]);

    // D4
    await deploy(rtG, SRC_ESC, "2026-11-06T13:00:00.000Z");
    assert.deepEqual(dec(await rtG.engine.check(deployRequest(ALICE))), ["deny", [], [], VG]);

    // D5
    await withTenantTx(db.appPool, a, async (tx) => {
      await tx.query("UPDATE ursitoare.policy_set SET current = false WHERE current");
      await tx.query(
        `INSERT INTO ursitoare.policy_set
           (tenant_id, deploy_seq, version, source, grant_ids, tenant_sources, tool_args,
            current, deployed_by, deployed_at)
         VALUES ($1, 100, $2, $3, '{}', $4::jsonb, '{}'::jsonb, true, 'carol', '2026-11-06T09:00:00Z')`,
        [T, "c".repeat(64), SRC_LOCK, JSON.stringify([{ id: "tenant/source", text: SRC_LOCK }])],
      );
    });
    state.down = true;
    const rtDown = await makeRt(wrap(db.appPool));
    assert.deepEqual(dec(await rtDown.engine.check(deployRequest(CARL))), allowCarol);
    assert.deepEqual(await rtDown.engine.allowedActions(CARL, ["deploy_policy", "read_self"]), [
      "deploy_policy",
    ]);
  } finally {
    await db.close();
  }
});
