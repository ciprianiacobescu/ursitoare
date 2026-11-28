import assert from "node:assert/strict";
import { test } from "node:test";

import { Secret } from "../../config/index.ts";
import type { Clock } from "../../core/index.ts";
import { createOidcClient, discoveryUrl, serverSideUrl } from "./client.ts";
import { OidcError } from "./errors.ts";

const ISS = "http://localhost:8180/realms/ursitoare";
const B = "http://keycloak:8080";
const SUFFIX = "/.well-known/openid-configuration";
const T = "/realms/ursitoare/protocol/openid-connect/token";
const NOW = new Date("2026-10-25T12:00:00Z");

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

function sync<T>(fn: () => T): { ok: true; value: T } | { ok: false; error: unknown } {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    return { ok: false, error };
  }
}

test("C-ad6ca6fb discoveryUrl and serverSideUrl follow the rule", async () => {
  await assert.doesNotReject(async () => {
    assert.equal(typeof discoveryUrl, "function");
    assert.equal(typeof serverSideUrl, "function");
    assert.equal(typeof createOidcClient, "function");

    // D rows
    assert.equal(discoveryUrl("https://idp.example/realms/r", null), "https://idp.example/realms/r" + SUFFIX);
    assert.equal(discoveryUrl("https://idp.example/r/", null), "https://idp.example/r//" + ".well-known/openid-configuration");
    assert.equal(discoveryUrl("nope", null), "nope" + SUFFIX);
    assert.equal(discoveryUrl(ISS, B), "http://keycloak:8080/realms/ursitoare/.well-known/openid-configuration");
    assert.equal(discoveryUrl(ISS + "/", B), "http://keycloak:8080/realms/ursitoare/.well-known/openid-configuration");
    assert.equal(discoveryUrl("https://idp.example", B), "http://keycloak:8080/.well-known/openid-configuration");
    assert.equal(discoveryUrl(ISS, B + "/"), "http://keycloak:8080/realms/ursitoare/.well-known/openid-configuration");

    const d8 = sync(() => discoveryUrl("nope", B));
    assert.equal(d8.ok, false);
    const d8err = (d8 as { ok: false; error: unknown }).error;
    assert.ok(d8err instanceof OidcError);
    assert.equal((d8err as OidcError).code, "OIDC_PROVIDER_UNAVAILABLE");
    assert.deepEqual((d8err as OidcError).details, { reason: "issuer" });

    // S rows
    assert.equal(serverSideUrl("http://localhost:8180" + T, ISS, null), "http://localhost:8180" + T);
    assert.equal(serverSideUrl("http://localhost:8180/t?x=1#f", ISS, null), "http://localhost:8180/t?x=1#f");
    assert.equal(serverSideUrl("http://keycloak:8080/t", ISS, null), null);
    assert.equal(serverSideUrl("ftp://localhost:8180/t", ISS, null), null);
    assert.equal(serverSideUrl("nope", ISS, null), null);
    assert.equal(serverSideUrl(B + T, ISS, B), B + T);
    assert.equal(serverSideUrl("http://localhost:8180" + T + "?a=1#f", ISS, B), "http://keycloak:8080" + T + "?a=1#f");
    assert.equal(serverSideUrl("http://localhost:8180" + T, ISS, B + "/"), "http://keycloak:8080" + T);
    assert.equal(serverSideUrl("https://evil.example/token", ISS, B), null);
    assert.equal(serverSideUrl("http://localhost:8181/t", ISS, B), null);
    assert.equal(serverSideUrl("http://keycloak:8081/t", ISS, B), null);
    assert.equal(serverSideUrl("ftp://keycloak:8080/t", ISS, B), null);
    assert.equal(serverSideUrl("nope", ISS, B), null);

    // E1
    const mod = (await import("../index.ts")) as Record<string, unknown>;
    assert.equal(mod["discoveryUrl"], discoveryUrl);
    assert.equal(mod["serverSideUrl"], serverSideUrl);
  });
});

test("C-2f15db84 Without a back-channel nothing changes", async () => {
  await assert.doesNotReject(async () => {
    assert.equal(discoveryUrl(ISS, null), ISS + SUFFIX);

    const clock: Clock = { now: () => new Date(NOW.getTime()) };
    const doc = {
      issuer: ISS,
      authorization_endpoint: ISS + "/protocol/openid-connect/auth",
      token_endpoint: ISS + "/protocol/openid-connect/token",
      jwks_uri: ISS + "/protocol/openid-connect/certs",
    };

    const calls: FetchCall[] = [];
    const fetch = recordingFetch(() => json(doc), calls);
    const client = createOidcClient({
      config: { issuer: ISS, clientId: "ursitoare-engine", clientSecret: new Secret("client-secret") },
      clock,
      fetch,
    });
    const settled = await settle(client.discovery());
    assert.ok(settled.ok, "discovery succeeds");
    assert.deepEqual(settled.ok ? settled.value : null, {
      authorizeUrl: ISS + "/protocol/openid-connect/auth",
      tokenUrl: ISS + "/protocol/openid-connect/token",
      jwksUrl: ISS + "/protocol/openid-connect/certs",
      logoutUrl: null,
    });
    assert.equal(calls.length, 1);
    const firstCall = calls[0] as FetchCall;
    assert.equal(firstCall.url, ISS + SUFFIX);
    assert.equal(firstCall.init?.redirect, "error");
    assert.ok(firstCall.init?.signal instanceof AbortSignal);

    // N2
    const doc2 = { ...doc, token_endpoint: "http://keycloak:8080/t" };
    const calls2: FetchCall[] = [];
    const fetch2 = recordingFetch(() => json(doc2), calls2);
    const client2 = createOidcClient({
      config: { issuer: ISS, clientId: "ursitoare-engine", clientSecret: new Secret("client-secret") },
      clock,
      fetch: fetch2,
    });
    const settled2 = await settle(client2.discovery());
    assert.equal(settled2.ok, false);
    const err = settled2.ok ? null : (settled2 as { ok: false; error: unknown }).error;
    assert.ok(err instanceof OidcError);
    assert.equal(err.code, "OIDC_PROVIDER_UNAVAILABLE");
    assert.deepEqual(err.details, { reason: "origin" });
  });
});
