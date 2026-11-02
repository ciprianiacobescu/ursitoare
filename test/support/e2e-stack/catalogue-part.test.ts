import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { createPool } from "../../../src/db/index.ts";
import { provisionTenantIdp } from "../../../src/identity/index.ts";
import { listBlockVersions } from "../../../src/registry/index.ts";
import type { BlockVersion } from "../../../src/registry/index.ts";
import { ensureDefaultTenant, withTenantTx } from "../../../src/tenancy/index.ts";
import type { TenantContext, TenantPool } from "../../../src/tenancy/index.ts";
import { readCatalogueDocument } from "../catalogue/document.ts";

import { cataloguePart } from "./catalogue-part.ts";
import { E2E_TENANT_NAME, databaseApi, databasePart } from "./database-part.ts";
import { PARTS_DIR, discoverParts } from "./discover.ts";
import { oidcApi, oidcPart } from "./oidc-part.ts";
import type { PartContext, PartHandle } from "./part.ts";
import { rbacPart } from "./rbac-part.ts";

const ENGINE_ORIGIN = "http://127.0.0.1:39080";
const CONTROL_ORIGIN = "http://127.0.0.1:39081";
const TENANT_B_ID = "tenant_b";
const TENANT_C_ID = "tenant_c";

const tempRoots: string[] = [];

after(() => {
  for (const dir of tempRoots) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // The parts may already have removed their own directories.
    }
  }
});

function tempRoot(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "e2e-catalogue-part-"));
  tempRoots.push(dir);
  return dir;
}

async function must<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    assert.fail(`expected the call to resolve: ${String(error)}`);
  }
}

function contextFor(
  name: string,
  dataDir: string,
  handles: ReadonlyMap<string, PartHandle>,
): PartContext {
  return {
    name,
    dataDir,
    engineOrigin: ENGINE_ORIGIN,
    controlOrigin: CONTROL_ORIGIN,
    env: {},
    handles: new Map(handles),
  };
}

async function versions(pool: TenantPool, ctx: TenantContext): Promise<BlockVersion[]> {
  return withTenantTx(pool, ctx, (tx) => listBlockVersions(tx, ctx, { limit: 201 }));
}

async function importEvents(pool: TenantPool, ctx: TenantContext): Promise<number> {
  return withTenantTx(pool, ctx, async (tx) => {
    const result = await tx.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM ursitoare.audit_event
       WHERE tenant_id = $1 AND event_type = 'registry.block_imported'`,
      [ctx.tenantId],
    );
    return result.rows[0]?.count ?? 0;
  });
}

test("C-3e0a938c Seed, re-seed, skip", async () => {
  assert.equal(cataloguePart.name, "catalogue", "the part is named catalogue");

  const root = tempRoot();
  const databaseDir = path.join(root, "database");
  mkdirSync(databaseDir, { recursive: true });

  const handles = new Map<string, PartHandle>();
  let databaseHandle: PartHandle | undefined;
  let oidcHandle: PartHandle | undefined;
  let rbacHandle: PartHandle | undefined;
  let catalogueHandle: PartHandle | undefined;
  let ownerPool: ReturnType<typeof createPool> | undefined;

  try {
    databaseHandle = await must(() =>
      databasePart.start(contextFor("database", databaseDir, handles)),
    );
    handles.set("database", databaseHandle);
    await must(() =>
      databasePart.seed?.(contextFor("database", databaseDir, handles)) ?? Promise.resolve(),
    );

    const oidcDir = path.join(root, "oidc");
    oidcHandle = await must(() => oidcPart.start(contextFor("oidc", oidcDir, handles)));
    handles.set("oidc", oidcHandle);
    await must(() =>
      oidcPart.seed?.(contextFor("oidc", oidcDir, handles)) ?? Promise.resolve(),
    );

    const fake = oidcApi(handles).fake;
    ownerPool = createPool(databaseApi(handles).ownerUrl, {
      max: 2,
      applicationName: "e2e-catalogue-part",
    });
    await ownerPool.query(
      `INSERT INTO ursitoare.tenant (tenant_id, name)
       VALUES ($1, 'Tenant B'), ($2, 'Tenant C')
       ON CONFLICT DO NOTHING`,
      [TENANT_B_ID, TENANT_C_ID],
    );
    const tenantB: TenantContext = { tenantId: TENANT_B_ID, reviewProfile: "solo" };
    const tenantC: TenantContext = { tenantId: TENANT_C_ID, reviewProfile: "solo" };
    await provisionTenantIdp(ownerPool, tenantB, { issuer: fake.issuer, organization: "org-b" });

    const rbacDir = path.join(root, "rbac");
    rbacHandle = await must(() => rbacPart.start(contextFor("rbac", rbacDir, handles)));
    handles.set("rbac", rbacHandle);
    await must(() =>
      rbacPart.seed?.(contextFor("rbac", rbacDir, handles)) ?? Promise.resolve(),
    );

    const catalogueDir = path.join(root, "catalogue");
    catalogueHandle = await must(() =>
      cataloguePart.start(contextFor("catalogue", catalogueDir, handles)),
    );
    assert.deepEqual(catalogueHandle.env, {}, "the catalogue handle exports no environment");
    handles.set("catalogue", catalogueHandle);

    const seed = cataloguePart.seed;
    assert.equal(typeof seed, "function", "the catalogue part has a seed");
    const defaultTenant = await ensureDefaultTenant(ownerPool, E2E_TENANT_NAME);
    const document = readCatalogueDocument();
    const refs = Object.keys(document.blocks).sort();
    assert.ok(refs.length > 0, "the document holds blocks");

    await must(
      () =>
        seed?.call(cataloguePart, contextFor("catalogue", catalogueDir, handles)) ??
        Promise.resolve(),
    );
    for (const ctx of [defaultTenant, tenantB]) {
      const stored = await versions(ownerPool, ctx);
      assert.deepEqual(stored.map((v) => v.ref).sort(), refs);
      const fetched = stored.find((v) => v.ref === "docs.fetch@1");
      const expected = document.blocks["docs.fetch@1"];
      assert.ok(fetched !== undefined && expected !== undefined);
      assert.deepEqual(fetched.def, {
        ...expected,
        untrusted_result: false,
        unsafe_to_retry: false,
      });
      assert.equal(await importEvents(ownerPool, ctx), refs.length);
    }
    assert.deepEqual(await versions(ownerPool, tenantC), []);
    assert.equal(await importEvents(ownerPool, tenantC), 0);

    await must(
      () =>
        seed?.call(cataloguePart, contextFor("catalogue", catalogueDir, handles)) ??
        Promise.resolve(),
    );
    for (const ctx of [defaultTenant, tenantB]) {
      assert.equal((await versions(ownerPool, ctx)).length, refs.length);
      assert.equal(await importEvents(ownerPool, ctx), refs.length, "a repeat changes nothing");
    }
    assert.equal(await importEvents(ownerPool, tenantC), 0);
  } finally {
    await catalogueHandle?.close().catch(() => undefined);
    await rbacHandle?.close().catch(() => undefined);
    await oidcHandle?.close().catch(() => undefined);
    await ownerPool?.end().catch(() => undefined);
    await databaseHandle?.close().catch(() => undefined);
  }
});

test("C-3e0a938c Discovered after rbac", async () => {
  const names = (await discoverParts()).map((part) => part.name);
  assert.ok(names.includes("catalogue"), "the catalogue part is discovered");
  assert.ok(names.indexOf("rbac") < names.indexOf("catalogue"));

  const partFile = path.join(PARTS_DIR, "35-catalogue.ts");
  assert.ok(existsSync(partFile), "the shipped catalogue part file exists");
  assert.equal(
    readFileSync(partFile, "utf8").trim(),
    'export { cataloguePart as part } from "../catalogue-part.ts";',
  );
});
