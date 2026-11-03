import assert from "node:assert/strict";
import { test } from "node:test";

import type pg from "pg";

import { createLogger } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { currentWorkflowId, launchDurable, registerWorkflow, runStep } from "./index.ts";
import type { DurableJson, DurableRuntime, WorkflowInfo, WorkflowState } from "./index.ts";

const silent: LogDestination = {
  write(): void {
    // discarded
  },
};

const TERMINAL: readonly WorkflowState[] = [
  "SUCCESS",
  "ERROR",
  "CANCELLED",
  "MAX_RECOVERY_ATTEMPTS_EXCEEDED",
];

interface ReadInput {
  tenantId: string | null;
  userId: string;
}

interface ProbeResult {
  ids: string[];
  user: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForState(
  rt: DurableRuntime,
  id: string,
  states: readonly WorkflowState[],
  timeoutMs = 20000,
): Promise<WorkflowInfo> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const info = await rt.status(id);
    if (info !== null && states.includes(info.state)) {
      return info;
    }
    if (Date.now() >= deadline) {
      assert.fail(`workflow ${id} did not reach ${states.join("/")}`);
    }
    await delay(20);
  }
}

let appPool: pg.Pool | undefined;
const results = new Map<string, ProbeResult>();

async function readWorkflow(input: DurableJson): Promise<DurableJson> {
  const tenantId = (input as unknown as ReadInput).tenantId;
  const workflowId = currentWorkflowId();
  const result = await runStep("read", async (): Promise<DurableJson> => {
    const pool = appPool;
    if (pool === undefined) {
      throw new Error("the app pool is not set");
    }
    if (tenantId === null) {
      const user = await pool.query<{ user: string }>("SELECT current_user AS user");
      const ids = await pool.query<{ tenant_id: string }>(
        "SELECT tenant_id FROM ursitoare.rls_probe ORDER BY tenant_id",
      );
      return { ids: ids.rows.map((row) => row.tenant_id), user: user.rows[0]?.user ?? "" };
    }
    return withTenantTx(pool, { tenantId, reviewProfile: "solo" }, async (tx) => {
      const user = await tx.query<{ user: string }>("SELECT current_user AS user");
      const ids = await tx.query<{ tenant_id: string }>(
        "SELECT tenant_id FROM ursitoare.rls_probe ORDER BY tenant_id",
      );
      return { ids: ids.rows.map((row) => row.tenant_id), user: user.rows[0]?.user ?? "" };
    });
  });
  results.set(workflowId, result as unknown as ProbeResult);
  return 0;
}

test("C-c27b0f1a row level security holds inside durable steps", async () => {
  results.clear();
  const db = await withTestDatabase();
  const logger = createLogger({ level: "silent", destination: silent });
  appPool = db.appPool;
  let runtime: DurableRuntime | undefined;
  try {
    await seedTwoTenants(db);
    await db.ownerPool.query("CREATE TABLE ursitoare.rls_probe (tenant_id text)");
    await db.ownerPool.query(
      "INSERT INTO ursitoare.rls_probe (tenant_id) VALUES ('tenant_a'), ('tenant_b')",
    );
    await db.ownerPool.query("ALTER TABLE ursitoare.rls_probe ENABLE ROW LEVEL SECURITY");
    await db.ownerPool.query("ALTER TABLE ursitoare.rls_probe FORCE ROW LEVEL SECURITY");
    await db.ownerPool.query(
      "CREATE POLICY tenant_isolation ON ursitoare.rls_probe USING (tenant_id = current_setting('app.tenant_id', true))",
    );
    await db.ownerPool.query("GRANT SELECT ON ursitoare.rls_probe TO ursitoare_app");

    assert.doesNotThrow(() => {
      registerWorkflow("t.read", readWorkflow);
    });

    const rt = await launchDurable({
      endpoint: db.appEndpoint,
      logger,
      pollingIntervalMs: 20,
    });
    runtime = rt;

    const cases: [string, string | null][] = [
      ["r-a", "tenant_a"],
      ["r-b", "tenant_b"],
      ["r-none", null],
    ];
    for (const [id, tenantId] of cases) {
      await rt.enqueue("t.read", id, { tenantId, userId: "u1" });
      const info = await waitForState(rt, id, TERMINAL);
      assert.equal(info.state, "SUCCESS", `the read workflow ${id} succeeded`);
    }

    assert.deepEqual(results.get("r-a"), { ids: ["tenant_a"], user: "ursitoare_app" });
    assert.deepEqual(results.get("r-b"), { ids: ["tenant_b"], user: "ursitoare_app" });
    assert.deepEqual(results.get("r-none"), { ids: [], user: "ursitoare_app" });
  } finally {
    await runtime?.shutdown().catch(() => undefined);
    appPool = undefined;
    await db.close();
  }
});
