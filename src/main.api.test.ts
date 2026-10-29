import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createConnection } from "node:net";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { DefinedRoute } from "./api/route.ts";
import { defineRoute, listDefinedRoutes, registerAuthVerifier } from "./api/route.ts";
import { checkRouteCoverage } from "./api/coverage.ts";
import type { AppConfig } from "./config/index.ts";
import type { Principal } from "./identity/index.ts";
import type { TenantContext } from "./tenancy/index.ts";
import type { MainDeps, RunningServer } from "./main.ts";
import { main } from "./main.ts";
import type { LogDestination } from "./observability/index.ts";
import { freePort } from "../test/support/pg.ts";

assert.equal(typeof main, "function");
assert.equal(typeof listDefinedRoutes, "function");
assert.equal(typeof checkRouteCoverage, "function");
assert.equal(typeof defineRoute, "function");
assert.equal(typeof registerAuthVerifier, "function");

const TENANT_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "team" };
const SERVICE_PRINCIPAL: Principal = {
  tenantId: "tenant_a",
  userId: "svc-test",
  kind: "service",
  roles: [],
  teams: [],
  actorChain: [],
};

// The service_token verifier (add-audit-sink owns the real one): tests define routes through
// defineRoute inside inspectServers, so the internal listener needs a wired kind.
registerAuthVerifier("service_token", async (request) => {
  if (request.headers["x-test-service"] !== "ok") {
    return null;
  }
  return { principal: SERVICE_PRINCIPAL, tenant: TENANT_A };
});

function capture(): { destination: LogDestination; lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    destination: {
      write(line: string): void {
        lines.push(line);
      },
    },
  };
}

function appConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    role: "all",
    host: "127.0.0.1",
    port: 0,
    logLevel: "info",
    publicBaseUrl: "https://ursitoare.example.com",
    webDist: null,
    shutdownDrainMs: 10000,
    engineKey: null,
    database: { app: null, owner: null },
    ...overrides,
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

function connectionRefused(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", (error: NodeJS.ErrnoException) => {
      socket.destroy();
      resolve(error.code === "ECONNREFUSED");
    });
  });
}

type KeptServers = { public: FastifyInstance; internal: FastifyInstance };

const PUBLIC_ROUTES: { key: string; auth: DefinedRoute["auth"]; action: string | null }[] = [
  { key: "GET /health", auth: { kind: "public", reason: "health" }, action: null },
  { key: "GET /*", auth: { kind: "public", reason: "static" }, action: null },
  { key: "GET /api/v1/me", auth: { kind: "session" }, action: "read_self" },
  { key: "GET /auth/oidc/login", auth: { kind: "public", reason: "oidc" }, action: null },
  { key: "GET /auth/oidc/callback", auth: { kind: "public", reason: "oidc" }, action: null },
  { key: "POST /auth/oidc/logout", auth: { kind: "public", reason: "oidc" }, action: null },
];

test("C-1191d5a9 main wires both listeners so every route comes from defineRoute", async () => {
  const { destination } = capture();
  const exits: number[] = [];
  let inspectRuns = 0;
  let keptServers: KeptServers[] = [];
  let running: RunningServer | null = null;

  try {
    running = await resolveMain({
      loadConfig: () => appConfig(),
      destination,
      signals: new EventEmitter(),
      exit: (code) => {
        exits.push(code);
      },
      inspectServers: (servers) => {
        inspectRuns += 1;
        keptServers = [servers];
      },
    });

    assert.ok(running !== null, "main resolves a running server");
    assert.deepEqual(exits, [], "startup did not fail");

    assert.equal(inspectRuns, 1, "inspectServers ran once before listening");

    const servers = keptServers[0];
    assert.ok(servers !== undefined, "inspectServers kept both servers");

    assert.deepEqual(checkRouteCoverage(servers.public), [], "the public listener is fully covered");

    const internal = servers.internal as FastifyInstance | undefined;
    assert.ok(internal !== undefined, "inspectServers kept the internal server");
    assert.deepEqual(checkRouteCoverage(internal), [], "the internal listener is fully covered");
    assert.deepEqual(listDefinedRoutes(internal), [], "the internal server has no routes");

    const byKey = new Map<string, DefinedRoute>(
      listDefinedRoutes(servers.public).map((route) => [`${route.method} ${route.url}`, route]),
    );
    for (const expected of PUBLIC_ROUTES) {
      const route = byKey.get(expected.key);
      assert.ok(route !== undefined, `${expected.key} is a defined route of the public listener`);
      assert.deepEqual(route.auth, expected.auth, `${expected.key} declares its public kind`);
      assert.deepEqual(route.action, expected.action, `${expected.key} declares its action`);
    }
  } finally {
    await running?.close().catch(() => undefined);
  }
});

test("C-45aacd7c main opens the internal listener only with routes and closes both ports", async () => {
  const first = capture();
  const exitsFirst: number[] = [];
  let firstRuns = 0;
  let firstInternal: FastifyInstance | undefined;
  let running: RunningServer | null = null;

  try {
    running = await resolveMain({
      loadConfig: () => appConfig(),
      destination: first.destination,
      signals: new EventEmitter(),
      exit: (code) => {
        exitsFirst.push(code);
      },
      inspectServers: (servers) => {
        firstRuns += 1;
        firstInternal = servers.internal;
      },
    });

    assert.ok(running !== null, "main resolves a running server");
    assert.deepEqual(exitsFirst, [], "startup did not fail");
    assert.equal(firstRuns, 1, "inspectServers ran on the first run");
    assert.ok(firstInternal !== undefined, "inspectServers kept the internal server");
    assert.equal(
      firstInternal.server.listening,
      false,
      "the internal listener is not opened without routes",
    );
  } finally {
    await running?.close().catch(() => undefined);
  }

  const second = capture();
  const exitsSecond: number[] = [];
  const internalPort = await freePort();
  let keptServers: KeptServers[] = [];
  let runningSecond: RunningServer | null = null;

  try {
    runningSecond = await resolveMain({
      loadConfig: () => appConfig({ internalPort }),
      destination: second.destination,
      signals: new EventEmitter(),
      exit: (code) => {
        exitsSecond.push(code);
      },
      inspectServers: (servers) => {
        keptServers = [servers];
        const internal = servers.internal;
        if (internal === undefined) {
          return;
        }
        defineRoute(internal, {
          method: "POST",
          url: "/v1/internal/test",
          auth: { kind: "service_token" },
          action: "read_self",
          schema: {},
          errors: [],
          handler: async () => ({ ok: true }),
        });
      },
    });

    assert.ok(runningSecond !== null, "main resolves a running server");
    assert.deepEqual(exitsSecond, [], "startup did not fail");

    const servers = keptServers[0];
    assert.ok(servers !== undefined, "inspectServers kept both servers");

    const internalResponse = await fetch(`http://127.0.0.1:${internalPort}/v1/internal/test`, {
      method: "POST",
      headers: { "x-test-service": "ok" },
    });
    assert.equal(internalResponse.status, 503, "the internal route answers without a database");
    const internalBody = (await internalResponse.json()) as { error?: { code?: string } };
    assert.equal(internalBody.error?.code, "AUTHZ_UNAVAILABLE");

    const publicResponse = await fetch(`${runningSecond.url}/v1/internal/test`, {
      method: "POST",
      headers: { "x-test-service": "ok" },
    });
    assert.equal(publicResponse.status, 404, "the public listener has no internal route");

    const publicMatch = /^http:\/\/127\.0\.0\.1:(\d+)$/.exec(runningSecond.url);
    assert.ok(publicMatch !== null, `the public url is loopback with a port, got ${runningSecond.url}`);
    const publicPortText = publicMatch[1];
    assert.ok(publicPortText !== undefined, "the public url carries the port");
    const publicPort = Number(publicPortText);

    await runningSecond.close();

    assert.equal(
      await connectionRefused(publicPort),
      true,
      "the public port refuses connections after close",
    );
    assert.equal(
      await connectionRefused(internalPort),
      true,
      "the internal port refuses connections after close",
    );
  } finally {
    await runningSecond?.close().catch(() => undefined);
  }
});
