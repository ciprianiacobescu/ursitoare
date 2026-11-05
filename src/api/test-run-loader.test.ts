import assert from "node:assert/strict";
import { test } from "node:test";

import type { Clock } from "../core/index.ts";
import { fixedClock } from "../core/index.ts";
import {
  createFlow,
  getVersion,
  saveFlowVersion,
  validateVersion,
} from "../registry/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import { payOnceCatalogue, payOnceVersion } from "../../test/support/crash/pay-once.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { seedMockRunFlows } from "../../test/support/mock-run-seed.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registryVersionLoader } from "./test-run-routes.ts";

const NOW = "2026-11-02T10:00:00Z";
const UNKNOWN_HASH = "sha256:" + "0".repeat(64);

async function seedPayOnce(
  db: TestDatabase,
  ctx: TenantContext,
  clock: Clock,
  userId: string,
): Promise<{ validated: string; draft: string }> {
  const actor = { kind: "user" as const, userId };
  const flow = payOnceVersion().flow;
  const validatedText = JSON.stringify(flow);
  const draftText = JSON.stringify({ ...flow, description: "draft" });
  let validated = "";
  let draft = "";
  await withTenantTx(db.appPool, ctx, async (tx) => {
    await createFlow(tx, ctx, { name: "pay-once", ownerTeam: "finance" }, actor, { clock });
    const first = await saveFlowVersion(
      tx,
      ctx,
      { flowId: "pay-once", format: "json", text: validatedText },
      actor,
      { clock },
    );
    validated = first.version.hash;
    await validateVersion(
      tx,
      ctx,
      { flowId: "pay-once", hash: validated, catalogue: payOnceCatalogue() },
      actor,
      { clock },
    );
    const second = await saveFlowVersion(
      tx,
      ctx,
      { flowId: "pay-once", format: "json", text: draftText },
      actor,
      { clock },
    );
    draft = second.version.hash;
  });
  return { validated, draft };
}

async function assertPayOnceLoader(
  db: TestDatabase,
  a: TenantContext,
  b: TenantContext,
  seed: { validated: string; draft: string },
): Promise<void> {
  const canonical = await withTenantTx(db.appPool, a, (tx) =>
    getVersion(tx, a, "pay-once", seed.validated),
  );
  assert.ok(canonical !== null, "the validated version is stored");

  const loader = registryVersionLoader(db.appPool);
  const validated = await loader(a, "pay-once", seed.validated);
  assert.deepEqual(validated, {
    flowId: "pay-once",
    hash: seed.validated,
    state: "validated",
    ownerTeam: "finance",
    flow: canonical.canonical,
  });
  assert.ok(validated !== null, "the validated version is loaded");
  assert.equal(validated.flow.start, "lookup");

  const draft = await loader(a, "pay-once", seed.draft);
  assert.ok(draft !== null, "the draft version is loaded");
  assert.equal(draft.flowId, "pay-once");
  assert.equal(draft.state, "draft");

  assert.equal(await loader(a, "pay-once", UNKNOWN_HASH), null);
  assert.equal(await loader(a, "pay-once", "sha256:xyz"), null);
  assert.equal(await loader(a, "ghost", seed.validated), null);
  assert.equal(await loader(b, "pay-once", seed.validated), null);
}

test("C-771f9778 the loader answers the versions seedMockRunFlows stored", async () => {
  await assert.doesNotReject(async () => {
    const db = await withTestDatabase();
    try {
      const { a, b } = await seedTwoTenants(db);
      const clock = fixedClock(NOW);
      const seed = await seedMockRunFlows(db, a, clock);
      assert.equal(typeof seed.validated, "string", "seed answers the validated hash");
      assert.equal(typeof seed.draft, "string", "seed answers the draft hash");
      await assertPayOnceLoader(db, a, b, seed);
    } finally {
      await db.close();
    }
  });
});

test("C-771f9778 the loader answers a validated and a draft version and refuses the rest", async () => {
  await assert.doesNotReject(async () => {
    const db = await withTestDatabase();
    try {
      const { a, b } = await seedTwoTenants(db);
      const clock = fixedClock(NOW);
      const users = await seedFlowActors(
        db,
        a,
        [{ subject: "alice", roles: ["author"], teams: ["finance"] }],
        clock,
      );
      const alice = users["alice"];
      assert.ok(alice !== undefined, "alice is seeded");
      const seed = await seedPayOnce(db, a, clock, alice);
      await assertPayOnceLoader(db, a, b, seed);
    } finally {
      await db.close();
    }
  });
});
