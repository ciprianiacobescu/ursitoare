import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { resolveTenantForToken } from "../../../src/identity/index.ts";
import { ensureDefaultTenant, withTenantTx } from "../../../src/tenancy/index.ts";

import { decodeJwt } from "../fake-oidc/index.ts";
import { withTestDatabase, type TestDatabase } from "../pg.ts";
import { TENANT_B_ID } from "../tenants.ts";
import { E2E_TENANT_NAME, databasePart } from "./database-part.ts";
import { PARTS_DIR, discoverParts } from "./discover.ts";
import { oidcApi, oidcPart } from "./oidc-part.ts";
import { E2eStackError } from "./part.ts";
import type { PartContext, PartHandle } from "./part.ts";
import type { SeedSource } from "./seed-data.ts";
import type { SeedUser } from "./tenant-b-part.ts";
import { seedUsersOf, tenantBPart } from "./tenant-b-part.ts";

assert.equal(typeof seedUsersOf, "function");

const ENGINE_ORIGIN = "http://127.0.0.1:39080";
const CONTROL_ORIGIN = "http://127.0.0.1:39081";
const USERNAMES = ["alice", "bob", "carol", "mallory"] as const;
const TENANT_B_NAME_LITERAL = "Tenant B";
const TENANT_B_ORGANIZATION_LITERAL = "org-b";

const tempRoots: string[] = [];

after(() => {
  for (const dir of tempRoots) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // The part or the cluster may already have removed its own directories.
    }
  }
});

function tempRoot(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "e2e-tenant-b-part-"));
  tempRoots.push(dir);
  return dir;
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
    handles,
  };
}

function databaseHandleOf(db: TestDatabase): PartHandle {
  const url = new URL(db.ownerUrl);
  const port = Number(url.port);
  assert.ok(port > 0, "the owner URL names the cluster port");
  return {
    env: {},
    api: { host: "127.0.0.1", port, database: db.name, ownerUrl: db.ownerUrl },
    close: async (): Promise<void> => {
      // The test closes the database it opened itself.
    },
  };
}

function isStackErrorWithCode(error: unknown, code: string): boolean {
  return error instanceof E2eStackError && error.code === code;
}

test("C-812ae263 tenant B is created and its organisation provisioned", async () => {
  const root = tempRoot();
  const oidcSeed = oidcPart.seed;
  if (oidcSeed === undefined) {
    assert.fail("the oidc part has a seed");
  }
  const tenantSeed = tenantBPart.seed;
  if (tenantSeed === undefined) {
    assert.fail("the tenant-b part has a seed");
  }

  let db: TestDatabase | undefined;
  let oidcHandle: PartHandle | undefined;
  try {
    db = await withTestDatabase();
    const handles = new Map<string, PartHandle>([["database", databaseHandleOf(db)]]);
    const oidcContext = contextFor("oidc", path.join(root, "oidc"), handles);
    oidcHandle = await oidcPart.start(oidcContext);
    handles.set("oidc", oidcHandle);
    const fake = oidcApi(handles).fake;
    const tenantContext = contextFor("tenant-b", path.join(root, "tenant-b"), handles);

    const before = await ensureDefaultTenant(db.ownerPool, E2E_TENANT_NAME);

    await oidcSeed.call(oidcPart, oidcContext);
    await tenantSeed.call(tenantBPart, tenantContext);
    await oidcSeed.call(oidcPart, oidcContext);
    await tenantSeed.call(tenantBPart, tenantContext);

    const afterTenant = await ensureDefaultTenant(db.ownerPool, E2E_TENANT_NAME);
    assert.equal(
      afterTenant.tenantId,
      before.tenantId,
      "the default tenant survives a re-seed with tenant B present",
    );

    const resolvedB = await resolveTenantForToken(db.appPool, {
      issuer: fake.issuer,
      organization: [TENANT_B_ORGANIZATION_LITERAL],
    });
    assert.deepEqual(resolvedB, { tenantId: TENANT_B_ID, reviewProfile: "solo" });

    const resolvedA = await resolveTenantForToken(db.appPool, {
      issuer: fake.issuer,
      organization: ["org-a"],
    });
    assert.deepEqual(resolvedA, before);

    const tenantB = { tenantId: TENANT_B_ID, reviewProfile: "solo" } as const;
    const tenantRows = await withTenantTx(db.appPool, tenantB, async (tx) =>
      (
        await tx.query<{ name: string }>("SELECT name FROM ursitoare.tenant")
      ).rows,
    );
    assert.deepEqual(tenantRows, [{ name: TENANT_B_NAME_LITERAL }]);

    const idpRows = await withTenantTx(db.appPool, tenantB, async (tx) =>
      (
        await tx.query<{ tenant_id: string; issuer: string; organization: string }>(
          "SELECT tenant_id, issuer, organization FROM ursitoare.tenant_idp",
        )
      ).rows,
    );
    assert.deepEqual(idpRows, [
      {
        tenant_id: TENANT_B_ID,
        issuer: fake.issuer,
        organization: TENANT_B_ORGANIZATION_LITERAL,
      },
    ]);

    const withoutOidc = contextFor(
      "tenant-b",
      path.join(root, "missing-oidc"),
      new Map<string, PartHandle>([["database", databaseHandleOf(db)]]),
    );
    await assert.rejects(
      tenantBPart.start(withoutOidc),
      (error: unknown) => isStackErrorWithCode(error, "STACK_PART_MISSING"),
      "the tenant-b part needs the oidc handle",
    );

    const withoutDatabase = contextFor(
      "tenant-b",
      path.join(root, "missing-database"),
      new Map<string, PartHandle>([["oidc", oidcHandle]]),
    );
    await assert.rejects(
      tenantBPart.start(withoutDatabase),
      (error: unknown) => isStackErrorWithCode(error, "STACK_PART_MISSING"),
      "the tenant-b part needs the database handle",
    );
  } finally {
    await oidcHandle?.close().catch(() => undefined);
    await db?.close().catch(() => undefined);
  }
});

test("C-c1ed19d8 seed users come from the fake", async () => {
  const root = tempRoot();
  const handles = new Map<string, PartHandle>();
  let databaseHandle: PartHandle | undefined;
  let oidcHandle: PartHandle | undefined;
  let tenantHandle: PartHandle | undefined;
  try {
    const oidcContext = contextFor("oidc", path.join(root, "oidc"), handles);
    oidcHandle = await oidcPart.start(oidcContext);
    handles.set("oidc", oidcHandle);
    const fake = oidcApi(handles).fake;

    await assert.doesNotReject(async () => {
      const users = seedUsersOf(fake);
      assert.deepEqual(Object.keys(users).sort(), [...USERNAMES].sort());

      for (const username of USERNAMES) {
        const user = users[username];
        assert.ok(user !== undefined, `the seed offers ${username}`);
        assert.equal(user.username, username);
        assert.equal(user.password, fake.passwordOf(username));
        const payload = decodeJwt(fake.mintToken({ user: username, kind: "id" })).payload;
        assert.equal(user.displayName, payload["name"]);
        const expectedTenant = username === "mallory" ? TENANT_B_NAME_LITERAL : E2E_TENANT_NAME;
        assert.equal(user.tenantName, expectedTenant);
      }
    });

    const databaseContext = contextFor("database", path.join(root, "database"), handles);
    mkdirSync(databaseContext.dataDir, { recursive: true });
    databaseHandle = await databasePart.start(databaseContext);
    handles.set("database", databaseHandle);

    tenantHandle = await tenantBPart.start(
      contextFor("tenant-b", path.join(root, "tenant-b"), handles),
    );
    assert.deepEqual(tenantHandle.env, {});

    const source = tenantHandle.api as SeedSource;
    assert.equal(typeof source.seedData, "function", "the handle offers seed data");

    await assert.doesNotThrow(() => {
      const data = source.seedData() as { users: Record<string, SeedUser> };
      assert.deepEqual(data, { users: seedUsersOf(fake) });

      const allEnv = JSON.stringify([databaseHandle?.env, oidcHandle?.env, tenantHandle?.env]);
      for (const username of USERNAMES) {
        assert.equal(
          allEnv.includes(fake.passwordOf(username)),
          false,
          `no environment holds the password of ${username}`,
        );
      }
    });
  } finally {
    await tenantHandle?.close().catch(() => undefined);
    await oidcHandle?.close().catch(() => undefined);
    await databaseHandle?.close().catch(() => undefined);
  }
});

test("C-39471a6a the tenant-b part is discovered after the oidc part", async () => {
  const parts = await discoverParts();
  const names = parts.map((part) => part.name);
  assert.ok(names.includes("tenant-b"), "the tenant-b part is discovered");
  assert.ok(names.includes("oidc"), "the oidc part is discovered");
  assert.ok(
    names.indexOf("oidc") < names.indexOf("tenant-b"),
    "the tenant-b part is discovered after the oidc part",
  );

  const partFile = path.join(PARTS_DIR, "27-tenant-b.ts");
  assert.ok(existsSync(partFile), "the shipped tenant-b part file exists");
  assert.equal(
    readFileSync(partFile, "utf8").trim(),
    'export { tenantBPart as part } from "../tenant-b-part.ts";',
    "the part file re-exports the tenant-b part",
  );
});
