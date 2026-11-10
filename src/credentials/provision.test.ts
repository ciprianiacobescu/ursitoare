import assert from "node:assert/strict";
import { test } from "node:test";

import { Secret } from "../config/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { startFakeEgress } from "../../test/support/fake-egress/index.ts";
import type { FakeEgress } from "../../test/support/fake-egress/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import type { PutCredentialInput, VaultWriter } from "../gateway/vault.ts";
import { createVaultWriter } from "../gateway/vault.ts";
import { provisionCredential, provisionCredentialTx } from "./provision.ts";
import { CredentialsError } from "./types.ts";
import type { CredentialDeps, CredentialRecord } from "./types.ts";

assert.equal(typeof provisionCredential, "function");

const ORIGIN = "https://tools.fake.test";
const KH = "x-fake-tools-key";
const NOW = "2026-11-06T10:00:00Z";
const TA = "d7f4eeba-9f57-8892-b4bb-591d220496d4";
const S2 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e02";
const SVC1 = "00000000-0000-7000-8000-000000000001";
const CRED1 = "cred_00000000-0000-7000-8000-000000000002";
const CAROL = { kind: "user", id: "u_carol" } as const;
const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);
const VAL1 = "kv-secret-7f3a";
const VALB = "bt-secret-9c1d";

interface Rig {
  db: TestDatabase;
  fake: FakeEgress;
  deps: CredentialDeps;
  ta: TenantContext;
  tb: TenantContext;
  seen: { input: PutCredentialInput; rows: number }[];
}

async function countRows(rig: Rig, table: string): Promise<number> {
  return withTenantTx(rig.db.appPool, rig.ta, async (tx) => {
    const { rows } = await tx.query<{ n: number }>(`SELECT count(*)::int AS n FROM ursitoare.${table}`);
    return rows[0]?.n ?? -1;
  });
}

async function setup(): Promise<Rig> {
  const db = await withTestDatabase();
  let fake: FakeEgress | undefined;
  await assert.doesNotReject(async () => {
    fake = await startFakeEgress({ now: () => new Date(NOW) });
  });
  assert.ok(fake !== undefined, "fake started");
  const { a, b } = await seedTwoTenants(db);
  for (const id of ["acme", "beta", "gamma", "delta"]) {
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
  const rig: Rig = {
    db,
    fake,
    ta: a,
    tb: b,
    seen: [],
    deps: {
      pool: db.appPool,
      ids: sequentialIds(1),
      clock: fixedClock(NOW),
      vault: inner,
    },
  };
  rig.deps = {
    ...rig.deps,
    vault: {
      async putCredential(input) {
        rig.seen.push({ input, rows: await countRows(rig, "credential_ref") });
        return inner.putCredential(input);
      },
    },
  };
  return rig;
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
  assert.ok(record !== undefined, "a record came back");
  return record;
}

function refusal(code: string, details: Record<string, string>) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof CredentialsError, "a CredentialsError");
    assert.equal(error.code, code);
    assert.deepEqual({ ...error.details }, details);
    return true;
  };
}

const API = "API_KEY_HEADER";
const BEARER = "BEARER_TOKEN";

test("C-41cf1ff5 provision puts first then stores the reference and the audit event", async () => {
  const rig = await setup();
  try {
    const rec1 = await provision(rig, { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 });
    assert.deepEqual(rec1, {
      id: CRED1,
      toolServerId: "acme",
      serviceId: SVC1,
      authScheme: API,
      headerName: KH,
      targetOrigin: ORIGIN,
      keyVersion: 1,
      provisionedBy: "u_carol",
      provisionedAt: "2026-11-06T10:00:00.000000Z",
      rotatedAt: null,
    });
    assert.deepEqual(rig.seen[0], {
      input: {
        tenantId: TA,
        serviceId: SVC1,
        authScheme: API,
        value: utf8(VAL1),
        headerName: KH,
        callerActorId: "u_carol",
        targetUrl: ORIGIN,
      },
      rows: 0,
    });
    assert.equal(rig.fake.credentials()[0]?.keyVersion, 1);

    const rec2 = await provision(rig, {
      toolServerId: "beta",
      authScheme: BEARER,
      headerName: null,
      value: VALB,
      serviceId: S2,
    });
    assert.equal(rec2.serviceId, S2);
    assert.equal(rec2.headerName, null);
    const rec3 = await provision(rig, {
      toolServerId: "delta",
      authScheme: API,
      headerName: KH,
      value: "a".repeat(4096),
    });
    assert.equal(rec3.keyVersion, 1);

    assert.equal(await countRows(rig, "credential_ref"), 3);
    const events = await withTenantTx(rig.db.appPool, rig.ta, async (tx) => {
      const { rows } = await tx.query<{ target: unknown; payload: unknown }>(
        "SELECT target, payload FROM ursitoare.audit_event WHERE event_type = 'credentials.provisioned' ORDER BY seq",
      );
      return rows;
    });
    assert.equal(events.length, 3);
    assert.deepEqual(events[0]?.target, { kind: "credential", id: CRED1 });
    assert.deepEqual(events[0]?.payload, {
      serviceId: SVC1,
      authScheme: API,
      keyVersion: 1,
      targetOrigin: ORIGIN,
    });
  } finally {
    await teardown(rig);
  }
});

test("C-41cf1ff5 provision refuses what is invalid, unknown or taken and changes nothing", async () => {
  const rig = await setup();
  try {
    await provision(rig, { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 });
    const base = { toolServerId: "beta", authScheme: API, headerName: KH, value: VAL1 } as const;
    const invalid = (field: string, reason: string) => refusal("CREDENTIALS_INVALID", { field, reason });
    const rows: [Parameters<typeof provisionCredential>[2], (e: unknown) => boolean][] = [
      [{ ...base, toolServerId: "Bad" }, invalid("toolServerId", "bad_value")],
      [{ ...base, authScheme: "BASIC_AUTH" as unknown as typeof API }, invalid("authScheme", "bad_value")],
      [{ ...base, headerName: null }, invalid("headerName", "required")],
      [{ ...base, headerName: "Authorization" }, invalid("headerName", "reserved")],
      [{ ...base, headerName: "HOST" }, invalid("headerName", "reserved")],
      [{ ...base, headerName: "X-Ursitoare-Call" }, invalid("headerName", "reserved")],
      [{ ...base, headerName: "x bad" }, invalid("headerName", "bad_value")],
      [{ ...base, authScheme: BEARER, headerName: "x-k" }, invalid("headerName", "not_allowed")],
      [{ ...base, value: "" }, invalid("value", "size")],
      [{ ...base, value: "a".repeat(4097) }, invalid("value", "size")],
      [{ ...base, value: "a b" }, invalid("value", "bad_value")],
      [{ ...base, value: "é" }, invalid("value", "bad_value")],
      [{ ...base, serviceId: "ABC" }, invalid("serviceId", "bad_value")],
      [{ ...base, toolServerId: "nope" }, refusal("CREDENTIALS_NOT_FOUND", { toolServerId: "nope" })],
      [{ ...base, toolServerId: "acme" }, refusal("CREDENTIALS_EXISTS", { toolServerId: "acme" })],
      [{ ...base, toolServerId: "gamma", serviceId: SVC1 }, refusal("CREDENTIALS_EXISTS", { serviceId: SVC1 })],
    ];
    for (const [input, check] of rows) {
      await assert.rejects(provisionCredential(rig.deps, rig.ta, input, CAROL), check);
    }
    await assert.rejects(
      withTenantTx(rig.db.appPool, rig.tb, (tx) =>
        provisionCredentialTx(
          tx,
          rig.deps,
          rig.ta,
          { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 },
          CAROL,
        ),
      ),
      refusal("CREDENTIALS_NOT_FOUND", { toolServerId: "acme" }),
    );
    assert.equal(await countRows(rig, "credential_ref"), 1);
    assert.equal(rig.fake.credentials().length, 1);
    assert.equal(rig.seen.length, 1, "no refused call reached the vault");
  } finally {
    await teardown(rig);
  }
});
