import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import { Secret } from "../config/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import { createVaultWriter } from "../gateway/vault.ts";
import type { VaultWriter } from "../gateway/vault.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { startFakeEgress } from "../../test/support/fake-egress/index.ts";
import type { FakeEgress } from "../../test/support/fake-egress/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registerCredentialRoutes } from "./credential-routes.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";

assert.equal(typeof registerCredentialRoutes, "function");

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-06T10:00:00Z";
const ORIGIN = "https://tools.fake.test";
const KH = "x-fake-tools-key";
const VAL1 = "kv-secret-" + "7f3a";
const VAL2 = "kv-secret-" + "8e2b";
const CRED1 = "cred_00000000-0000-7000-8000-000000000002";

const KEY: KeyMaterial = { reveal: () => "k".repeat(64) };

const ROLES_CEDAR = join(import.meta.dirname, "..", "identity", "policy", "roles.cedar");
const CREDENTIALS_CEDAR = join(
  import.meta.dirname,
  "..",
  "credentials",
  "policy",
  "credentials.cedar",
);

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface Base {
  db: TestDatabase;
  a: TenantContext;
  clock: Clock;
  fake: FakeEgress;
  writer: VaultWriter;
  carol: Session;
  alice: Session;
}

interface ErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

const engineDirs: string[] = [];

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

function silentLogger() {
  return createLogger({ level: "silent", destination: silentDestination });
}

async function copyFragment(srcDir: string, relative: string, source: string): Promise<void> {
  const text = await readFile(source, "utf8").catch(() => "");
  if (text === "") return;
  const target = join(srcDir, relative);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, text, "utf8");
}

async function engineFor(clock: Clock) {
  const srcDir = await mkdtemp(join(tmpdir(), "api-credential-rotate-scheme-src-"));
  engineDirs.push(srcDir);
  await copyFragment(srcDir, join("identity", "policy", "roles.cedar"), ROLES_CEDAR);
  await copyFragment(srcDir, join("credentials", "policy", "credentials.cedar"), CREDENTIALS_CEDAR);
  return createPolicyEngine({
    srcDir,
    clock,
    ids: sequentialIds(200),
    logger: silentLogger(),
  });
}

async function seedBase(): Promise<Base> {
  const db = await withTestDatabase();
  const { a } = await seedTwoTenants(db);
  const clock = fixedClock(NOW);
  await seedFlowActors(
    db,
    a,
    [
      { subject: "carol", roles: ["tenant_admin"], teams: [] },
      { subject: "alice", roles: ["author"], teams: [] },
    ],
    clock,
  );
  await withTenantTx(db.ownerPool, a, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare.tool_server
         (tenant_id, tool_server_id, adapter, origin, local, state, registered_by, registered_at)
       VALUES ($1, 'acme', 'fixture', $2, false, 'pending', 'u_carol', $3)`,
      [a.tenantId, ORIGIN, NOW],
    );
  });
  const fake = await startFakeEgress({ now: () => new Date(NOW) });
  const writer = createVaultWriter(
    {
      url: fake.vaultUrl,
      identity: fake.vaultAdmin.identity,
      token: new Secret(fake.vaultAdmin.token),
    },
    { logger: silentLogger() },
  );
  return {
    db,
    a,
    clock,
    fake,
    writer,
    carol: await createTestSession(db, a, "carol", clock),
    alice: await createTestSession(db, a, "alice", clock),
  };
}

async function startServer(base: Base): Promise<FastifyInstance> {
  const engine = await engineFor(base.clock);
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: silentLogger(),
    tracer: noopTracer,
  });
  installPep(server, {
    pool: base.db.appPool,
    engine,
    clock: base.clock,
    publicBaseUrl: BASE_URL,
  });
  assert.doesNotThrow(() => {
    registerCredentialRoutes(server, {
      pool: base.db.appPool,
      vault: base.writer,
      ids: sequentialIds(1),
      clock: base.clock,
      engineKey: KEY,
    });
  }, "registerCredentialRoutes");
  return server;
}

function send(server: FastifyInstance, session: Session, url: string, payload: unknown) {
  return server.inject({
    method: "POST",
    url,
    headers: {
      cookie: session.cookie,
      "x-csrf-token": session.csrfToken,
    },
    payload: payload as never,
  });
}

function fieldsOf(body: unknown): unknown {
  return (body as ErrorBody).error.details?.["fields"];
}

async function countCredentials(base: Base): Promise<number> {
  return withTenantTx(base.db.appPool, base.a, async (tx) => {
    const { rows } = await tx.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM ursitoare.credential_ref",
    );
    return rows[0]?.n ?? -1;
  });
}

async function storedText(base: Base): Promise<string> {
  return withTenantTx(base.db.appPool, base.a, async (tx) => {
    const rows = await tx.query("SELECT * FROM ursitoare.credential_ref");
    const events = await tx.query(
      "SELECT payload FROM ursitoare.audit_event WHERE event_type = 'credentials.rotated'",
    );
    return JSON.stringify({ rows: rows.rows, events: events.rows });
  });
}

async function closeBase(base: Base): Promise<void> {
  await base.fake.close();
  await base.db.close();
}

test("C-4450f7f8 the rotate route changes the scheme and header and refuses a bad pair", async () => {
  const base = await seedBase();
  let server: FastifyInstance | undefined;
  try {
    server = await startServer(base);
    const provisioned = await send(server, base.carol, "/api/v1/credentials", {
      toolServerId: "acme",
      authScheme: "API_KEY_HEADER",
      headerName: KH,
      value: VAL1,
    });
    assert.equal(provisioned.statusCode, 201);
    const url = `/api/v1/credentials/${CRED1}/rotate`;

    const q1 = await send(server, base.carol, url, {
      value: VAL2,
      authScheme: "BEARER_TOKEN",
    });
    assert.equal(q1.statusCode, 200);
    const q1body = q1.json() as Record<string, unknown>;
    assert.equal(q1body["authScheme"], "BEARER_TOKEN");
    assert.equal(q1body["headerName"], null);
    assert.equal(q1body["keyVersion"], 2);
    assert.ok(!q1.body.includes(VAL1), "the old value is not echoed");
    assert.ok(!q1.body.includes(VAL2), "the new value is not echoed");

    const q2 = await send(server, base.carol, url, {
      value: VAL2,
      authScheme: "BEARER_TOKEN",
      headerName: "x-k",
    });
    assert.equal(q2.statusCode, 400);
    assert.equal((q2.json() as ErrorBody).error.code, "VALIDATION_FAILED");
    assert.deepEqual(fieldsOf(q2.json()), [{ field: "body/headerName", message: "not_allowed" }]);

    const q3 = await send(server, base.carol, url, { authScheme: "BEARER_TOKEN" });
    assert.equal(q3.statusCode, 400);
    assert.equal((q3.json() as ErrorBody).error.code, "VALIDATION_FAILED");
    assert.deepEqual(fieldsOf(q3.json()), [
      { field: "body/value", message: "must have required property 'value'" },
    ]);

    const q4 = await send(server, base.alice, url, { value: VAL2 });
    assert.equal(q4.statusCode, 403);
    assert.equal((q4.json() as ErrorBody).error.code, "FORBIDDEN");
    assert.ok(!q4.body.includes(VAL2), "the refused body is not echoed");

    assert.equal(await countCredentials(base), 1, "the refusals wrote no credential");
    assert.ok(!q2.body.includes(VAL2), "the refused body is not echoed");
    assert.ok(!q3.body.includes(VAL2), "the refused body is not echoed");
    const stored = await storedText(base);
    assert.ok(!stored.includes(VAL1), "the old value is in no row or event");
    assert.ok(!stored.includes(VAL2), "the new value is in no row or event");
  } finally {
    await server?.close();
    await closeBase(base);
  }
});
