import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { listDefinedRoutes } from "./api/index.ts";
import type { AppConfig, DatabaseEndpoint, EgressConfig } from "./config/index.ts";
import { Secret } from "./config/index.ts";
import { systemClock } from "./core/index.ts";
import type { EndpointLike } from "./db/index.ts";
import { mintkeyTenantId } from "./gateway/index.ts";
import type { MainDeps, RunningServer } from "./main.ts";
import { main } from "./main.ts";
import type { LogDestination } from "./observability/index.ts";
import { withTenantTx } from "./tenancy/index.ts";
import { createTestSession } from "../test/support/api-session.ts";
import { startFakeEgress } from "../test/support/fake-egress/index.ts";
import type { FakeEgress } from "../test/support/fake-egress/index.ts";
import { seedFlowActors } from "../test/support/flow-actors.ts";
import { OPENAPI_FILE } from "../test/support/openapi-docs.ts";
import { withTestDatabase } from "../test/support/pg.ts";
import { seedTwoTenants } from "../test/support/tenants.ts";

assert.equal(typeof main, "function");
assert.equal(typeof listDefinedRoutes, "function");

interface KeptServers {
  public: FastifyInstance;
  internal: FastifyInstance;
}

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface Schema {
  type?: unknown;
  properties?: Record<string, unknown>;
  required?: unknown;
  items?: Schema;
}

interface Operation {
  operationId?: string;
  "x-ursitoare-action"?: string;
  "x-ursitoare-errors"?: string[];
  requestBody?: {
    content?: { "application/json"?: { schema?: Schema } };
  };
  responses?: Record<string, { content?: { "application/json"?: { schema?: Schema } } }>;
}

interface Document {
  paths?: Record<string, Record<string, Operation>>;
}

interface ErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

const SILENT: LogDestination = { write(): void {} };
const ORIGIN = "https://tools.fake.test";
const KH = "x-fake-tools-key";
const VAL1 = "kv-secret-" + "7f3a";
const VALB = "bt-secret-" + "9c1d";
const CANARY = "CANARY-" + "5f1d9c3a-77e2-4b6c-a0d8-2b9e4c61f3a7";
const CREDENTIAL_PATH = "/api/v1/credentials";
const ROTATE_PATH = "/api/v1/credentials/{id}/rotate";
const RECORD_PROPERTIES: readonly string[] = [
  "authScheme",
  "headerName",
  "id",
  "keyVersion",
  "provisionedAt",
  "provisionedBy",
  "rotatedAt",
  "serviceId",
  "targetOrigin",
  "toolServerId",
];
const VALUE_SCHEMA = {
  type: "string",
  minLength: 1,
  maxLength: 4096,
  writeOnly: true,
};

function endpointOf(source: EndpointLike): DatabaseEndpoint {
  const revealed = source.password === null ? null : source.password.reveal();
  return { url: source.url, password: revealed === null ? null : new Secret(revealed) };
}

function appConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    role: "api",
    host: "127.0.0.1",
    port: 0,
    logLevel: "silent",
    publicBaseUrl: "http://127.0.0.1",
    webDist: null,
    shutdownDrainMs: 1000,
    engineKey: null,
    database: { app: null, owner: null },
    ...overrides,
  };
}

function egressOf(fake: FakeEgress): EgressConfig {
  return {
    brokerUrl: fake.brokerUrl,
    proxyUrl: fake.proxyUrl,
    brokerToken: new Secret(fake.brokerServiceToken),
    agentId: "ursitoare-engine",
    vault: {
      url: fake.vaultUrl,
      identity: fake.vaultAdmin.identity,
      token: new Secret(fake.vaultAdmin.token),
    },
  };
}

async function resolveMain(deps: Partial<MainDeps>): Promise<RunningServer | null> {
  const results: (RunningServer | null)[] = [];
  await assert.doesNotReject(async () => {
    results.push(await main(deps));
  }, "main must resolve");
  const result = results[0];
  assert.ok(result !== undefined, "main resolved a value");
  return result;
}

function responseSchema(operation: Operation, status: string): Schema {
  const schema = operation.responses?.[status]?.content?.["application/json"]?.schema;
  assert.ok(schema !== undefined, `the operation declares a ${status} response schema`);
  return schema;
}

function recordSchemaOf(schema: Schema): Schema {
  const properties = schema.properties;
  assert.ok(properties !== undefined, "the response schema declares properties");
  const items = properties["items"];
  assert.ok(items !== undefined, "the list response declares items");
  const record = (items as Schema).items;
  assert.ok(record !== undefined, "the list response declares an item schema");
  return record;
}

function assertRecordShape(schema: Schema, label: string): void {
  const properties = schema.properties;
  assert.ok(properties !== undefined, `${label} declares properties`);
  assert.deepEqual(
    Object.keys(properties).sort(),
    [...RECORD_PROPERTIES],
    `${label} holds exactly the ten record properties`,
  );
  assert.deepEqual(
    [...((schema.required as readonly string[] | undefined) ?? [])].sort(),
    [...RECORD_PROPERTIES],
    `${label} requires exactly the ten record properties`,
  );
}

async function provision(
  baseUrl: string,
  session: Session,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${baseUrl}${CREDENTIAL_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: session.cookie,
      "x-csrf-token": session.csrfToken,
    },
    body: JSON.stringify(body),
  });
}

async function list(baseUrl: string, session: Session, query = ""): Promise<Response> {
  return fetch(`${baseUrl}${CREDENTIAL_PATH}${query}`, {
    headers: { cookie: session.cookie },
  });
}

test("C-1e452907 main registers the credential routes with action manage credentials", async () => {
  const exits: number[] = [];
  const kept: FastifyInstance[] = [];
  let running: RunningServer | null = null;

  try {
    running = await resolveMain({
      loadConfig: () => appConfig(),
      destination: SILENT,
      signals: new EventEmitter(),
      exit: (code) => {
        exits.push(code);
      },
      inspectServers: (servers: KeptServers) => {
        kept.push(servers.public);
      },
    });

    assert.ok(running !== null, "main resolves a running server");
    assert.deepEqual(exits, [], "startup did not fail");

    const server = kept[0];
    assert.ok(server !== undefined, "inspectServers kept the public server");
    const routes = listDefinedRoutes(server);

    const expected: readonly { method: string; url: string }[] = [
      { method: "POST", url: CREDENTIAL_PATH },
      { method: "POST", url: "/api/v1/credentials/:id/rotate" },
      { method: "GET", url: CREDENTIAL_PATH },
    ];
    for (const wanted of expected) {
      const route = routes.find(
        (candidate) => candidate.method === wanted.method && candidate.url === wanted.url,
      );
      assert.ok(
        route !== undefined,
        `the public server defines ${wanted.method} ${wanted.url}`,
      );
      assert.equal(
        route.action,
        "manage_credentials",
        `${wanted.method} ${wanted.url} declares manage_credentials`,
      );
    }
  } finally {
    await running?.close().catch(() => undefined);
  }
});

test("C-1e452907 the committed OpenAPI document lists the credential operations", async () => {
  assert.ok(
    existsSync(OPENAPI_FILE),
    "docs/api/openapi.json exists; run node test/support/openapi-docs.ts",
  );
  const text = await readFile(OPENAPI_FILE, "utf8");
  const document = JSON.parse(text) as Document;
  assert.ok(document.paths !== undefined, "the committed document holds paths");

  const collection = document.paths[CREDENTIAL_PATH];
  assert.ok(
    collection !== undefined,
    `the document lists ${CREDENTIAL_PATH}: ${JSON.stringify(Object.keys(document.paths))}`,
  );
  const post = collection["post"];
  const get = collection["get"];
  const rotate = document.paths[ROTATE_PATH]?.["post"];
  assert.ok(post !== undefined, `the document lists POST ${CREDENTIAL_PATH}`);
  assert.ok(get !== undefined, `the document lists GET ${CREDENTIAL_PATH}`);
  assert.ok(rotate !== undefined, `the document lists POST ${ROTATE_PATH}`);

  assert.equal(post.operationId, "post_api_v1_credentials", "the provision operation id");
  assert.equal(get.operationId, "get_api_v1_credentials", "the list operation id");
  assert.equal(
    rotate.operationId,
    "post_api_v1_credentials_id_rotate",
    "the rotate operation id",
  );

  for (const [label, operation] of [
    ["provision", post],
    ["rotate", rotate],
    ["list", get],
  ] as const) {
    assert.equal(
      operation["x-ursitoare-action"],
      "manage_credentials",
      `${label} declares the manage_credentials action`,
    );
  }

  assert.ok(
    (post["x-ursitoare-errors"] ?? []).includes("EGRESS_UNAVAILABLE"),
    "the provision operation lists EGRESS_UNAVAILABLE",
  );
  assert.ok(
    (rotate["x-ursitoare-errors"] ?? []).includes("EGRESS_UNAVAILABLE"),
    "the rotate operation lists EGRESS_UNAVAILABLE",
  );
  assert.equal(
    (get["x-ursitoare-errors"] ?? []).includes("EGRESS_UNAVAILABLE"),
    false,
    "the list operation does not list EGRESS_UNAVAILABLE",
  );

  for (const [label, operation] of [
    ["provision", post],
    ["rotate", rotate],
  ] as const) {
    const body = operation.requestBody?.content?.["application/json"]?.schema;
    assert.ok(body !== undefined, `${label} declares a request body schema`);
    const properties = body.properties;
    assert.ok(properties !== undefined, `${label} declares body properties`);
    assert.deepEqual(
      properties["value"],
      VALUE_SCHEMA,
      `${label} declares value as write only with no example`,
    );
  }

  assertRecordShape(responseSchema(post, "201"), "the provision response");
  assertRecordShape(responseSchema(rotate, "200"), "the rotate response");
  assertRecordShape(recordSchemaOf(responseSchema(get, "200")), "the list response");

  assert.equal(text.includes(CANARY), false, "the committed document holds no canary");
});

test("C-8ba7a4db main wires the vault the ids and the engine key", async () => {
  const db = await withTestDatabase();
  const { a } = await seedTwoTenants(db);
  const clock = systemClock;
  const fake = await startFakeEgress();
  let running: RunningServer | null = null;

  try {
    await seedFlowActors(
      db,
      a,
      [{ subject: "carol", roles: ["tenant_admin"], teams: [] }],
      clock,
    );
    const carol: Session = await createTestSession(db, a, "carol", clock);
    const registeredAt = clock.now().toISOString();
    for (const id of ["acme", "beta"]) {
      await withTenantTx(db.ownerPool, a, async (tx) => {
        await tx.query(
          `INSERT INTO ursitoare.tool_server
             (tenant_id, tool_server_id, adapter, origin, local, state, registered_by, registered_at)
           VALUES ($1, $2, 'fixture', $3, false, 'pending', 'u_carol', $4)`,
          [a.tenantId, id, ORIGIN, registeredAt],
        );
      });
    }

    const egress = egressOf(fake);
    const engineKey = new Secret("k".repeat(64));
    const database = {
      app: endpointOf(db.appEndpoint),
      owner: endpointOf(db.ownerEndpoint),
    };
    const deps = (config: AppConfig): Partial<MainDeps> => ({
      loadConfig: () => config,
      destination: SILENT,
      signals: new EventEmitter(),
      exit: (): void => undefined,
      checkEgress: async () => ({ broker: "closed" as const }),
    });

    running = await resolveMain(deps(appConfig({ database, engineKey, egress })));
    assert.ok(running !== null, "main resolves a running server");

    const created = await provision(running.url, carol, {
      toolServerId: "acme",
      authScheme: "API_KEY_HEADER",
      headerName: KH,
      value: VAL1,
    });
    assert.equal(created.status, 201, await created.clone().text());
    const record = (await created.json()) as { id: string; keyVersion: number };
    assert.equal(record.keyVersion, 1, "the provision stores the vault's key version");
    assert.match(
      record.id,
      /^cred_(?!00000000)[0-9a-f-]{36}$/,
      "the id comes from the system id source",
    );

    const stored = fake.credentials();
    assert.equal(stored.length, 1, "the vault received one credential");
    const entry = stored[0];
    assert.ok(entry !== undefined, "the stored credential is recorded");
    assert.equal(entry.tenantId, mintkeyTenantId("tenant_a"), "the mintkey tenant id");
    assert.equal(entry.targetUrl, ORIGIN, "the writer receives the server's origin");
    assert.equal(entry.callerActorId, carol.userId, "the caller is carol's session user");
    assert.equal(entry.identity, fake.vaultAdmin.identity, "the configured vault identity");

    const beta = await provision(running.url, carol, {
      toolServerId: "beta",
      authScheme: "BEARER_TOKEN",
      value: VALB,
    });
    assert.equal(beta.status, 201, await beta.clone().text());
    assert.equal(fake.credentials().length, 2, "the second credential is stored");

    const firstPage = await list(running.url, carol, "?limit=1");
    assert.equal(firstPage.status, 200, await firstPage.clone().text());
    const page = (await firstPage.json()) as { items: unknown[]; next_cursor: unknown };
    assert.equal(page.items.length, 1, "the page honours the limit");
    assert.equal(typeof page.next_cursor, "string", "the engine key pages the records");

    await running.close();
    running = null;
    const vaultEntries = fake.credentials().length;

    running = await resolveMain(
      deps(appConfig({ database, engineKey, egress: { ...egress, vault: null } })),
    );
    assert.ok(running !== null, "main starts without a vault");
    const noVault = await provision(running.url, carol, {
      toolServerId: "acme",
      authScheme: "API_KEY_HEADER",
      headerName: KH,
      value: VAL1,
    });
    assert.equal(noVault.status, 503, await noVault.clone().text());
    const noVaultBody = (await noVault.json()) as ErrorBody;
    assert.equal(noVaultBody.error.code, "EGRESS_UNAVAILABLE");
    assert.deepEqual(noVaultBody.error.details, { reason: "vault_not_configured" });
    assert.equal(fake.credentials().length, vaultEntries, "the vault is unchanged");
    const noVaultList = await list(running.url, carol);
    assert.equal(noVaultList.status, 200, await noVaultList.clone().text());

    await running.close();
    running = null;

    running = await resolveMain(deps(appConfig({ database, engineKey })));
    assert.ok(running !== null, "main starts without egress");
    const noEgress = await provision(running.url, carol, {
      toolServerId: "acme",
      authScheme: "API_KEY_HEADER",
      headerName: KH,
      value: VAL1,
    });
    assert.equal(noEgress.status, 503, await noEgress.clone().text());
    const noEgressBody = (await noEgress.json()) as ErrorBody;
    assert.equal(noEgressBody.error.code, "EGRESS_UNAVAILABLE");
    assert.deepEqual(noEgressBody.error.details, { reason: "vault_not_configured" });
    assert.equal(fake.credentials().length, vaultEntries, "the vault is unchanged");
  } finally {
    await running?.close().catch(() => undefined);
    await fake.close();
    await db.close();
  }
});
