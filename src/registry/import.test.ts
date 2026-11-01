import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { AuditError, canonicalize } from "../audit/index.ts";
import type { BlockDef } from "../authoring/index.ts";
import { fixedClock } from "../core/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { RegistryError, getBlockVersion, importCatalogue } from "./index.ts";
import type { BlockBinding, BlockImport, ImportReport } from "./index.ts";

const IMPORTED_AT = "2026-10-31T09:00:00.000000Z";

const ACTOR = { kind: "system", id: "operator:e2e-seed" } as const;

const clock = fixedClock("2026-10-31T09:00:00Z");

const I: BlockImport = {
  effect: "read",
  description: "Fetch an invoice.",
  input: {
    type: "object",
    properties: { invoice_id: { type: "string" } },
    required: ["invoice_id"],
  },
  output: {
    type: "object",
    properties: {
      raw_text: { type: "string" },
      vendor_name: { type: "string" },
    },
  },
  untrusted_fields: ["vendor_name", "raw_text"],
  data_class: "private",
};

const D: BlockImport = {
  effect: "read",
  input: {
    type: "object",
    properties: { url: { type: "string" } },
    required: ["url"],
  },
  output: { type: "object", properties: { content: { type: "string" } } },
  untrusted_fields: ["content"],
  data_class: "public",
  untrusted_result: true,
};

const M: BlockImport = {
  effect: "send",
  description: "Send a mail.",
  input: { type: "object", properties: { to: { type: "string" } } },
  output: { type: "object" },
  unsafe_to_retry: true,
  binding: { server: "mail", tool: "send" },
};

const I2: BlockImport = { ...I, description: "Other." };

const X: BlockImport = {
  effect: "pay",
  description: "X",
  input: { type: "object" },
  output: { type: "object" },
};

const Y: BlockImport = { ...X, description: "Y" };

const Z: BlockImport = { ...X, description: "Z" };

const normalizedI: BlockDef = {
  effect: "read",
  description: "Fetch an invoice.",
  input: {
    type: "object",
    properties: { invoice_id: { type: "string" } },
    required: ["invoice_id"],
  },
  output: {
    type: "object",
    properties: {
      raw_text: { type: "string" },
      vendor_name: { type: "string" },
    },
  },
  untrusted_fields: ["raw_text", "vendor_name"],
  data_class: "private",
  untrusted_result: false,
  unsafe_to_retry: false,
};

const normalizedD: BlockDef = {
  effect: "read",
  input: {
    type: "object",
    properties: { url: { type: "string" } },
    required: ["url"],
  },
  output: { type: "object", properties: { content: { type: "string" } } },
  untrusted_fields: ["content"],
  data_class: "public",
  untrusted_result: true,
  unsafe_to_retry: false,
};

const normalizedM: BlockDef = {
  effect: "send",
  description: "Send a mail.",
  input: { type: "object", properties: { to: { type: "string" } } },
  output: { type: "object" },
  untrusted_fields: [],
  untrusted_result: false,
  unsafe_to_retry: true,
};

const normalizedI2: BlockDef = {
  ...normalizedI,
  description: "Other.",
};

const normalizedX: BlockDef = {
  effect: "pay",
  description: "X",
  input: { type: "object" },
  output: { type: "object" },
  untrusted_fields: [],
  untrusted_result: false,
  unsafe_to_retry: false,
};

const normalizedY: BlockDef = {
  ...normalizedX,
  description: "Y",
};

const MAIL_BINDING: BlockBinding = { server: "mail", tool: "send" };

function deriveHash(def: BlockDef, binding: BlockBinding | null): string {
  const digest = createHash("sha256")
    .update(canonicalize({ binding, def }), "utf8")
    .digest("hex");
  return `sha256:${digest}`;
}

const HASH_I = deriveHash(normalizedI, null);
const HASH_D = deriveHash(normalizedD, null);
const HASH_M = deriveHash(normalizedM, MAIL_BINDING);
const HASH_I2 = deriveHash(normalizedI2, null);
const HASH_X = deriveHash(normalizedX, null);
const HASH_Y = deriveHash(normalizedY, null);

interface AuditRow {
  event_type: string;
  actor: unknown;
  target: unknown;
  payload: unknown;
}

async function runImport(
  pool: TenantPool,
  ctx: TenantContext,
  blocks: { [ref: string]: BlockImport },
  actor: { kind: "user" | "service" | "system"; id: string },
  opts?: { clock?: typeof clock },
): Promise<ImportReport> {
  let report: ImportReport | undefined;
  await assert.doesNotReject(
    async () => {
      report = await importCatalogue(pool, ctx, blocks, actor, opts);
    },
    "importCatalogue resolves",
  );
  assert.ok(report !== undefined, "importCatalogue returns a report");
  return report;
}

async function registryEvents(db: TestDatabase, ctx: TenantContext): Promise<AuditRow[]> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query<AuditRow>(
      `SELECT event_type, actor, target, payload FROM ursitoare.audit_event
       WHERE tenant_id = $1 AND event_type LIKE 'registry.%' ORDER BY seq`,
      [ctx.tenantId],
    );
    return result.rows;
  });
}

async function blockRefsIn(db: TestDatabase, ctx: TenantContext): Promise<string[]> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query<{ ref: string }>(
      `SELECT ref FROM ursitoare.block_version WHERE tenant_id = $1 ORDER BY ref COLLATE "C"`,
      [ctx.tenantId],
    );
    return result.rows.map((row) => row.ref);
  });
}

async function readVersion(
  db: TestDatabase,
  ctx: TenantContext,
  ref: string,
): Promise<Awaited<ReturnType<typeof getBlockVersion>>> {
  return withTenantTx(db.appPool, ctx, (tx) => getBlockVersion(tx, ctx, ref));
}

function registryFailure(
  code: "REGISTRY_INVALID" | "REGISTRY_SCHEMA_INVALID" | "REGISTRY_CONFLICT",
  details?: Record<string, string | number>,
): (error: unknown) => boolean {
  return (error: unknown) => {
    assert.ok(error instanceof RegistryError, "the error is a RegistryError");
    assert.equal(error.code, code);
    if (details !== undefined) {
      assert.deepEqual(error.details, details);
    }
    return true;
  };
}

function auditFailure(code: string): (error: unknown) => boolean {
  return (error: unknown) => {
    assert.ok(error instanceof AuditError, "the error is an AuditError");
    assert.equal(error.code, code);
    return true;
  };
}

function auditFailingPool(pool: TenantPool): TenantPool {
  const wrapped = {
    async connect() {
      const client = await pool.connect();
      return new Proxy(client, {
        get(target, property, receiver) {
          if (property === "query") {
            const raw = target as unknown as {
              query: (query: unknown, values?: unknown) => Promise<unknown>;
            };
            return (query: unknown, values?: unknown) => {
              const text =
                typeof query === "string"
                  ? query
                  : (query as { text?: unknown } | null)?.text;
              if (typeof text === "string" && text.includes("audit_")) {
                const error = new Error("audit statements are unavailable") as Error & {
                  code: string;
                };
                error.code = "XX000";
                return Promise.reject(error);
              }
              return raw.query(query, values);
            };
          }
          const value = Reflect.get(target, property, receiver) as unknown;
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    },
  };
  return wrapped as unknown as TenantPool;
}

test("C-c82d0207 an import adds versions and one event each", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);

    const report = await runImport(
      db.appPool,
      a,
      { "mail.send@1": M, "invoices.get@1": I, "docs.fetch@1": D },
      ACTOR,
      { clock },
    );
    assert.deepEqual(report, {
      imported: ["docs.fetch@1", "invoices.get@1", "mail.send@1"],
      unchanged: [],
    });

    const invoices = await readVersion(db, a, "invoices.get@1");
    assert.ok(invoices !== null, "invoices.get@1 is stored");
    assert.deepEqual(invoices.def, normalizedI);
    assert.equal(invoices.binding, null);
    assert.equal(invoices.contentHash, HASH_I);
    assert.equal(invoices.importedBy, "operator:e2e-seed");
    assert.equal(invoices.importedAt, IMPORTED_AT);

    const docs = await readVersion(db, a, "docs.fetch@1");
    assert.ok(docs !== null, "docs.fetch@1 is stored");
    assert.deepEqual(docs.def, normalizedD);
    assert.equal(docs.binding, null);
    assert.equal(docs.contentHash, HASH_D);
    assert.equal(docs.importedAt, IMPORTED_AT);

    const mail = await readVersion(db, a, "mail.send@1");
    assert.ok(mail !== null, "mail.send@1 is stored");
    assert.deepEqual(mail.def, normalizedM);
    assert.deepEqual(mail.binding, { server: "mail", tool: "send" });
    assert.equal(mail.contentHash, HASH_M);
    assert.equal(mail.importedAt, IMPORTED_AT);

    assert.deepEqual(await blockRefsIn(db, a), [
      "docs.fetch@1",
      "invoices.get@1",
      "mail.send@1",
    ]);

    const events = await registryEvents(db, a);
    assert.deepEqual(
      events.map((row) => row.event_type),
      ["registry.block_imported", "registry.block_imported", "registry.block_imported"],
    );
    const stored = [
      { ref: "docs.fetch@1", hash: HASH_D, effect: "read" },
      { ref: "invoices.get@1", hash: HASH_I, effect: "read" },
      { ref: "mail.send@1", hash: HASH_M, effect: "send" },
    ];
    for (const [index, expected] of stored.entries()) {
      const event = events[index];
      assert.ok(event !== undefined, "the audit event exists");
      assert.deepEqual(event.actor, { kind: "system", id: "operator:e2e-seed" });
      assert.deepEqual(event.target, { kind: "block", id: expected.ref });
      assert.deepEqual(event.payload, { contentHash: expected.hash, effect: expected.effect });
    }

    assert.deepEqual(await blockRefsIn(db, b), []);
    assert.deepEqual(await registryEvents(db, b), []);
  } finally {
    await db.close();
  }
});

test("C-fc62e0a1 a repeat changes nothing and a changed definition is refused", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);

    const seeded = await runImport(
      db.appPool,
      a,
      { "invoices.get@1": I, "docs.fetch@1": D },
      ACTOR,
      { clock },
    );
    assert.deepEqual(seeded, {
      imported: ["docs.fetch@1", "invoices.get@1"],
      unchanged: [],
    });
    assert.equal((await registryEvents(db, a)).length, 2);

    const repeated = await runImport(
      db.appPool,
      a,
      {
        "invoices.get@1": {
          ...I,
          unsafe_to_retry: false,
          untrusted_fields: ["raw_text", "vendor_name"],
        },
        "docs.fetch@1": D,
      },
      ACTOR,
      { clock },
    );
    assert.deepEqual(repeated, {
      imported: [],
      unchanged: ["docs.fetch@1", "invoices.get@1"],
    });
    assert.equal((await registryEvents(db, a)).length, 2);

    await assert.rejects(
      importCatalogue(db.appPool, a, { "invoices.get@1": I2, "mail.send@1": M }, ACTOR, {
        clock,
      }),
      registryFailure("REGISTRY_CONFLICT", { ref: "invoices.get@1" }),
    );

    assert.equal(await readVersion(db, a, "mail.send@1"), null);
    const invoices = await readVersion(db, a, "invoices.get@1");
    assert.ok(invoices !== null, "invoices.get@1 is still stored");
    assert.equal(invoices.contentHash, HASH_I);

    const refused = (await registryEvents(db, a)).filter(
      (row) => row.event_type === "registry.import_refused",
    );
    assert.equal(refused.length, 1);
    assert.deepEqual(refused[0]?.actor, { kind: "system", id: "operator:e2e-seed" });
    assert.deepEqual(refused[0]?.target, { kind: "block", id: "invoices.get@1" });
    assert.deepEqual(refused[0]?.payload, { code: "REGISTRY_CONFLICT" });

    const newMajor = await runImport(
      db.appPool,
      a,
      { "invoices.get@2": I2 },
      ACTOR,
      { clock },
    );
    assert.deepEqual(newMajor, { imported: ["invoices.get@2"], unchanged: [] });
    const second = await readVersion(db, a, "invoices.get@2");
    assert.ok(second !== null, "invoices.get@2 is stored");
    assert.equal(second.contentHash, HASH_I2);

    const forB = await runImport(
      db.appPool,
      b,
      { "invoices.get@1": I2 },
      ACTOR,
      { clock },
    );
    assert.deepEqual(forB, { imported: ["invoices.get@1"], unchanged: [] });
    const bInvoice = await readVersion(db, b, "invoices.get@1");
    assert.ok(bInvoice !== null, "tenant B stores its own invoices.get@1");
    assert.equal(bInvoice.contentHash, HASH_I2);
    const aInvoice = await readVersion(db, a, "invoices.get@1");
    assert.ok(aInvoice !== null, "tenant A's invoices.get@1 is unchanged");
    assert.equal(aInvoice.contentHash, HASH_I);

    const beforeEmpty = (await registryEvents(db, a)).length;
    const empty = await runImport(db.appPool, a, {}, ACTOR, { clock });
    assert.deepEqual(empty, { imported: [], unchanged: [] });
    assert.equal((await registryEvents(db, a)).length, beforeEmpty);
  } finally {
    await db.close();
  }
});

test("C-3657b7b4 parallel imports and a failing audit", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);

    const settled = await Promise.allSettled([
      importCatalogue(db.appPool, a, { "pay.run@1": X }, ACTOR, { clock }),
      importCatalogue(db.appPool, a, { "pay.run@1": Y }, ACTOR, { clock }),
    ]);
    const first = settled[0];
    const second = settled[1];
    assert.ok(first !== undefined && second !== undefined, "both calls settle");
    const fulfilled = settled.filter((outcome) => outcome.status === "fulfilled");
    const rejected = settled.filter((outcome) => outcome.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    const firstWon = first.status === "fulfilled";
    const winner = firstWon ? X : Y;
    const winnerHash = firstWon ? HASH_X : HASH_Y;
    const winnerReport = firstWon
      ? first.value
      : second.status === "fulfilled"
        ? second.value
        : undefined;
    assert.deepEqual(winnerReport, { imported: ["pay.run@1"], unchanged: [] });
    const refusal = firstWon ? second : first;
    assert.equal(refusal.status, "rejected");
    if (refusal.status === "rejected") {
      assert.ok(refusal.reason instanceof RegistryError, "the refusal is a RegistryError");
      assert.equal(refusal.reason.code, "REGISTRY_CONFLICT");
      assert.deepEqual(refusal.reason.details, { ref: "pay.run@1" });
    }

    const stored = await readVersion(db, a, "pay.run@1");
    assert.ok(stored !== null, "pay.run@1 is stored once");
    assert.equal(stored.contentHash, winnerHash);
    assert.deepEqual(stored.def, winner === X ? normalizedX : normalizedY);

    let events = (await registryEvents(db, a)).filter((row) => {
      const target = row.target as { kind?: string; id?: string } | null;
      return target?.id === "pay.run@1";
    });
    assert.deepEqual(
      events.map((row) => row.event_type).sort(),
      ["registry.block_imported", "registry.import_refused"],
    );

    const same = await Promise.allSettled([
      importCatalogue(db.appPool, a, { "pay.two@1": Z }, ACTOR, { clock }),
      importCatalogue(db.appPool, a, { "pay.two@1": Z }, ACTOR, { clock }),
    ]);
    const reports = same.map((outcome) => {
      assert.equal(outcome.status, "fulfilled");
      if (outcome.status !== "fulfilled") {
        throw new Error("unreachable");
      }
      return outcome.value;
    });
    assert.deepEqual(reports.sort((left, right) => left.imported.length - right.imported.length), [
      { imported: [], unchanged: ["pay.two@1"] },
      { imported: ["pay.two@1"], unchanged: [] },
    ]);

    events = (await registryEvents(db, a)).filter((row) => {
      const target = row.target as { kind?: string; id?: string } | null;
      return target?.id === "pay.two@1";
    });
    assert.deepEqual(
      events.map((row) => row.event_type),
      ["registry.block_imported"],
    );

    await assert.rejects(
      importCatalogue(auditFailingPool(db.appPool), a, { "pay.three@1": Z }, ACTOR, { clock }),
      auditFailure("AUDIT_STORE_FAILED"),
    );
    assert.equal(await readVersion(db, a, "pay.three@1"), null);
  } finally {
    await db.close();
  }
});

test("C-180a7986 importCatalogue refuses a bad ref without writing", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);

    await assert.rejects(
      importCatalogue(db.appPool, a, { "mail.send@1": M, "Bad@1": I }, ACTOR, { clock }),
      registryFailure("REGISTRY_INVALID"),
    );
    assert.deepEqual(await blockRefsIn(db, a), []);
    assert.deepEqual(await registryEvents(db, a), []);
  } finally {
    await db.close();
  }
});

test("C-180a7986 importCatalogue refuses a malformed or oversized map", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);

    await assert.rejects(
      importCatalogue(db.appPool, a, [] as unknown as Record<string, BlockImport>, ACTOR, {
        clock,
      }),
      registryFailure("REGISTRY_INVALID", { field: "blocks", reason: "not_object" }),
    );

    const tooMany: Record<string, BlockImport> = {};
    for (let index = 0; index <= 200; index += 1) {
      tooMany[`b${index}@1`] = D;
    }
    await assert.rejects(
      importCatalogue(db.appPool, a, tooMany, ACTOR, { clock }),
      registryFailure("REGISTRY_INVALID", { field: "blocks", reason: "too_many" }),
    );
    assert.deepEqual(await blockRefsIn(db, a), []);
    assert.deepEqual(await registryEvents(db, a), []);
  } finally {
    await db.close();
  }
});

test("C-180a7986 an invalid actor leaves no row", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);

    await assert.rejects(
      importCatalogue(db.appPool, a, { "invoices.get@1": I }, { kind: "user", id: "" }, { clock }),
      auditFailure("AUDIT_EVENT_INVALID"),
    );
    assert.equal(await readVersion(db, a, "invoices.get@1"), null);
    assert.deepEqual(await registryEvents(db, a), []);
  } finally {
    await db.close();
  }
});
