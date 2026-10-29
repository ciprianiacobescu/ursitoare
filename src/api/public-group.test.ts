import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { sequentialIds, systemClock } from "../core/index.ts";
import { registerOidcRoutes } from "../identity/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { definePublicRoutes } from "./public-group.ts";
import { listDefinedRoutes, RouteDefinitionError } from "./route.ts";
import type { PublicReason } from "./route.ts";
import { buildServer } from "./server.ts";
import type { ServerDeps } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";

function deps(overrides?: Partial<ServerDeps>): ServerDeps {
  return {
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
    ...overrides,
  };
}

function oidcRegister(): (scoped: FastifyInstance) => unknown {
  return (scoped) =>
    registerOidcRoutes(scoped, {
      config: null,
      publicBaseUrl: BASE_URL,
      pool: null,
      engineKey: null,
      clock: systemClock,
    });
}

function expectDefinitionError(error: unknown, code: string, details: Record<string, string>): true {
  assert.ok(error instanceof RouteDefinitionError, "expected RouteDefinitionError");
  assert.equal(error.code, code);
  for (const [key, value] of Object.entries(details)) {
    assert.equal(error.details[key], value);
  }
  return true;
}

test("C-b78b341e oidc routes are classified through a public group", async (t) => {
  assert.equal(typeof definePublicRoutes, "function");

  const servers: FastifyInstance[] = [];
  t.after(async () => {
    for (const server of servers) {
      await server.close();
    }
  });

  const server = await buildServer(deps());
  servers.push(server);

  await assert.doesNotReject(async () => {
    await definePublicRoutes(server, "oidc", oidcRegister());
  });
  await server.ready();

  assert.deepEqual(
    listDefinedRoutes(server).filter((route) => route.url.startsWith("/auth/oidc")),
    [
      {
        method: "GET",
        url: "/auth/oidc/login",
        auth: { kind: "public", reason: "oidc" },
        action: null,
        errors: [],
        schema: {},
        listener: "public",
      },
      {
        method: "GET",
        url: "/auth/oidc/callback",
        auth: { kind: "public", reason: "oidc" },
        action: null,
        errors: [],
        schema: {},
        listener: "public",
      },
      {
        method: "POST",
        url: "/auth/oidc/logout",
        auth: { kind: "public", reason: "oidc" },
        action: null,
        errors: [],
        schema: {},
        listener: "public",
      },
    ],
  );

  const login = await server.inject({ method: "GET", url: "/auth/oidc/login" });
  assert.equal(login.statusCode, 503);
  assert.deepEqual(login.json(), {
    error: { code: "OIDC_NOT_CONFIGURED", message: "Sign-in is not configured" },
  });

  await assert.rejects(
    () => definePublicRoutes(server, "nope" as PublicReason, () => undefined),
    (error: unknown) => expectDefinitionError(error, "ROUTE_DEF_INVALID", { reason: "auth" }),
  );

  const internal = await buildServer({ ...deps(), listener: "internal" } as ServerDeps);
  servers.push(internal);

  await assert.rejects(
    () => definePublicRoutes(internal, "oidc", oidcRegister()),
    (error: unknown) =>
      expectDefinitionError(error, "ROUTE_LISTENER_MISMATCH", { listener: "internal" }),
  );
});
