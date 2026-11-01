import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { canonicalize } from "../audit/index.ts";
import type { BlockDef } from "../authoring/index.ts";
import {
  RegistryError,
  getBlockVersion,
  listBlockVersions,
} from "./index.ts";
import type {
  BlockBinding,
  BlockVersion,
  RegistryErrorCode,
} from "./index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantTx } from "../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";

const IMPORTED_BY = "operator:e2e-seed";
const IMPORTED_AT = "2026-10-31T09:00:00Z";

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

const normalizedMB: BlockDef = {
  ...normalizedM,
  description: "Send a mail (tenant B).",
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
const HASH_MB = deriveHash(normalizedMB, MAIL_BINDING);

interface SeedVersion {
  ref: string;
  def: BlockDef;
  binding: BlockBinding | null;
  contentHash: string;
}

// Rows are inserted with SQL through the owner pool. FORCE ROW LEVEL SECURITY applies to the owner too, so the
// tenant is set on the transaction exactly as the application does.
async function seedVersion(
  db: TestDatabase,
  ctx: TenantContext,
  seed: SeedVersion,
): Promise<void> {
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare.block_version
         (tenant_id, ref, effect, description, input, output, untrusted_fields,
          data_class, untrusted_result, unsafe_to_retry, binding, content_hash,
          imported_by, imported_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::text[], $8, $9, $10,
               $11::jsonb, $12, $13, $14::timestamptz)`,
      [
        ctx.tenantId,
        seed.ref,
        seed.def.effect,
        seed.def.description ?? null,
        JSON.stringify(seed.def.input),
        JSON.stringify(seed.def.output),
        seed.def.untrusted_fields ?? [],
        seed.def.data_class ?? null,
        seed.def.untrusted_result ?? false,
        seed.def.unsafe_to_retry ?? false,
        seed.binding === null ? null : JSON.stringify(seed.binding),
        seed.contentHash,
        IMPORTED_BY,
        IMPORTED_AT,
      ],
    );
  });
}

async function seedTenantABlocks(db: TestDatabase, a: TenantContext): Promise<void> {
  await seedVersion(db, a, {
    ref: "invoices.get@1",
    def: normalizedI,
    binding: null,
    contentHash: HASH_I,
  });
  await seedVersion(db, a, {
    ref: "docs.fetch@1",
    def: normalizedD,
    binding: null,
    contentHash: HASH_D,
  });
  await seedVersion(db, a, {
    ref: "mail.send@1",
    def: normalizedM,
    binding: MAIL_BINDING,
    contentHash: HASH_M,
  });
}

async function seedTenantBBlocks(db: TestDatabase, b: TenantContext): Promise<void> {
  await seedVersion(db, b, {
    ref: "mail.send@1",
    def: normalizedMB,
    binding: MAIL_BINDING,
    contentHash: HASH_MB,
  });
}

// A stub's "not implemented" error must surface as an assertion failure, not a bare error.
async function readVersion(
  tx: TenantTx,
  ctx: TenantContext,
  ref: string,
): Promise<BlockVersion | null> {
  let result: BlockVersion | null | undefined;
  await assert.doesNotReject(async () => {
    result = await getBlockVersion(tx, ctx, ref);
  });
  assert.ok(result !== undefined, "getBlockVersion returned a result");
  return result;
}

async function readPage(
  tx: TenantTx,
  ctx: TenantContext,
  q: { limit: number; after?: string | undefined },
): Promise<BlockVersion[]> {
  let result: BlockVersion[] | undefined;
  await assert.doesNotReject(async () => {
    result = await listBlockVersions(tx, ctx, q);
  });
  assert.ok(result !== undefined, "listBlockVersions returned a result");
  return result;
}

function registryError(
  code: RegistryErrorCode,
  details: Record<string, string | number>,
): (error: unknown) => boolean {
  return (error: unknown) => {
    assert.ok(error instanceof RegistryError, "the error is a RegistryError");
    assert.equal(error.code, code);
    assert.deepEqual(error.details, details);
    return true;
  };
}

test("C-d907c4d9 a stored version is read back in normalised form", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedTenantABlocks(db, a);

    const mail = await withTenantTx(db.appPool, a, (tx) =>
      readVersion(tx, a, "mail.send@1"),
    );
    assert.deepEqual(mail, {
      ref: "mail.send@1",
      def: normalizedM,
      binding: { server: "mail", tool: "send" },
      contentHash: HASH_M,
      importedBy: "operator:e2e-seed",
      importedAt: "2026-10-31T09:00:00.000000Z",
    });
    assert.equal(mail?.binding?.["server"], "mail");
    assert.equal(mail?.def.description, "Send a mail.");
    assert.deepEqual(mail?.def.untrusted_fields, []);

    const missing = await withTenantTx(db.appPool, a, (tx) =>
      readVersion(tx, a, "nope@1"),
    );
    assert.equal(missing, null);

    const prototype = await withTenantTx(db.appPool, a, (tx) =>
      readVersion(tx, a, "__proto__"),
    );
    assert.equal(prototype, null);
  } finally {
    await db.close();
  }
});

test("C-d907c4d9 versions are listed in ref order a page at a time", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedTenantABlocks(db, a);

    const first = await withTenantTx(db.appPool, a, (tx) =>
      readPage(tx, a, { limit: 2 }),
    );
    assert.deepEqual(
      first.map((version) => version.ref),
      ["docs.fetch@1", "invoices.get@1"],
    );
    assert.deepEqual(first[0]?.def, normalizedD);
    assert.equal(first[0]?.contentHash, HASH_D);
    assert.equal(first[0]?.importedAt, "2026-10-31T09:00:00.000000Z");

    const second = await withTenantTx(db.appPool, a, (tx) =>
      readPage(tx, a, { limit: 2, after: "invoices.get@1" }),
    );
    assert.deepEqual(
      second.map((version) => version.ref),
      ["mail.send@1"],
    );
    assert.deepEqual(second[0]?.def, normalizedM);
    assert.deepEqual(second[0]?.binding, { server: "mail", tool: "send" });

    const empty = await withTenantTx(db.appPool, a, (tx) =>
      readPage(tx, a, { limit: 3, after: "mail.send@1" }),
    );
    assert.deepEqual(empty, []);
  } finally {
    await db.close();
  }
});

test("C-d907c4d9 listing refuses a bad limit or an empty after", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedTenantABlocks(db, a);

    for (const limit of [0, 202, 1.5]) {
      await assert.rejects(
        withTenantTx(db.appPool, a, (tx) =>
          listBlockVersions(tx, a, { limit }),
        ),
        registryError("REGISTRY_INVALID", { field: "limit", reason: "bad_value" }),
      );
    }

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        listBlockVersions(tx, a, { limit: 2, after: "" }),
      ),
      registryError("REGISTRY_INVALID", { field: "after", reason: "bad_value" }),
    );
  } finally {
    await db.close();
  }
});

test("C-d907c4d9 each tenant reads its own versions and a mismatched context is refused", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await seedTenantABlocks(db, a);
    await seedTenantBBlocks(db, b);

    const listed = await withTenantTx(db.appPool, b, (tx) =>
      readPage(tx, b, { limit: 10 }),
    );
    assert.deepEqual(
      listed.map((version) => version.ref),
      ["mail.send@1"],
    );
    assert.equal(listed[0]?.contentHash, HASH_MB);
    assert.equal(listed[0]?.def.description, "Send a mail (tenant B).");

    await assert.rejects(
      withTenantTx(db.appPool, b, (tx) =>
        getBlockVersion(tx, a, "mail.send@1"),
      ),
      registryError("REGISTRY_TENANT_MISMATCH", {}),
    );

    await assert.rejects(
      withTenantTx(db.appPool, b, (tx) =>
        listBlockVersions(tx, a, { limit: 1 }),
      ),
      registryError("REGISTRY_TENANT_MISMATCH", {}),
    );
  } finally {
    await db.close();
  }
});
