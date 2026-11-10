import assert from "node:assert/strict";
import { test } from "node:test";

import { Secret } from "../config/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { GatewayError } from "../gateway/index.ts";
import { createVaultWriter } from "../gateway/vault.ts";
import type { PutCredentialInput, VaultWriter } from "../gateway/vault.ts";
import { createLogger } from "../observability/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { startFakeEgress } from "../../test/support/fake-egress/index.ts";
import type { FakeEgress } from "../../test/support/fake-egress/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { provisionCredential, provisionCredentialTx } from "./provision.ts";
import { CredentialsError } from "./types.ts";
import type { CredentialDeps, CredentialRecord } from "./types.ts";

assert.equal(typeof provisionCredential, "function");
assert.equal(typeof provisionCredentialTx, "function");

const ORIGIN = "https://tools.fake.test";
const KH = "x-fake-tools-key";
const NOW = "2026-11-06T10:00:00Z";
const SVC1 = "00000000-0000-7000-8000-000000000001";
const SVC3 = "00000000-0000-7000-8000-000000000003";
const CRED4 = "cred_00000000-0000-7000-8000-000000000004";
const S1 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";
const S2 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e02";
const CAROL = { kind: "user", id: "u_carol" } as const;
const API = "API_KEY_HEADER";
const VAL1 = "kv-secret-7f3a";
const VAL2 = "kv-secret-8b4c";

interface Rig {
  db: TestDatabase;
  fake: FakeEgress;
  ta: TenantContext;
  tb: TenantContext;
  deps: CredentialDeps;
  inner: VaultWriter;
  logger: ReturnType<typeof createLogger>;
}

function statementText(query: unknown): string {
  if (typeof query === "string") return query;
  const text = (query as { text?: unknown } | null)?.text;
  return typeof text === "string" ? text : "";
}

function proxyPool(
  base: TenantPool,
  onQuery: (text: string) => Promise<void> | undefined,
): TenantPool {
  const wrapped = {
    async connect() {
      const client = await base.connect();
      return new Proxy(client, {
        get(target, property, receiver) {
          if (property === "query") {
            const raw = target as unknown as {
              query: (query: unknown, values?: unknown) => Promise<unknown>;
            };
            return async (query: unknown, values?: unknown): Promise<unknown> => {
              const action = onQuery(statementText(query));
              if (action !== undefined) await action;
              return raw.query(query, values);
            };
          }
          const value = Reflect.get(target, property, receiver) as unknown;
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    },
  };
  return wrapped as unknown as TenantPool;
}

const INSERT_CREDENTIAL = /INSERT INTO ursitoare\.credential_ref/;

function rejectingPool(base: TenantPool, matches: (text: string) => boolean): TenantPool {
  return proxyPool(base, (text) =>
    matches(text) ? Promise.reject(new Error("injected")) : undefined,
  );
}

function rejectingPoolWith(
  base: TenantPool,
  matches: (text: string) => boolean,
  error: Error,
): TenantPool {
  return proxyPool(base, (text) => (matches(text) ? Promise.reject(error) : undefined));
}

function rejectingWriter(error: Error): VaultWriter {
  return {
    async putCredential(_input: PutCredentialInput): Promise<{ keyVersion: number }> {
      throw error;
    },
  };
}

function barrierWriter(inner: VaultWriter, needed: number): VaultWriter {
  let calls = 0;
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    async putCredential(input: PutCredentialInput): Promise<{ keyVersion: number }> {
      calls += 1;
      if (calls === needed) release?.();
      await gate;
      return inner.putCredential(input);
    },
  };
}

function refusal(code: string, details: Record<string, string>) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof CredentialsError, "a CredentialsError");
    assert.equal(error.code, code);
    assert.deepEqual({ ...error.details }, details);
    return true;
  };
}

async function setup(): Promise<Rig> {
  const db = await withTestDatabase();
  let fake: FakeEgress | undefined;
  await assert.doesNotReject(async () => {
    fake = await startFakeEgress({ now: () => new Date(NOW) });
  });
  assert.ok(fake !== undefined, "fake started");
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
  const inner = createVaultWriter(
    { url: fake.vaultUrl, identity: fake.vaultAdmin.identity, token: new Secret(fake.vaultAdmin.token) },
    { logger },
  );
  return {
    db,
    fake,
    ta: a,
    tb: b,
    inner,
    logger,
    deps: { pool: db.appPool, ids: sequentialIds(1), clock: fixedClock(NOW), vault: inner },
  };
}

async function teardown(rig: Rig): Promise<void> {
  await rig.fake.close();
  await rig.db.close();
}

async function countRows(rig: Rig, table: string): Promise<number> {
  return withTenantTx(rig.db.appPool, rig.ta, async (tx) => {
    const { rows } = await tx.query<{ n: number }>(`SELECT count(*)::int AS n FROM ursitoare.${table}`);
    return rows[0]?.n ?? -1;
  });
}

async function countEvents(rig: Rig): Promise<number> {
  return withTenantTx(rig.db.appPool, rig.ta, async (tx) => {
    const { rows } = await tx.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM ursitoare.audit_event WHERE event_type LIKE 'credentials.%'",
    );
    return rows[0]?.n ?? -1;
  });
}

async function credentialRows(rig: Rig): Promise<{ mintkey_service_id: string; key_version: number }[]> {
  return withTenantTx(rig.db.appPool, rig.ta, async (tx) => {
    const { rows } = await tx.query<{ mintkey_service_id: string; key_version: number }>(
      "SELECT mintkey_service_id, key_version FROM ursitoare.credential_ref ORDER BY credential_id COLLATE \"C\"",
    );
    return rows;
  });
}

function serviceVersions(rig: Rig): { serviceId: string; keyVersion: number }[] {
  return rig.fake
    .credentials()
    .map((entry) => ({ serviceId: entry.serviceId, keyVersion: entry.keyVersion }))
    .sort((left, right) => left.serviceId.localeCompare(right.serviceId));
}

test("C-842be4dd vault failures map to CREDENTIALS_VAULT and leave no row or event", async () => {
  const rig = await setup();
  try {
    const denied = createVaultWriter(
      {
        url: rig.fake.vaultUrl,
        identity: rig.fake.vaultDenied.identity,
        token: new Secret(rig.fake.vaultDenied.token),
      },
      { logger: rig.logger },
    );
    const input = { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 } as const;
    const writers: [VaultWriter, (error: unknown) => boolean][] = [
      [denied, refusal("CREDENTIALS_VAULT", { reason: "token_refused" })],
      [
        rejectingWriter(new GatewayError("GATEWAY_INVALID", "refused", { reason: "bad" })),
        refusal("CREDENTIALS_VAULT", { reason: "vault_refused" }),
      ],
      [
        rejectingWriter(new GatewayError("GATEWAY_UNAVAILABLE", "down", { stage: "vault" })),
        refusal("CREDENTIALS_VAULT", { reason: "unavailable" }),
      ],
    ];
    for (const [vault, check] of writers) {
      await assert.rejects(provisionCredential({ ...rig.deps, vault }, rig.ta, input, CAROL), check);
    }
    const boom = new Error("boom");
    await assert.rejects(
      provisionCredential({ ...rig.deps, vault: rejectingWriter(boom) }, rig.ta, input, CAROL),
      (error: unknown) => error === boom,
    );
    assert.equal(await countRows(rig, "credential_ref"), 0);
    assert.equal(await countEvents(rig), 0);
    assert.deepEqual(rig.fake.credentials(), []);
  } finally {
    await teardown(rig);
  }
});

test("C-842be4dd an insert failure leaves the vault entry and the repeat counts on", async () => {
  const rig = await setup();
  try {
    const failing = rejectingPool(rig.db.appPool, (text) => INSERT_CREDENTIAL.test(text));
    const input = {
      toolServerId: "acme",
      authScheme: API,
      headerName: KH,
      value: VAL1,
      serviceId: SVC1,
    } as const;
    await assert.rejects(provisionCredential({ ...rig.deps, pool: failing }, rig.ta, input, CAROL), /injected/);
    assert.equal(await countRows(rig, "credential_ref"), 0);
    assert.equal(await countEvents(rig), 0);
    assert.deepEqual(serviceVersions(rig), [{ serviceId: SVC1, keyVersion: 1 }]);

    const repeat = await provisionCredential(rig.deps, rig.ta, input, CAROL);
    assert.equal(repeat.serviceId, SVC1);
    assert.equal(repeat.keyVersion, 2);
    assert.deepEqual(await credentialRows(rig), [{ mintkey_service_id: SVC1, key_version: 2 }]);
    assert.equal(await countEvents(rig), 1);
  } finally {
    await teardown(rig);
  }
});

test("C-842be4dd an insert failure without a service id orphans the first put", async () => {
  const rig = await setup();
  try {
    const failing = rejectingPool(rig.db.appPool, (text) => INSERT_CREDENTIAL.test(text));
    const input = { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 } as const;
    await assert.rejects(provisionCredential({ ...rig.deps, pool: failing }, rig.ta, input, CAROL), /injected/);
    assert.equal(await countRows(rig, "credential_ref"), 0);
    assert.equal(await countEvents(rig), 0);
    assert.deepEqual(serviceVersions(rig), [{ serviceId: SVC1, keyVersion: 1 }]);

    const repeat = await provisionCredential(rig.deps, rig.ta, input, CAROL);
    assert.equal(repeat.serviceId, SVC3);
    assert.equal(repeat.id, CRED4);
    assert.equal(repeat.keyVersion, 1);
    assert.deepEqual(await credentialRows(rig), [{ mintkey_service_id: SVC3, key_version: 1 }]);
    assert.deepEqual(serviceVersions(rig), [
      { serviceId: SVC1, keyVersion: 1 },
      { serviceId: SVC3, keyVersion: 1 },
    ]);
  } finally {
    await teardown(rig);
  }
});

test("C-842be4dd a transaction abort and a down pool write nothing", async () => {
  const rig = await setup();
  try {
    const abort = new Error("abort");
    await assert.rejects(
      withTenantTx(rig.db.appPool, rig.ta, async (tx) => {
        await provisionCredentialTx(
          tx,
          rig.deps,
          rig.ta,
          { toolServerId: "beta", authScheme: API, headerName: KH, value: VAL1, serviceId: S2 },
          CAROL,
        );
        throw abort;
      }),
      (error: unknown) => error === abort,
    );
    assert.equal(await countRows(rig, "credential_ref"), 0);
    assert.equal(await countEvents(rig), 0);
    assert.deepEqual(serviceVersions(rig), [{ serviceId: S2, keyVersion: 1 }]);

    const down: TenantPool = {
      connect: async () => {
        throw new Error("db down");
      },
    };
    await assert.rejects(
      provisionCredential(
        { ...rig.deps, pool: down },
        rig.ta,
        { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 },
        CAROL,
      ),
      /db down/,
    );
    assert.equal(await countRows(rig, "credential_ref"), 0);
    assert.equal(await countEvents(rig), 0);
  } finally {
    await teardown(rig);
  }
});

test("C-842be4dd concurrent provisions keep one row and refuse the lost race", async () => {
  const rig = await setup();
  try {
    const serverRace = barrierWriter(rig.inner, 2);
    const input = { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 } as const;
    const serverOutcomes = await Promise.allSettled([
      provisionCredential({ ...rig.deps, vault: serverRace }, rig.ta, input, CAROL),
      provisionCredential({ ...rig.deps, vault: serverRace }, rig.ta, { ...input, value: VAL2 }, CAROL),
    ]);
    const serverRecord = serverOutcomes.find(
      (outcome): outcome is PromiseFulfilledResult<CredentialRecord> => outcome.status === "fulfilled",
    );
    const serverFailure = serverOutcomes.find(
      (outcome): outcome is PromiseRejectedResult => outcome.status === "rejected",
    );
    assert.ok(serverRecord !== undefined, "one provision returned a record");
    assert.ok(serverFailure !== undefined, "one provision was refused");
    assert.equal(serverRecord.value.toolServerId, "acme");
    const serverError: unknown = serverFailure.reason;
    assert.ok(serverError instanceof CredentialsError, "the loser throws a CredentialsError");
    assert.equal(serverError.code, "CREDENTIALS_EXISTS");
    assert.deepEqual({ ...serverError.details }, { toolServerId: "acme" });
    assert.equal(await countRows(rig, "credential_ref"), 1);
    assert.equal(await countEvents(rig), 1);
    const serverEntries = rig.fake.credentials();
    assert.equal(serverEntries.length, 2);
    const storedServer = serverEntries.find((entry) => entry.serviceId === serverRecord.value.serviceId);
    assert.ok(storedServer !== undefined, "the row's service is in the vault");
    assert.equal(storedServer.keyVersion, serverRecord.value.keyVersion);
  } finally {
    await teardown(rig);
  }
});

test("C-842be4dd concurrent provisions of one service id keep one row and refuse the loser", async () => {
  const rig = await setup();
  try {
    const serviceRace = barrierWriter(rig.inner, 2);
    const outcomes = await Promise.allSettled([
      provisionCredential(
        { ...rig.deps, vault: serviceRace },
        rig.ta,
        { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1, serviceId: S1 },
        CAROL,
      ),
      provisionCredential(
        { ...rig.deps, vault: serviceRace },
        rig.ta,
        { toolServerId: "beta", authScheme: API, headerName: KH, value: VAL2, serviceId: S1 },
        CAROL,
      ),
    ]);
    const record = outcomes.find(
      (outcome): outcome is PromiseFulfilledResult<CredentialRecord> => outcome.status === "fulfilled",
    );
    const failure = outcomes.find(
      (outcome): outcome is PromiseRejectedResult => outcome.status === "rejected",
    );
    assert.ok(record !== undefined, "one provision returned a record");
    assert.ok(failure !== undefined, "one provision was refused");
    const error: unknown = failure.reason;
    assert.ok(error instanceof CredentialsError, "the loser throws a CredentialsError");
    assert.equal(error.code, "CREDENTIALS_EXISTS");
    assert.deepEqual({ ...error.details }, { serviceId: S1 });
    assert.equal(await countRows(rig, "credential_ref"), 1);
    assert.equal(await countEvents(rig), 1);
    assert.deepEqual(serviceVersions(rig), [{ serviceId: S1, keyVersion: 2 }]);
    const stored = await credentialRows(rig);
    assert.deepEqual(stored.map((row) => row.mintkey_service_id), [S1]);
    assert.equal(stored[0]?.key_version, record.value.keyVersion);
  } finally {
    await teardown(rig);
  }
});

test("C-842be4dd insert constraint errors map by constraint and other errors pass unchanged", async () => {
  const rig = await setup();
  try {
    const fk = Object.assign(new Error("fk"), {
      code: "23503",
      constraint: "credential_ref_tool_server_fkey",
    });
    await assert.rejects(
      provisionCredential(
        { ...rig.deps, pool: rejectingPoolWith(rig.db.appPool, (text) => INSERT_CREDENTIAL.test(text), fk) },
        rig.ta,
        { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 },
        CAROL,
      ),
      refusal("CREDENTIALS_NOT_FOUND", { toolServerId: "acme" }),
    );
    assert.equal(await countRows(rig, "credential_ref"), 0);
    assert.equal(await countEvents(rig), 0);

    const otherFk = Object.assign(new Error("other fk"), { code: "23503", constraint: "other_fkey" });
    await assert.rejects(
      provisionCredential(
        { ...rig.deps, pool: rejectingPoolWith(rig.db.appPool, (text) => INSERT_CREDENTIAL.test(text), otherFk) },
        rig.ta,
        { toolServerId: "beta", authScheme: API, headerName: KH, value: VAL1 },
        CAROL,
      ),
      (error: unknown) => error === otherFk,
    );

    const otherUnique = Object.assign(new Error("other unique"), {
      code: "23505",
      constraint: "other_key",
    });
    await assert.rejects(
      provisionCredential(
        {
          ...rig.deps,
          pool: rejectingPoolWith(rig.db.appPool, (text) => INSERT_CREDENTIAL.test(text), otherUnique),
        },
        rig.ta,
        { toolServerId: "beta", authScheme: API, headerName: KH, value: VAL1 },
        CAROL,
      ),
      (error: unknown) => error === otherUnique,
    );
    assert.equal(await countRows(rig, "credential_ref"), 0);
    assert.equal(await countEvents(rig), 0);
  } finally {
    await teardown(rig);
  }
});
