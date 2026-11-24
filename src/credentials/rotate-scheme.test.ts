import assert from "node:assert/strict";
import { test } from "node:test";

import { Secret } from "../config/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { GatewayError } from "../gateway/index.ts";
import { createVaultWriter } from "../gateway/vault.ts";
import type { PutCredentialInput, VaultWriter } from "../gateway/vault.ts";
import { createLogger } from "../observability/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { startFakeEgress } from "../../test/support/fake-egress/index.ts";
import type { FakeEgress } from "../../test/support/fake-egress/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { provisionCredential } from "./provision.ts";
import { rotateCredential } from "./rotate.ts";
import { CredentialsError } from "./types.ts";
import type { CredentialDeps, CredentialRecord } from "./types.ts";

assert.equal(typeof rotateCredential, "function");

const ORIGIN = "https://tools.fake.test";
const KH = "x-fake-tools-key";
const NOW = "2026-11-06T10:00:00Z";
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

interface RotateChange {
  authScheme?: string;
  headerName?: string;
}

type RotateWithChange = (
  deps: CredentialDeps,
  ctx: TenantContext,
  credentialId: string,
  value: string,
  actor: Parameters<typeof rotateCredential>[4],
  change: RotateChange,
) => Promise<CredentialRecord>;

const rotateWithChange = rotateCredential as unknown as RotateWithChange;

interface Rig {
  db: TestDatabase;
  fake: FakeEgress;
  ta: TenantContext;
  deps: CredentialDeps;
  seen: PutCredentialInput[];
}

async function setup(): Promise<Rig> {
  const db = await withTestDatabase();
  const fake = await startFakeEgress({ now: () => new Date(NOW) });
  const { a } = await seedTwoTenants(db);
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
  const logger = createLogger({
    level: "silent",
    destination: { write: (_line: string): void => {} },
  });
  const inner: VaultWriter = createVaultWriter(
    {
      url: fake.vaultUrl,
      identity: fake.vaultAdmin.identity,
      token: new Secret(fake.vaultAdmin.token),
    },
    { logger },
  );
  const seen: PutCredentialInput[] = [];
  return {
    db,
    fake,
    ta: a,
    seen,
    deps: {
      pool: db.appPool,
      ids: sequentialIds(1),
      clock: fixedClock(NOW),
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

async function rotatedEvents(rig: Rig): Promise<{ payload: unknown }[]> {
  return withTenantTx(rig.db.appPool, rig.ta, async (tx) => {
    const { rows } = await tx.query<{ payload: unknown }>(
      "SELECT payload FROM ursitoare.audit_event WHERE event_type = 'credentials.rotated' ORDER BY seq",
    );
    return rows;
  });
}

async function credentialRow(rig: Rig, credentialId: string): Promise<unknown> {
  return withTenantTx(rig.db.appPool, rig.ta, async (tx) => {
    const { rows } = await tx.query(
      `SELECT auth_scheme, header_name, key_version, target_origin, mintkey_service_id
         FROM ursitoare.credential_ref WHERE tenant_id = $1 AND credential_id = $2`,
      [rig.ta.tenantId, credentialId],
    );
    return rows[0];
  });
}

async function rawCredentialRows(rig: Rig): Promise<unknown[]> {
  return withTenantTx(rig.db.appPool, rig.ta, async (tx) => {
    const { rows } = await tx.query("SELECT * FROM ursitoare.credential_ref");
    return rows;
  });
}

function refusal(code: string, details: Record<string, string>) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof CredentialsError, "a CredentialsError");
    assert.equal(error.code, code);
    assert.deepEqual({ ...error.details }, details);
    const text = JSON.stringify({ message: error.message, details: error.details });
    assert.ok(!text.includes(VAL1), "the old value is not in the error");
    assert.ok(!text.includes(VAL2), "the new value is not in the error");
    return true;
  };
}

function assertNoSecret(value: unknown): void {
  const text = JSON.stringify(value);
  assert.ok(!text.includes(VAL1), "the old value is not stored");
  assert.ok(!text.includes(VAL2), "the new value is not stored");
}

test("C-bc2e752b migration 0550 lets the app role change the scheme and header and nothing else", async () => {
  const rig = await setup();
  try {
    await provision(rig, { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 });

    const ledger = await rig.db.ownerPool.query<{ version: number; name: string }>(
      "SELECT version, name FROM ursitoare.schema_migration WHERE version = 550",
    );
    const entry = ledger.rows[0];
    assert.ok(entry !== undefined, "the ledger holds version 550");
    assert.equal(entry.name, "credential_scheme");

    const changed = await withTenantTx(rig.db.appPool, rig.ta, async (tx) => {
      const result = await tx.query(
        `UPDATE ursitoare.credential_ref
           SET auth_scheme = 'BEARER_TOKEN', header_name = NULL
         WHERE credential_id = $1`,
        [CRED1],
      );
      return result.rowCount ?? 0;
    });
    assert.equal(changed, 1, "the app role changes the scheme and the header");

    await assert.rejects(
      withTenantTx(rig.db.appPool, rig.ta, async (tx) => {
        await tx.query(
          "UPDATE ursitoare.credential_ref SET auth_scheme = 'API_KEY_HEADER' WHERE credential_id = $1",
          [CRED1],
        );
      }),
      { code: "23514" },
    );

    for (const sql of [
      "UPDATE ursitoare.credential_ref SET target_origin = 'https://evil.test' WHERE credential_id = $1",
      "UPDATE ursitoare.credential_ref SET mintkey_service_id = '" + S2 + "' WHERE credential_id = $1",
      "UPDATE ursitoare.credential_ref SET provisioned_by = 'u_x' WHERE credential_id = $1",
    ]) {
      await assert.rejects(
        withTenantTx(rig.db.appPool, rig.ta, async (tx) => {
          await tx.query(sql, [CRED1]);
        }),
        { code: "42501" },
      );
    }
  } finally {
    await teardown(rig);
  }
});

test("C-4450f7f8 a rotation changes the scheme and header and a value-only rotation is as before", async () => {
  const rig = await setup();
  const fresh = await setup();
  try {
    await provision(rig, { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 });
    rig.seen.length = 0;

    const s2 = await rotateWithChange(rig.deps, rig.ta, CRED1, VAL2, DAVE, { authScheme: BEARER });
    assert.equal(s2.authScheme, BEARER);
    assert.equal(s2.headerName, null);
    assert.equal(s2.keyVersion, 2);
    assert.equal(rig.seen[0]?.authScheme, BEARER);
    assert.equal(rig.seen[0]?.headerName, null);
    const fake2 = rig.fake.credentials().find((entry) => entry.serviceId === SVC1);
    assert.equal(fake2?.authScheme, BEARER);
    assert.equal(fake2?.headerName, null);
    assert.equal(fake2?.keyVersion, 2);
    assert.deepEqual((await rotatedEvents(rig)).at(-1)?.payload, {
      serviceId: SVC1,
      keyVersion: 2,
      authScheme: BEARER,
      headerName: null,
    });

    const s3 = await rotateWithChange(rig.deps, rig.ta, CRED1, VAL2, DAVE, {
      authScheme: API,
      headerName: "X-Api-Key",
    });
    assert.equal(s3.authScheme, API);
    assert.equal(s3.headerName, "X-Api-Key");
    assert.equal(s3.keyVersion, 3);
    assert.equal(rig.seen.at(-1)?.authScheme, API);
    assert.equal(rig.seen.at(-1)?.headerName, "X-Api-Key");
    const fake3 = rig.fake.credentials().find((entry) => entry.serviceId === SVC1);
    assert.equal(fake3?.authScheme, API);
    assert.equal(fake3?.headerName, "x-api-key");
    assert.equal(fake3?.keyVersion, 3);
    assert.deepEqual((await rotatedEvents(rig)).at(-1)?.payload, {
      serviceId: SVC1,
      keyVersion: 3,
      authScheme: API,
      headerName: "X-Api-Key",
    });

    const s4 = await rotateWithChange(rig.deps, rig.ta, CRED1, VAL2, DAVE, {
      headerName: "x-other",
    });
    assert.equal(s4.authScheme, API);
    assert.equal(s4.headerName, "x-other");
    assert.equal(s4.keyVersion, 4);
    assert.equal(rig.seen.at(-1)?.authScheme, API);
    assert.equal(rig.seen.at(-1)?.headerName, "x-other");
    const fake4 = rig.fake.credentials().find((entry) => entry.serviceId === SVC1);
    assert.equal(fake4?.headerName, "x-other");
    assert.equal(fake4?.keyVersion, 4);
    assert.deepEqual((await rotatedEvents(rig)).at(-1)?.payload, {
      serviceId: SVC1,
      keyVersion: 4,
      authScheme: API,
      headerName: "x-other",
    });

    await provision(fresh, { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 });
    fresh.seen.length = 0;
    const s5 = await rotateCredential(fresh.deps, fresh.ta, CRED1, VAL2, DAVE);
    assert.equal(s5.authScheme, API);
    assert.equal(s5.headerName, KH);
    assert.equal(s5.keyVersion, 2);
    const s5events = await rotatedEvents(fresh);
    assert.deepEqual(s5events.at(-1)?.payload, { serviceId: SVC1, keyVersion: 2 });
    assertNoSecret(s5events);
    assertNoSecret(await rawCredentialRows(fresh));

    assertNoSecret(await rawCredentialRows(rig));
    assertNoSecret(await rotatedEvents(rig));
  } finally {
    await teardown(rig);
    await teardown(fresh);
  }
});

test("C-4450f7f8 rotation refusals change no row vault entry or event", async () => {
  const rig = await setup();
  try {
    await provision(rig, { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 });
    await provision(rig, {
      toolServerId: "beta",
      authScheme: BEARER,
      headerName: null,
      value: VAL1,
      serviceId: S2,
    });
    rig.seen.length = 0;
    const before1 = await credentialRow(rig, CRED1);
    const before2 = await credentialRow(rig, CRED2);
    const beforeEvents = (await rotatedEvents(rig)).length;

    await assert.rejects(
      rotateWithChange(rig.deps, rig.ta, CRED1, VAL2, DAVE, {
        authScheme: BEARER,
        headerName: "x-k",
      }),
      refusal("CREDENTIALS_INVALID", { field: "headerName", reason: "not_allowed" }),
    );
    await assert.rejects(
      rotateWithChange(rig.deps, rig.ta, CRED2, VAL2, DAVE, { authScheme: API }),
      refusal("CREDENTIALS_INVALID", { field: "headerName", reason: "required" }),
    );
    await assert.rejects(
      rotateWithChange(rig.deps, rig.ta, CRED1, VAL2, DAVE, { headerName: "authorization" }),
      refusal("CREDENTIALS_INVALID", { field: "headerName", reason: "reserved" }),
    );
    await assert.rejects(
      rotateWithChange(rig.deps, rig.ta, CRED1, VAL2, DAVE, { headerName: "bad header" }),
      refusal("CREDENTIALS_INVALID", { field: "headerName", reason: "bad_value" }),
    );
    await assert.rejects(
      rotateWithChange(rig.deps, rig.ta, CRED1, VAL2, DAVE, { authScheme: "BASIC" }),
      refusal("CREDENTIALS_INVALID", { field: "authScheme", reason: "bad_value" }),
    );

    const rejecting: VaultWriter = {
      async putCredential(): Promise<{ keyVersion: number }> {
        throw new GatewayError("GATEWAY_INVALID", "Vault refused the credential", {
          reason: "vault_refused",
        });
      },
    };
    await assert.rejects(
      rotateWithChange({ ...rig.deps, vault: rejecting }, rig.ta, CRED1, VAL2, DAVE, {
        authScheme: BEARER,
      }),
      refusal("CREDENTIALS_VAULT", { reason: "vault_refused" }),
    );

    assert.equal(rig.seen.length, 0, "no refusal reached the recording writer");
    assert.deepEqual(await credentialRow(rig, CRED1), before1);
    assert.deepEqual(await credentialRow(rig, CRED2), before2);
    const events = await rotatedEvents(rig);
    assert.equal(events.length, beforeEvents, "no refusal appended an event");
    const stored = rig.fake.credentials().find((entry) => entry.serviceId === SVC1);
    assert.equal(stored?.authScheme, API, "the vault entry is unchanged");
    assert.equal(stored?.headerName, KH);
    assert.equal(stored?.keyVersion, 1);
    assertNoSecret(await rawCredentialRows(rig));
    assertNoSecret(events);
  } finally {
    await teardown(rig);
  }
});
