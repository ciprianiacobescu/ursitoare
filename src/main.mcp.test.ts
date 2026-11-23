import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { listDefinedRoutes } from "./api/index.ts";
import type { AppConfig, DatabaseEndpoint, EgressConfig } from "./config/index.ts";
import { Secret } from "./config/index.ts";
import { systemClock } from "./core/index.ts";
import type { EndpointLike } from "./db/index.ts";
import type { MainDeps, RunningServer } from "./main.ts";
import { main } from "./main.ts";
import type { LogDestination } from "./observability/index.ts";
import { createTestSession } from "../test/support/api-session.ts";
import { startFakeEgress } from "../test/support/fake-egress/index.ts";
import type { FakeEgress } from "../test/support/fake-egress/index.ts";
import { seedFlowActors } from "../test/support/flow-actors.ts";
import { FAKE_MCP_HOST, startFakeMcp } from "../test/support/fake-mcp/index.ts";
import { OPENAPI_FILE } from "../test/support/openapi-docs.ts";
import { withTestDatabase } from "../test/support/pg.ts";
import { seedTwoTenants } from "../test/support/tenants.ts";

interface KeptServers {
  public: FastifyInstance;
  internal: FastifyInstance;
}

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface Operation {
  operationId?: string;
  "x-ursitoare-action"?: string;
}

interface Document {
  paths?: Record<string, Record<string, Operation>>;
}

const SILENT: LogDestination = { write(): void {} };
const TOKEN = "k-mcp-" + "7f3a";
const REGISTER_PATH = "/api/v1/tool-registrations/mcp";
const DISCOVER_ROUTE = "/api/v1/tool-servers/:id/discover";
const DISCOVER_PATH = "/api/v1/tool-servers/{id}/discover";
const REGISTER_OPERATION = "post_api_v1_tool_registrations_mcp";
const DISCOVER_OPERATION = "post_api_v1_tool_servers_id_discover";

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

function send(
  baseUrl: string,
  session: Session,
  path: string,
  payload: unknown,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: session.cookie,
      "x-csrf-token": session.csrfToken,
    },
    body: JSON.stringify(payload),
  });
}

function operationOf(document: Document, path: string, method: string): Operation | undefined {
  return document.paths?.[path]?.[method];
}

test("C-32af4b42 main defines the MCP routes and both operations are documented", async () => {
  const kept: FastifyInstance[] = [];
  const exits: number[] = [];
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
    for (const url of [REGISTER_PATH, DISCOVER_ROUTE]) {
      const route = routes.find((candidate) => candidate.method === "POST" && candidate.url === url);
      assert.ok(route !== undefined, `the public server defines POST ${url}`);
      assert.equal(
        route.action,
        "register_tool_server",
        `POST ${url} declares register_tool_server`,
      );
    }

    const response = await fetch(`${running.url}/api/v1/openapi.json`);
    assert.equal(response.status, 200, "the OpenAPI route answers");
    const served = (await response.json()) as Document;
    assert.equal(
      operationOf(served, REGISTER_PATH, "post")?.operationId,
      REGISTER_OPERATION,
      "the served document lists the MCP registration operation",
    );
    assert.equal(
      operationOf(served, DISCOVER_PATH, "post")?.operationId,
      DISCOVER_OPERATION,
      "the served document lists the MCP discovery operation",
    );

    const committed = JSON.parse(await readFile(OPENAPI_FILE, "utf8")) as Document;
    assert.equal(
      operationOf(committed, REGISTER_PATH, "post")?.operationId,
      REGISTER_OPERATION,
      "the committed document lists the MCP registration operation",
    );
    assert.equal(
      operationOf(committed, DISCOVER_PATH, "post")?.operationId,
      DISCOVER_OPERATION,
      "the committed document lists the MCP discovery operation",
    );
  } finally {
    await running?.close().catch(() => undefined);
  }
});

test("C-32af4b42 main discovers an MCP server through the wired routes and the fake egress", async () => {
  const db = await withTestDatabase();
  const { a } = await seedTwoTenants(db);
  const clock = systemClock;
  const fake = await startFakeEgress();
  const mcp = await startFakeMcp();
  let running: RunningServer | null = null;

  try {
    await seedFlowActors(db, a, [{ subject: "carol", roles: ["tenant_admin"], teams: [] }], clock);
    const carol = await createTestSession(db, a, "carol", clock);
    fake.addUpstream(FAKE_MCP_HOST, mcp.origin);

    const config = appConfig({
      database: {
        app: endpointOf(db.appEndpoint),
        owner: endpointOf(db.ownerEndpoint),
      },
      egress: egressOf(fake),
      engineKey: new Secret("k".repeat(64)),
    });

    running = await resolveMain({
      loadConfig: () => config,
      destination: SILENT,
      signals: new EventEmitter(),
      exit: (): void => undefined,
      checkEgress: async () => ({ broker: "closed" as const }),
    });
    assert.ok(running !== null, "main resolves a running server");

    const registered = await send(running.url, carol, REGISTER_PATH, {
      id: "docs",
      url: "https://mcp.fake.test/mcp",
    });
    const registeredText = await registered.text();
    assert.equal(registered.status, 201, registeredText);
    const registeredBody = JSON.parse(registeredText) as {
      endpoint?: unknown;
      server?: { adapter?: unknown; state?: unknown };
    };
    assert.equal(registeredBody.endpoint, "/mcp", "the endpoint is stored once");
    assert.equal(registeredBody.server?.adapter, "mcp");
    assert.equal(registeredBody.server?.state, "pending");

    const credential = await send(running.url, carol, "/api/v1/credentials", {
      toolServerId: "docs",
      authScheme: "BEARER_TOKEN",
      value: TOKEN,
    });
    const credentialText = await credential.text();
    assert.equal(credential.status, 201, credentialText);

    const discovered = await send(running.url, carol, "/api/v1/tool-servers/docs/discover", {});
    const discoveredText = await discovered.text();
    assert.equal(discovered.status, 200, discoveredText);
    const discoveredBody = JSON.parse(discoveredText) as {
      era?: unknown;
      protocolVersion?: unknown;
      server?: { state?: unknown; tools?: { name?: unknown }[] };
    };
    assert.equal(discoveredBody.era, "modern");
    assert.equal(discoveredBody.protocolVersion, "2026-07-28");
    assert.equal(discoveredBody.server?.state, "pending");
    assert.deepEqual(
      discoveredBody.server?.tools?.map((tool) => tool.name),
      ["find_vendor", "log_note"],
    );

    const requests = mcp.requests();
    assert.equal(requests.length, 2, "discovery sends server/discover and tools/list");
    assert.deepEqual(
      requests.map((request) => request.method),
      ["server/discover", "tools/list"],
    );
    for (const request of requests) {
      assert.equal(request.headers["authorization"], "[credential]");
    }

    for (const record of [
      registeredText,
      credentialText,
      discoveredText,
      JSON.stringify(requests),
      JSON.stringify(fake.requests()),
    ]) {
      assert.equal(record.includes(TOKEN), false, "no response or record holds the credential");
    }
  } finally {
    await running?.close().catch(() => undefined);
    await mcp.close().catch(() => undefined);
    await fake.close().catch(() => undefined);
    await db.close().catch(() => undefined);
  }
});
