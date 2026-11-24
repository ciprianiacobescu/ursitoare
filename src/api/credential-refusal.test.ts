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
import type { PutCredentialInput, VaultWriter } from "../gateway/vault.ts";
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
const VALUE = "kv-secret-" + "7f3a";

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
  const srcDir = await mkdtemp(join(tmpdir(), "api-credential-refusal-src-"));
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
  await seedFlowActors(db, a, [{ subject: "carol", roles: ["tenant_admin"], teams: [] }], clock);
  await withTenantTx(db.ownerPool, a, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare.tool_server
         (tenant_id, tool_server_id, adapter, origin, local, state, registered_by, registered_at)
       VALUES ($1, 'blocks', 'code_block', 'sandbox', true, 'pending', 'u_carol', $2)`,
      [a.tenantId, NOW],
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
  };
}

async function startServer(base: Base, vault: VaultWriter): Promise<FastifyInstance> {
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
      vault,
      ids: sequentialIds(1),
      clock: base.clock,
      engineKey: KEY,
    });
  }, "registerCredentialRoutes");
  return server;
}

function send(server: FastifyInstance, session: Session, payload: unknown) {
  return server.inject({
    method: "POST",
    url: "/api/v1/credentials",
    headers: {
      cookie: session.cookie,
      "x-csrf-token": session.csrfToken,
    },
    payload: payload as never,
  });
}

async function countCredentials(base: Base): Promise<number> {
  return withTenantTx(base.db.appPool, base.a, async (tx) => {
    const { rows } = await tx.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM ursitoare.credential_ref",
    );
    return rows[0]?.n ?? -1;
  });
}

async function closeBase(base: Base): Promise<void> {
  await base.fake.close();
  await base.db.close();
}

test("C-bf4aafd0 the credential route refuses a code block server with OPERATION_REFUSED", async () => {
  const base = await seedBase();
  let server: FastifyInstance | undefined;
  try {
    const calls: PutCredentialInput[] = [];
    const recording: VaultWriter = {
      async putCredential(input: PutCredentialInput): Promise<{ keyVersion: number }> {
        calls.push(input);
        return base.writer.putCredential(input);
      },
    };
    server = await startServer(base, recording);
    const response = await send(server, base.carol, {
      toolServerId: "blocks",
      authScheme: "BEARER_TOKEN",
      value: VALUE,
    });
    assert.equal(response.statusCode, 422);
    assert.equal((response.json() as ErrorBody).error.code, "OPERATION_REFUSED");
    assert.deepEqual((response.json() as ErrorBody).error.details, {
      reason: "no_credential_needed",
    });
    assert.equal(calls.length, 0, "no vault call for a code block server");
    assert.equal(await countCredentials(base), 0);
    assert.ok(!response.body.includes(VALUE), "the value is not echoed");
  } finally {
    await server?.close();
    await closeBase(base);
  }
});
