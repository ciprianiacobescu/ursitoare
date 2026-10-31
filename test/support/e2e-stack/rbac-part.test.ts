import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { createPool } from "../../../src/db/index.ts";
import { provisionTenantIdp } from "../../../src/identity/index.ts";
import { ensureDefaultTenant, withTenantTx } from "../../../src/tenancy/index.ts";
import type { TenantContext, TenantPool } from "../../../src/tenancy/index.ts";

import { E2E_TENANT_NAME, databaseApi, databasePart } from "./database-part.ts";
import { PARTS_DIR, discoverParts } from "./discover.ts";
import { oidcApi, oidcPart } from "./oidc-part.ts";
import type { PartContext, PartHandle } from "./part.ts";
import { rbacPart } from "./rbac-part.ts";

const ENGINE_ORIGIN = "http://127.0.0.1:39080";
const CONTROL_ORIGIN = "http://127.0.0.1:39081";
const TENANT_B_ID = "tenant_b";
const TENANT_C_ID = "tenant_c";
const EXPECTED_MAPPINGS = [
  { group: "team-finance", roleId: null, teamId: "finance" },
  { group: "ursitoare-admins", roleId: "tenant_admin", teamId: null },
  { group: "ursitoare-approvers", roleId: "approver", teamId: null },
  { group: "ursitoare-authors", roleId: "author", teamId: null },
] as const;

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
  const dir = mkdtempSync(path.join(os.tmpdir(), "e2e-rbac-part-"));
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

interface SeedState {
  teams: string[];
  mappings: { group: string; roleId: string | null; teamId: string | null }[];
}

async function seedState(pool: TenantPool, ctx: TenantContext): Promise<SeedState> {
  return withTenantTx(pool, ctx, async (tx) => {
    const teams = await tx.query<{ team_id: string }>(
      "SELECT team_id FROM ursitoare.team WHERE tenant_id = $1 ORDER BY team_id COLLATE \"C\"",
      [ctx.tenantId],
    );
    const mappings = await tx.query<{
      group_name: string;
      role_id: string | null;
      team_id: string | null;
    }>(
      `SELECT group_name, role_id, team_id FROM ursitoare.idp_group_map
       WHERE tenant_id = $1 ORDER BY group_name COLLATE "C"`,
      [ctx.tenantId],
    );
    return {
      teams: teams.rows.map((row) => row.team_id),
      mappings: mappings.rows.map((row) => ({
        group: row.group_name,
        roleId: row.role_id,
        teamId: row.team_id,
      })),
    };
  });
}

async function eventCount(pool: TenantPool, ctx: TenantContext): Promise<number> {
  return withTenantTx(pool, ctx, async (tx) => {
    const result = await tx.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM ursitoare.audit_event WHERE tenant_id = $1",
      [ctx.tenantId],
    );
    return result.rows[0]?.count ?? 0;
  });
}

test("C-84f68efb Seed, re-seed, skip", async () => {
  const root = tempRoot();
  const databaseDir = path.join(root, "database");
  mkdirSync(databaseDir, { recursive: true });

  const handles = new Map<string, PartHandle>();
  let databaseHandle: PartHandle | undefined;
  let oidcHandle: PartHandle | undefined;
  let rbacHandle: PartHandle | undefined;
  let ownerPool: ReturnType<typeof createPool> | undefined;

  try {
    databaseHandle = await must(() =>
      databasePart.start(contextFor("database", databaseDir, handles)),
    );
    handles.set("database", databaseHandle);
    await must(() =>
      databasePart.seed?.(contextFor("database", databaseDir, handles)) ?? Promise.resolve(),
    );

    oidcHandle = await must(() => oidcPart.start(contextFor("oidc", path.join(root, "oidc"), handles)));
    handles.set("oidc", oidcHandle);
    await must(() =>
      oidcPart.seed?.(contextFor("oidc", path.join(root, "oidc"), handles)) ?? Promise.resolve(),
    );

    const fake = oidcApi(handles).fake;
    ownerPool = createPool(databaseApi(handles).ownerUrl, {
      max: 2,
      applicationName: "e2e-rbac-part",
    });

    await ownerPool.query(
      `INSERT INTO ursitoare.tenant (tenant_id, name)
       VALUES ($1, 'Tenant B'), ($2, 'Tenant C')
       ON CONFLICT DO NOTHING`,
      [TENANT_B_ID, TENANT_C_ID],
    );
    const tenantB: TenantContext = { tenantId: TENANT_B_ID, reviewProfile: "solo" };
    const tenantC: TenantContext = { tenantId: TENANT_C_ID, reviewProfile: "solo" };
    await provisionTenantIdp(ownerPool, tenantB, {
      issuer: fake.issuer,
      organization: "org-b",
    });

    rbacHandle = await must(() =>
      rbacPart.start(contextFor("rbac", path.join(root, "rbac"), handles)),
    );
    assert.deepEqual(rbacHandle.env, {}, "the rbac handle exports no environment");
    handles.set("rbac", rbacHandle);

    const seed = rbacPart.seed;
    assert.equal(typeof seed, "function", "the rbac part has a seed");

    const defaultTenant = await ensureDefaultTenant(ownerPool, E2E_TENANT_NAME);
    await must(() =>
      seed?.call(rbacPart, contextFor("rbac", path.join(root, "rbac"), handles)) ?? Promise.resolve(),
    );
    const countsAfterFirst = {
      default: await eventCount(ownerPool, defaultTenant),
      b: await eventCount(ownerPool, tenantB),
      c: await eventCount(ownerPool, tenantC),
    };

    await must(() =>
      seed?.call(rbacPart, contextFor("rbac", path.join(root, "rbac"), handles)) ?? Promise.resolve(),
    );
    assert.deepEqual(
      {
        default: await eventCount(ownerPool, defaultTenant),
        b: await eventCount(ownerPool, tenantB),
        c: await eventCount(ownerPool, tenantC),
      },
      countsAfterFirst,
      "the second seed appends no event",
    );
    assert.ok(countsAfterFirst.default > 0, "the first seed appends events");
    assert.ok(countsAfterFirst.b > 0, "the first seed appends events for tenant_b");

    for (const ctx of [defaultTenant, tenantB]) {
      assert.deepEqual(await seedState(ownerPool, ctx), {
        teams: ["finance"],
        mappings: [...EXPECTED_MAPPINGS],
      });
    }
    assert.deepEqual(await seedState(ownerPool, tenantC), {
      teams: [],
      mappings: [],
    });

    const onlyDatabase = new Map<string, PartHandle>([["database", databaseHandle]]);
    await assert.rejects(
      seed?.call(rbacPart, contextFor("rbac", path.join(root, "rbac"), onlyDatabase)) ??
        Promise.resolve(),
      { code: "STACK_PART_MISSING" },
      "a seed without the oidc handle is refused",
    );
  } finally {
    await rbacHandle?.close().catch(() => undefined);
    await oidcHandle?.close().catch(() => undefined);
    await ownerPool?.end().catch(() => undefined);
    await databaseHandle?.close().catch(() => undefined);
  }
});

test("C-d6306ed0 Discovered in order", async () => {
  const parts = await discoverParts();
  const names = parts.map((part) => part.name);
  assert.ok(names.includes("rbac"), "the rbac part is discovered");
  assert.ok(
    names.indexOf("database") < names.indexOf("rbac"),
    "the rbac part is discovered after the database part",
  );
  assert.ok(
    names.indexOf("oidc") < names.indexOf("rbac"),
    "the rbac part is discovered after the oidc part",
  );

  const partFile = path.join(PARTS_DIR, "30-rbac.ts");
  assert.ok(existsSync(partFile), "the shipped rbac part file exists");
  assert.equal(
    readFileSync(partFile, "utf8").trim(),
    'export { rbacPart as part } from "../rbac-part.ts";',
    "the part file re-exports the rbac part",
  );
});
