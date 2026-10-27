import assert from "node:assert/strict";
import http from "node:http";
import { createConnection } from "node:net";
import { after, test } from "node:test";

import { decodeJwt, verifyRs256 } from "./jwt.ts";
import type { Jwk } from "./keys.ts";
import { startFakeOidc } from "./server.ts";
import { FakeOidcError } from "./types.ts";
import type { FakeOidc } from "./types.ts";

const NOW = new Date("2026-10-25T12:00:00Z");
const DISCOVERY = "/realms/ursitoare/.well-known/openid-configuration";
const PROTOCOL = "/realms/ursitoare/protocol/openid-connect";

type StartOptions = {
  port?: number;
  host?: string;
  now?: () => Date;
  redirectUri?: string;
};

const fakes: FakeOidc[] = [];

async function startFake(opts: StartOptions = {}): Promise<FakeOidc> {
  const fake = await startFakeOidc(opts);
  fakes.push(fake);
  return fake;
}

after(async () => {
  await Promise.all(fakes.map((fake) => fake.close()));
});

interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
  socketClosed: Promise<void>;
}

function rawRequest(
  baseUrl: string,
  options: {
    method?: string;
    path: string;
    headers?: Record<string, string>;
    body?: string;
  },
): Promise<RawResponse> {
  const url = new URL(baseUrl);
  return new Promise<RawResponse>((resolve, reject) => {
    let responded = false;
    let markClosed: () => void = () => undefined;
    const socketClosed = new Promise<void>((done) => {
      markClosed = done;
    });
    const request = http.request(
      {
        hostname: url.hostname,
        port: Number(url.port),
        path: options.path,
        method: options.method ?? "GET",
        headers: options.headers ?? {},
      },
      (response) => {
        responded = true;
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body,
            socketClosed,
          });
        });
      },
    );
    request.on("socket", (socket) => {
      if (socket.destroyed) {
        markClosed();
      } else {
        socket.once("close", markClosed);
      }
    });
    request.on("error", (error) => {
      if (!responded) reject(error);
    });
    request.end(options.body ?? "");
  });
}

function headerOf(response: RawResponse, name: string): string | undefined {
  const value = response.headers[name];
  return Array.isArray(value) ? value.join(", ") : value;
}

function jsonOf(response: RawResponse): unknown {
  return JSON.parse(response.body) as unknown;
}

function socketClosedWithin(closed: Promise<void>, ms: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), ms);
    timer.unref();
    void closed.then(() => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

function connectionRefused(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 2000);
    timer.unref();
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

async function assertFakeOidcError(promise: Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof FakeOidcError);
    assert.equal(error.code, code);
    return true;
  });
}

function assertThrowsFakeOidcError(call: () => unknown, code: string): void {
  assert.throws(call, (error: unknown) => {
    assert.ok(error instanceof FakeOidcError);
    assert.equal(error.code, code);
    return true;
  });
}

async function jwksOf(fake: FakeOidc): Promise<Jwk[]> {
  const response = await fetch(`${fake.url}${PROTOCOL}/certs`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as { keys: Jwk[] };
  return body.keys;
}

function includesString(value: unknown, needle: string): boolean {
  return Array.isArray(value) && value.includes(needle);
}

test("C-0aaa91d6 default start binds loopback and serves realm discovery", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake();
    assert.match(fake.url, /^http:\/\/127\.0\.0\.1:\d+$/);
    assert.equal(fake.issuer, `${fake.url}/realms/ursitoare`);

    const response = await fetch(`${fake.issuer}/.well-known/openid-configuration`);
    assert.equal(response.status, 200);
    const body = (await response.json()) as { issuer?: unknown };
    assert.equal(body.issuer, fake.issuer);
  });
});

test("C-2df38924 bad options reject with FAKE_OIDC_START_FAILED and leave no listener", async () => {
  await assertFakeOidcError(startFakeOidc({ host: "0.0.0.0" }), "FAKE_OIDC_START_FAILED");
  await assertFakeOidcError(startFakeOidc({ host: "192.168.1.5" }), "FAKE_OIDC_START_FAILED");
  await assertFakeOidcError(startFakeOidc({ port: 70000 }), "FAKE_OIDC_START_FAILED");
  await assertFakeOidcError(startFakeOidc({ now: 5 } as never), "FAKE_OIDC_START_FAILED");
  await assertFakeOidcError(
    startFakeOidc({ redirectUri: "javascript:x" } as never),
    "FAKE_OIDC_START_FAILED",
  );

  const running = await startFake({ now: () => NOW });
  const port = Number(new URL(running.url).port);
  await assertFakeOidcError(startFakeOidc({ port }), "FAKE_OIDC_START_FAILED");

  const stillUp = await fetch(`${running.issuer}/.well-known/openid-configuration`);
  assert.equal(stillUp.status, 200);
  await stillUp.text();

  await running.close();
  const rebound = await startFake({ port, now: () => NOW });
  assert.equal(Number(new URL(rebound.url).port), port);
});

test("C-65cedd86 foreign Host unknown path and wrong method are refused", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake({ now: () => NOW });
    const port = new URL(fake.url).port;

    const foreign = await rawRequest(fake.url, {
      path: DISCOVERY,
      headers: { host: `evil.example:${port}` },
    });
    assert.equal(foreign.status, 400);
    assert.deepEqual(jsonOf(foreign), { error: "invalid_request" });

    const missing = await rawRequest(fake.url, { path: "/nope" });
    assert.equal(missing.status, 404);
    assert.deepEqual(jsonOf(missing), { error: "not_found" });

    const wrongMethod = await rawRequest(fake.url, { method: "POST", path: DISCOVERY });
    assert.equal(wrongMethod.status, 405);
    assert.equal(headerOf(wrongMethod, "allow"), "GET");
  });
});

test("C-69ae792e oversized bodies answer 413 and close while exactly 65536 bytes is allowed", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake({ now: () => NOW });
    const form = { "content-type": "application/x-www-form-urlencoded" };
    const oversized = "a".repeat(65537);

    const token = await rawRequest(fake.url, {
      method: "POST",
      path: `${PROTOCOL}/token`,
      headers: form,
      body: oversized,
    });
    assert.equal(token.status, 413);
    assert.deepEqual(jsonOf(token), { error: "invalid_request" });
    assert.equal(await socketClosedWithin(token.socketClosed, 2000), true);

    const authorize = await rawRequest(fake.url, {
      method: "POST",
      path: `${PROTOCOL}/auth`,
      headers: form,
      body: oversized,
    });
    assert.equal(authorize.status, 413);
    assert.deepEqual(jsonOf(authorize), { error: "invalid_request" });
    assert.equal(await socketClosedWithin(authorize.socketClosed, 2000), true);

    const boundary = `x=${"a".repeat(65536 - 2)}`;
    assert.equal(boundary.length, 65536);
    const withinLimit = await rawRequest(fake.url, {
      method: "POST",
      path: "/nope",
      headers: form,
      body: boundary,
    });
    assert.equal(withinLimit.status, 404);
    assert.deepEqual(jsonOf(withinLimit), { error: "not_found" });
  });
});

test("C-1d9cc129 redirect registration validates the URI and the client", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake({ now: () => NOW });

    for (const uri of [
      "javascript:x",
      "ftp://127.0.0.1:9/cb",
      "http://u:p@127.0.0.1:9/cb",
      "http://127.0.0.1:9/cb#f",
    ]) {
      assertThrowsFakeOidcError(() => fake.registerRedirect(uri), "FAKE_OIDC_BAD_REDIRECT");
    }

    assertThrowsFakeOidcError(
      () => fake.registerRedirect("http://127.0.0.1:9/cb", { clientId: "nope" }),
      "FAKE_OIDC_UNKNOWN_CLIENT",
    );
    assertThrowsFakeOidcError(
      () =>
        fake.registerRedirect("http://127.0.0.1:9/bye", {
          clientId: "nope",
          postLogout: true,
        }),
      "FAKE_OIDC_UNKNOWN_CLIENT",
    );

    assert.doesNotThrow(() => {
      fake.registerRedirect("http://127.0.0.1:9/bye", {
        clientId: "ursitoare-mcp",
        postLogout: true,
      });
    });
  });
});

test("C-7f218491 close is idempotent and complete while each fake has its own port and kid", async () => {
  await assert.doesNotReject(async () => {
    const first = await startFake({ now: () => NOW });
    const second = await startFake({ now: () => NOW });
    const firstPort = Number(new URL(first.url).port);
    const secondPort = Number(new URL(second.url).port);
    assert.notEqual(firstPort, secondPort);

    const firstKey = (await jwksOf(first))[0];
    const secondKey = (await jwksOf(second))[0];
    assert.ok(firstKey !== undefined);
    assert.ok(secondKey !== undefined);
    assert.notEqual(firstKey.kid, secondKey.kid);

    const keepAlive = await rawRequest(first.url, { path: DISCOVERY });
    assert.equal(keepAlive.status, 200);

    await first.close();
    await first.close();
    assert.equal(await connectionRefused(firstPort), true);
  });
});

test("C-852e549c discovery mirrors the Keycloak realm paths and capabilities", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake({ now: () => NOW });
    const response = await fetch(`${fake.issuer}/.well-known/openid-configuration`);
    assert.equal(response.status, 200);
    const body = (await response.json()) as Record<string, unknown>;
    const base = `${fake.issuer}/protocol/openid-connect`;

    assert.equal(body["issuer"], fake.issuer);
    assert.equal(body["authorization_endpoint"], `${base}/auth`);
    assert.equal(body["token_endpoint"], `${base}/token`);
    assert.equal(body["userinfo_endpoint"], `${base}/userinfo`);
    assert.equal(body["end_session_endpoint"], `${base}/logout`);
    assert.equal(body["jwks_uri"], `${base}/certs`);
    assert.deepEqual(body["grant_types_supported"], ["authorization_code"]);
    assert.deepEqual(body["id_token_signing_alg_values_supported"], ["RS256"]);
    assert.deepEqual(body["code_challenge_methods_supported"], ["S256"]);
    assert.equal(
      includesString(body["token_endpoint_auth_methods_supported"], "client_secret_basic"),
      true,
    );
    assert.equal(includesString(body["scopes_supported"], "openid"), true);
    assert.equal(includesString(body["scopes_supported"], "organization"), true);
  });
});

test("C-a715e6d5 the JWKS holds one RS256 key that verifies a minted token and is not cached", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake({ now: () => NOW });

    const discovery = await fetch(`${fake.issuer}/.well-known/openid-configuration`);
    assert.equal(discovery.headers.get("cache-control"), "no-store");
    await discovery.text();

    const certs = await fetch(`${fake.url}${PROTOCOL}/certs`);
    assert.equal(certs.status, 200);
    assert.equal(certs.headers.get("cache-control"), "no-store");
    const body = (await certs.json()) as { keys: Jwk[] };
    assert.equal(body.keys.length, 1);
    const key = body.keys[0];
    assert.ok(key !== undefined);
    assert.equal(key.kty, "RSA");
    assert.equal(key.use, "sig");
    assert.equal(key.alg, "RS256");
    assert.ok(key.kid.length > 0);
    assert.ok(key.n.length > 0);
    assert.ok(key.e.length > 0);

    const token = fake.mintToken({});
    assert.equal(decodeJwt(token).header["kid"], key.kid);
    assert.equal(verifyRs256(token, key), true);
  });
});

test("C-5938a11f rotation keeps old tokens valid and publishes both keys", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake({ now: () => NOW });
    const firstToken = fake.mintToken({});
    fake.rotateSigningKey();
    const secondToken = fake.mintToken({});

    const keys = await jwksOf(fake);
    assert.equal(keys.length, 2);

    const firstKid = decodeJwt(firstToken).header["kid"];
    const secondKid = decodeJwt(secondToken).header["kid"];
    assert.notEqual(firstKid, secondKid);

    const firstKey = keys.find((key) => key.kid === firstKid);
    const secondKey = keys.find((key) => key.kid === secondKid);
    assert.ok(firstKey !== undefined);
    assert.ok(secondKey !== undefined);
    assert.equal(verifyRs256(firstToken, firstKey), true);
    assert.equal(verifyRs256(secondToken, secondKey), true);
  });
});

test("C-271f3bbf mintToken defaults to a valid alice id token for the engine client", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake({ now: () => NOW });
    const token = fake.mintToken({ nonce: "n-2" });
    const decoded = decodeJwt(token);

    assert.equal(decoded.payload["preferred_username"], "alice");
    assert.equal(decoded.payload["azp"], "ursitoare-engine");
    assert.equal(decoded.payload["aud"], "ursitoare-engine");
    assert.equal(decoded.payload["typ"], "ID");
    assert.equal(decoded.payload["nonce"], "n-2");

    const keys = await jwksOf(fake);
    const key = keys.find((candidate) => candidate.kid === decoded.header["kid"]);
    assert.ok(key !== undefined);
    assert.equal(verifyRs256(token, key), true);
  });
});

test("C-a723b427 passwords and client secrets differ per start and are long", async () => {
  await assert.doesNotReject(async () => {
    const first = await startFake({ now: () => NOW });
    const second = await startFake({ now: () => NOW });

    const aliceFirst = first.passwordOf("alice");
    const aliceSecond = second.passwordOf("alice");
    assert.notEqual(aliceFirst, aliceSecond);
    assert.ok(aliceFirst.length >= 24);
    assert.ok(aliceSecond.length >= 24);

    const secretFirst = first.clientSecret("ursitoare-engine");
    const secretSecond = second.clientSecret("ursitoare-engine");
    assert.notEqual(secretFirst, secretSecond);
    assert.ok(secretFirst.length >= 24);
    assert.ok(secretSecond.length >= 24);

    assertThrowsFakeOidcError(() => first.passwordOf("eve"), "FAKE_OIDC_UNKNOWN_USER");
  });
});

test("C-ccee87e5 a fresh fake has an empty request log and records the first request", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake({ now: () => NOW });
    assert.deepEqual(fake.requests(), []);

    const response = await fetch(`${fake.issuer}/.well-known/openid-configuration`);
    await response.text();

    const log = fake.requests();
    assert.equal(log.length, 1);
    assert.equal(log[0]?.path, DISCOVERY);
    assert.equal(log[0]?.method, "GET");
  });
});

test("C-67d66ecd the request log keeps the newest 5000 entries and drops the oldest", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake({ now: () => NOW });

    const first = await fetch(`${fake.url}/first`);
    await first.text();
    assert.equal(first.status, 404);

    for (let batch = 0; batch < 50; batch += 1) {
      await Promise.all(
        Array.from({ length: 100 }, async () => {
          const response = await fetch(`${fake.issuer}/.well-known/openid-configuration`);
          await response.arrayBuffer();
        }),
      );
    }

    const log = fake.requests();
    assert.equal(log.length, 5000);
    assert.equal(
      log.some((entry) => entry.path === "/first"),
      false,
    );
    assert.equal(
      log.every((entry) => entry.path === DISCOVERY),
      true,
    );
  });
});
