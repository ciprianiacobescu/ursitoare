import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { buildServer } from "../../api/index.ts";
import type { ServerDeps } from "../../api/index.ts";
import { Secret } from "../../config/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import type { Clock } from "../../core/index.ts";
import { createLogger, noopTracer } from "../../observability/index.ts";
import type { TenantPool } from "../../tenancy/index.ts";
import { startFakeOidc } from "../../../test/support/fake-oidc/index.ts";
import type { FakeOidc } from "../../../test/support/fake-oidc/index.ts";
import { freePort } from "../../../test/support/pg.ts";
import { registerOidcRoutes } from "../index.ts";
import type { OidcRoutesDeps } from "../index.ts";

const NOW = "2026-10-25T12:00:00.000Z";
const PUBLIC_BASE_URL = "http://127.0.0.1:8080";
const CALLBACK_URL = "http://127.0.0.1:8080/auth/oidc/callback";
const HTTPS_BASE_URL = "https://app.example";
const ENGINE_KEY = "k".repeat(64);

interface InjectedResponse {
  statusCode: number;
  body: string;
  headers: Record<string, unknown>;
}

interface InjectOptions {
  method?: string;
  url: string;
  headers?: Record<string, string>;
}

function serverDeps(): ServerDeps {
  return {
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent" }),
    tracer: noopTracer,
  };
}

function unusedPool(): TenantPool {
  return {
    connect: (): never => {
      throw new Error("the pool must not be used at login");
    },
  } as unknown as TenantPool;
}

function oidcConfig(issuer: string): {
  issuer: string;
  clientId: string;
  clientSecret: Secret;
} {
  return { issuer, clientId: "ursitoare-engine", clientSecret: new Secret("client-secret") };
}

interface RouteOptions {
  publicBaseUrl?: string;
  pool?: TenantPool | null;
  engineKey?: { reveal(): string } | null;
  clock?: Clock;
}

function routeDeps(issuer: string, options: RouteOptions = {}): OidcRoutesDeps {
  return {
    config: oidcConfig(issuer),
    publicBaseUrl: options.publicBaseUrl ?? PUBLIC_BASE_URL,
    pool: options.pool === undefined ? unusedPool() : options.pool,
    engineKey: options.engineKey === undefined ? { reveal: () => ENGINE_KEY } : options.engineKey,
    clock: options.clock ?? fixedClock(NOW),
  };
}

async function registeredServer(
  deps: OidcRoutesDeps,
  message = "registerOidcRoutes registers the routes",
): Promise<FastifyInstance> {
  const server = await buildServer(serverDeps());
  try {
    assert.doesNotThrow(() => {
      registerOidcRoutes(server, deps);
    }, message);
    return server;
  } catch (error) {
    await server.close();
    throw error;
  }
}

async function inject(
  server: FastifyInstance,
  options: InjectOptions,
): Promise<InjectedResponse> {
  let response: InjectedResponse | undefined;
  await assert.doesNotReject(async () => {
    response = await server.inject(options);
  }, "server.inject must not reject");
  assert.ok(response !== undefined, "server.inject returns a response");
  return response;
}

function jsonBody(response: InjectedResponse): Record<string, unknown> {
  const parsed = JSON.parse(response.body) as unknown;
  assert.ok(typeof parsed === "object" && parsed !== null, "the body is a JSON object");
  return parsed as Record<string, unknown>;
}

function header(response: InjectedResponse, name: string): string {
  const value = response.headers[name];
  assert.equal(typeof value, "string", `the response has a ${name} header`);
  return value as string;
}

function setCookies(response: InjectedResponse): string[] {
  const value = response.headers["set-cookie"];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
  return [];
}

function authorizationParams(response: InjectedResponse, fake: FakeOidc): URLSearchParams {
  assert.equal(response.statusCode, 302);
  assert.equal(header(response, "cache-control"), "no-store");
  const location = new URL(header(response, "location"));
  assert.equal(location.origin, fake.issuer);
  assert.equal(location.pathname, "/protocol/openid-connect/auth");
  return location.searchParams;
}

function loginCookieValue(cookies: readonly string[]): string {
  assert.equal(cookies.length, 1, "the login answer sets exactly one cookie");
  const cookie = cookies[0] as string;
  const match = /^ursitoare_login=([A-Za-z0-9_-]+); Path=\/auth\/oidc; Max-Age=600; HttpOnly; SameSite=Lax(; Secure)?$/.exec(
    cookie,
  );
  assert.ok(match !== null, "the login cookie has the expected shape");
  return match?.[1] as string;
}

test("C-63967930 Authorization request", async () => {
  const fake = await startFakeOidc();
  try {
    fake.registerRedirect(CALLBACK_URL);
    fake.registerRedirect("https://app.example/auth/oidc/callback");

    const server = await registeredServer(routeDeps(fake.issuer));
    try {
      const first = await inject(server, { method: "GET", url: "/auth/oidc/login?return_to=/flows/1" });
      const second = await inject(server, {
        method: "GET",
        url: "/auth/oidc/login?return_to=/flows/1",
      });

      const firstParams = authorizationParams(first, fake);
      const secondParams = authorizationParams(second, fake);

      for (const params of [firstParams, secondParams]) {
        assert.equal(params.get("response_type"), "code");
        assert.equal(params.get("client_id"), "ursitoare-engine");
        assert.equal(params.get("redirect_uri"), CALLBACK_URL);
        assert.equal(params.get("scope"), "openid profile email organization");
        assert.equal(params.get("code_challenge_method"), "S256");
        assert.equal(params.get("state")?.length, 43);
        assert.equal(params.get("nonce")?.length, 43);
        assert.equal(params.get("code_challenge")?.length, 43);
      }

      assert.notEqual(firstParams.get("state"), secondParams.get("state"));
      assert.notEqual(firstParams.get("nonce"), secondParams.get("nonce"));

      const firstValue = loginCookieValue(setCookies(first));
      const secondValue = loginCookieValue(setCookies(second));
      assert.equal(firstValue.includes(firstParams.get("state") as string), false);
      assert.equal(firstValue.includes(firstParams.get("nonce") as string), false);
      assert.equal(secondValue.includes(secondParams.get("state") as string), false);
      assert.equal(secondValue.includes(secondParams.get("nonce") as string), false);
      assert.equal(setCookies(first)[0]?.includes("; Secure"), false);
    } finally {
      await server.close();
    }

    const httpsServer = await registeredServer(
      routeDeps(fake.issuer, { publicBaseUrl: HTTPS_BASE_URL }),
    );
    try {
      const https = await inject(httpsServer, {
        method: "GET",
        url: "/auth/oidc/login?return_to=/flows/1",
      });
      const params = authorizationParams(https, fake);
      assert.equal(params.get("redirect_uri"), "https://app.example/auth/oidc/callback");
      assert.equal(params.get("state")?.length, 43);
      assert.equal(params.get("nonce")?.length, 43);
      assert.equal(params.get("code_challenge")?.length, 43);
      loginCookieValue(setCookies(https));
      assert.equal(setCookies(https)[0]?.endsWith("; Secure"), true);
    } finally {
      await httpsServer.close();
    }
  } finally {
    await fake.close();
  }
});

test("C-6207c094 Provider down at login", async () => {
  const port = await freePort();
  const server = await registeredServer(routeDeps(`http://127.0.0.1:${port}`));
  try {
    const response = await inject(server, { method: "GET", url: "/auth/oidc/login" });

    assert.equal(response.statusCode, 302);
    assert.equal(header(response, "location"), "/sign-in?error=OIDC_PROVIDER_UNAVAILABLE");
    assert.deepEqual(setCookies(response), []);
  } finally {
    await server.close();
  }
});

test("C-449f1e02 No issuer", async () => {
  assert.equal(typeof registerOidcRoutes, "function");

  const server = await buildServer(serverDeps());
  try {
    assert.doesNotThrow(() => {
      registerOidcRoutes(server, {
        config: null,
        publicBaseUrl: PUBLIC_BASE_URL,
        pool: null,
        engineKey: null,
        clock: fixedClock(NOW),
      });
    }, "registerOidcRoutes registers the unavailable routes without a config");

    const health = await inject(server, { method: "GET", url: "/health" });
    assert.equal(health.statusCode, 200);
    assert.equal(jsonBody(health)["status"], "ok");

    const routes: readonly InjectOptions[] = [
      { method: "GET", url: "/auth/oidc/login" },
      { method: "GET", url: "/auth/oidc/callback" },
      { method: "POST", url: "/auth/oidc/logout" },
    ];
    for (const route of routes) {
      const response = await inject(server, route);
      assert.equal(response.statusCode, 503);
      assert.deepEqual(jsonBody(response), {
        error: { code: "OIDC_NOT_CONFIGURED", message: "Sign-in is not configured" },
      });
    }
  } finally {
    await server.close();
  }
});

test("C-3e029f2d A half-wired engine is refused", async () => {
  const clock = fixedClock(NOW);

  const withoutPool = await buildServer(serverDeps());
  try {
    assert.throws(
      () => {
        registerOidcRoutes(withoutPool, routeDeps("https://idp.example", { pool: null, clock }));
      },
      { name: "OidcError", code: "OIDC_NOT_CONFIGURED" },
    );
  } finally {
    await withoutPool.close();
  }

  const withoutEngineKey = await buildServer(serverDeps());
  try {
    assert.throws(
      () => {
        registerOidcRoutes(
          withoutEngineKey,
          routeDeps("https://idp.example", { engineKey: null, clock }),
        );
      },
      { name: "OidcError", code: "OIDC_NOT_CONFIGURED" },
    );
  } finally {
    await withoutEngineKey.close();
  }
});
