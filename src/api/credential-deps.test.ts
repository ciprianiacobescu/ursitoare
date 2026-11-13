import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import { Secret } from "../config/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import { createVaultWriter } from "../gateway/vault.ts";
import type { VaultWriter } from "../gateway/vault.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
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
const PROVISIONED_AT = "2026-11-06T10:00:00.000000Z";
const ORIGIN = "https://tools.fake.test";
const KH = "x-fake-tools-key";
const VAL1 = "kv-secret-" + "7f3a";
const VAL2 = "kv-secret-" + "8e2b";
const VALB = "bt-secret-" + "9c1d";
const SVC1 = "00000000-0000-7000-8000-000000000001";
const SVC3 = "00000000-0000-7000-8000-000000000003";
const CRED1 = "cred_00000000-0000-7000-8000-000000000002";
const CRED2 = "cred_00000000-0000-7000-8000-000000000004";

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
  b: TenantContext;
  clock: Clock;
  fake: FakeEgress;
  writer: VaultWriter;
  carol: Session;
  alice: Session;
}

interface ErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

interface ServerOptions {
  pepPool?: TenantPool | null;
  depsPool?: TenantPool | null;
  vault?: VaultWriter | null;
  engineKey?: KeyMaterial | null;
  ids?: IdSource;
  engine?: PolicyEngine;
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

async function engineFor(clock: Clock): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-credential-deps-src-"));
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
  const { a, b } = await seedTwoTenants(db);
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
    b,
    clock,
    fake,
    writer,
    carol: await createTestSession(db, a, "carol", clock),
    alice: await createTestSession(db, a, "alice", clock),
  };
}

async function startServer(base: Base, opts: ServerOptions = {}): Promise<FastifyInstance> {
  const engine = opts.engine ?? (await engineFor(base.clock));
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: silentLogger(),
    tracer: noopTracer,
  });
  installPep(server, {
    pool: opts.pepPool === undefined ? base.db.appPool : opts.pepPool,
    engine,
    clock: base.clock,
    publicBaseUrl: BASE_URL,
  });
  const deps = {
    pool: opts.depsPool === undefined ? base.db.appPool : opts.depsPool,
    vault: opts.vault === undefined ? base.writer : opts.vault,
    ids: opts.ids ?? sequentialIds(1),
    clock: base.clock,
    engineKey: opts.engineKey === undefined ? KEY : opts.engineKey,
  };
  assert.doesNotThrow(() => {
    registerCredentialRoutes(server, deps);
  }, "registerCredentialRoutes");
  return server;
}

function send(
  server: FastifyInstance,
  method: "GET" | "POST",
  url: string,
  session: Session | null,
  payload?: unknown,
  key?: string,
) {
  const headers: Record<string, string> = {};
  if (session !== null) {
    headers.cookie = session.cookie;
    if (method !== "GET") headers["x-csrf-token"] = session.csrfToken;
  }
  if (key !== undefined) headers["idempotency-key"] = key;
  return server.inject({ method, url, headers, payload: payload as never });
}

function detailsOf(body: unknown): Record<string, unknown> | undefined {
  return (body as ErrorBody).error.details;
}

function rec1(provisionedBy: string) {
  return {
    id: CRED1,
    toolServerId: "acme",
    serviceId: SVC1,
    authScheme: "API_KEY_HEADER",
    headerName: KH,
    targetOrigin: ORIGIN,
    keyVersion: 1,
    provisionedBy,
    provisionedAt: PROVISIONED_AT,
    rotatedAt: null,
  };
}

function rec2(provisionedBy: string) {
  return {
    id: CRED2,
    toolServerId: "beta",
    serviceId: SVC3,
    authScheme: "BEARER_TOKEN",
    headerName: null,
    targetOrigin: ORIGIN,
    keyVersion: 1,
    provisionedBy,
    provisionedAt: PROVISIONED_AT,
    rotatedAt: null,
  };
}

const B1 = {
  toolServerId: "acme",
  authScheme: "API_KEY_HEADER",
  headerName: KH,
  value: VAL1,
};

const UNAVAILABLE = {
  error: { code: "AUTHZ_UNAVAILABLE", message: "Authorization is unavailable" },
};

async function closeBase(base: Base): Promise<void> {
  await base.fake.close();
  await base.db.close();
}

test("C-94f3dabe a null PEP pool answers every request 503 before validation", async () => {
  const base = await seedBase();
  let server: FastifyInstance | undefined;
  try {
    server = await startServer(base, {
      pepPool: null,
      depsPool: null,
      vault: null,
      engineKey: null,
    });
    const requests: [string, string, unknown][] = [
      ["POST", "/api/v1/credentials", B1],
      ["POST", "/api/v1/credentials", {}],
      ["POST", `/api/v1/credentials/${CRED1}/rotate`, { value: VAL2 }],
      ["GET", "/api/v1/credentials", undefined],
    ];
    for (const [method, url, payload] of requests) {
      const response = await send(server, method as "GET" | "POST", url, null, payload);
      assert.equal(response.statusCode, 503, `${method} ${url}`);
      assert.deepEqual(response.json(), UNAVAILABLE, `${method} ${url}`);
    }
  } finally {
    await server?.close();
    await closeBase(base);
  }
});

test("C-94f3dabe a null deps pool is 503 for carol and 403 for alice", async () => {
  const base = await seedBase();
  let server: FastifyInstance | undefined;
  try {
    server = await startServer(base, { depsPool: null, vault: null });
    for (const [method, url, payload] of [
      ["POST", "/api/v1/credentials", B1],
      ["POST", `/api/v1/credentials/${CRED1}/rotate`, { value: VAL2 }],
      ["GET", "/api/v1/credentials", undefined],
    ] as const) {
      const response = await send(server, method, url, base.carol, payload);
      assert.equal(response.statusCode, 503, `${method} ${url}`);
      assert.deepEqual(response.json(), UNAVAILABLE, `${method} ${url}`);
    }
    for (const [method, url, payload] of [
      ["POST", "/api/v1/credentials", B1],
      ["GET", "/api/v1/credentials", undefined],
    ] as const) {
      const response = await send(server, method, url, base.alice, payload);
      assert.equal(response.statusCode, 403, `${method} ${url}`);
      assert.equal((response.json() as ErrorBody).error.code, "FORBIDDEN", `${method} ${url}`);
    }
  } finally {
    await server?.close();
    await closeBase(base);
  }
});

test("C-94f3dabe a null engine key provisions and replays but refuses paging", async () => {
  const base = await seedBase();
  let server: FastifyInstance | undefined;
  try {
    server = await startServer(base, { engineKey: null });
    const first = await send(server, "POST", "/api/v1/credentials", base.carol, B1, "k1");
    assert.equal(first.statusCode, 201);
    assert.deepEqual(first.json(), rec1(base.carol.userId));

    const replay = await send(server, "POST", "/api/v1/credentials", base.carol, B1, "k1");
    assert.equal(replay.statusCode, 201);
    assert.deepEqual(replay.json(), rec1(base.carol.userId));
    assert.equal(replay.headers["idempotent-replayed"], "true");
    assert.equal(base.fake.credentials().length, 1);
    assert.equal(base.fake.credentials()[0]?.keyVersion, 1);

    const beta = await send(
      server,
      "POST",
      "/api/v1/credentials",
      base.carol,
      { toolServerId: "beta", authScheme: "BEARER_TOKEN", value: VALB },
    );
    assert.equal(beta.statusCode, 201);
    assert.deepEqual(beta.json(), rec2(base.carol.userId));

    for (const query of ["?limit=1", "?cursor=abc"]) {
      const response = await send(server, "GET", `/api/v1/credentials${query}`, base.carol);
      assert.equal(response.statusCode, 503, query);
      assert.deepEqual(
        response.json(),
        {
          error: {
            code: "ENGINE_KEY_REQUIRED",
            message: "Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)",
          },
        },
        query,
      );
    }

    const whole = await send(server, "GET", "/api/v1/credentials?limit=2", base.carol);
    assert.equal(whole.statusCode, 200);
    assert.deepEqual(whole.json(), {
      items: [rec1(base.carol.userId), rec2(base.carol.userId)],
      next_cursor: null,
    });

    const rotated = await send(
      server,
      "POST",
      `/api/v1/credentials/${CRED2}/rotate`,
      base.carol,
      { value: VAL2 },
    );
    assert.equal(rotated.statusCode, 200);
    assert.equal((rotated.json() as { keyVersion: number }).keyVersion, 2);
    const stored = base.fake.credentials().find((entry) => entry.serviceId === SVC3);
    assert.equal(stored?.keyVersion, 2);
  } finally {
    await server?.close();
    await closeBase(base);
  }
});

test("C-94f3dabe a re-registered server refuses the old key with no vault call", async () => {
  const base = await seedBase();
  const servers: FastifyInstance[] = [];
  try {
    const first = await startServer(base, { engineKey: null });
    servers.push(first);
    const created = await send(first, "POST", "/api/v1/credentials", base.carol, B1, "k1");
    assert.equal(created.statusCode, 201);
    assert.equal(base.fake.credentials().length, 1);

    const second = await startServer(base, { engineKey: null });
    servers.push(second);
    const reused = await send(second, "POST", "/api/v1/credentials", base.carol, B1, "k1");
    assert.equal(reused.statusCode, 422);
    assert.equal((reused.json() as ErrorBody).error.code, "IDEMPOTENCY_KEY_REUSED");
    assert.deepEqual(detailsOf(reused.json()), undefined);

    const stored = base.fake.credentials().find((entry) => entry.serviceId === SVC1);
    assert.equal(stored?.keyVersion, 1);
    assert.equal(base.fake.credentials().length, 1);
  } finally {
    for (const server of servers) await server.close();
    await closeBase(base);
  }
});
