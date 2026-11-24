import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { unregisteredRouteErrors } from "./api/error-codes.ts";
import { listDefinedRoutes } from "./api/route.ts";
import type { AppConfig, DatabaseEndpoint } from "./config/index.ts";
import { Secret } from "./config/index.ts";
import type { Database, EndpointLike } from "./db/index.ts";
import type { LogDestination } from "./observability/index.ts";
import type { MainDeps, RunningServer } from "./main.ts";
import { main } from "./main.ts";
import { OPENAPI_FILE, servedOpenApiText } from "../test/support/openapi-docs.ts";
import { withTestDatabase } from "../test/support/pg.ts";

const SILENT: LogDestination = { write(): void {} };

interface KeptServers {
  public: FastifyInstance;
  internal: FastifyInstance;
}

function endpointOf(source: EndpointLike): DatabaseEndpoint {
  const revealed = source.password === null ? null : source.password.reveal();
  return { url: source.url, password: revealed === null ? null : new Secret(revealed) };
}

function appConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    role: "all",
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

async function mainText(): Promise<string> {
  const source = await readFile(new URL("./main.ts", import.meta.url), "utf8");
  return source
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
}

test("C-46d522e4 main defines both code block routes with every error registered", async () => {
  const db = await withTestDatabase();
  const kept: { servers?: KeptServers } = {};
  let running: RunningServer | null = null;
  try {
    const deps: Partial<MainDeps> = {
      loadConfig: () =>
        appConfig({ database: { app: endpointOf(db.appEndpoint), owner: null } }),
      destination: SILENT,
      signals: new EventEmitter(),
      exit: () => undefined,
      inspectServers: (servers: KeptServers) => {
        kept.servers = servers;
      },
      openDatabase: async (): Promise<Database> => ({
        appPool: db.appPool,
        close: async (): Promise<void> => undefined,
      }),
    };
    await assert.doesNotReject(async () => {
      running = await main(deps);
    });
    const servers = kept.servers;
    assert.ok(servers !== undefined, "inspectServers kept both servers");
    const routes = [...listDefinedRoutes(servers.public), ...listDefinedRoutes(servers.internal)];
    for (const [method, url] of [
      ["POST", "/api/v1/tool-registrations/code"],
      ["PUT", "/api/v1/tool-servers/:id/code"],
    ] as const) {
      const route = routes.find((r) => r.method === method && r.url === url);
      assert.ok(route !== undefined, `main defines ${method} ${url}`);
      assert.deepEqual(route.auth, { kind: "session" });
      assert.equal(route.action, "register_tool_server");
    }
    assert.deepEqual(unregisteredRouteErrors(routes), []);
    const credentials = routes.find(
      (r) => r.method === "POST" && r.url === "/api/v1/credentials",
    );
    assert.ok(credentials?.errors.includes("OPERATION_REFUSED"), "credentials lists OPERATION_REFUSED");
  } finally {
    const closing = running as RunningServer | null;
    await closing?.close().catch(() => undefined);
    await db.close();
  }
});

test("C-46d522e4 the committed document lists both code block routes and equals the served text", async () => {
  const committed = await readFile(OPENAPI_FILE, "utf8");
  const doc = JSON.parse(committed) as { paths: Record<string, unknown> };
  assert.ok(doc.paths["/api/v1/tool-registrations/code"] !== undefined, "POST route listed");
  assert.ok(doc.paths["/api/v1/tool-servers/{id}/code"] !== undefined, "PUT route listed");
  assert.equal(committed, await servedOpenApiText());
});

test("C-46d522e4 main passes the code runner getter and registers the routes after the tool server routes", async () => {
  const code = await mainText();
  const line = "code: createCodeRunner(() => sandbox),";
  assert.equal(code.split(line).length - 1, 1, "the getter line appears once");
  const invoke = code.indexOf("createInvokePath(");
  const lineAt = code.indexOf(line);
  assert.ok(invoke >= 0 && lineAt > invoke, "the line sits after createInvokePath(");
  assert.ok(
    !code.slice(invoke, lineAt).includes("});"),
    "the line sits inside the createInvokePath call",
  );
  assert.equal(code.split("registerCodeBlockRoutes(").length - 1, 1, "registered once");
  assert.ok(
    code.indexOf("registerCodeBlockRoutes(") > code.indexOf("registerToolServerRoutes("),
    "registered after registerToolServerRoutes(",
  );
});
