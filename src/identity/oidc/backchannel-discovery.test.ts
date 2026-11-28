import assert from "node:assert/strict";
import { test } from "node:test";


import { buildServer } from "../../api/index.ts";
import type { ServerDeps } from "../../api/index.ts";
import { Secret } from "../../config/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import type { Clock } from "../../core/index.ts";
import { createLogger, noopTracer } from "../../observability/index.ts";
import type { TenantPool } from "../../tenancy/index.ts";
import { registerOidcRoutes } from "../index.ts";
import { createOidcClient } from "./client.ts";
import { OidcError } from "./errors.ts";

const ISS = "http://localhost:8180/realms/ursitoare";
const B = "http://keycloak:8080";
const P = "/realms/ursitoare/protocol/openid-connect";
const B_DISCOVERY = B + "/realms/ursitoare/.well-known/openid-configuration";

const D1 = {
  issuer: ISS,
  authorization_endpoint: ISS + "/protocol/openid-connect/auth",
  token_endpoint: ISS + "/protocol/openid-connect/token",
  jwks_uri: ISS + "/protocol/openid-connect/certs",
  end_session_endpoint: ISS + "/protocol/openid-connect/logout",
};

type FetchCall = Readonly<{ url: string; init: RequestInit | undefined }>;

function recordingFetch(
  handler: (url: string, init: RequestInit | undefined) => Response | Promise<Response>,
  calls: FetchCall[],
): typeof fetch {
  return async (input, init) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, init });
    return handler(url, init);
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function settle<T>(p: Promise<T>): Promise<
  | { ok: true; value: T }
  | { ok: false; error: unknown }
> {
  try {
    return { ok: true, value: await p };
  } catch (error) {
    return { ok: false, error };
  }
}

function config(issuer: string, backchannelUrl?: string): {
  issuer: string;
  clientId: string;
  clientSecret: Secret;
  backchannelUrl?: string;
} {
  return {
    issuer,
    clientId: "ursitoare-engine",
    clientSecret: new Secret("client-secret"),
    ...(backchannelUrl === undefined ? {} : { backchannelUrl }),
  };
}

function guarded(calls: readonly FetchCall[]): void {
  assert.ok(calls.length > 0, "the client made a request");
  for (const call of calls) {
    assert.equal(call.init?.redirect, "error", "the request refuses redirects");
    assert.ok(call.init?.signal instanceof AbortSignal, "the request carries a signal");
  }
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
      throw new Error("the pool must not be used");
    },
  } as unknown as TenantPool;
}

test("C-b6e51fd5 Discovery is requested at the back-channel origin", async () => {
  await assert.doesNotReject(async () => {
    assert.equal(typeof createOidcClient, "function");
    const clock: Clock = { now: () => new Date("2026-10-25T12:00:00Z") };

    // R1
    {
      const calls: FetchCall[] = [];
      const fetch = recordingFetch(() => json(D1), calls);
      const client = createOidcClient({ config: config(ISS, B), clock, fetch });
      const settled = await settle(client.discovery());
      assert.ok(settled.ok, "R1 discovery succeeds");
      const value = settled.ok ? settled.value : null;
      assert.equal(value?.authorizeUrl, ISS + "/protocol/openid-connect/auth");
      assert.equal(value?.logoutUrl, ISS + "/protocol/openid-connect/logout");
      assert.equal(calls.length, 1);
      assert.equal(calls[0]?.url, B_DISCOVERY);
      assert.equal(calls[0]?.init?.method, "GET");
      guarded(calls);
    }

    const refusalCases: Array<{
      doc: unknown;
      details: Record<string, unknown>;
    }> = [
      { doc: { ...D1, authorization_endpoint: B + P + "/auth" }, details: { reason: "origin" } },
      { doc: { ...D1, end_session_endpoint: B + P + "/logout" }, details: { reason: "origin" } },
      { doc: { ...D1, authorization_endpoint: "https://evil.example/auth" }, details: { reason: "origin" } },
      { doc: { ...D1, end_session_endpoint: "https://evil.example/logout" }, details: { reason: "origin" } },
      { doc: { ...D1, issuer: "http://keycloak:8080/realms/ursitoare" }, details: { reason: "issuer" } },
      { doc: { ...D1, authorization_endpoint: 5 }, details: { reason: "endpoint" } },
    ];

    for (const { doc, details } of refusalCases) {
      const calls: FetchCall[] = [];
      const fetch = recordingFetch(() => json(doc), calls);
      const client = createOidcClient({ config: config(ISS, B), clock, fetch });
      const settled = await settle(client.discovery());
      assert.equal(settled.ok, false, "refusal rejects");
      const err = settled.ok ? null : (settled as { ok: false; error: unknown }).error;
      assert.ok(err instanceof OidcError);
      assert.equal((err as OidcError).code, "OIDC_PROVIDER_UNAVAILABLE");
      assert.equal((err as OidcError).message, "The OIDC provider is unavailable");
      assert.deepEqual((err as OidcError).details, details);
      assert.equal(calls.length, 1);
      assert.equal(calls[0]?.url, B_DISCOVERY);
      guarded(calls);
    }
  });
});

test("C-8448dfd1 A discovery failure is not retried on the issuer origin", async () => {
  await assert.doesNotReject(async () => {
    const clock: Clock = { now: () => new Date("2026-10-25T12:00:00Z") };

    // F1
    {
      const calls: FetchCall[] = [];
      const fetchImpl: typeof globalThis.fetch = async (input, init) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        calls.push({ url, init });
        throw new TypeError("connect refused");
      };
      const client = createOidcClient({ config: config(ISS, B), clock, fetch: fetchImpl });
      const settled = await settle(client.discovery());
      assert.equal(settled.ok, false);
      const err = settled.ok ? null : (settled as { ok: false; error: unknown }).error;
      assert.ok(err instanceof OidcError);
      assert.equal((err as OidcError).code, "OIDC_PROVIDER_UNAVAILABLE");
      assert.deepEqual((err as OidcError).details, { reason: "network" });
      assert.equal(calls.length, 1);
      assert.equal(calls[0]?.url, B_DISCOVERY);
    }

    // F2
    {
      const calls: FetchCall[] = [];
      const fetch = recordingFetch(() => new Response("busy", { status: 503 }), calls);
      const client = createOidcClient({ config: config(ISS, B), clock, fetch });
      const settled = await settle(client.discovery());
      assert.equal(settled.ok, false);
      const err = settled.ok ? null : (settled as { ok: false; error: unknown }).error;
      assert.ok(err instanceof OidcError);
      assert.equal((err as OidcError).code, "OIDC_PROVIDER_UNAVAILABLE");
      assert.deepEqual((err as OidcError).details, { reason: "status", status: 503 });
      assert.equal(calls.length, 1);
      assert.equal(calls[0]?.url, B_DISCOVERY);
    }

    // F3
    {
      const calls: FetchCall[] = [];
      const fetch = recordingFetch(() => json({}), calls);
      const client = createOidcClient({ config: config("nope", B), clock, fetch });
      const settled = await settle(client.discovery());
      assert.equal(settled.ok, false);
      const err = settled.ok ? null : (settled as { ok: false; error: unknown }).error;
      assert.ok(err instanceof OidcError);
      assert.equal((err as OidcError).code, "OIDC_PROVIDER_UNAVAILABLE");
      assert.deepEqual((err as OidcError).details, { reason: "issuer" });
      assert.equal(calls.length, 0);
    }
  });
});

test("C-d3271182 The sign-in redirect stays on the issuer origin", async () => {
  const NOWS = "2026-10-25T12:00:00.000Z";
  // L1
  {
    const calls: FetchCall[] = [];
    const fetch = recordingFetch(() => json(D1), calls);
    const server = await buildServer(serverDeps());
    try {
      assert.doesNotThrow(() => {
        registerOidcRoutes(server, {
          config: config(ISS, B),
          publicBaseUrl: "http://127.0.0.1:8080",
          pool: unusedPool(),
          engineKey: { reveal: () => "k".repeat(64) },
          clock: fixedClock(NOWS),
          fetch,
        });
      });
      const response = await server.inject({
        method: "GET",
        url: "/auth/oidc/login?return_to=/flows",
      });
      assert.equal(response.statusCode, 302);
      const location = (response.headers["location"] as string) ?? "";
      const url = new URL(location);
      assert.equal(url.origin, "http://localhost:8180");
      assert.equal(url.pathname, "/realms/ursitoare/protocol/openid-connect/auth");
      assert.equal(url.searchParams.get("client_id"), "ursitoare-engine");
      const setCookie = response.headers["set-cookie"];
      assert.ok(setCookie !== undefined, "a set-cookie header is present");
      assert.equal(calls.length, 1);
      assert.equal(calls[0]?.url, B_DISCOVERY);
    } finally {
      await server.close();
    }
  }

  // L2
  {
    const calls: FetchCall[] = [];
    const fetchImpl: typeof globalThis.fetch = async (input, init) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      calls.push({ url, init });
      throw new TypeError("connect refused");
    };
    const server = await buildServer(serverDeps());
    try {
      assert.doesNotThrow(() => {
        registerOidcRoutes(server, {
          config: config(ISS, B),
          publicBaseUrl: "http://127.0.0.1:8080",
          pool: unusedPool(),
          engineKey: { reveal: () => "k".repeat(64) },
          clock: fixedClock(NOWS),
          fetch: fetchImpl,
        });
      });
      const response = await server.inject({
        method: "GET",
        url: "/auth/oidc/login?return_to=/flows",
      });
      assert.equal(response.statusCode, 302);
      assert.equal(response.headers["location"], "/sign-in?error=OIDC_PROVIDER_UNAVAILABLE");
      const setCookie = response.headers["set-cookie"];
      assert.equal(setCookie, undefined, "no set-cookie header");
      assert.equal(calls.length, 1);
      assert.equal(calls[0]?.url, B_DISCOVERY);
    } finally {
      await server.close();
    }
  }
});
