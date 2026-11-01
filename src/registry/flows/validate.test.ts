import assert from "node:assert/strict";
import { test } from "node:test";

import { canonicalizeFlow, emptyCatalogue, validateFlow } from "../../authoring/index.ts";
import type { Catalogue, FlowFormat } from "../../authoring/index.ts";
import { listAuditEvents } from "../../audit/index.ts";
import type { AuditEventRecord } from "../../audit/index.ts";
import { fixedClock } from "../../core/index.ts";
import { withTenantTx, type TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { readTestFlowText } from "../../../test/support/catalogue/flows.ts";
import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { FlowError } from "./errors.ts";
import type { FlowActor, VersionSummary } from "./flows.ts";
import { getVersion, saveFlowVersion } from "./versions.ts";
import { validateVersion } from "./validate.ts";

const T0 = "2026-10-25T09:00:00.000000Z";
const T1 = "2026-10-25T09:01:00.000000Z";
const SEEDED_AT = "2026-10-25T08:00:00.000000Z";
const ALICE: FlowActor = { kind: "user", userId: "alice" };

const DEMO_FLOW = JSON.stringify({
  ursitoare: "0.1",
  flow: "demo-flow",
  version: "1.0.0",
  start: "a",
  nodes: {
    a: { kind: "block", uses: "nope.missing@1", next: "done" },
    done: { kind: "end", status: "completed" },
  },
});

async function seed(db: TestDatabase, ctx: TenantContext, flows: readonly string[]): Promise<void> {
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, display_name)
       VALUES ($1, 'alice', 'human', 'alice') ON CONFLICT DO NOTHING`,
      [ctx.tenantId],
    );
    await tx.query(
      "INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1, 'finance') ON CONFLICT DO NOTHING",
      [ctx.tenantId],
    );
    for (const flowId of flows) {
      await tx.query(
        `INSERT INTO ursitoare.flow (tenant_id, flow_id, owner_team, created_by, created_at, last_no)
         VALUES ($1, $2, 'finance', 'alice', $3, 0)`,
        [ctx.tenantId, flowId, SEEDED_AT],
      );
    }
  });
}

async function save(
  db: TestDatabase,
  ctx: TenantContext,
  flowId: string,
  format: FlowFormat,
  text: string,
): Promise<VersionSummary> {
  const saved = await withTenantTx(db.appPool, ctx, (tx) =>
    saveFlowVersion(tx, ctx, { flowId, format, text }, ALICE, { clock: fixedClock(T0) }),
  );
  return saved.version;
}

function attempt(
  db: TestDatabase,
  ctx: TenantContext,
  flowId: string,
  hash: string,
  catalogue: Catalogue,
  at: string,
) {
  return withTenantTx(db.appPool, ctx, (tx) =>
    validateVersion(tx, ctx, { flowId, hash, catalogue }, ALICE, { clock: fixedClock(at) }),
  );
}

async function validate(
  db: TestDatabase,
  ctx: TenantContext,
  flowId: string,
  hash: string,
  catalogue: Catalogue,
  at: string,
) {
  let out: Awaited<ReturnType<typeof attempt>> | undefined;
  await assert.doesNotReject(async () => {
    out = await attempt(db, ctx, flowId, hash, catalogue, at);
  });
  assert.ok(out, "validateVersion answered");
  return out;
}

async function events(db: TestDatabase, ctx: TenantContext): Promise<AuditEventRecord[]> {
  return listAuditEvents(db.appPool, ctx, {
    filter: { eventType: "flow.version_validated" },
    order: "asc",
    limit: 50,
  });
}

test("C-5cccca9d validateVersion stores an ok result and promotes to validated", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seed(db, a, ["rf-1-core"]);
    const v = await save(db, a, "rf-1-core", "yaml", readTestFlowText("rf-1-core"));
    const catalogue = loadTestCatalogue();

    const out = await validate(db, a, "rf-1-core", v.hash, catalogue, T0);
    assert.equal(out.version.state, "validated");
    assert.equal(out.version.validationOk, true);
    assert.equal(out.version.validatedAt, T0);
    assert.equal(out.result.ok, true);

    const read = await withTenantTx(db.appPool, a, (tx) => getVersion(tx, a, "rf-1-core", v.hash));
    assert.ok(read);
    assert.deepEqual(out.result, validateFlow(canonicalizeFlow(read.canonical), catalogue));
    assert.deepEqual(read.result, out.result);
    assert.equal(read.validatedAt, T0);
  } finally {
    await db.close();
  }
});

test("C-5cccca9d validateVersion keeps a failing version a draft and stores the issues", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seed(db, a, ["demo-flow"]);
    const v = await save(db, a, "demo-flow", "json", DEMO_FLOW);

    const out = await validate(db, a, "demo-flow", v.hash, loadTestCatalogue(), T0);
    assert.equal(out.version.state, "draft");
    assert.equal(out.version.validationOk, false);
    assert.equal(out.result.ok, false);
    assert.ok(out.result.errors.length >= 1);

    const read = await withTenantTx(db.appPool, a, (tx) => getVersion(tx, a, "demo-flow", v.hash));
    assert.deepEqual(read?.result, out.result);
    assert.equal(read?.validatedAt, T0);
  } finally {
    await db.close();
  }
});

test("C-e8b0edd9 a later validation replaces the earlier result and can demote", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seed(db, a, ["rf-1-core"]);
    const v = await save(db, a, "rf-1-core", "yaml", readTestFlowText("rf-1-core"));
    await validate(db, a, "rf-1-core", v.hash, loadTestCatalogue(), T0);
    const before = await withTenantTx(db.appPool, a, (tx) => getVersion(tx, a, "rf-1-core", v.hash));
    assert.equal(before?.state, "validated");

    const out = await validate(db, a, "rf-1-core", v.hash, emptyCatalogue, T1);
    assert.equal(out.version.state, "draft");
    assert.equal(out.version.validationOk, false);
    assert.equal(out.version.validatedAt, T1);

    const after = await withTenantTx(db.appPool, a, (tx) => getVersion(tx, a, "rf-1-core", v.hash));
    assert.deepEqual(after?.result, out.result);
    assert.equal(after?.hash, before?.hash);
    assert.equal(after?.text, before?.text);
    assert.deepEqual(after?.canonical, before?.canonical);
    assert.equal((await events(db, a)).length, 2);
  } finally {
    await db.close();
  }
});

test("C-94dc4b8c validateVersion appends one event with the counts and the state", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seed(db, a, ["rf-1-core"]);
    const v = await save(db, a, "rf-1-core", "yaml", readTestFlowText("rf-1-core"));
    const out = await validate(db, a, "rf-1-core", v.hash, loadTestCatalogue(), T0);

    const found = await events(db, a);
    assert.equal(found.length, 1);
    assert.deepEqual(found[0]?.target, { kind: "flow_version", id: v.hash });
    assert.deepEqual(found[0]?.actor, { kind: "user", id: "alice" });
    assert.deepEqual(found[0]?.payload, {
      flowId: "rf-1-core",
      ok: true,
      errors: 0,
      warnings: out.result.warnings.length,
      state: "validated",
    });
  } finally {
    await db.close();
  }
});

test("C-920a230a validateVersion refuses a malformed hash and an unknown or foreign version", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seed(db, a, ["rf-1-core", "other"]);
    const v = await save(db, a, "rf-1-core", "yaml", readTestFlowText("rf-1-core"));
    const catalogue = loadTestCatalogue();

    await assert.rejects(attempt(db, a, "rf-1-core", "sha256:zz", catalogue, T0), (error: unknown) => {
      assert.ok(error instanceof FlowError);
      assert.equal(error.code, "FLOW_INVALID");
      return true;
    });
    const unknown = "sha256:" + "0".repeat(64);
    for (const [flowId, hash] of [
      ["rf-1-core", unknown],
      ["other", v.hash],
    ] as const) {
      await assert.rejects(attempt(db, a, flowId, hash, catalogue, T0), (error: unknown) => {
        assert.ok(error instanceof FlowError);
        assert.equal(error.code, "FLOW_NOT_FOUND");
        return true;
      });
    }

    const read = await withTenantTx(db.appPool, a, (tx) => getVersion(tx, a, "rf-1-core", v.hash));
    assert.equal(read?.validatedAt, null);
    assert.equal((await events(db, a)).length, 0);
    // a real answer in the same test: the valid call works
    const ok = await validate(db, a, "rf-1-core", v.hash, catalogue, T0);
    assert.equal(ok.result.ok, true);
  } finally {
    await db.close();
  }
});

test("C-5cccca9d C-e8b0edd9 a state outside draft and validated is left alone while the result is stored", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seed(db, a, ["rf-1-core"]);
    const v = await save(db, a, "rf-1-core", "yaml", readTestFlowText("rf-1-core"));
    await withTenantTx(db.ownerPool, a, (tx) =>
      tx.query(
        "UPDATE ursitoare.flow_version SET state = 'reviewed' WHERE tenant_id = $1 AND content_hash = $2",
        [a.tenantId, v.hash],
      ),
    );

    const out = await validate(db, a, "rf-1-core", v.hash, loadTestCatalogue(), T1);
    assert.equal(out.version.state, "reviewed");
    assert.equal(out.result.ok, true);
    assert.equal(out.version.validatedAt, T1);

    const read = await withTenantTx(db.appPool, a, (tx) => getVersion(tx, a, "rf-1-core", v.hash));
    assert.equal(read?.state, "reviewed");
    assert.deepEqual(read?.result, out.result);
  } finally {
    await db.close();
  }
});
