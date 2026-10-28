import assert from "node:assert/strict";
import { test } from "node:test";

import type { QueryResultRow } from "pg";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { ensurePartitions } from "../db/index.ts";
import { createLogger } from "../observability/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { createPdp, entityRef, recordDecision } from "./index.ts";
import type { Decision, PolicyRequest, PolicySource } from "./types.ts";

const SCHEMA = `entity Role;
entity User in [Role];
entity Tool { effect: String };
entity Doc { owner: User, locked: Bool };
action read, write, send appliesTo {
  principal: User, resource: Doc, context: { n: Long, tool: Tool, amount?: decimal } };
`;

const PLATFORM: PolicySource = {
  id: "platform.cedar",
  layer: "platform",
  text: '@id("p-forbid-locked") forbid (principal, action, resource) when { resource.locked };',
};

const TENANT: PolicySource = {
  id: "tenant.cedar",
  layer: "tenant",
  text: `@id("t-read-own") permit (principal, action == Action::"read", resource) when { resource.owner == principal };
@id("t-write-admin") permit (principal in Role::"admin", action == Action::"write", resource);
@id("t-send-tool") permit (principal, action == Action::"send", resource) when { context.tool.effect == "send" };
@id("t-forbid-big") forbid (principal, action == Action::"write", resource) when { context.n * 9223372036854775807 > 100 };`,
};

const POLICIES: readonly PolicySource[] = [PLATFORM, TENANT];

interface PartitionRow extends QueryResultRow {
  decided_at: string;
  partition: string;
}

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

function makePdp(iso: string) {
  return createPdp({
    schema: SCHEMA,
    policies: [...POLICIES],
    clock: fixedClock(iso),
    ids: sequentialIds(),
    logger: silentLogger(),
  });
}

function baseRequest(): PolicyRequest {
  return {
    principal: { type: "User", id: "alice" },
    action: "read",
    resource: { type: "Doc", id: "d1" },
    context: { n: 0, tool: entityRef("Tool", "mail") },
    entities: [
      { uid: { type: "User", id: "alice" }, attrs: {}, parents: [{ type: "Role", id: "admin" }] },
      {
        uid: { type: "Doc", id: "d1" },
        attrs: { owner: entityRef("User", "alice"), locked: false },
        parents: [],
      },
      { uid: { type: "Tool", id: "mail" }, attrs: { effect: "send" }, parents: [] },
    ],
  };
}

function recordIn(
  db: TestDatabase,
  ctx: TenantContext,
  decision: Decision,
  req: PolicyRequest,
): Promise<boolean> {
  return withTenantTx(db.appPool, ctx, (tx) => recordDecision(tx, ctx, decision, req));
}

async function outcome(promise: Promise<boolean>): Promise<boolean | unknown> {
  return promise.then(
    (value) => value,
    (error: unknown) => error,
  );
}

test("C-8440a92f decisions land in the default or the monthly partition", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);

    const earlyPdp = await makePdp("2020-01-15T10:00:00Z");
    const earlyRequest = baseRequest();
    const earlyDecision = await earlyPdp.check(earlyRequest);
    assert.equal(earlyDecision.decision, "allow");
    const earlyRecorded = await outcome(
      recordIn(db, a, earlyDecision, earlyRequest),
    );
    assert.equal(earlyRecorded, true);

    const created = await ensurePartitions(db.ownerPool, fixedClock("2031-03-10T00:00:00Z"));
    assert.ok(created.created.includes("ursitoare.policy_decision_p203103"));

    const laterPdp = await makePdp("2031-03-12T10:00:00Z");
    const laterRequest = baseRequest();
    const laterDecision = await laterPdp.check(laterRequest);
    assert.equal(laterDecision.decision, "allow");
    const laterRecorded = await outcome(
      recordIn(db, a, laterDecision, laterRequest),
    );
    assert.equal(laterRecorded, true);

    const rows = await withTenantTx(db.appPool, a, async (tx) => {
      const result = await tx.query<PartitionRow>(
        `SELECT to_char(d.decided_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS decided_at,
                c.relname AS partition
           FROM ursitoare.policy_decision d
           JOIN pg_class c ON c.oid = d.tableoid
          ORDER BY d.decided_at`,
      );
      return result.rows;
    });
    assert.deepEqual(rows, [
      { decided_at: "2020-01-15T10:00:00Z", partition: "policy_decision_default" },
      { decided_at: "2031-03-12T10:00:00Z", partition: "policy_decision_p203103" },
    ]);
  } finally {
    await db.close();
  }
});
