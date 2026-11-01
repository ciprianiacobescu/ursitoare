import assert from "node:assert/strict";
import { test } from "node:test";

import { canonicalizeFlow, contentHash, parseFlowText } from "../../authoring/index.ts";
import type { FlowFormat } from "../../authoring/index.ts";
import type { AuditEventRecord } from "../../audit/index.ts";
import { listAuditEvents } from "../../audit/index.ts";
import { fixedClock } from "../../core/index.ts";
import { withTenantTx, type TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { readTestFlowText } from "../../../test/support/catalogue/flows.ts";
import { FlowError, type FlowErrorCode } from "./errors.ts";
import { getFlow, type FlowActor, type VersionDetail, type VersionSummary } from "./flows.ts";
import { getVersion, listVersions, saveFlowVersion } from "./versions.ts";

const SAVED_AT = "2026-10-25T09:00:00.000000Z";
const SEEDED_AT = "2026-10-25T08:00:00.000000Z";
const ALICE: FlowActor = { kind: "user", userId: "alice" };

function parsedDoc(text: string, format: FlowFormat): Record<string, unknown> {
  const parsed = parseFlowText(text, format);
  assert.ok(parsed.ok, "the test text parses");
  const doc = parsed.doc;
  assert.ok(typeof doc === "object" && doc !== null && !Array.isArray(doc));
  return doc as Record<string, unknown>;
}

function t1(): string {
  return readTestFlowText("rf-1-core");
}

function t1Json(): string {
  const doc = parsedDoc(t1(), "yaml");
  const reversed: Record<string, unknown> = {};
  for (const key of Object.keys(doc).reverse()) {
    reversed[key] = doc[key];
  }
  return JSON.stringify(reversed);
}

function t2Json(): string {
  return JSON.stringify({ ...parsedDoc(t1(), "yaml"), description: "second" });
}

async function resolved<T>(call: () => Promise<T>): Promise<T> {
  let result: T | undefined;
  await assert.doesNotReject(async () => {
    result = await call();
  });
  assert.notEqual(result, undefined, "the call returned a result");
  return result as T;
}

function flowTextError(
  details: Record<string, unknown>,
  code: FlowErrorCode = "FLOW_TEXT_INVALID",
): (error: unknown) => boolean {
  return (error: unknown) => {
    assert.ok(error instanceof FlowError, "the error is a FlowError");
    assert.equal(error.code, code);
    assert.equal(error.details?.reason, details["reason"]);
    if (details["code"] !== undefined) {
      assert.equal(error.details?.code, details["code"]);
    }
    return true;
  };
}

async function seedFlows(
  db: TestDatabase,
  ctx: TenantContext,
  flowIds: readonly string[],
): Promise<void> {
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
    for (const flowId of flowIds) {
      await tx.query(
        `INSERT INTO ursitoare.flow (tenant_id, flow_id, owner_team, created_by, created_at, last_no)
         VALUES ($1, $2, 'finance', 'alice', $3, 0)`,
        [ctx.tenantId, flowId, SEEDED_AT],
      );
    }
  });
}

function save(
  db: TestDatabase,
  ctx: TenantContext,
  flowId: string,
  format: FlowFormat,
  text: string,
): Promise<{ version: VersionSummary; created: boolean }> {
  return resolved(() =>
    withTenantTx(db.appPool, ctx, (tx) =>
      saveFlowVersion(tx, ctx, { flowId, format, text }, ALICE, {
        clock: fixedClock(SAVED_AT),
      }),
    ),
  );
}

async function detail(
  db: TestDatabase,
  ctx: TenantContext,
  flowId: string,
  hash: string,
): Promise<VersionDetail | null> {
  let result: VersionDetail | null | undefined;
  await assert.doesNotReject(async () => {
    result = await withTenantTx(db.appPool, ctx, (tx) => getVersion(tx, ctx, flowId, hash));
  });
  return result ?? null;
}

async function eventsOf(
  db: TestDatabase,
  ctx: TenantContext,
  eventType: string,
): Promise<AuditEventRecord[]> {
  return listAuditEvents(db.appPool, ctx, { filter: { eventType }, order: "asc", limit: 50 });
}

test("C-a41d1eac saveFlowVersion stores a draft and answers the same content again", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedFlows(db, a, ["rf-1-core", "other"]);
    const hash = contentHash(parsedDoc(t1(), "yaml"));

    const first = await save(db, a, "rf-1-core", "yaml", t1());
    assert.equal(first.created, true);
    assert.deepEqual(first.version, {
      flowId: "rf-1-core",
      number: 1,
      hash,
      state: "draft",
      surface: "yaml",
      author: "alice",
      requestedBy: null,
      createdAt: SAVED_AT,
      validatedAt: null,
      validationOk: null,
    });

    const again = await save(db, a, "rf-1-core", "yaml", t1());
    assert.equal(again.created, false);
    assert.deepEqual(again.version, first.version);

    const twin = await save(db, a, "rf-1-core", "json", t1Json());
    assert.equal(twin.created, false);
    assert.deepEqual(twin.version, first.version);
    assert.equal(twin.version.surface, "yaml");

    const events = await eventsOf(db, a, "flow.version_saved");
    assert.equal(events.length, 1, "existing content appends no event");
  } finally {
    await db.close();
  }
});

test("C-a41d1eac saveFlowVersion numbers versions and getFlow shows the latest", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedFlows(db, a, ["rf-1-core"]);

    const one = await save(db, a, "rf-1-core", "yaml", t1());
    const two = await save(db, a, "rf-1-core", "json", t2Json());
    assert.equal(one.version.number, 1);
    assert.equal(two.created, true);
    assert.equal(two.version.number, 2);
    assert.equal(two.version.surface, "json");
    assert.notEqual(two.version.hash, one.version.hash);

    const flow = await resolved(() => withTenantTx(db.appPool, a, (tx) => getFlow(tx, a, "rf-1-core")));
    assert.equal(flow?.versionCount, 2);
    assert.deepEqual(flow?.latest, two.version);
  } finally {
    await db.close();
  }
});

test("C-a41d1eac listVersions pages newest first with next", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedFlows(db, a, ["rf-1-core", "other"]);
    await save(db, a, "rf-1-core", "yaml", t1());
    await save(db, a, "rf-1-core", "json", t2Json());

    const page = (flowId: string, limit: number, after?: number) =>
      resolved(() =>
        withTenantTx(db.appPool, a, (tx) => listVersions(tx, a, { flowId, limit, after })),
      );

    const first = await page("rf-1-core", 1);
    assert.deepEqual(
      first.versions.map((v) => v.number),
      [2],
    );
    assert.equal(first.next, 2);

    const second = await page("rf-1-core", 1, first.next ?? undefined);
    assert.deepEqual(
      second.versions.map((v) => v.number),
      [1],
    );
    assert.equal(second.next, null);

    const other = await page("other", 5);
    assert.deepEqual(other.versions, []);
    assert.equal(other.next, null);
  } finally {
    await db.close();
  }
});

test("C-a41d1eac getVersion returns text, canonical and no result for the right flow only", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedFlows(db, a, ["rf-1-core", "other"]);
    const saved = await save(db, a, "rf-1-core", "yaml", t1());
    const hash = saved.version.hash;

    const found = await detail(db, a, "rf-1-core", hash);
    assert.notEqual(found, null);
    assert.equal(found?.text, t1());
    assert.equal(found?.number, 1);
    assert.equal(found?.hash, hash);
    assert.equal(found?.result, null);
    const canonical = canonicalizeFlow(parsedDoc(t1(), "yaml"));
    assert.deepEqual(found?.canonical, canonical);
    assert.equal(contentHash(found?.canonical), hash);

    assert.equal(await detail(db, a, "other", hash), null, "another flow");
    assert.equal(await detail(db, a, "rf-1-core", "sha256:" + "0".repeat(64)), null, "unknown");
    assert.equal(await detail(db, a, "rf-1-core", "sha256:zz"), null, "malformed");
  } finally {
    await db.close();
  }
});

test("C-042f1711 saveFlowVersion refuses text that is not a flow document", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedFlows(db, a, ["rf-1-core", "other"]);
    const otherDoc = JSON.stringify({ ...parsedDoc(t1(), "yaml"), flow: "other" });
    const noFlow = parsedDoc(t1(), "yaml");
    delete noFlow["flow"];

    const cases: [FlowFormat, string, Record<string, unknown>][] = [
      ["yaml", "a: [1", { reason: "parse", code: "FORMAT_YAML_SYNTAX" }],
      ["json", "{", { reason: "parse", code: "FORMAT_JSON_SYNTAX" }],
      ["yaml", "[1]", { reason: "not_object" }],
      ["yaml", "# only a comment", { reason: "not_object" }],
      ["json", otherDoc, { reason: "name_mismatch" }],
      ["json", JSON.stringify(noFlow), { reason: "name_mismatch" }],
      ["yaml", "# \u0000\n" + t1(), { reason: "parse", code: "FORMAT_NOT_JSON" }],
    ];
    for (const [format, text, details] of cases) {
      await assert.rejects(
        withTenantTx(db.appPool, a, (tx) =>
          saveFlowVersion(tx, a, { flowId: "rf-1-core", format, text }, ALICE),
        ),
        flowTextError(details),
        `${String(details["reason"])} for ${text.slice(0, 12)}`,
      );
    }

    const flow = await resolved(() => withTenantTx(db.appPool, a, (tx) => getFlow(tx, a, "rf-1-core")));
    assert.equal(flow?.versionCount, 0);
    assert.equal((await eventsOf(db, a, "flow.version_saved")).length, 0);
  } finally {
    await db.close();
  }
});

test("C-042f1711 saveFlowVersion refuses a text over the size limit", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedFlows(db, a, ["rf-1-core"]);

    const text = "# " + "x".repeat(1_048_577 - 3) + "\n";
    assert.equal(Buffer.byteLength(text), 1_048_577);
    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        saveFlowVersion(tx, a, { flowId: "rf-1-core", format: "yaml", text }, ALICE),
      ),
      flowTextError({ reason: "parse", code: "FORMAT_TOO_LARGE" }),
    );
    assert.equal((await eventsOf(db, a, "flow.version_saved")).length, 0);
  } finally {
    await db.close();
  }
});

test("C-a41d1eac saveFlowVersion refuses an unknown flow and a bad flow id", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedFlows(db, a, ["rf-1-core"]);

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        saveFlowVersion(tx, a, { flowId: "ghost", format: "yaml", text: t1() }, ALICE),
      ),
      (error: unknown) => {
        assert.ok(error instanceof FlowError);
        assert.equal(error.code, "FLOW_NOT_FOUND");
        return true;
      },
    );
    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        saveFlowVersion(tx, a, { flowId: "Bad_Id", format: "yaml", text: t1() }, ALICE),
      ),
      (error: unknown) => {
        assert.ok(error instanceof FlowError);
        assert.equal(error.code, "FLOW_INVALID");
        return true;
      },
    );
  } finally {
    await db.close();
  }
});

test("C-4d1b43b3 concurrent saves of the same text store one version", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedFlows(db, a, ["rf-1-core"]);

    const results = await resolved(() => Promise.all([
      withTenantTx(db.appPool, a, (tx) =>
        saveFlowVersion(tx, a, { flowId: "rf-1-core", format: "yaml", text: t1() }, ALICE),
      ),
      withTenantTx(db.appPool, a, (tx) =>
        saveFlowVersion(tx, a, { flowId: "rf-1-core", format: "yaml", text: t1() }, ALICE),
      ),
    ]));
    assert.deepEqual(results.map((r) => r.created).sort(), [false, true]);
    assert.deepEqual(
      results.map((r) => r.version.number),
      [1, 1],
    );
    assert.equal((await eventsOf(db, a, "flow.version_saved")).length, 1);
  } finally {
    await db.close();
  }
});

test("C-4d1b43b3 concurrent saves of different texts are numbered gaplessly", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedFlows(db, a, ["rf-1-core"]);
    await save(db, a, "rf-1-core", "yaml", t1());

    const second = JSON.stringify({ ...parsedDoc(t1(), "yaml"), description: "second" });
    const third = JSON.stringify({ ...parsedDoc(t1(), "yaml"), description: "third" });
    const results = await resolved(() => Promise.all([
      withTenantTx(db.appPool, a, (tx) =>
        saveFlowVersion(tx, a, { flowId: "rf-1-core", format: "json", text: second }, ALICE),
      ),
      withTenantTx(db.appPool, a, (tx) =>
        saveFlowVersion(tx, a, { flowId: "rf-1-core", format: "json", text: third }, ALICE),
      ),
    ]));
    assert.deepEqual(results.map((r) => r.version.number).sort(), [2, 3]);
    assert.deepEqual(
      results.map((r) => r.created),
      [true, true],
    );
  } finally {
    await db.close();
  }
});

test("C-94dc4b8c saveFlowVersion appends one flow.version_saved event", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedFlows(db, a, ["rf-1-core"]);

    const saved = await save(db, a, "rf-1-core", "yaml", t1());
    await save(db, a, "rf-1-core", "yaml", t1());

    const events = await eventsOf(db, a, "flow.version_saved");
    assert.equal(events.length, 1);
    const [event] = events;
    assert.deepEqual(event?.target, { kind: "flow_version", id: saved.version.hash });
    assert.deepEqual(event?.actor, { kind: "user", id: "alice" });
    assert.deepEqual(event?.payload, { flowId: "rf-1-core", number: 1, surface: "yaml" });
    assert.equal(event?.at, SAVED_AT);
  } finally {
    await db.close();
  }
});

test("C-94dc4b8c a failed audit append rolls the save back", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedFlows(db, a, ["rf-1-core"]);
    await save(db, a, "rf-1-core", "yaml", t1());

    await assert.rejects(
      withTenantTx(db.appPool, a, async (tx) => {
        const guarded = {
          ...tx,
          query: (sql: string, values?: unknown[]) => {
            if (sql.includes("audit_")) {
              return Promise.reject(new Error("audit down"));
            }
            return tx.query(sql, values);
          },
        } as typeof tx;
        return saveFlowVersion(
          guarded,
          a,
          { flowId: "rf-1-core", format: "json", text: t2Json() },
          ALICE,
        );
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "audit down");
        return true;
      },
    );

    const flow = await resolved(() => withTenantTx(db.appPool, a, (tx) => getFlow(tx, a, "rf-1-core")));
    assert.equal(flow?.versionCount, 1);
    assert.equal((await eventsOf(db, a, "flow.version_saved")).length, 1);
  } finally {
    await db.close();
  }
});
