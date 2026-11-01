import assert from "node:assert/strict";
import { test } from "node:test";

import type { AuditEventRecord } from "../../audit/index.ts";
import { listAuditEvents } from "../../audit/index.ts";
import { fixedClock } from "../../core/index.ts";
import { withTenantTx, type TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { FlowError, type FlowErrorCode } from "./errors.ts";
import {
  createFlow,
  flowOwnerTeam,
  getFlow,
  listFlows,
  type FlowActor,
  type FlowRecord,
} from "./flows.ts";

const CREATED_AT = "2026-10-25T09:00:00.000000Z";
const SEEDED_AT = "2026-10-25T08:00:00.000000Z";

function actorOf(userId: string): FlowActor {
  return { kind: "user", userId };
}

async function resolved<T>(call: () => Promise<T>): Promise<T> {
  let result: T | undefined;
  await assert.doesNotReject(async () => {
    result = await call();
  });
  assert.notEqual(result, undefined, "the flow registry call returned a result");
  return result as T;
}

function flowError(code: FlowErrorCode): (error: unknown) => boolean {
  return (error: unknown) => {
    assert.ok(error instanceof FlowError, "the error is a FlowError");
    assert.equal(error.code, code);
    return true;
  };
}

async function seedActor(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
  teams: readonly string[],
): Promise<void> {
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, display_name)
       VALUES ($1, $2, 'human', $2) ON CONFLICT DO NOTHING`,
      [ctx.tenantId, userId],
    );
    for (const team of teams) {
      await tx.query(
        "INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [ctx.tenantId, team],
      );
    }
  });
}

async function seedFlowRow(
  db: TestDatabase,
  ctx: TenantContext,
  input: { flowId: string; ownerTeam: string; createdBy: string },
): Promise<void> {
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare.flow (tenant_id, flow_id, owner_team, created_by, created_at, last_no)
       VALUES ($1, $2, $3, $4, $5, 0)`,
      [ctx.tenantId, input.flowId, input.ownerTeam, input.createdBy, SEEDED_AT],
    );
  });
}

function create(
  db: TestDatabase,
  ctx: TenantContext,
  input: { name: string; ownerTeam: string },
  actor: FlowActor,
): Promise<FlowRecord> {
  return resolved(() =>
    withTenantTx(db.appPool, ctx, (tx) =>
      createFlow(tx, ctx, input, actor, { clock: fixedClock(CREATED_AT) }),
    ),
  );
}

function readFlow(
  db: TestDatabase,
  ctx: TenantContext,
  flowId: string,
): Promise<FlowRecord | null> {
  return resolved(() => withTenantTx(db.appPool, ctx, (tx) => getFlow(tx, ctx, flowId)));
}

function ownerTeamOf(
  db: TestDatabase,
  ctx: TenantContext,
  flowId: string,
): Promise<string | null> {
  return resolved(() => withTenantTx(db.appPool, ctx, (tx) => flowOwnerTeam(tx, ctx, flowId)));
}

function pageFlows(
  db: TestDatabase,
  ctx: TenantContext,
  q: {
    limit: number;
    after?: string | undefined;
    filter: { sql: string; values: unknown[] };
  },
): Promise<{ flows: FlowRecord[]; next: string | null }> {
  return resolved(() => withTenantTx(db.appPool, ctx, (tx) => listFlows(tx, ctx, q)));
}

async function eventsOf(
  db: TestDatabase,
  ctx: TenantContext,
  eventType: string,
): Promise<AuditEventRecord[]> {
  return listAuditEvents(db.appPool, ctx, {
    filter: { eventType },
    order: "asc",
    limit: 50,
  });
}

test("C-e41f985e createFlow stores a flow and appends its audit event", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedActor(db, a, "alice", ["finance"]);
    const actor = actorOf("alice");

    const record = await create(db, a, { name: "rf-1-core", ownerTeam: "finance" }, actor);
    assert.deepEqual(record, {
      flowId: "rf-1-core",
      ownerTeam: "finance",
      createdBy: "alice",
      createdAt: CREATED_AT,
      versionCount: 0,
      latest: null,
    });

    const events = await eventsOf(db, a, "flow.created");
    assert.equal(events.length, 1);
    const [event] = events;
    assert.equal(event?.eventType, "flow.created");
    assert.equal(event?.at, CREATED_AT);
    assert.deepEqual(event?.target, { kind: "flow", id: "rf-1-core" });
    assert.deepEqual(event?.payload, { ownerTeam: "finance" });
    assert.deepEqual(event?.actor, { kind: "user", id: "alice" });
  } finally {
    await db.close();
  }
});

test("C-e41f985e FlowError carries its code, message and text details", () => {
  let detailed: FlowError | undefined;
  assert.doesNotThrow(() => {
    detailed = new FlowError("FLOW_TEXT_INVALID", "the text is not a flow", {
      reason: "parse",
      code: "FORMAT_YAML_SYNTAX",
      message: "bad yaml",
      line: 2,
      column: 3,
    });
  });
  assert.ok(detailed instanceof FlowError);
  assert.ok(detailed instanceof Error);
  assert.equal(detailed.code, "FLOW_TEXT_INVALID");
  assert.equal(detailed.message, "the text is not a flow");
  assert.deepEqual(detailed.details, {
    reason: "parse",
    code: "FORMAT_YAML_SYNTAX",
    message: "bad yaml",
    line: 2,
    column: 3,
  });

  let plain: FlowError | undefined;
  assert.doesNotThrow(() => {
    plain = new FlowError("FLOW_EXISTS", "the flow exists");
  });
  assert.ok(plain instanceof FlowError);
  assert.equal(plain.code, "FLOW_EXISTS");
  assert.equal(plain.details, null);
});

test("C-e41f985e createFlow refuses a bad name, a duplicate and an unknown team", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedActor(db, a, "alice", ["finance"]);
    const actor = actorOf("alice");
    const clock = fixedClock(CREATED_AT);

    const tooLong = "a" + "b".repeat(64);
    for (const name of ["Bad_Name", tooLong]) {
      await assert.rejects(
        withTenantTx(db.appPool, a, (tx) =>
          createFlow(tx, a, { name, ownerTeam: "finance" }, actor, { clock }),
        ),
        flowError("FLOW_INVALID"),
        `${name} is not a flow id`,
      );
    }

    await create(db, a, { name: "rf-1-core", ownerTeam: "finance" }, actor);

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        createFlow(tx, a, { name: "rf-1-core", ownerTeam: "finance" }, actor, { clock }),
      ),
      flowError("FLOW_EXISTS"),
      "a flow id is unique per tenant",
    );

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        createFlow(tx, a, { name: "x-1", ownerTeam: "nope" }, actor, { clock }),
      ),
      flowError("FLOW_UNKNOWN_TEAM"),
      "the owner team must exist",
    );

    assert.equal(await readFlow(db, a, "x-1"), null);
    const events = await eventsOf(db, a, "flow.created");
    assert.equal(events.length, 1, "only the created flow is audited");
  } finally {
    await db.close();
  }
});

test("C-e41f985e createFlow refuses a transaction of another tenant", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await seedActor(db, a, "alice", ["finance"]);
    const actor = actorOf("alice");
    const clock = fixedClock(CREATED_AT);

    await assert.rejects(
      withTenantTx(db.appPool, b, (tx) =>
        createFlow(tx, a, { name: "rf-1-core", ownerTeam: "finance" }, actor, { clock }),
      ),
      flowError("FLOW_TENANT_MISMATCH"),
      "the transaction belongs to tenant B while the context names tenant A",
    );

    assert.equal(await readFlow(db, b, "rf-1-core"), null);
  } finally {
    await db.close();
  }
});

test("C-e41f985e getFlow and flowOwnerTeam read the tenant's own flows only", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await seedActor(db, a, "alice", ["finance"]);
    await seedActor(db, a, "dave", ["ops"]);
    await seedActor(db, b, "mallory", ["finance"]);

    await seedFlowRow(db, a, { flowId: "rf-1-core", ownerTeam: "finance", createdBy: "alice" });
    await seedFlowRow(db, a, { flowId: "ops-one", ownerTeam: "ops", createdBy: "dave" });
    await seedFlowRow(db, b, { flowId: "b-one", ownerTeam: "finance", createdBy: "mallory" });

    assert.deepEqual(await readFlow(db, a, "rf-1-core"), {
      flowId: "rf-1-core",
      ownerTeam: "finance",
      createdBy: "alice",
      createdAt: SEEDED_AT,
      versionCount: 0,
      latest: null,
    });
    assert.deepEqual(await readFlow(db, a, "ops-one"), {
      flowId: "ops-one",
      ownerTeam: "ops",
      createdBy: "dave",
      createdAt: SEEDED_AT,
      versionCount: 0,
      latest: null,
    });

    assert.equal(await readFlow(db, a, "ghost"), null);
    assert.equal(await readFlow(db, a, "b-one"), null);

    assert.equal(await ownerTeamOf(db, a, "rf-1-core"), "finance");
    assert.equal(await ownerTeamOf(db, a, "ops-one"), "ops");
    assert.equal(await ownerTeamOf(db, a, "ghost"), null);
    assert.equal(await ownerTeamOf(db, a, "b-one"), null);

    assert.deepEqual(await readFlow(db, b, "b-one"), {
      flowId: "b-one",
      ownerTeam: "finance",
      createdBy: "mallory",
      createdAt: SEEDED_AT,
      versionCount: 0,
      latest: null,
    });
  } finally {
    await db.close();
  }
});

test("C-538382af listFlows filters by team and pages by flow id", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await seedActor(db, a, "alice", ["finance"]);
    await seedActor(db, a, "dave", ["ops"]);
    await seedActor(db, b, "mallory", ["finance"]);

    await seedFlowRow(db, a, { flowId: "alpha", ownerTeam: "finance", createdBy: "alice" });
    await seedFlowRow(db, a, { flowId: "beta", ownerTeam: "finance", createdBy: "alice" });
    await seedFlowRow(db, a, { flowId: "gamma", ownerTeam: "finance", createdBy: "alice" });
    await seedFlowRow(db, a, { flowId: "ops-one", ownerTeam: "ops", createdBy: "dave" });
    await seedFlowRow(db, b, { flowId: "b-one", ownerTeam: "finance", createdBy: "mallory" });

    const filter = { sql: "owner_team = ANY($4)", values: [["finance"]] };

    const first = await pageFlows(db, a, { limit: 2, filter });
    assert.deepEqual(
      first.flows.map((flow) => flow.flowId),
      ["alpha", "beta"],
    );
    assert.equal(first.next, "beta");
    assert.deepEqual(first.flows[0], {
      flowId: "alpha",
      ownerTeam: "finance",
      createdBy: "alice",
      createdAt: SEEDED_AT,
      versionCount: 0,
      latest: null,
    });

    const second = await pageFlows(db, a, { limit: 2, after: first.next ?? undefined, filter });
    assert.deepEqual(
      second.flows.map((flow) => flow.flowId),
      ["gamma"],
    );
    assert.equal(second.next, null);

    const ops = await pageFlows(db, a, {
      limit: 2,
      filter: { sql: "owner_team = ANY($4)", values: [["ops"]] },
    });
    assert.deepEqual(
      ops.flows.map((flow) => flow.flowId),
      ["ops-one"],
    );
    assert.equal(ops.next, null);

    const empty = await pageFlows(db, a, {
      limit: 2,
      filter: { sql: "owner_team = ANY($4)", values: [[]] },
    });
    assert.deepEqual(empty.flows, []);
    assert.equal(empty.next, null);

    const foreign = await pageFlows(db, b, {
      limit: 2,
      filter: { sql: "owner_team = ANY($4)", values: [["finance"]] },
    });
    assert.deepEqual(
      foreign.flows.map((flow) => flow.flowId),
      ["b-one"],
    );
    assert.equal(foreign.next, null);
  } finally {
    await db.close();
  }
});
