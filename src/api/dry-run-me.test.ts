import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine, defaultSrcDir } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registerMeRoute } from "./me.ts";
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

interface MeBody {
  capabilities: string[];
}

function silentLogger() {
  return createLogger({ level: "silent", destination: silentDestination });
}

async function defaultEngine(clock: ReturnType<typeof fixedClock>): Promise<PolicyEngine> {
  return createPolicyEngine({
    srcDir: defaultSrcDir(),
    clock,
    ids: sequentialIds(300),
    logger: silentLogger(),
  });
}

test("C-e792e555 dry_run_flow is a capability of the me route for authors only", async () => {
  const db = await withTestDatabase();
  const clock = fixedClock(NOW);
  const { a } = await seedTwoTenants(db);
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
  const sessions: { [name: string]: Session } = {};
  for (const name of ["alice", "bob", "dave", "carol"]) {
    sessions[name] = await createTestSession(db, a, name, clock);
  }

  const engine = await defaultEngine(clock);
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: silentLogger(),
    tracer: noopTracer,
  });
  installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  registerMeRoute(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });

  try {
    const cases: readonly (readonly [string, boolean])[] = [
      ["alice", true],
      ["bob", false],
      ["dave", true],
      ["carol", false],
    ];
    for (const [name, expected] of cases) {
      const session = sessions[name];
      assert.ok(session !== undefined, `session for ${name}`);
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/me",
        headers: { cookie: session.cookie },
      });
      assert.equal(response.statusCode, 200, `me for ${name}`);
      const body = response.json() as MeBody;
      assert.ok(Array.isArray(body.capabilities), `capabilities for ${name}`);
      assert.equal(
        body.capabilities.includes("dry_run_flow"),
        expected,
        `dry_run_flow capability for ${name}`,
      );
    }
  } finally {
    await server.close();
    await db.close();
  }
});
