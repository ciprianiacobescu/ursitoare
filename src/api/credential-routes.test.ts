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
import { GatewayError } from "../gateway/index.ts";
import { createVaultWriter } from "../gateway/vault.ts";
import type { PutCredentialInput, VaultWriter } from "../gateway/vault.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { ACTION_NAMES, createPolicyEngine, defaultSrcDir } from "../pdp/index.ts";
import type { PolicyEngine, PrincipalEntity } from "../pdp/index.ts";
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
  ada: Session;
  mallory: Session;
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
  const srcDir = await mkdtemp(join(tmpdir(), "api-credential-routes-src-"));
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
      { subject: "ada", roles: ["auditor"], teams: [] },
    ],
    clock,
  );
  await seedFlowActors(db, b, [{ subject: "mallory", roles: ["tenant_admin"], teams: [] }], clock);
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
    ada: await createTestSession(db, a, "ada", clock),
    mallory: await createTestSession(db, b, "mallory", clock),
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

function fieldsOf(body: unknown): unknown {
  return (body as ErrorBody).error.details?.["fields"];
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

async function closeBase(base: Base): Promise<void> {
  await base.fake.close();
  await base.db.close();
}

test("C-bbdd4a2c carol provisions, replays and is refused a changed body under the same key", async () => {
  const base = await seedBase();
  let server: FastifyInstance | undefined;
  try {
    server = await startServer(base);
    const first = await send(server, "POST", "/api/v1/credentials", base.carol, B1, "k1");
    assert.equal(first.statusCode, 201);
    assert.deepEqual(first.json(), rec1(base.carol.userId));

    const replay = await send(server, "POST", "/api/v1/credentials", base.carol, B1, "k1");
    assert.equal(replay.statusCode, 201);
    assert.deepEqual(replay.json(), rec1(base.carol.userId));
    assert.equal(replay.headers["idempotent-replayed"], "true");
    assert.equal(base.fake.credentials().length, 1);

    const changed = await send(
      server,
      "POST",
      "/api/v1/credentials",
      base.carol,
      { ...B1, value: VAL2 },
      "k1",
    );
    assert.equal(changed.statusCode, 422);
    assert.equal((changed.json() as ErrorBody).error.code, "IDEMPOTENCY_KEY_REUSED");

    const duplicate = await send(server, "POST", "/api/v1/credentials", base.carol, B1, "k2");
    assert.equal(duplicate.statusCode, 409);
    assert.equal((duplicate.json() as ErrorBody).error.code, "ALREADY_EXISTS");
    assert.deepEqual(detailsOf(duplicate.json()), { toolServerId: "acme" });

    const beta = await send(
      server,
      "POST",
      "/api/v1/credentials",
      base.carol,
      { toolServerId: "beta", authScheme: "BEARER_TOKEN", value: VALB },
      "k3",
    );
    assert.equal(beta.statusCode, 201);
    assert.deepEqual(beta.json(), rec2(base.carol.userId));
  } finally {
    await server?.close();
    await closeBase(base);
  }
});

test("C-bbdd4a2c malformed credential requests are 400 with the field of the rule", async () => {
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
    server = await startServer(base, { vault: recording });

    const cases: { label: string; body: Record<string, unknown>; field: string; message: string }[] = [
      {
        label: "reserved host",
        body: { ...B1, headerName: "Host" },
        field: "body/headerName",
        message: "reserved",
      },
      {
        label: "reserved call header",
        body: { ...B1, headerName: "X-Ursitoare-Call" },
        field: "body/headerName",
        message: "reserved",
      },
      {
        label: "bad header",
        body: { ...B1, headerName: "x bad" },
        field: "body/headerName",
        message: "bad_value",
      },
      {
        label: "missing header",
        body: { toolServerId: "acme", authScheme: "API_KEY_HEADER", value: VAL1 },
        field: "body/headerName",
        message: "required",
      },
      {
        label: "empty header",
        body: { ...B1, headerName: "" },
        field: "body/headerName",
        message: "must NOT have fewer than 1 characters",
      },
      {
        label: "null header",
        body: { ...B1, headerName: null },
        field: "body/headerName",
        message: "must NOT have fewer than 1 characters",
      },
      {
        label: "bearer with header",
        body: { ...B1, authScheme: "BEARER_TOKEN", headerName: "x-k" },
        field: "body/headerName",
        message: "not_allowed",
      },
      {
        label: "bad scheme",
        body: { ...B1, authScheme: "BASIC_AUTH" },
        field: "body/authScheme",
        message: "must be equal to one of the allowed values",
      },
      {
        label: "empty value",
        body: { ...B1, value: "" },
        field: "body/value",
        message: "must NOT have fewer than 1 characters",
      },
      {
        label: "long value",
        body: { ...B1, value: "a".repeat(4097) },
        field: "body/value",
        message: "must NOT have more than 4096 characters",
      },
      {
        label: "bad value",
        body: { ...B1, value: "a b" },
        field: "body/value",
        message: "bad_value",
      },
      {
        label: "missing value",
        body: { toolServerId: "acme", authScheme: "API_KEY_HEADER", headerName: KH },
        field: "body/value",
        message: "must have required property 'value'",
      },
      {
        label: "missing server",
        body: { authScheme: "API_KEY_HEADER", headerName: KH, value: VAL1 },
        field: "body/toolServerId",
        message: "must have required property 'toolServerId'",
      },
      {
        label: "bad server",
        body: { ...B1, toolServerId: "Bad" },
        field: "body/toolServerId",
        message: "bad_value",
      },
      {
        label: "extra service id",
        body: { ...B1, serviceId: SVC1 },
        field: "body/serviceId",
        message: "must NOT have additional properties",
      },
    ];

    for (const row of cases) {
      const response = await send(server, "POST", "/api/v1/credentials", base.carol, row.body);
      assert.equal(response.statusCode, 400, row.label);
      assert.equal((response.json() as ErrorBody).error.code, "VALIDATION_FAILED", row.label);
      assert.deepEqual(
        fieldsOf(response.json()),
        [{ field: row.field, message: row.message }],
        row.label,
      );
    }

    const unknown = await send(
      server,
      "POST",
      "/api/v1/credentials",
      base.carol,
      { ...B1, toolServerId: "nope" },
    );
    assert.equal(unknown.statusCode, 404);
    assert.equal((unknown.json() as ErrorBody).error.code, "NOT_FOUND");
    assert.deepEqual(detailsOf(unknown.json()), { toolServerId: "nope" });

    assert.deepEqual(calls, [], "no invalid request reached the vault");
  } finally {
    await server?.close();
    await closeBase(base);
  }
});

test("C-bbdd4a2c alice is refused, mallory sees nothing and rotation moves the key version", async () => {
  const base = await seedBase();
  let server: FastifyInstance | undefined;
  try {
    server = await startServer(base);
    const acme = await send(server, "POST", "/api/v1/credentials", base.carol, B1, "k1");
    assert.equal(acme.statusCode, 201);
    const beta = await send(
      server,
      "POST",
      "/api/v1/credentials",
      base.carol,
      { toolServerId: "beta", authScheme: "BEARER_TOKEN", value: VALB },
      "k2",
    );
    assert.equal(beta.statusCode, 201);

    for (const [method, url, payload] of [
      ["POST", "/api/v1/credentials", B1],
      ["GET", "/api/v1/credentials", undefined],
    ] as const) {
      const denied = await send(server, method, url, base.alice, payload);
      assert.equal(denied.statusCode, 403, method);
      assert.equal((denied.json() as ErrorBody).error.code, "FORBIDDEN", method);
    }

    const rotateUrl = `/api/v1/credentials/${CRED1}/rotate`;
    const rotated = await send(server, "POST", rotateUrl, base.carol, { value: VAL2 });
    assert.equal(rotated.statusCode, 200);
    assert.deepEqual(rotated.json(), {
      ...rec1(base.carol.userId),
      keyVersion: 2,
      rotatedAt: PROVISIONED_AT,
    });

    const missing = await send(
      server,
      "POST",
      "/api/v1/credentials/cred_nope/rotate",
      base.carol,
      { value: VAL2 },
    );
    assert.equal(missing.statusCode, 404);
    assert.equal((missing.json() as ErrorBody).error.code, "NOT_FOUND");
    assert.deepEqual(detailsOf(missing.json()), { credentialId: "cred_nope" });

    const empty = await send(server, "POST", rotateUrl, base.carol, { value: "" });
    assert.equal(empty.statusCode, 400);
    const emptyFields = fieldsOf(empty.json()) as { field: string }[];
    assert.equal(emptyFields.length, 1);
    assert.equal(emptyFields[0]?.field, "body/value");

    const extra = await send(server, "POST", rotateUrl, base.carol, {
      value: VAL2,
      serviceId: SVC1,
    });
    assert.equal(extra.statusCode, 400);
    assert.deepEqual(fieldsOf(extra.json()), [
      { field: "body/serviceId", message: "must NOT have additional properties" },
    ]);

    const noValue = await send(server, "POST", rotateUrl, base.carol, {});
    assert.equal(noValue.statusCode, 400);
    assert.deepEqual(fieldsOf(noValue.json()), [
      { field: "body/value", message: "must have required property 'value'" },
    ]);

    const aliceRotate = await send(server, "POST", rotateUrl, base.alice, { value: VAL2 });
    assert.equal(aliceRotate.statusCode, 403);

    const malloryRotate = await send(server, "POST", rotateUrl, base.mallory, { value: VAL2 });
    assert.equal(malloryRotate.statusCode, 404);
    assert.deepEqual(detailsOf(malloryRotate.json()), { credentialId: CRED1 });

    const page1 = await send(server, "GET", "/api/v1/credentials?limit=1", base.carol);
    assert.equal(page1.statusCode, 200);
    const body1 = page1.json() as { items: unknown[]; next_cursor: string | null };
    assert.deepEqual(body1.items, [
      { ...rec1(base.carol.userId), keyVersion: 2, rotatedAt: PROVISIONED_AT },
    ]);
    assert.equal(typeof body1.next_cursor, "string");
    const page2 = await send(
      server,
      "GET",
      `/api/v1/credentials?limit=1&cursor=${encodeURIComponent(body1.next_cursor ?? "")}`,
      base.carol,
    );
    assert.equal(page2.statusCode, 200);
    const body2 = page2.json() as { items: unknown[]; next_cursor: string | null };
    assert.deepEqual(body2.items, [rec2(base.carol.userId)]);
    assert.equal(body2.next_cursor, null);

    const theirs = await send(server, "GET", "/api/v1/credentials", base.mallory);
    assert.equal(theirs.statusCode, 200);
    assert.deepEqual(theirs.json(), { items: [], next_cursor: null });
  } finally {
    await server?.close();
    await closeBase(base);
  }
});

test("C-bbdd4a2c a null vault answers 503 for the writes while the list stays available", async () => {
  const base = await seedBase();
  const servers: FastifyInstance[] = [];
  try {
    const admin = await startServer(base);
    servers.push(admin);
    const first = await send(admin, "POST", "/api/v1/credentials", base.carol, B1, "k1");
    assert.equal(first.statusCode, 201);

    const nullVault = await startServer(base, { vault: null });
    servers.push(nullVault);
    const post = await send(nullVault, "POST", "/api/v1/credentials", base.carol, {
      ...B1,
      toolServerId: "beta",
    });
    assert.equal(post.statusCode, 503);
    const postError = (post.json() as ErrorBody).error;
    assert.equal(postError.code, "EGRESS_UNAVAILABLE");
    assert.equal(postError.message, "The egress broker or vault is unavailable");
    assert.deepEqual(detailsOf(post.json()), { reason: "vault_not_configured" });

    const rotate = await send(nullVault, "POST", `/api/v1/credentials/${CRED1}/rotate`, base.carol, {
      value: VAL2,
    });
    assert.equal(rotate.statusCode, 503);
    assert.equal((rotate.json() as ErrorBody).error.code, "EGRESS_UNAVAILABLE");
    assert.deepEqual(detailsOf(rotate.json()), { reason: "vault_not_configured" });

    const list = await send(nullVault, "GET", "/api/v1/credentials", base.carol);
    assert.equal(list.statusCode, 200);
    assert.deepEqual(list.json(), { items: [rec1(base.carol.userId)], next_cursor: null });
  } finally {
    for (const server of servers) await server.close();
    await closeBase(base);
  }
});

test("C-bbdd4a2c a closed or refusing vault leaves the row and writes nothing", async () => {
  const base = await seedBase();
  const servers: FastifyInstance[] = [];
  try {
    const admin = await startServer(base);
    servers.push(admin);
    const first = await send(admin, "POST", "/api/v1/credentials", base.carol, B1, "k1");
    assert.equal(first.statusCode, 201);
    const rotated = await send(admin, "POST", `/api/v1/credentials/${CRED1}/rotate`, base.carol, {
      value: VAL2,
    });
    assert.equal(rotated.statusCode, 200);
    assert.equal((rotated.json() as { keyVersion: number }).keyVersion, 2);

    const deniedWriter = createVaultWriter(
      {
        url: base.fake.vaultUrl,
        identity: base.fake.vaultDenied.identity,
        token: new Secret(base.fake.vaultDenied.token),
      },
      { logger: silentLogger() },
    );
    const denied = await startServer(base, { vault: deniedWriter });
    servers.push(denied);

    const gammaDenied = await send(denied, "POST", "/api/v1/credentials", base.carol, {
      ...B1,
      toolServerId: "gamma",
    });
    assert.equal(gammaDenied.statusCode, 503);
    assert.equal((gammaDenied.json() as ErrorBody).error.code, "EGRESS_UNAVAILABLE");
    assert.deepEqual(detailsOf(gammaDenied.json()), { reason: "token_refused" });
    const deniedRotate = await send(denied, "POST", `/api/v1/credentials/${CRED1}/rotate`, base.carol, {
      value: VAL1,
    });
    assert.equal(deniedRotate.statusCode, 503);
    assert.deepEqual(detailsOf(deniedRotate.json()), { reason: "token_refused" });

    const refusing: VaultWriter = {
      async putCredential(): Promise<{ keyVersion: number }> {
        throw new GatewayError("GATEWAY_INVALID", "Vault refused the credential", {
          reason: "vault_refused",
        });
      },
    };
    const stub = await startServer(base, { vault: refusing });
    servers.push(stub);

    const gammaRefused = await send(stub, "POST", "/api/v1/credentials", base.carol, {
      ...B1,
      toolServerId: "gamma",
    });
    assert.equal(gammaRefused.statusCode, 503);
    assert.equal((gammaRefused.json() as ErrorBody).error.code, "EGRESS_UNAVAILABLE");
    assert.deepEqual(detailsOf(gammaRefused.json()), { reason: "vault_refused" });
    const stubRotate = await send(stub, "POST", `/api/v1/credentials/${CRED1}/rotate`, base.carol, {
      value: VAL1,
    });
    assert.equal(stubRotate.statusCode, 503);
    assert.deepEqual(detailsOf(stubRotate.json()), { reason: "vault_refused" });

    const listed = await send(denied, "GET", "/api/v1/credentials", base.carol);
    assert.equal(listed.statusCode, 200);
    const list = listed.json() as { items: { toolServerId: string; keyVersion: number }[] };
    assert.deepEqual(
      list.items.map((item) => item.toolServerId),
      ["acme"],
    );
    assert.equal(list.items[0]?.keyVersion, 2);

    await base.fake.close();
    const closed = await send(admin, "POST", "/api/v1/credentials", base.carol, {
      ...B1,
      toolServerId: "gamma",
    }, "k3");
    assert.equal(closed.statusCode, 503);
    assert.equal((closed.json() as ErrorBody).error.code, "EGRESS_UNAVAILABLE");
    assert.deepEqual(detailsOf(closed.json()), { reason: "unavailable" });

    const again = await send(admin, "POST", "/api/v1/credentials", base.carol, {
      ...B1,
      toolServerId: "gamma",
    }, "k3");
    assert.equal(again.statusCode, 503);
    assert.deepEqual(detailsOf(again.json()), { reason: "unavailable" });

    const closedRotate = await send(admin, "POST", `/api/v1/credentials/${CRED1}/rotate`, base.carol, {
      value: VAL1,
    });
    assert.equal(closedRotate.statusCode, 503);
    assert.deepEqual(detailsOf(closedRotate.json()), { reason: "unavailable" });

    const still = await send(admin, "GET", "/api/v1/credentials", base.carol);
    assert.equal(still.statusCode, 200);
    const stillBody = still.json() as { items: { keyVersion: number }[] };
    assert.equal(stillBody.items[0]?.keyVersion, 2);
  } finally {
    for (const server of servers) await server.close();
    await closeBase(base);
  }
});

function principalWith(roles: readonly string[]): PrincipalEntity {
  return { tenantId: "tenant_a", userId: "carol", kind: "human", roles, teams: [] };
}

test("C-bbdd4a2c the credentials fragment permits only tenant admins", async () => {
  let server: FastifyInstance | undefined;
  try {
    server = await buildServer({
      version: "0.0.0",
      ids: sequentialIds(100),
      logger: silentLogger(),
      tracer: noopTracer,
    });
    assert.doesNotThrow(() => {
      registerCredentialRoutes(server as FastifyInstance, {
        pool: null,
        vault: null,
        ids: sequentialIds(1),
        clock: fixedClock(NOW),
        engineKey: null,
      });
    }, "registerCredentialRoutes");

    const engine = await engineFor(fixedClock(NOW));
    const carol = principalWith(["tenant_admin"]);
    const alice = principalWith(["author"]);
    const ada = principalWith(["auditor"]);

    assert.ok(
      (await engine.allowedActions(carol, ACTION_NAMES)).includes("manage_credentials"),
      "carol holds manage_credentials",
    );
    for (const [label, principal] of [
      ["alice", alice],
      ["ada", ada],
    ] as const) {
      assert.ok(
        !(await engine.allowedActions(principal, ACTION_NAMES)).includes("manage_credentials"),
        `${label} does not hold manage_credentials`,
      );
    }

    const defaults = await createPolicyEngine({
      srcDir: defaultSrcDir(),
      clock: fixedClock(NOW),
      ids: sequentialIds(),
      logger: silentLogger(),
    });
    assert.deepEqual(
      defaults.policies
        .map((policy) => policy.id)
        .filter((id) => id.startsWith("credentials-"))
        .sort(),
      ["credentials-manage-admin"],
    );
  } finally {
    await server?.close();
  }
});
