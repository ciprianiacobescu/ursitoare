import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "../core/index.ts";
import {
  createServiceAccount,
  grantRole,
  setAccountState,
} from "../identity/index.ts";
import type { User } from "../identity/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { createPrincipalLoader } from "./principal-loader.ts";

const NOW = "2026-11-02T10:00:00Z";
const OPERATOR = { kind: "operator", name: "seed" } as const;

test("C-70f6fb59 principal loader gives an active user's entity and null for anyone else", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const clock = fixedClock(NOW);
    const users = await seedFlowActors(
      db,
      a,
      [
        { subject: "alice", roles: ["author"], teams: ["finance"] },
        { subject: "carol", roles: ["tenant_admin"], teams: [] },
      ],
      clock,
    );
    const others = await seedFlowActors(
      db,
      b,
      [{ subject: "mallory", roles: ["author"], teams: ["finance"] }],
      clock,
    );
    const alice = users["alice"];
    const carol = users["carol"];
    const mallory = others["mallory"];
    assert.ok(alice !== undefined, "alice is seeded");
    assert.ok(carol !== undefined, "carol is seeded");
    assert.ok(mallory !== undefined, "mallory is seeded");

    let service: User | undefined;
    await withTenantTx(db.appPool, a, async (tx) => {
      service = await createServiceAccount(tx, a, { displayName: "robot", ownerUserId: alice });
      await grantRole(tx, a, { userId: service.userId, roleId: "tenant_admin" }, OPERATOR);
      await grantRole(tx, a, { userId: service.userId, roleId: "author" }, OPERATOR);
    });
    assert.ok(service !== undefined, "the service account is created");
    const serviceId = service.userId;

    let load: ReturnType<typeof createPrincipalLoader> | undefined;
    assert.doesNotThrow(() => {
      load = createPrincipalLoader(db.appPool);
    });
    assert.ok(load !== undefined, "createPrincipalLoader returns a loader");

    const aliceEntity = await load(a, alice);
    assert.deepEqual(aliceEntity, {
      tenantId: "tenant_a",
      userId: alice,
      kind: "human",
      roles: ["author"],
      teams: ["finance"],
    });

    assert.deepEqual(await load(a, carol), {
      tenantId: "tenant_a",
      userId: carol,
      kind: "human",
      roles: ["tenant_admin"],
      teams: [],
    });

    assert.deepEqual(await load(a, serviceId), {
      tenantId: "tenant_a",
      userId: serviceId,
      kind: "service",
      roles: ["author", "tenant_admin"],
      teams: [],
    });

    await withTenantTx(db.appPool, a, async (tx) => {
      await setAccountState(
        tx,
        a,
        { userId: alice, kind: "human", state: "disabled" },
        { kind: "user", userId: carol, roles: ["tenant_admin"] },
      );
    });
    assert.equal(await load(a, alice), null, "a disabled user has no entity");

    assert.equal(await load(a, "u_nope"), null, "an unknown id has no entity");
    assert.equal(await load(a, mallory), null, "a user of another tenant has no entity");
    await assert.rejects(load(a, "a b"), { code: "IDENTITY_INVALID" });
  } finally {
    await db.close();
  }
});
