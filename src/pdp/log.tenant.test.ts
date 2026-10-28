import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
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

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

function makePdp() {
  return createPdp({
    schema: SCHEMA,
    policies: [...POLICIES],
    clock: fixedClock("2026-10-25T09:00:00Z"),
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

async function countIn(db: TestDatabase, ctx: TenantContext): Promise<number> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM ursitoare.policy_decision",
    );
    const row = result.rows[0];
    return row === undefined ? -1 : Number(row.n);
  });
}

test("C-ff0a5e53 two tenants see only their own decisions", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const pdp = await makePdp();
    const req = baseRequest();
    const decision = await pdp.check(req);
    assert.equal(decision.decision, "allow");

    const recorded = await outcome(recordIn(db, a, decision, req));
    assert.equal(recorded, true);

    assert.deepEqual(
      { a: await countIn(db, a), b: await countIn(db, b) },
      { a: 1, b: 0 },
    );
  } finally {
    await db.close();
  }
});
