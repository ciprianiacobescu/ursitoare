import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import type { QueryResultRow } from "pg";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantTx } from "../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { createPdp, entityRef, formatUid, PdpError, recordDecision } from "./index.ts";
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

const FALLBACK_DIGEST = "2f600a98a05b66eadd93b11605e6f82102236a634f91a7fa74df0dea6da97caf";

interface DecisionRow extends QueryResultRow {
  decision_id: string;
  action: string;
  principal: string;
  resource: string;
  decision: string;
  errors: string[];
  request_digest: string;
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function bounded(text: string, limit: number): string {
  const clean = text.replaceAll("\u0000", "\uFFFD");
  if (clean.length <= limit) {
    return clean;
  }
  return `${clean.slice(0, limit - 17)}#${sha256Hex(clean).slice(0, 16)}`;
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

function validDecision(): Decision {
  return {
    decision: "deny",
    decisionId: "dec_valid",
    decidedAt: "2026-10-25T09:00:00.000Z",
    reasons: [],
    errors: ["PDP_REQUEST_INVALID"],
    policySetVersion: "a".repeat(64),
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

async function outcome<T>(promise: Promise<T>): Promise<T | unknown> {
  return promise.then(
    (value) => value,
    (error: unknown) => error,
  );
}

function spyTx(response: () => Promise<{ rowCount: number | null }>): {
  tx: TenantTx;
  queries: () => number;
} {
  let queries = 0;
  const tx = {
    query: () => {
      queries += 1;
      return response();
    },
  } as unknown as TenantTx;
  return { tx, queries: () => queries };
}

async function readRows(db: TestDatabase, ctx: TenantContext): Promise<DecisionRow[]> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query<DecisionRow>(
      `SELECT decision_id, action, principal, resource, decision, errors, request_digest
         FROM ursitoare.policy_decision
        ORDER BY decision_id`,
    );
    return result.rows;
  });
}

test("C-88454164 hostile text is bounded in the decision log", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const pdp = await makePdp();
    const req = baseRequest();
    req.action = `${"a".repeat(2500)}\u0000${"b".repeat(2499)}`;
    req.resource = { type: "Doc", id: "r".repeat(10000) };

    const decision = await pdp.check(req);
    assert.equal(decision.decision, "deny");
    assert.deepEqual(decision.errors, ["PDP_UNKNOWN_ACTION"]);

    const recorded = await outcome(recordIn(db, a, decision, req));
    assert.equal(recorded, true);

    const rows = await readRows(db, a);
    assert.deepEqual(rows, [
      {
        decision_id: decision.decisionId,
        action: bounded(req.action, 128),
        principal: 'User::"alice"',
        resource: bounded(formatUid(req.resource), 512),
        decision: "deny",
        errors: ["PDP_UNKNOWN_ACTION"],
        request_digest: requestDigest(req),
      },
    ]);

    const row = rows[0];
    assert.ok(row !== undefined);
    assert.equal(row.action.length, 128);
    assert.equal(row.resource.length, 512);
    assert.ok(!row.action.includes("\u0000"));
    assert.ok(!row.resource.includes("\u0000"));
  } finally {
    await db.close();
  }
});

test("C-f837602a a request that is not a request is still recorded", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const pdp = await makePdp();

    const nullRequest = null as unknown as PolicyRequest;
    const nullDecision = await pdp.check(nullRequest);
    assert.equal(nullDecision.decision, "deny");
    assert.deepEqual(nullDecision.errors, ["PDP_REQUEST_INVALID"]);

    const throwingRequest = baseRequest();
    Object.defineProperty(throwingRequest, "context", {
      get(): never {
        throw new Error("boom");
      },
      enumerable: true,
    });
    const throwingDecision = await pdp.check(throwingRequest);
    assert.equal(throwingDecision.decision, "deny");
    assert.deepEqual(throwingDecision.errors, ["PDP_REQUEST_INVALID"]);

    const firstRecorded = await outcome(recordIn(db, a, nullDecision, nullRequest));
    assert.equal(firstRecorded, true);
    const secondRecorded = await outcome(recordIn(db, a, throwingDecision, throwingRequest));
    assert.equal(secondRecorded, true);

    const rows = await readRows(db, a);
    assert.deepEqual(rows, [
      {
        decision_id: nullDecision.decisionId,
        action: "",
        principal: "(invalid)",
        resource: "(invalid)",
        decision: "deny",
        errors: ["PDP_REQUEST_INVALID"],
        request_digest: FALLBACK_DIGEST,
      },
      {
        decision_id: throwingDecision.decisionId,
        action: "read",
        principal: 'User::"alice"',
        resource: 'Doc::"d1"',
        decision: "deny",
        errors: ["PDP_REQUEST_INVALID"],
        request_digest: FALLBACK_DIGEST,
      },
    ]);
  } finally {
    await db.close();
  }
});

test("C-12c8f3d3 a write for another tenant is refused", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const pdp = await makePdp();
    const req = baseRequest();
    const decision = await pdp.check(req);
    assert.equal(decision.decision, "allow");

    const result = await outcome(
      withTenantTx(db.appPool, b, (tx) => recordDecision(tx, a, decision, req)),
    );
    assert.ok(result instanceof PdpError);
    assert.equal(result.code, "PDP_RECORD_FAILED");
    assert.equal(result.details.sqlstate, "42501");

    const rows = await readRows(db, a);
    assert.deepEqual(rows, []);
  } finally {
    await db.close();
  }
});

test("C-2df1f84d invalid decisions are refused and insert failures are mapped", async () => {
  const tenant: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
  const req = baseRequest();
  const decision = validDecision();

  const cases: readonly { reason: string; decision: Decision; ctx: TenantContext }[] = [
    {
      reason: "decision",
      decision: { ...decision, decision: "maybe" as unknown as Decision["decision"] },
      ctx: tenant,
    },
    {
      reason: "decided_at",
      decision: { ...decision, decidedAt: "yesterday" },
      ctx: tenant,
    },
    {
      reason: "policy_set_version",
      decision: { ...decision, policySetVersion: "abc" },
      ctx: tenant,
    },
    {
      reason: "tenant_id",
      decision,
      ctx: { tenantId: "a/b", reviewProfile: "solo" },
    },
  ];

  for (const entry of cases) {
    const spy = spyTx(() => Promise.resolve({ rowCount: 1 }));
    const result = await outcome(recordDecision(spy.tx, entry.ctx, entry.decision, req));
    assert.ok(result instanceof PdpError, entry.reason);
    assert.equal(result.code, "PDP_RECORD_INVALID", entry.reason);
    assert.equal(result.details.reason, entry.reason);
    assert.equal(spy.queries(), 0, `${entry.reason} is validated before any SQL runs`);
  }

  const spy = spyTx(() =>
    Promise.reject(
      Object.assign(new Error("terminating connection postgres://u:ZZ-DSN@h/db"), {
        code: "57P01",
      }),
    ),
  );
  const result = await outcome(recordDecision(spy.tx, tenant, decision, req));
  assert.ok(result instanceof PdpError);
  assert.equal(result.code, "PDP_RECORD_FAILED");
  assert.equal(result.details.sqlstate, "57P01");
  assert.ok(!result.message.includes("ZZ-DSN"));
  assert.equal(spy.queries(), 1);
});
