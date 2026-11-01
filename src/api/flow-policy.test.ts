import assert from "node:assert/strict";
import { test } from "node:test";

import { listAuditEvents } from "../audit/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine, defaultSrcDir } from "../pdp/index.ts";
import { createFlow } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { readTestFlowText } from "../../test/support/catalogue/flows.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registerFlowRoutes } from "./flow-routes.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-10-25T09:00:00Z";

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface Outcome {
  status: number;
  code: string | null;
  decisionId: boolean;
}

test("C-ce591faf who may call the flow routes is scoped to the owner team", async () => {
  const db = await withTestDatabase();
  const clock = fixedClock(NOW);
  const { a, b } = await seedTwoTenants(db);
  await seedFlowActors(
    db,
    a,
    [
      { subject: "alice", roles: ["author"], teams: ["finance"] },
      { subject: "bob", roles: ["approver"], teams: ["finance"] },
      { subject: "dave", roles: ["author"], teams: ["ops"] },
      { subject: "carol", roles: ["tenant_admin"], teams: [] },
    ],
    clock,
  );
  await seedFlowActors(db, b, [{ subject: "mallory", roles: ["author"], teams: ["finance"] }], clock);
  const sessions: Record<string, Session> = {};
  for (const name of ["alice", "bob", "dave", "carol"]) {
    sessions[name] = await createTestSession(db, a, name, clock);
  }
  sessions["mallory"] = await createTestSession(db, b, "mallory", clock);

  const engine = await createPolicyEngine({
    srcDir: defaultSrcDir(),
    clock,
    ids: sequentialIds(200),
    logger: createLogger({ level: "silent", destination: silentDestination }),
  });
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
  installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  registerFlowRoutes(server, {
    pool: db.appPool,
    clock,
    engineKey: { reveal: () => "k".repeat(64) },
  });

  try {
    const alice = sessions["alice"] as Session;
    await withTenantTx(db.appPool, a, async (tx) => {
      await createFlow(
        tx,
        a,
        { name: "rf-1-core", ownerTeam: "finance" },
        { kind: "user", userId: alice.userId },
        { clock },
      );
    });

    const text = readTestFlowText("rf-1-core");
    async function call(name: string, step: number): Promise<Outcome> {
      const s = sessions[name] as Session;
      const headers = { cookie: s.cookie, "x-csrf-token": s.csrfToken };
      let res;
      if (step === 0) {
        res = await server.inject({ method: "GET", url: "/api/v1/flows/rf-1-core", headers });
      } else if (step === 1) {
        res = await server.inject({
          method: "POST",
          url: "/api/v1/flows/rf-1-core/versions",
          headers,
          payload: { format: "yaml", text },
        });
      } else {
        res = await server.inject({
          method: "POST",
          url: "/api/v1/flows",
          headers,
          payload: step === 2
            ? { name: "ops-flow", ownerTeam: "ops" }
            : { name: "ghost-flow", ownerTeam: "nope" },
        });
      }
      let code: string | null = null;
      let decisionId = false;
      if (res.statusCode >= 400) {
        const body = res.json() as { error: { code: string; details?: { decisionId?: string } } };
        code = body.error.code;
        decisionId = typeof body.error.details?.decisionId === "string";
      }
      return { status: res.statusCode, code, decisionId };
    }

    const results: Record<string, number[]> = {};
    const outcomes: Record<string, Outcome[]> = {};
    for (const name of ["alice", "bob", "dave", "carol", "mallory"]) {
      outcomes[name] = [];
      for (let step = 0; step < 4; step += 1) {
        (outcomes[name] as Outcome[]).push(await call(name, step));
      }
      results[name] = (outcomes[name] as Outcome[]).map((o) => o.status);
    }

    assert.deepEqual(results["alice"], [200, 201, 403, 403]);
    assert.deepEqual(results["bob"], [200, 403, 403, 403]);
    assert.deepEqual(results["dave"], [403, 403, 201, 403]);
    assert.deepEqual(results["carol"], [403, 403, 403, 403]);
    assert.deepEqual(results["mallory"], [404, 404, 403, 403]);

    for (const name of Object.keys(outcomes)) {
      for (const o of outcomes[name] as Outcome[]) {
        if (o.status === 403) {
          assert.equal(o.code, "FORBIDDEN");
          assert.equal(o.decisionId, true);
        }
      }
    }
    assert.equal((outcomes["mallory"] as Outcome[])[0]?.code, "NOT_FOUND");
    assert.equal((outcomes["mallory"] as Outcome[])[1]?.code, "NOT_FOUND");

    async function eventTypes(ctx: TenantContext): Promise<string[]> {
      const events = await listAuditEvents(db.appPool, ctx, { filter: {}, order: "asc", limit: 200 });
      return events.map((event) => event.eventType);
    }
    const aEvents = await eventTypes(a);
    const bEvents = await eventTypes(b);
    assert.equal(aEvents.filter((t) => t === "authz.denied").length, 2 + 3 + 3 + 4);
    assert.equal(bEvents.filter((t) => t === "authz.denied").length, 2);
    assert.equal(aEvents.filter((t) => t === "flow.created").length, 2);
    assert.equal(aEvents.filter((t) => t === "flow.version_saved").length, 1);
    assert.equal(bEvents.filter((t) => t.startsWith("flow.")).length, 0);

    const rows = await withTenantTx(db.appPool, a, async (tx) =>
      tx.query("SELECT flow_id FROM ursitoare.flow ORDER BY flow_id", []),
    );
    assert.deepEqual(
      rows.rows.map((row) => (row as { flow_id: string }).flow_id),
      ["ops-flow", "rf-1-core"],
    );
    const bRows = await withTenantTx(db.appPool, b, async (tx) =>
      tx.query("SELECT flow_id FROM ursitoare.flow", []),
    );
    assert.equal(bRows.rows.length, 0);
  } finally {
    await server.close();
    await db.close();
  }
});
