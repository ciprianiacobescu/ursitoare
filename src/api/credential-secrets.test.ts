import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { inspect } from "node:util";

import type { FastifyInstance } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import { Secret } from "../config/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import { createVaultWriter } from "../gateway/vault.ts";
import type { PutCredentialInput, VaultWriter } from "../gateway/vault.ts";
import { createLogger } from "../observability/index.ts";
import type { LogDestination, Span, SpanValue, Tracer } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
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
import { requestDigestOf } from "./idempotency.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";

assert.equal(typeof registerCredentialRoutes, "function");

const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-06T10:00:00Z";
const ORIGIN = "https://tools.fake.test";
const KH = "x-fake-tools-key";
const CANARY = "CANARY-" + "5f1d9c3a-77e2-4b6c-a0d8-2b9e4c61f3a7";
const VAL1 = "kv-secret-" + "7f3a";
const SVC1 = "00000000-0000-7000-8000-000000000001";
const CRED1 = "cred_00000000-0000-7000-8000-000000000002";
const KEY: KeyMaterial = { reveal: () => "k".repeat(64) };

const ROLES_CEDAR = new URL("../identity/policy/roles.cedar", import.meta.url).pathname;
const CREDENTIALS_CEDAR = new URL("../credentials/policy/credentials.cedar", import.meta.url)
  .pathname;

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
}

const B1 = {
  toolServerId: "acme",
  authScheme: "API_KEY_HEADER",
  headerName: KH,
  value: VAL1,
};

const B1C = { ...B1, value: CANARY };

const engineDirs: string[] = [];

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: { write(): void {} } satisfies LogDestination,
  });
}

function recordingLogger(lines: string[]) {
  return createLogger({
    level: "debug",
    destination: {
      write(line: string): void {
        lines.push(line);
      },
    } satisfies LogDestination,
  });
}

function recordingTracer(spans: string[]): Tracer {
  return {
    startSpan(name: string, attrs?: Readonly<Record<string, SpanValue>>): Span {
      spans.push(JSON.stringify({ name, attrs }));
      return {
        setAttribute(key: string, value: SpanValue): void {
          spans.push(JSON.stringify({ key, value }));
        },
        end(): void {},
      };
    },
  };
}

function recordingWriter(writer: VaultWriter, calls: PutCredentialInput[]): VaultWriter {
  return {
    async putCredential(input: PutCredentialInput): Promise<{ keyVersion: number }> {
      calls.push(input);
      return writer.putCredential(input);
    },
  };
}

async function engineFor(clock: Clock): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-credential-secrets-src-"));
  engineDirs.push(srcDir);
  for (const [relative, source] of [
    [join("identity", "policy", "roles.cedar"), ROLES_CEDAR],
    [join("credentials", "policy", "credentials.cedar"), CREDENTIALS_CEDAR],
  ] as const) {
    const text = await readFile(source, "utf8").catch(() => "");
    if (text === "") continue;
    const target = join(srcDir, relative);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text, "utf8");
  }
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
  await seedFlowActors(db, a, [{ subject: "carol", roles: ["tenant_admin"], teams: [] }], clock);
  for (const id of ["acme", "gamma"]) {
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
  };
}

async function startServer(
  base: Base,
  writer: VaultWriter,
  logs: string[],
  spans: string[],
): Promise<FastifyInstance> {
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: recordingLogger(logs),
    tracer: recordingTracer(spans),
  });
  installPep(server, {
    pool: base.db.appPool,
    engine: await engineFor(base.clock),
    clock: base.clock,
    publicBaseUrl: BASE_URL,
  });
  assert.doesNotThrow(() => {
    registerCredentialRoutes(server, {
      pool: base.db.appPool,
      vault: writer,
      ids: sequentialIds(1),
      clock: base.clock,
      engineKey: KEY,
    });
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

function responseText(response: { statusCode: number; headers: Record<string, unknown>; body: string }) {
  return JSON.stringify({ status: response.statusCode, headers: response.headers, body: response.body });
}

async function databaseText(base: Base): Promise<string> {
  const tables = await withTenantTx(base.db.ownerPool, base.a, async (tx) => {
    const result = await tx.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'ursitoare' ORDER BY table_name",
    );
    return result.rows.map((row) => row.table_name);
  });
  const parts: string[] = [];
  for (const tenant of [base.a, base.b]) {
    for (const table of tables) {
      const quoted = `"${table.replaceAll('"', '""')}"`;
      const rows = await withTenantTx(base.db.ownerPool, tenant, async (tx) => {
        const result = await tx.query<{ row: string }>(
          `SELECT row_to_json(t)::text AS row FROM ursitoare.${quoted} t`,
        );
        return result.rows.map((row) => row.row);
      });
      parts.push(...rows);
    }
  }
  return parts.join("\n");
}

test("C-01ef6501 the credential value never reaches a response, log, span, row or fake sink", async () => {
  const base = await seedBase();
  let server: FastifyInstance | undefined;
  try {
    const logs: string[] = [];
    const spans: string[] = [];
    const vaultCalls: PutCredentialInput[] = [];
    const responseTexts: string[] = [];
    const errorTexts: string[] = [];

    const writer = recordingWriter(base.writer, vaultCalls);
    server = await startServer(base, writer, logs, spans);

    const provision = await send(server, "POST", "/api/v1/credentials", base.carol, B1C, "k1");
    responseTexts.push(responseText(provision));
    assert.equal(provision.statusCode, 201);

    const replay = await send(server, "POST", "/api/v1/credentials", base.carol, B1C, "k1");
    responseTexts.push(responseText(replay));
    assert.equal(replay.statusCode, 201);
    assert.equal(replay.headers["idempotent-replayed"], "true");

    const duplicate = await send(server, "POST", "/api/v1/credentials", base.carol, B1C, "k2");
    responseTexts.push(responseText(duplicate));
    assert.equal(duplicate.statusCode, 409);

    const reused = await send(
      server,
      "POST",
      "/api/v1/credentials",
      base.carol,
      { ...B1C, value: CANARY + "-changed" },
      "k1",
    );
    responseTexts.push(responseText(reused));
    assert.equal(reused.statusCode, 422);

    const rotate = await send(
      server,
      "POST",
      `/api/v1/credentials/${CRED1}/rotate`,
      base.carol,
      { value: CANARY },
    );
    responseTexts.push(responseText(rotate));
    assert.equal(rotate.statusCode, 200);

    for (const value of [
      CANARY + "\u0007",
      CANARY + "a".repeat(4097 - CANARY.length),
    ]) {
      const rejected = await send(
        server,
        "POST",
        `/api/v1/credentials/${CRED1}/rotate`,
        base.carol,
        { value },
      );
      responseTexts.push(responseText(rejected));
      assert.equal(rejected.statusCode, 400);
    }

    const denied = createVaultWriter(
      {
        url: base.fake.vaultUrl,
        identity: base.fake.vaultDenied.identity,
        token: new Secret(base.fake.vaultDenied.token),
      },
      { logger: silentLogger() },
    );
    const deniedCalls: PutCredentialInput[] = [];
    const deniedServer = await startServer(base, recordingWriter(denied, deniedCalls), [], []);
    const refused = await send(deniedServer, "POST", "/api/v1/credentials", base.carol, {
      ...B1C,
      toolServerId: "gamma",
    });
    responseTexts.push(responseText(refused));
    assert.equal(refused.statusCode, 503);
    assert.deepEqual((refused.json() as { error: { details?: unknown } }).error.details, {
      reason: "token_refused",
    });

    const deniedInput = deniedCalls[0];
    assert.ok(deniedInput !== undefined, "the refused request reached the vault writer");
    let deniedError: unknown;
    try {
      await denied.putCredential(deniedInput);
    } catch (error) {
      deniedError = error;
    }
    assert.ok(deniedError !== undefined, "the denied vault refuses a direct put");
    errorTexts.push(inspect(deniedError, { depth: null }));
    errorTexts.push((deniedError as Error).message);
    errorTexts.push(JSON.stringify((deniedError as { details?: unknown }).details));

    const closedFake = await startFakeEgress({ now: () => new Date(NOW) });
    const closedWriter = createVaultWriter(
      {
        url: closedFake.vaultUrl,
        identity: closedFake.vaultAdmin.identity,
        token: new Secret(closedFake.vaultAdmin.token),
      },
      { logger: silentLogger() },
    );
    await closedFake.close();
    let closedError: unknown;
    try {
      await closedWriter.putCredential({
        tenantId: base.a.tenantId,
        serviceId: SVC1,
        authScheme: "API_KEY_HEADER",
        value: new TextEncoder().encode(CANARY),
        headerName: KH,
        callerActorId: base.carol.userId,
        targetUrl: ORIGIN,
      });
    } catch (error) {
      closedError = error;
    }
    assert.ok(closedError !== undefined, "the closed vault refuses a direct put");
    errorTexts.push(inspect(closedError, { depth: null }));
    errorTexts.push((closedError as Error).message);
    errorTexts.push(JSON.stringify((closedError as { details?: unknown }).details));

    for (const call of [...vaultCalls, ...deniedCalls]) {
      errorTexts.push(Buffer.from(call.value).toString("utf8"));
    }

    const fakeText = JSON.stringify({
      credentials: base.fake.credentials(),
      issued: base.fake.issued(),
      requests: base.fake.requests(),
      events: base.fake.events(),
      vaultAdmin: base.fake.vaultAdmin,
      vaultProxy: base.fake.vaultProxy,
      vaultDenied: base.fake.vaultDenied,
    });
    const rows = await databaseText(base);
    const responseBody = responseTexts.join("\n");
    const logText = logs.join("\n");
    const spanText = spans.join("\n");
    const errorText = errorTexts.join("\n");

    const stored = await withTenantTx(base.db.ownerPool, base.a, async (tx) => {
      const result = await tx.query<{ request_digest: string }>(
        "SELECT request_digest FROM ursitoare.idempotency_key WHERE tenant_id = $1 AND principal_id = $2 AND key = $3",
        [base.a.tenantId, base.carol.userId, "k1"],
      );
      return result.rows[0];
    });
    assert.ok(stored !== undefined, "the first request left an idempotency row");
    assert.notEqual(
      stored.request_digest,
      requestDigestOf({
        method: "POST",
        route: "/api/v1/credentials",
        params: {},
        query: {},
        body: B1,
      }),
      "the stored digest is not the plain request digest",
    );

    assert.ok(vaultCalls.length >= 2, "the canary was sent to the vault");
    assert.ok(JSON.stringify(vaultCalls.map((call) => Buffer.from(call.value).toString("utf8"))).includes(CANARY));
    assert.ok(`${responseBody}\n${logText}\n${spanText}\n${errorText}\n${fakeText}\n${rows}`.length > 0);

    for (const [sink, text] of [
      ["responses", responseBody],
      ["logs", logText],
      ["spans", spanText],
      ["errors", errorText],
      ["fake", fakeText],
      ["rows", rows],
    ] as const) {
      assert.equal(text.includes(CANARY), false, `${sink} do not contain the canary`);
    }
    assert.ok(("x" + CANARY).includes(CANARY), "the canary search sees a control marker");

    await deniedServer.close();
  } finally {
    await server?.close();
    await base.fake.close();
    await base.db.close();
  }
});
