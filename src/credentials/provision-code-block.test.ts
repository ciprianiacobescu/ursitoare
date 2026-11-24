import assert from "node:assert/strict";
import { test } from "node:test";

import { Secret } from "../config/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
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
import { provisionCredential, provisionCredentialTx } from "./provision.ts";
import { CredentialsError } from "./types.ts";
import type { CredentialDeps, CredentialRecord } from "./types.ts";

assert.equal(typeof provisionCredential, "function");
assert.equal(typeof provisionCredentialTx, "function");

const ORIGIN = "https://tools.fake.test";
const NOW = "2026-11-06T10:00:00Z";
const BEARER = "BEARER_TOKEN";
const CAROL = { kind: "user", id: "u_carol" } as const;
const VALUE = "kv-secret-" + "7f3a";

interface Rig {
  db: TestDatabase;
  fake: FakeEgress;
  ta: TenantContext;
  deps: CredentialDeps;
  calls: PutCredentialInput[];
}

async function countRows(rig: Rig, table: string): Promise<number> {
  return withTenantTx(rig.db.appPool, rig.ta, async (tx) => {
    const { rows } = await tx.query<{ n: number }>(`SELECT count(*)::int AS n FROM ursitoare.${table}`);
    return rows[0]?.n ?? -1;
  });
}

async function countProvisionedEvents(rig: Rig): Promise<number> {
  return withTenantTx(rig.db.appPool, rig.ta, async (tx) => {
    const { rows } = await tx.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM ursitoare.audit_event WHERE event_type = 'credentials.provisioned'",
    );
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
  const { a } = await seedTwoTenants(db);
  await withTenantTx(db.ownerPool, a, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare.tool_server
         (tenant_id, tool_server_id, adapter, origin, local, state, registered_by, registered_at)
       VALUES ($1, 'blocks', 'code_block', 'sandbox', true, 'pending', 'u_carol', $2)`,
      [a.tenantId, NOW],
    );
    await tx.query(
      `INSERT INTO ursitoare.tool_server
         (tenant_id, tool_server_id, adapter, origin, local, state, registered_by, registered_at)
       VALUES ($1, 'acme', 'fixture', $2, false, 'pending', 'u_carol', $3)`,
      [a.tenantId, ORIGIN, NOW],
    );
  });
  const logger = createLogger({
    level: "silent",
    destination: { write: (_line: string): void => {} },
  });
  const inner = createVaultWriter(
    {
      url: fake.vaultUrl,
      identity: fake.vaultAdmin.identity,
      token: new Secret(fake.vaultAdmin.token),
    },
    { logger },
  );
  const calls: PutCredentialInput[] = [];
  const recording: VaultWriter = {
    async putCredential(input: PutCredentialInput): Promise<{ keyVersion: number }> {
      calls.push(input);
      return inner.putCredential(input);
    },
  };
  return {
    db,
    fake,
    ta: a,
    calls,
    deps: { pool: db.appPool, ids: sequentialIds(1), clock: fixedClock(NOW), vault: recording },
  };
}

async function teardown(rig: Rig): Promise<void> {
  await rig.fake.close();
  await rig.db.close();
}

function refusal(code: string, details: Record<string, string>) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof CredentialsError, "a CredentialsError");
    assert.equal(error.code, code);
    assert.deepEqual({ ...error.details }, details);
    return true;
  };
}

test("C-bf4aafd0 a code block server is refused before the vault while a fixture server provisions", async () => {
  const rig = await setup();
  try {
    const blocks = { toolServerId: "blocks", authScheme: BEARER, headerName: null, value: VALUE } as const;
    const refused = refusal("CREDENTIALS_REFUSED", { reason: "no_credential_needed" });

    await assert.rejects(provisionCredential(rig.deps, rig.ta, blocks, CAROL), refused);
    await assert.rejects(
      withTenantTx(rig.db.appPool, rig.ta, (tx) =>
        provisionCredentialTx(tx, rig.deps, rig.ta, blocks, CAROL),
      ),
      refused,
    );
    assert.equal(rig.calls.length, 0, "no refused call reached the vault");
    assert.equal(await countRows(rig, "credential_ref"), 0);
    assert.equal(await countProvisionedEvents(rig), 0);

    await assert.rejects(
      provisionCredential(rig.deps, rig.ta, { ...blocks, value: "" }, CAROL),
      refusal("CREDENTIALS_INVALID", { field: "value", reason: "size" }),
    );
    await assert.rejects(
      provisionCredential(rig.deps, rig.ta, { ...blocks, toolServerId: "ghost" }, CAROL),
      refusal("CREDENTIALS_NOT_FOUND", { toolServerId: "ghost" }),
    );
    assert.equal(rig.calls.length, 0, "no invalid or unknown call reached the vault");
    assert.equal(await countRows(rig, "credential_ref"), 0);
    assert.equal(await countProvisionedEvents(rig), 0);

    let record: CredentialRecord | undefined;
    await assert.doesNotReject(async () => {
      record = await provisionCredential(
        rig.deps,
        rig.ta,
        { toolServerId: "acme", authScheme: BEARER, headerName: null, value: VALUE },
        CAROL,
      );
    });
    assert.ok(record !== undefined, "a fixture server still provisions");
    assert.equal(record.toolServerId, "acme");
    assert.equal(record.authScheme, BEARER);
    assert.equal(record.headerName, null);
    assert.equal(record.targetOrigin, ORIGIN);
    assert.equal(rig.calls.length, 1, "the fixture server writes once");
    assert.equal(await countRows(rig, "credential_ref"), 1);
    assert.equal(await countProvisionedEvents(rig), 1);
  } finally {
    await teardown(rig);
  }
});
