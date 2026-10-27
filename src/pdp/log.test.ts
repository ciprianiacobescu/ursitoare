import assert from "node:assert/strict";
import { test } from "node:test";

import type { QueryResultRow } from "pg";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { createPdp, entityRef, recordDecision } from "./index.ts";
import { requestDigest } from "./digest.ts";
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

const CLOCK = fixedClock("2026-10-25T09:00:00Z");

const BODY_DIGEST = "a".repeat(64);

const EGRESS = {
  method: "POST",
  host: "api.example.test",
  path: "/v1/send",
  bodyDigest: BODY_DIGEST,
  serviceId: "svc_mail",
  ttlSeconds: 60,
} as const;

interface DecisionRow extends QueryResultRow {
  decided_at: string;
  action: string;
  principal: string;
  resource: string;
  decision: string;
  reasons: string[];
  errors: string[];
  policy_set_version: string;
  request_digest: string;
  permit: unknown;
  run_id: string | null;
  node_id: string | null;
}

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
    clock: CLOCK,
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

function sendRequest(): PolicyRequest {
  return { ...baseRequest(), action: "send", egress: { ...EGRESS } };
}

function writeRequest(n: number): PolicyRequest {
  const request = baseRequest();
  request.action = "write";
  request.context = { n, tool: entityRef("Tool", "mail") };
  return request;
}

function recordIn(
  db: TestDatabase,
  ctx: TenantContext,
  decision: Decision,
  req: PolicyRequest,
  extra?: { runId?: string; nodeId?: string },
): Promise<boolean> {
  return withTenantTx(db.appPool, ctx, (tx) => recordDecision(tx, ctx, decision, req, extra));
}

async function outcome(promise: Promise<boolean>): Promise<boolean | unknown> {
  return promise.then(
    (value) => value,
    (error: unknown) => error,
  );
}

async function readRows(db: TestDatabase, ctx: TenantContext): Promise<DecisionRow[]> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query<DecisionRow>(
      `SELECT to_char(decided_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS decided_at,
              action, principal, resource, decision, reasons, errors,
              policy_set_version, request_digest, permit, run_id, node_id
         FROM ursitoare.policy_decision
        ORDER BY decided_at, decision_id`,
    );
    return result.rows;
  });
}

async function countIn(db: TestDatabase, ctx: TenantContext, decisionId: string): Promise<number> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM ursitoare.policy_decision WHERE decision_id = $1",
      [decisionId],
    );
    const row = result.rows[0];
    return row === undefined ? -1 : Number(row.n);
  });
}

test("C-d44216c5 a full row records every decision field", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const pdp = await makePdp();
    const req = sendRequest();
    const decision = await pdp.check(req);
    assert.equal(decision.decision, "allow");
    assert.deepEqual(decision.reasons, ["t-send-tool"]);
    assert.ok(decision.permit !== undefined);

    const recorded = await outcome(recordIn(db, a, decision, req, { runId: "run_1", nodeId: "n1" }));
    assert.equal(recorded, true);

    const rows = await readRows(db, a);
    assert.deepEqual(rows, [
      {
        decided_at: "2026-10-25T09:00:00Z",
        action: "send",
        principal: 'User::"alice"',
        resource: 'Doc::"d1"',
        decision: "allow",
        reasons: ["t-send-tool"],
        errors: [],
        policy_set_version: pdp.policySetVersion,
        request_digest: requestDigest(req),
        permit: decision.permit,
        run_id: "run_1",
        node_id: "n1",
      },
    ]);
  } finally {
    await db.close();
  }
});

test("C-1cafaf79 a deny row has no permit", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const pdp = await makePdp();
    const req = writeRequest(2);
    const decision = await pdp.check(req);
    assert.equal(decision.decision, "deny");
    assert.deepEqual(decision.reasons, ["t-write-admin"]);
    assert.deepEqual(decision.errors, ["PDP_EVALUATION_ERROR:t-forbid-big"]);

    const recorded = await outcome(recordIn(db, a, decision, req));
    assert.equal(recorded, true);

    const rows = await readRows(db, a);
    assert.deepEqual(rows, [
      {
        decided_at: "2026-10-25T09:00:00Z",
        action: "write",
        principal: 'User::"alice"',
        resource: 'Doc::"d1"',
        decision: "deny",
        reasons: ["t-write-admin"],
        errors: ["PDP_EVALUATION_ERROR:t-forbid-big"],
        policy_set_version: pdp.policySetVersion,
        request_digest: requestDigest(req),
        permit: null,
        run_id: null,
        node_id: null,
      },
    ]);
  } finally {
    await db.close();
  }
});

test("C-a9a57f52 a decision is recorded once even twice or concurrently", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const pdp = await makePdp();
    const req = baseRequest();
    const firstDecision = await pdp.check(req);
    const secondDecision = await pdp.check(req);
    assert.equal(firstDecision.decision, "allow");
    assert.equal(secondDecision.decision, "allow");
    assert.notEqual(firstDecision.decisionId, secondDecision.decisionId);

    const first = await outcome(recordIn(db, a, firstDecision, req));
    assert.equal(first, true);
    const repeated = await outcome(recordIn(db, a, firstDecision, req));
    assert.equal(repeated, false);

    const concurrent = await Promise.all([
      outcome(recordIn(db, a, secondDecision, req)),
      outcome(recordIn(db, a, secondDecision, req)),
    ]);
    assert.deepEqual([...concurrent].sort(), [false, true]);

    assert.equal(await countIn(db, a, firstDecision.decisionId), 1);
    assert.equal(await countIn(db, a, secondDecision.decisionId), 1);
  } finally {
    await db.close();
  }
});
