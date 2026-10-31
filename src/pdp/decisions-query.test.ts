import assert from "node:assert/strict";
import { test } from "node:test";

import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { requestDigest } from "./digest.ts";
import { listPolicyDecisions } from "./decisions-query.ts";
import type { PolicyDecisionFilter, PolicyDecisionRecord } from "./decisions-query.ts";
import { PdpError, recordDecision } from "./index.ts";
import type { Decision, PolicyRequest } from "./types.ts";

interface DecisionQuery {
  filter?: PolicyDecisionFilter;
  continueAfter?: { decidedAt: string; decisionId: string };
  order: "asc" | "desc";
  limit: number;
}

const POLICY_SET_VERSION = "b".repeat(64);
const BODY_DIGEST = "a".repeat(64);

const PERMIT = {
  method: "GET",
  host: "tool.test",
  path: "/x",
  bodyDigest: BODY_DIGEST,
  serviceId: "svc_1",
  ttlSeconds: 30,
} as const;

const AT_1 = "2026-10-25T08:00:01.000000Z";
const AT_2 = "2026-10-25T08:00:02.000000Z";
const AT_4 = "2026-10-25T08:00:04.000000Z";

function requestFor(action: string, principalId: string, tenantId: string): PolicyRequest {
  return {
    principal: { type: "User", id: principalId },
    action,
    resource: { type: "Tenant", id: tenantId },
    context: {},
    entities: [],
  };
}

function invokeToolRequest(): PolicyRequest {
  return requestFor("invoke_tool", "tenant_a/u_1", "tenant_a");
}

async function record(
  db: TestDatabase,
  ctx: TenantContext,
  decision: Decision,
  req: PolicyRequest,
  extra?: { runId?: string; nodeId?: string },
): Promise<void> {
  const recorded = await withTenantTx(db.appPool, ctx, (tx) =>
    recordDecision(tx, ctx, decision, req, extra),
  );
  assert.equal(recorded, true, `decision ${decision.decisionId} was recorded`);
}

async function seedDecisions(db: TestDatabase, a: TenantContext): Promise<void> {
  await record(
    db,
    a,
    {
      decision: "deny",
      decisionId: "d_1",
      decidedAt: "2026-10-25T08:00:01.000Z",
      reasons: [],
      errors: [],
      policySetVersion: POLICY_SET_VERSION,
    },
    requestFor("start_run", "tenant_a/u_9", "tenant_a"),
  );
  await record(
    db,
    a,
    {
      decision: "allow",
      decisionId: "d_2",
      decidedAt: "2026-10-25T08:00:02.000Z",
      reasons: [],
      errors: [],
      policySetVersion: POLICY_SET_VERSION,
    },
    requestFor("read_flow", "tenant_a/u_1", "tenant_a"),
    { runId: "run_1" },
  );
  await record(
    db,
    a,
    {
      decision: "allow",
      decisionId: "d_3",
      decidedAt: "2026-10-25T08:00:02.000Z",
      reasons: [],
      errors: [],
      policySetVersion: POLICY_SET_VERSION,
    },
    requestFor("read_flow", "tenant_a/u_1", "tenant_a"),
  );
  await record(
    db,
    a,
    {
      decision: "allow",
      decisionId: "d_4",
      decidedAt: "2026-10-25T08:00:04.000Z",
      reasons: [],
      errors: [],
      policySetVersion: POLICY_SET_VERSION,
      permit: { ...PERMIT },
    },
    invokeToolRequest(),
    { runId: "run_1", nodeId: "n_1" },
  );
}

async function list(
  pool: TenantPool,
  ctx: TenantContext,
  q: DecisionQuery,
): Promise<PolicyDecisionRecord[]> {
  let result: PolicyDecisionRecord[] | undefined;
  await assert.doesNotReject(async () => {
    result = await listPolicyDecisions(pool, ctx, q);
  });
  assert.ok(result !== undefined, "listPolicyDecisions returned a result");
  return result;
}

function ids(rows: PolicyDecisionRecord[]): string[] {
  return rows.map((row) => row.decisionId);
}

async function rejectsReason(
  pool: TenantPool,
  ctx: TenantContext,
  q: DecisionQuery,
  reason: string,
): Promise<void> {
  await assert.rejects(
    listPolicyDecisions(pool, ctx, q),
    (err: unknown) => {
      if (!(err instanceof PdpError)) {
        return false;
      }
      return err.code === "PDP_OPTIONS_INVALID" && err.details.reason === reason;
    },
  );
}

test("C-061beb81 the policy decision reader refuses bad options", async () => {
  assert.equal(typeof listPolicyDecisions, "function");
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedDecisions(db, a);

    await rejectsReason(db.appPool, a, { order: "desc", limit: 0 }, "bad_limit");
    await rejectsReason(db.appPool, a, { order: "desc", limit: 201 }, "bad_limit");
    await rejectsReason(db.appPool, a, { order: "up" as "asc", limit: 50 }, "bad_order");
    await rejectsReason(
      db.appPool,
      a,
      { order: "desc", limit: 50, filter: { decision: "maybe" as "allow" } },
      "bad_filter",
    );
    await rejectsReason(
      db.appPool,
      a,
      { order: "desc", limit: 50, filter: { from: "2026-10-25T09:00:00.1Z" } },
      "bad_filter",
    );
    await rejectsReason(
      db.appPool,
      a,
      {
        order: "desc",
        limit: 50,
        continueAfter: { decidedAt: "2026-02-30T00:00:00.000000Z", decisionId: "d_1" },
      },
      "bad_position",
    );

    const rows = await list(db.appPool, a, {
      order: "desc",
      limit: 50,
      continueAfter: { decidedAt: AT_2, decisionId: "d_3" },
    });
    assert.deepEqual(ids(rows), ["d_2", "d_1"]);
  } finally {
    await db.close();
  }
});

test("C-d6210b1c each policy decision filter returns the matching records", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedDecisions(db, a);

    assert.deepEqual(
      ids(
        await list(db.appPool, a, {
          order: "desc",
          limit: 50,
          filter: { decision: "deny", to: "2026-10-25T09:00:00Z" },
        }),
      ),
      ["d_1"],
    );
    assert.deepEqual(
      ids(await list(db.appPool, a, { order: "desc", limit: 50, filter: { action: "read_flow" } })),
      ["d_3", "d_2"],
    );
    assert.deepEqual(
      ids(await list(db.appPool, a, { order: "desc", limit: 50, filter: { runId: "run_1" } })),
      ["d_4", "d_2"],
    );
    assert.deepEqual(
      ids(await list(db.appPool, a, { order: "desc", limit: 50, filter: { decisionId: "d_2" } })),
      ["d_2"],
    );
    assert.deepEqual(
      ids(
        await list(db.appPool, a, {
          order: "desc",
          limit: 50,
          filter: { principal: 'User::"tenant_a/u_9"' },
        }),
      ),
      ["d_1"],
    );
    assert.deepEqual(
      ids(
        await list(db.appPool, a, {
          order: "desc",
          limit: 50,
          filter: { from: "2026-10-25T08:00:02Z", to: "2026-10-25T08:00:04Z" },
        }),
      ),
      ["d_3", "d_2"],
    );
  } finally {
    await db.close();
  }
});

test("C-3d923c6a policy decisions walk in both directions with ties", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedDecisions(db, a);

    assert.deepEqual(ids(await list(db.appPool, a, { order: "desc", limit: 1 })), ["d_4"]);
    assert.deepEqual(
      ids(
        await list(db.appPool, a, {
          order: "desc",
          limit: 1,
          continueAfter: { decidedAt: AT_4, decisionId: "d_4" },
        }),
      ),
      ["d_3"],
    );
    assert.deepEqual(
      ids(
        await list(db.appPool, a, {
          order: "desc",
          limit: 1,
          continueAfter: { decidedAt: AT_2, decisionId: "d_3" },
        }),
      ),
      ["d_2"],
    );
    assert.deepEqual(
      ids(
        await list(db.appPool, a, {
          order: "desc",
          limit: 1,
          continueAfter: { decidedAt: AT_2, decisionId: "d_2" },
        }),
      ),
      ["d_1"],
    );
    assert.deepEqual(
      ids(
        await list(db.appPool, a, {
          order: "desc",
          limit: 1,
          continueAfter: { decidedAt: AT_1, decisionId: "d_1" },
        }),
      ),
      [],
    );

    assert.deepEqual(ids(await list(db.appPool, a, { order: "asc", limit: 1 })), ["d_1"]);
    assert.deepEqual(
      ids(
        await list(db.appPool, a, {
          order: "asc",
          limit: 1,
          continueAfter: { decidedAt: AT_1, decisionId: "d_1" },
        }),
      ),
      ["d_2"],
    );
    assert.deepEqual(
      ids(
        await list(db.appPool, a, {
          order: "asc",
          limit: 1,
          continueAfter: { decidedAt: AT_2, decisionId: "d_2" },
        }),
      ),
      ["d_3"],
    );
    assert.deepEqual(
      ids(
        await list(db.appPool, a, {
          order: "asc",
          limit: 1,
          continueAfter: { decidedAt: AT_2, decisionId: "d_3" },
        }),
      ),
      ["d_4"],
    );
    assert.deepEqual(
      ids(
        await list(db.appPool, a, {
          order: "asc",
          limit: 1,
          continueAfter: { decidedAt: AT_4, decisionId: "d_4" },
        }),
      ),
      [],
    );
  } finally {
    await db.close();
  }
});

test("C-590617af the policy decision reader returns the full d_4 record", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedDecisions(db, a);

    const rows = await list(db.appPool, a, {
      order: "desc",
      limit: 2,
      filter: { to: "2026-10-25T09:00:00Z" },
    });
    assert.deepEqual(ids(rows), ["d_4", "d_3"]);

    const expected = {
      decisionId: "d_4",
      decidedAt: AT_4,
      runId: "run_1",
      nodeId: "n_1",
      action: "invoke_tool",
      principal: 'User::"tenant_a/u_1"',
      resource: 'Tenant::"tenant_a"',
      decision: "allow",
      reasons: [],
      errors: [],
      policySetVersion: POLICY_SET_VERSION,
      requestDigest: requestDigest(invokeToolRequest()),
      permit: { ...PERMIT },
    };
    assert.deepEqual(rows[0], expected);
    assert.match(expected.policySetVersion, /^[0-9a-f]{64}$/);
    assert.match(expected.requestDigest, /^[0-9a-f]{64}$/);
  } finally {
    await db.close();
  }
});

test("C-2b77706e the policy decision reader returns only the calling tenant's decisions", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await seedDecisions(db, a);
    await record(
      db,
      b,
      {
        decision: "allow",
        decisionId: "b_1",
        decidedAt: "2026-10-25T08:00:01.000Z",
        reasons: [],
        errors: [],
        policySetVersion: POLICY_SET_VERSION,
      },
      requestFor("start_run", "tenant_b/m_1", "tenant_b"),
    );

    const bRows = await list(db.appPool, b, { order: "desc", limit: 50 });
    assert.deepEqual(ids(bRows), ["b_1"]);
    assert.equal(bRows[0]?.principal, 'User::"tenant_b/m_1"');
    assert.equal(bRows[0]?.resource, 'Tenant::"tenant_b"');

    const aRows = await list(db.appPool, a, { order: "desc", limit: 50 });
    assert.deepEqual(ids(aRows), ["d_4", "d_3", "d_2", "d_1"]);
  } finally {
    await db.close();
  }
});
