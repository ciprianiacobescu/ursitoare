import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { sequentialIds } from "../core/index.ts";
import type { ActionName } from "../pdp/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import {
  defineRoute,
  listDefinedRoutes,
  registerAuthVerifier,
  RouteDefinitionError,
} from "./route.ts";
import type { AuthVerifier, ListFilter, RouteDef } from "./route.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };

function testServer(): Promise<FastifyInstance> {
  return buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
}

function routeDef(overrides: Record<string, unknown>): RouteDef {
  return {
    method: "GET",
    url: "/api/v1/test/route",
    auth: { kind: "public", reason: "well_known" },
    schema: {},
    errors: [],
    handler: async () => ({}),
    ...overrides,
  } as unknown as RouteDef;
}

function expectDefinitionError(
  run: () => void,
  code: string,
  details: Record<string, string>,
): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof RouteDefinitionError, "expected RouteDefinitionError");
    assert.equal(error.code, code);
    for (const [key, value] of Object.entries(details)) {
      assert.equal(error.details[key], value);
    }
    return true;
  });
}

test("C-5a782e1a a public route registers and answers", async () => {
  const server = await testServer();

  await assert.doesNotReject(async () => {
    defineRoute(server, {
      method: "GET",
      url: "/ping",
      auth: { kind: "public", reason: "well_known" },
      schema: {},
      errors: [],
      handler: async () => ({ ok: true }),
    });
  });

  const response = await server.inject({ method: "GET", url: "/ping" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { ok: true });
  assert.deepEqual(listDefinedRoutes(server), [
    {
      method: "GET",
      url: "/ping",
      auth: { kind: "public", reason: "well_known" },
      action: null,
      errors: [],
      schema: {},
      listener: "public",
    },
  ]);

  await server.close();
});

test("C-d738ea05 unwired kinds refuse and verifier registrations are unique", async () => {
  const server = await testServer();
  const verifier: AuthVerifier = async () => null;

  expectDefinitionError(
    () =>
      defineRoute(server, {
        method: "POST",
        url: "/api/v1/test/delegate",
        auth: { kind: "hmac", hmacKind: "delegate" },
        schema: {},
        errors: [],
        handler: async () => ({ ok: true }),
      }),
    "ROUTE_AUTH_UNWIRED",
    { kind: "hmac" },
  );

  const notRouted = await server.inject({ method: "POST", url: "/api/v1/test/delegate" });
  assert.equal(notRouted.statusCode, 404);

  assert.doesNotThrow(() => {
    registerAuthVerifier("bearer", verifier);
  });
  assert.doesNotThrow(() => {
    defineRoute(server, {
      method: "GET",
      url: "/api/v1/test/self",
      auth: { kind: "bearer", audience: "ursitoare-mcp" },
      action: "read_self",
      schema: {},
      errors: [],
      handler: async () => ({ ok: true }),
    });
  });

  expectDefinitionError(
    () => {
      registerAuthVerifier("bearer", verifier);
    },
    "ROUTE_DUPLICATE",
    {},
  );
  expectDefinitionError(
    () => {
      registerAuthVerifier("session", verifier);
    },
    "ROUTE_DUPLICATE",
    {},
  );

  await server.close();
});

test("C-b74fec9d a non-public route needs a known action", async () => {
  const server = await testServer();
  const base = {
    method: "GET" as const,
    auth: { kind: "session" as const },
    schema: {},
    errors: [] as readonly string[],
    handler: async () => ({ ok: true }),
  };

  expectDefinitionError(
    () => {
      defineRoute(server, { ...base, url: "/api/v1/test/no-action" });
    },
    "ROUTE_ACTION_MISSING",
    {},
  );
  expectDefinitionError(
    () => {
      defineRoute(server, {
        ...base,
        url: "/api/v1/test/unknown",
        action: "delete_everything" as ActionName,
      });
    },
    "ROUTE_ACTION_UNKNOWN",
    {},
  );
  expectDefinitionError(
    () => {
      defineRoute(server, {
        ...base,
        url: "/api/v1/test/inherited",
        action: "constructor" as unknown as ActionName,
      });
    },
    "ROUTE_ACTION_UNKNOWN",
    {},
  );
  assert.doesNotThrow(() => {
    defineRoute(server, {
      ...base,
      url: "/api/v1/test/self",
      action: "read_self",
    });
  });

  assert.deepEqual(
    listDefinedRoutes(server).map((route) => route.url),
    ["/api/v1/test/self"],
  );

  await server.close();
});

test("C-1788d011 bad definitions are refused with their reason", async () => {
  const server = await testServer();

  expectDefinitionError(
    () => {
      defineRoute(server, routeDef({ method: "TRACE" }));
    },
    "ROUTE_DEF_INVALID",
    { reason: "method" },
  );
  expectDefinitionError(
    () => {
      defineRoute(server, routeDef({ url: "/x?y=1" }));
    },
    "ROUTE_DEF_INVALID",
    { reason: "url" },
  );
  expectDefinitionError(
    () => {
      defineRoute(server, routeDef({ url: "x" }));
    },
    "ROUTE_DEF_INVALID",
    { reason: "url" },
  );
  expectDefinitionError(
    () => {
      defineRoute(server, routeDef({ errors: ["not_upper"] }));
    },
    "ROUTE_DEF_INVALID",
    { reason: "errors" },
  );
  expectDefinitionError(
    () => {
      defineRoute(server, routeDef({ action: "read_self" }));
    },
    "ROUTE_DEF_INVALID",
    { reason: "public_options" },
  );
  expectDefinitionError(
    () => {
      defineRoute(
        server,
        routeDef({
          auth: { kind: "session" },
          url: "/api/v1/test/resource-without-action",
          resource: async () => null,
        }),
      );
    },
    "ROUTE_DEF_INVALID",
    { reason: "resource_without_action" },
  );
  expectDefinitionError(
    () => {
      defineRoute(
        server,
        routeDef({
          auth: { kind: "session" },
          action: "read_self",
          url: "/api/v1/test/bad-filter",
          listFilter: { kind: "other" } as unknown as ListFilter,
        }),
      );
    },
    "ROUTE_DEF_INVALID",
    { reason: "list_filter" },
  );
  expectDefinitionError(
    () => {
      defineRoute(
        server,
        routeDef({
          auth: { kind: "bearer", audience: "" },
          action: "read_self",
          url: "/api/v1/test/bad-auth",
        }),
      );
    },
    "ROUTE_DEF_INVALID",
    { reason: "auth" },
  );

  assert.deepEqual(listDefinedRoutes(server), []);
  for (const url of ["/x", "/api/v1/test/route", "/api/v1/test/resource-without-action"]) {
    const response = await server.inject({ method: "GET", url });
    assert.equal(response.statusCode, 404);
  }

  await server.close();
});

test("C-3f4fc0c0 duplicates and listeners are refused", async () => {
  const server = await testServer();
  const ping: RouteDef = {
    method: "GET",
    url: "/ping",
    auth: { kind: "public", reason: "well_known" },
    schema: {},
    errors: [],
    handler: async () => ({ ok: true }),
  };

  assert.doesNotThrow(() => {
    defineRoute(server, ping);
  });
  expectDefinitionError(
    () => {
      defineRoute(server, ping);
    },
    "ROUTE_DUPLICATE",
    { route: "GET /ping" },
  );
  expectDefinitionError(
    () => {
      defineRoute(server, {
        method: "POST",
        url: "/v1/internal/test",
        auth: { kind: "service_token" },
        action: "read_self",
        schema: {},
        errors: [],
        handler: async () => ({ ok: true }),
      });
    },
    "ROUTE_LISTENER_MISMATCH",
    { listener: "public" },
  );

  await server.close();
});
