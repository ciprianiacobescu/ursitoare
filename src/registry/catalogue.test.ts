import assert from "node:assert/strict";
import { test } from "node:test";

import type { BlockDef, Catalogue } from "../authoring/index.ts";
import { importCatalogue, loadRegistryCatalogue, registryCatalogue } from "./index.ts";
import type { BlockBinding, BlockVersion, RegistryCatalogue } from "./index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";

const IMPORTED_AT = "2026-10-31T09:00:00Z";
const ZEROS = "0".repeat(64);

const defI: BlockDef = {
  effect: "read",
  description: "Fetch an invoice.",
  input: { type: "object", properties: { invoice_id: { type: "string" } } },
  output: { type: "object", properties: { raw_text: { type: "string" } } },
  untrusted_fields: ["raw_text"],
  data_class: "private",
  untrusted_result: false,
  unsafe_to_retry: false,
};

const defD: BlockDef = {
  effect: "read",
  input: { type: "object", properties: { url: { type: "string" } } },
  output: { type: "object", properties: { content: { type: "string" } } },
  untrusted_fields: ["content"],
  data_class: "public",
  untrusted_result: true,
  unsafe_to_retry: false,
};

const defM: BlockDef = {
  effect: "send",
  description: "Send a mail.",
  input: { type: "object", properties: { to: { type: "string" } } },
  output: { type: "object" },
  untrusted_fields: [],
  untrusted_result: false,
  unsafe_to_retry: true,
};

const defMB: BlockDef = { ...defM, description: "Send a mail (tenant B)." };

const defX: BlockDef = {
  effect: "pay",
  input: { type: "object" },
  output: { type: "object" },
  untrusted_fields: [],
  untrusted_result: false,
  unsafe_to_retry: true,
};

const MAIL_BINDING: BlockBinding = { server: "mail", tool: "send" };

function version(ref: string, def: BlockDef, binding: BlockBinding | null): BlockVersion {
  return {
    ref,
    def,
    binding,
    contentHash: `sha256:${ZEROS}`,
    importedBy: "operator:e2e-seed",
    importedAt: "2026-10-31T09:00:00.000000Z",
  };
}

function build(blocks: readonly BlockVersion[], roles: readonly string[]): RegistryCatalogue {
  let result: RegistryCatalogue | undefined;
  assert.doesNotThrow(() => {
    result = registryCatalogue(blocks, roles);
  });
  assert.ok(result !== undefined, "registryCatalogue returned a catalogue");
  return result;
}

async function load(
  db: TestDatabase,
  ctx: TenantContext,
): Promise<Catalogue> {
  let result: Catalogue | undefined;
  await assert.doesNotReject(async () => {
    result = await loadRegistryCatalogue(db.appPool, ctx);
  });
  assert.ok(result !== undefined, "loadRegistryCatalogue returned a catalogue");
  return result;
}

async function seed(
  db: TestDatabase,
  ctx: TenantContext,
  ref: string,
  def: BlockDef,
  binding: BlockBinding | null,
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
        ref,
        def.effect,
        def.description ?? null,
        JSON.stringify(def.input),
        JSON.stringify(def.output),
        def.untrusted_fields ?? [],
        def.data_class ?? null,
        def.untrusted_result ?? false,
        def.unsafe_to_retry ?? false,
        binding === null ? null : JSON.stringify(binding),
        `sha256:${ZEROS}`,
        "operator:e2e-seed",
        IMPORTED_AT,
      ],
    );
  });
}

test("C-94cec17b block and role answer from the snapshot by exact key", () => {
  const catalogue = build(
    [version("invoices.get@1", defI, null), version("mail.send@1", defM, MAIL_BINDING)],
    ["author", "tenant_admin"],
  );

  assert.deepEqual(catalogue.block("invoices.get@1"), defI);
  const mail = catalogue.block("mail.send@1");
  assert.deepEqual(mail, defM);
  assert.equal(mail !== undefined && "binding" in mail, false);

  const unknown: unknown[] = [
    "docs.fetch@1",
    "invoices.get",
    "INVOICES.GET@1",
    "__proto__",
    "constructor",
    "toString",
    "",
    42,
  ];
  for (const ref of unknown) {
    assert.equal(catalogue.block(ref as string), undefined, String(ref));
  }

  assert.deepEqual(catalogue.role("author"), { name: "author" });
  assert.equal(catalogue.role("finance-approver"), undefined);
  assert.equal(catalogue.role("__proto__"), undefined);
});

test("C-94cec17b a returned definition is a copy and the other lookups are undefined", () => {
  const catalogue = build(
    [version("invoices.get@1", defI, null), version("mail.send@1", defM, MAIL_BINDING)],
    ["author", "tenant_admin"],
  );

  const first = catalogue.block("invoices.get@1");
  assert.ok(first !== undefined);
  first.effect = "pay";
  first.untrusted_fields?.push("changed");
  assert.deepEqual(catalogue.block("invoices.get@1"), defI);

  assert.equal(catalogue.modelProfile("default"), undefined);
  assert.equal(catalogue.delegateTarget("n8n", "sync-crm"), undefined);
  assert.equal(catalogue.flow("notify-customer", 1), undefined);

  assert.deepEqual(catalogue.blockRefs(), ["invoices.get@1", "mail.send@1"]);
  assert.deepEqual(catalogue.roleNames(), ["author", "tenant_admin"]);
  catalogue.blockRefs().push("x@1");
  catalogue.roleNames().push("x");
  assert.deepEqual(catalogue.blockRefs(), ["invoices.get@1", "mail.send@1"]);
  assert.deepEqual(catalogue.roleNames(), ["author", "tenant_admin"]);
});

test("C-845617bb a load reads one tenant's blocks and roles", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await seed(db, a, "invoices.get@1", defI, null);
    await seed(db, a, "docs.fetch@1", defD, null);
    await seed(db, a, "mail.send@1", defM, MAIL_BINDING);
    await seed(db, b, "mail.send@1", defMB, MAIL_BINDING);

    const catA = await load(db, a);
    assert.deepEqual(catA.block("docs.fetch@1"), defD);
    assert.deepEqual(catA.block("invoices.get@1"), defI);
    assert.deepEqual(catA.block("mail.send@1"), defM);
    assert.equal(catA.block("pay.run@1"), undefined);
    assert.deepEqual(catA.role("author"), { name: "author" });

    const catB = await load(db, b);
    assert.deepEqual(catB.block("mail.send@1"), defMB);
    assert.equal(catB.block("invoices.get@1"), undefined);
    assert.equal(catB.block("docs.fetch@1"), undefined);

    const sync = catA.block("docs.fetch@1");
    assert.ok(!(sync instanceof Promise));
  } finally {
    await db.close();
  }
});

test("C-845617bb a loaded catalogue stays fixed and a new tenant has no blocks", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seed(db, a, "invoices.get@1", defI, null);

    const before = await load(db, a);
    assert.deepEqual(before.block("invoices.get@1"), defI);

    await importCatalogue(
      db.appPool,
      a,
      { "pay.run@1": defX },
      { kind: "system", id: "operator:e2e-seed" },
    );

    assert.equal(before.block("pay.run@1"), undefined);
    const after = await load(db, a);
    assert.deepEqual(after.block("pay.run@1"), defX);

    await db.ownerPool.query(
      "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_c', 'Tenant C')",
    );
    const c: TenantContext = { tenantId: "tenant_c", reviewProfile: a.reviewProfile };
    const catC = await load(db, c);
    assert.equal(catC.block("invoices.get@1"), undefined);
    const named = catC as RegistryCatalogue;
    assert.deepEqual(named.blockRefs(), []);
    assert.deepEqual(named.roleNames(), ["approver", "auditor", "author", "tenant_admin"]);
  } finally {
    await db.close();
  }
});
