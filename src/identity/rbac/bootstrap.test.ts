import assert from "node:assert/strict";
import { test } from "node:test";

import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { provisionTenantIdp } from "../index.ts";
import { bootstrapAdminGroup, mapBootstrapAdminGroup } from "./bootstrap.ts";
import { listGroupMappings, type GroupMapping } from "./group-map.ts";

const ISS = "https://idp.example/realms/ursitoare";
const OTHER_ISS = "https://other.example";
const BOOTSTRAP_GROUP = "ursitoare-admins";
const OPERATOR = "cli";

interface AuditRow {
  event_type: string;
  actor: unknown;
  target: unknown;
  payload: unknown;
}

async function bootstrap(
  db: TestDatabase,
  ctx: TenantContext,
  input: { issuer: string; group: string; operator: string },
): Promise<"mapped" | "already_mapped"> {
  let result: "mapped" | "already_mapped" | undefined;
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await assert.doesNotReject(async () => {
      result = await mapBootstrapAdminGroup(tx, ctx, input);
    });
  });
  assert.ok(result !== undefined, "mapBootstrapAdminGroup resolves");
  return result;
}

async function mappingsIn(db: TestDatabase, ctx: TenantContext): Promise<GroupMapping[]> {
  return withTenantTx(db.ownerPool, ctx, async (tx) => listGroupMappings(tx, ctx));
}

async function auditIn(db: TestDatabase, ctx: TenantContext): Promise<AuditRow[]> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query<AuditRow>(
      `SELECT event_type, actor, target, payload FROM ursitoare.audit_event
       WHERE tenant_id = $1 ORDER BY seq`,
      [ctx.tenantId],
    );
    return result.rows;
  });
}

function configured(env: Readonly<Record<string, string | undefined>>): string {
  let result: string | undefined;
  assert.doesNotThrow(() => {
    result = bootstrapAdminGroup(env);
  });
  return result as string;
}

test("C-5d833e0c Once, also under concurrency", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });

    assert.equal(
      await bootstrap(db, a, { issuer: ISS, group: BOOTSTRAP_GROUP, operator: OPERATOR }),
      "mapped",
    );
    assert.equal(
      await bootstrap(db, a, { issuer: ISS, group: "other-admins", operator: OPERATOR }),
      "already_mapped",
    );

    assert.deepEqual(await mappingsIn(db, a), [
      {
        issuer: ISS,
        group: BOOTSTRAP_GROUP,
        roleId: "tenant_admin",
        teamId: null,
        reviewedBy: `operator:${OPERATOR}`,
      },
    ]);

    const eventsA = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.bootstrap_admin_mapped",
    );
    assert.equal(eventsA.length, 1, "the second call appends no event");
    assert.deepEqual(eventsA[0]?.actor, { kind: "system", id: `operator:${OPERATOR}` });
    assert.deepEqual(eventsA[0]?.payload, { issuer: ISS, group: BOOTSTRAP_GROUP });

    await db.ownerPool.query(
      "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_c', 'Tenant C')",
    );
    const c: TenantContext = { tenantId: "tenant_c", reviewProfile: "solo" };
    await provisionTenantIdp(db.ownerPool, c, { issuer: ISS, organization: "org-c" });

    const input = { issuer: ISS, group: BOOTSTRAP_GROUP, operator: OPERATOR };
    const settled = await Promise.all([
      withTenantTx(db.ownerPool, c, (tx) => mapBootstrapAdminGroup(tx, c, input)),
      withTenantTx(db.ownerPool, c, (tx) => mapBootstrapAdminGroup(tx, c, input)),
    ]);
    assert.deepEqual([...settled].sort(), ["already_mapped", "mapped"]);

    assert.deepEqual(await mappingsIn(db, c), [
      {
        issuer: ISS,
        group: BOOTSTRAP_GROUP,
        roleId: "tenant_admin",
        teamId: null,
        reviewedBy: `operator:${OPERATOR}`,
      },
    ]);

    const eventsC = (await auditIn(db, c)).filter(
      (row) => row.event_type === "identity.bootstrap_admin_mapped",
    );
    assert.equal(eventsC.length, 1, "the parallel calls append exactly one event");
    assert.deepEqual(eventsC[0]?.actor, { kind: "system", id: `operator:${OPERATOR}` });
    assert.deepEqual(eventsC[0]?.payload, { issuer: ISS, group: BOOTSTRAP_GROUP });
  } finally {
    await db.close();
  }
});

test("C-66bbe105 Refusals", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });

    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.rejects(
        mapBootstrapAdminGroup(
          tx,
          a,
          { issuer: OTHER_ISS, group: BOOTSTRAP_GROUP, operator: OPERATOR },
        ),
        { code: "RBAC_UNKNOWN_ISSUER" },
        "an issuer not routed to the tenant",
      );
    });
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.rejects(
        mapBootstrapAdminGroup(tx, a, { issuer: ISS, group: "", operator: OPERATOR }),
        { code: "RBAC_INVALID" },
        "an empty group",
      );
    });
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.rejects(
        mapBootstrapAdminGroup(
          tx,
          a,
          { issuer: ISS, group: BOOTSTRAP_GROUP, operator: "bad name!" },
        ),
        { code: "RBAC_INVALID" },
        "an invalid operator name",
      );
    });

    assert.deepEqual(await mappingsIn(db, a), [], "the refusals map nothing");
    assert.deepEqual(
      (await auditIn(db, a)).filter(
        (row) => row.event_type === "identity.bootstrap_admin_mapped",
      ),
      [],
      "the refusals append no event",
    );
  } finally {
    await db.close();
  }
});

test("C-df09429c The configured name", () => {
  assert.equal(configured({}), "ursitoare-admins");
  assert.equal(configured({ URSITOARE_BOOTSTRAP_ADMIN_GROUP: "corp-admins" }), "corp-admins");
  assert.equal(configured({ URSITOARE_BOOTSTRAP_ADMIN_GROUP: "" }), "ursitoare-admins");
  assert.throws(
    () => bootstrapAdminGroup({ URSITOARE_BOOTSTRAP_ADMIN_GROUP: "a".repeat(256) }),
    { code: "RBAC_INVALID" },
    "a value of 256 characters",
  );
  assert.throws(
    () => bootstrapAdminGroup({ URSITOARE_BOOTSTRAP_ADMIN_GROUP: " x" }),
    { code: "RBAC_INVALID" },
    "a value that is not equal to its trim",
  );
});
