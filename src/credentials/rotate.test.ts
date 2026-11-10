import assert from "node:assert/strict";
import { test } from "node:test";

import { Secret } from "../config/index.ts";
import { sequentialIds } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { startFakeEgress } from "../../test/support/fake-egress/index.ts";
import type { FakeEgress } from "../../test/support/fake-egress/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { createVaultWriter } from "../gateway/vault.ts";
import type { PutCredentialInput, VaultWriter } from "../gateway/vault.ts";
import { provisionCredential } from "./provision.ts";
import { rotateCredential } from "./rotate.ts";
import { listCredentials } from "./store.ts";
import { CredentialsError } from "./types.ts";
import type { CredentialDeps, CredentialRecord } from "./types.ts";

assert.equal(typeof rotateCredential, "function");
assert.equal(typeof listCredentials, "function");

const ORIGIN = "https://tools.fake.test";
const KH = "x-fake-tools-key";
const NOW = "2026-11-06T10:00:00Z";
const TA = "d7f4eeba-9f57-8892-b4bb-591d220496d4";
const S2 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e02";
const SVC1 = "00000000-0000-7000-8000-000000000001";
const CRED1 = "cred_00000000-0000-7000-8000-000000000002";
const CRED2 = "cred_00000000-0000-7000-8000-000000000003";
const CAROL = { kind: "user", id: "u_carol" } as const;
const DAVE = { kind: "user", id: "u_dave" } as const;
const API = "API_KEY_HEADER";
const BEARER = "BEARER_TOKEN";
const VAL1 = "kv-secret-" + "7f3a";
const VAL2 = "kv-secret-" + "8e2b";
const VALB = "bt-secret-" + "9c1d";
const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);

interface MutableClock extends Clock {
  advance(ms: number): void;
}

function mutableClock(iso: string): MutableClock {
  let millis = Date.parse(iso);
  return {
    now: (): Date => new Date(millis),
    advance(ms: number): void {
      millis += ms;
    },
  };
}

interface Rig {
  db: TestDatabase;
  fake: FakeEgress;
  ta: TenantContext;
  tb: TenantContext;
  deps: CredentialDeps;
  logger: ReturnType<typeof createLogger>;
  clock: MutableClock;
  seen: PutCredentialInput[];
}

async function setup(): Promise<Rig> {
  const db = await withTestDatabase();
  const fake = await startFakeEgress({ now: () => new Date(NOW) });
  const { a, b } = await seedTwoTenants(db);
  for (const id of ["acme", "beta"]) {
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await tx.query(
        `INSERT INTO ursitoare.tool_server
           (tenant_id, tool_server_id, adapter, origin, local, state, registered_by, registered_at)
         VALUES ($1, $2, 'fixture', $3, false, 'pending', 'u_carol', $4)`,
        [a.tenantId, id, ORIGIN, NOW],
      );
    });
  }
  const logger = createLogger({ level: "silent", destination: { write: (_line: string): void => {} } });
  const inner: VaultWriter = createVaultWriter(
    { url: fake.vaultUrl, identity: fake.vaultAdmin.identity, token: new Secret(fake.vaultAdmin.token) },
    { logger },
  );
  const seen: PutCredentialInput[] = [];
  const clock = mutableClock(NOW);
  return {
    db,
    fake,
    ta: a,
    tb: b,
    logger,
    clock,
    seen,
    deps: {
      pool: db.appPool,
      ids: sequentialIds(1),
      clock,
      vault: {
        async putCredential(input: PutCredentialInput): Promise<{ keyVersion: number }> {
          seen.push(input);
          return inner.putCredential(input);
        },
      },
    },
  };
}

async function teardown(rig: Rig): Promise<void> {
  await rig.fake.close();
  await rig.db.close();
}

async function provision(
  rig: Rig,
  input: Parameters<typeof provisionCredential>[2],
): Promise<CredentialRecord> {
  let record: CredentialRecord | undefined;
  await assert.doesNotReject(async () => {
    record = await provisionCredential(rig.deps, rig.ta, input, CAROL);
  });
  assert.ok(record !== undefined, "a provisioned record came back");
  return record;
}

async function rotate(
  deps: CredentialDeps,
  ctx: TenantContext,
  credentialId: string,
  value: string,
  actor: Parameters<typeof rotateCredential>[4],
): Promise<CredentialRecord> {
  let record: CredentialRecord | undefined;
  await assert.doesNotReject(async () => {
    record = await rotateCredential(deps, ctx, credentialId, value, actor);
  });
  assert.ok(record !== undefined, "a rotated record came back");
  return record;
}

async function list(pool: Rig["deps"]["pool"], ctx: TenantContext): Promise<CredentialRecord[]> {
  let records: CredentialRecord[] | undefined;
  await assert.doesNotReject(async () => {
    records = await listCredentials(pool, ctx);
  });
  assert.ok(records !== undefined, "the list call returned");
  return records;
}

async function credentialRows(rig: Rig): Promise<{ mintkey_service_id: string; key_version: number }[]> {
  return withTenantTx(rig.db.appPool, rig.ta, async (tx) => {
    const { rows } = await tx.query<{ mintkey_service_id: string; key_version: number }>(
      "SELECT mintkey_service_id, key_version FROM ursitoare.credential_ref ORDER BY credential_id COLLATE \"C\"",
    );
    return rows;
  });
}

async function rotatedEvents(
  rig: Rig,
): Promise<{ target: unknown; payload: unknown }[]> {
  return withTenantTx(rig.db.appPool, rig.ta, async (tx) => {
    const { rows } = await tx.query<{ target: unknown; payload: unknown }>(
      "SELECT target, payload FROM ursitoare.audit_event WHERE event_type = 'credentials.rotated' ORDER BY seq",
    );
    return rows;
  });
}

function refusal(code: string, details: Record<string, string>) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof CredentialsError, "a CredentialsError");
    assert.equal(error.code, code);
    assert.deepEqual({ ...error.details }, details);
    return true;
  };
}

async function closedVaultWriter(logger: Rig["logger"]): Promise<VaultWriter> {
  const fake = await startFakeEgress({ now: () => new Date(NOW) });
  try {
    return createVaultWriter(
      { url: fake.vaultUrl, identity: fake.vaultAdmin.identity, token: new Secret(fake.vaultAdmin.token) },
      { logger },
    );
  } finally {
    await fake.close();
  }
}

const REC2 = (): CredentialRecord => ({
  id: CRED2,
  toolServerId: "beta",
  serviceId: S2,
  authScheme: BEARER,
  headerName: null,
  targetOrigin: ORIGIN,
  keyVersion: 1,
  provisionedBy: "u_carol",
  provisionedAt: "2026-11-06T10:00:00.000000Z",
  rotatedAt: null,
});

test("C-9507eedb rotate bumps the key version records the caller and lists tenant metadata", async () => {
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
    rig.seen.length = 0;
    rig.clock.advance(1000);

    const rotated = await rotate(rig.deps, rig.ta, CRED1, VAL2, DAVE);
    assert.deepEqual(rotated, {
      id: CRED1,
      toolServerId: "acme",
      serviceId: SVC1,
      authScheme: API,
      headerName: KH,
      targetOrigin: ORIGIN,
      keyVersion: 2,
      provisionedBy: "u_carol",
      provisionedAt: "2026-11-06T10:00:00.000000Z",
      rotatedAt: "2026-11-06T10:00:01.000000Z",
    });
    assert.deepEqual(rig.seen[0], {
      tenantId: TA,
      serviceId: SVC1,
      authScheme: API,
      value: utf8(VAL2),
      headerName: KH,
      callerActorId: "u_dave",
      targetUrl: ORIGIN,
    });
    const stored = rig.fake.credentials().find((entry) => entry.serviceId === SVC1);
    assert.ok(stored !== undefined, "the fake still holds the credential");
    assert.equal(stored.keyVersion, 2);
    assert.equal(stored.callerActorId, "u_dave");

    const events = await rotatedEvents(rig);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0]?.target, { kind: "credential", id: CRED1 });
    assert.deepEqual(events[0]?.payload, { serviceId: SVC1, keyVersion: 2 });

    const listed = await list(rig.deps.pool, rig.ta);
    assert.deepEqual(listed, [rotated, REC2()]);
    const otherTenant = await list(rig.deps.pool, rig.tb);
    assert.deepEqual(otherTenant, []);
  } finally {
    await teardown(rig);
  }
});

test("C-9507eedb rotation refusals change nothing and concurrent rotations serialise", async () => {
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
    rig.seen.length = 0;
    rig.clock.advance(1000);
    const first = await rotate(rig.deps, rig.ta, CRED1, VAL2, DAVE);
    assert.equal(first.keyVersion, 2);

    await assert.rejects(
      rotateCredential(rig.deps, rig.ta, "cred_nope", VAL2, DAVE),
      refusal("CREDENTIALS_NOT_FOUND", { credentialId: "cred_nope" }),
    );
    await assert.rejects(
      rotateCredential(rig.deps, rig.tb, CRED1, VAL2, DAVE),
      refusal("CREDENTIALS_NOT_FOUND", { credentialId: CRED1 }),
    );
    const callsBeforeInvalid = rig.seen.length;
    await assert.rejects(
      rotateCredential(rig.deps, rig.ta, CRED1, "", DAVE),
      refusal("CREDENTIALS_INVALID", { field: "value", reason: "size" }),
    );
    assert.equal(rig.seen.length, callsBeforeInvalid, "an invalid value never reaches the vault");

    const closed = await closedVaultWriter(rig.logger);
    await assert.rejects(
      rotateCredential({ ...rig.deps, vault: closed }, rig.ta, CRED1, VAL2, DAVE),
      refusal("CREDENTIALS_VAULT", { reason: "unavailable" }),
    );

    assert.deepEqual(await credentialRows(rig), [
      { mintkey_service_id: SVC1, key_version: 2 },
      { mintkey_service_id: S2, key_version: 1 },
    ]);
    assert.equal((await rotatedEvents(rig)).length, 1, "the refusals appended no event");
    const storedAfterRefusals = rig.fake.credentials().find((entry) => entry.serviceId === SVC1);
    assert.equal(storedAfterRefusals?.keyVersion, 2);

    const outcomes = await Promise.allSettled([
      rotateCredential(rig.deps, rig.ta, CRED1, VAL2, DAVE),
      rotateCredential(rig.deps, rig.ta, CRED1, VAL2, DAVE),
    ]);
    const versions = outcomes.map((outcome) => {
      assert.equal(outcome.status, "fulfilled", "both rotations succeed in turn");
      return outcome.status === "fulfilled" ? outcome.value.keyVersion : -1;
    });
    assert.deepEqual(versions.sort((left, right) => left - right), [3, 4]);

    assert.deepEqual(await credentialRows(rig), [
      { mintkey_service_id: SVC1, key_version: 4 },
      { mintkey_service_id: S2, key_version: 1 },
    ]);
    const storedAfterRace = rig.fake.credentials().find((entry) => entry.serviceId === SVC1);
    assert.equal(storedAfterRace?.keyVersion, 4);
    assert.equal((await rotatedEvents(rig)).length, 3);

    const listed = await list(rig.deps.pool, rig.ta);
    assert.deepEqual(listed, [
      {
        id: CRED1,
        toolServerId: "acme",
        serviceId: SVC1,
        authScheme: API,
        headerName: KH,
        targetOrigin: ORIGIN,
        keyVersion: 4,
        provisionedBy: "u_carol",
        provisionedAt: "2026-11-06T10:00:00.000000Z",
        rotatedAt: "2026-11-06T10:00:01.000000Z",
      },
      REC2(),
    ]);
    const otherTenant = await list(rig.deps.pool, rig.tb);
    assert.deepEqual(otherTenant, []);
  } finally {
    await teardown(rig);
  }
});
