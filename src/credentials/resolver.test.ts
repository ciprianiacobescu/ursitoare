import assert from "node:assert/strict";
import { test } from "node:test";

import { Secret } from "../config/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { startFakeEgress } from "../../test/support/fake-egress/index.ts";
import type { FakeEgress } from "../../test/support/fake-egress/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { createVaultWriter } from "../gateway/vault.ts";
import type { VaultWriter } from "../gateway/vault.ts";
import { provisionCredential } from "./provision.ts";
import { rotateCredential } from "./rotate.ts";
import { createServiceResolver, seedServiceId } from "./resolver.ts";
import type { CredentialDeps, ServiceResolver } from "./types.ts";

assert.equal(typeof createServiceResolver, "function");
assert.equal(typeof seedServiceId, "function");

const ORIGIN = "https://tools.fake.test";
const KH = "x-fake-tools-key";
const NOW = "2026-11-06T10:00:00Z";
const S2 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e02";
const SVC1 = "00000000-0000-7000-8000-000000000001";
const CRED1 = "cred_00000000-0000-7000-8000-000000000002";
const CAROL = { kind: "user", id: "u_carol" } as const;
const DAVE = { kind: "user", id: "u_dave" } as const;
const API = "API_KEY_HEADER";
const BEARER = "BEARER_TOKEN";
const VAL1 = "kv-secret-" + "7f3a";
const VAL2 = "kv-secret-" + "8e2b";
const VALB = "bt-secret-" + "9c1d";

interface Rig {
  db: TestDatabase;
  fake: FakeEgress;
  ta: TenantContext;
  tb: TenantContext;
  deps: CredentialDeps;
}

async function setup(): Promise<Rig> {
  const db = await withTestDatabase();
  const fake = await startFakeEgress({ now: () => new Date(NOW) });
  const { a, b } = await seedTwoTenants(db);
  for (const id of ["acme", "beta", "gamma"]) {
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await tx.query(
        `INSERT INTO ursitoare.tool_server
           (tenant_id, tool_server_id, adapter, origin, local, state, registered_by, registered_at)
         VALUES ($1, $2, 'fixture', $3, false, 'pending', 'u_carol', $4)`,
        [a.tenantId, id, ORIGIN, NOW],
      );
    });
  }
  await withTenantTx(db.ownerPool, b, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare.tool_server
         (tenant_id, tool_server_id, adapter, origin, local, state, registered_by, registered_at)
       VALUES ($1, 'acme', 'fixture', $2, false, 'pending', 'u_carol', $3)`,
      [b.tenantId, ORIGIN, NOW],
    );
  });
  const logger = createLogger({ level: "silent", destination: { write: (_line: string): void => {} } });
  const vault: VaultWriter = createVaultWriter(
    { url: fake.vaultUrl, identity: fake.vaultAdmin.identity, token: new Secret(fake.vaultAdmin.token) },
    { logger },
  );
  return {
    db,
    fake,
    ta: a,
    tb: b,
    deps: {
      pool: db.appPool,
      vault,
      ids: sequentialIds(1),
      clock: fixedClock(NOW),
    },
  };
}

async function teardown(rig: Rig): Promise<void> {
  await rig.fake.close();
  await rig.db.close();
}

function resolverFor(pool: TenantPool): ServiceResolver {
  let resolver: ServiceResolver | undefined;
  assert.doesNotThrow(() => {
    resolver = createServiceResolver(pool);
  });
  assert.ok(resolver !== undefined, "the resolver was created");
  return resolver;
}

function seedId(tenantId: string, toolServerId: string): string {
  let id: string | undefined;
  assert.doesNotThrow(() => {
    id = seedServiceId(tenantId, toolServerId);
  });
  assert.ok(id !== undefined, "seedServiceId answered");
  return id;
}

async function resolveTarget(
  resolver: ServiceResolver,
  ctx: TenantContext,
  toolServerId: string,
): Promise<{ serviceId: string; origin: string } | null> {
  let target: { serviceId: string; origin: string } | null | undefined;
  await assert.doesNotReject(async () => {
    target = await resolver.resolve(ctx, toolServerId);
  });
  assert.notEqual(target, undefined, "resolve answered");
  return target ?? null;
}

async function provision(
  rig: Rig,
  input: Parameters<typeof provisionCredential>[2],
): Promise<void> {
  await assert.doesNotReject(async () => {
    await provisionCredential(rig.deps, rig.ta, input, CAROL);
  });
}

async function rotate(
  rig: Rig,
  ctx: TenantContext,
  credentialId: string,
  value: string,
  actor: Parameters<typeof rotateCredential>[4],
): Promise<void> {
  await assert.doesNotReject(async () => {
    await rotateCredential(rig.deps, ctx, credentialId, value, actor);
  });
}

test("C-c3669299 resolve answers per tenant before and after rotation and seedServiceId matches its vectors", async () => {
  const rig = await setup();
  try {
    await provision(rig, { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 });
    await provision(rig, {
      toolServerId: "beta",
      authScheme: BEARER,
      headerName: null,
      value: VALB,
      serviceId: S2,
    });

    assert.equal(seedId("tenant_a", "acme"), "87caf624-f579-8435-9540-24d6eb57aeff");
    assert.equal(seedId("tenant_b", "acme"), "78edb038-ec1b-82b0-8002-8efed8152e65");

    const resolver = resolverFor(rig.db.appPool);
    assert.deepEqual(await resolveTarget(resolver, rig.ta, "acme"), {
      serviceId: SVC1,
      origin: ORIGIN,
    });
    assert.equal(await resolveTarget(resolver, rig.ta, "gamma"), null);
    assert.equal(await resolveTarget(resolver, rig.ta, "nope"), null);
    assert.equal(await resolveTarget(resolver, rig.tb, "acme"), null);

    await rotate(rig, rig.ta, CRED1, VAL2, DAVE);
    assert.deepEqual(await resolveTarget(resolver, rig.ta, "acme"), {
      serviceId: SVC1,
      origin: ORIGIN,
    });
  } finally {
    await teardown(rig);
  }
});

test("C-c3669299 a down pool rejects with db down", async () => {
  const ctx: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
  const failing: TenantPool = {
    connect: async () => {
      throw new Error("db down");
    },
  };
  const resolver = resolverFor(failing);
  await assert.rejects(resolver.resolve(ctx, "acme"), /db down/);
});
