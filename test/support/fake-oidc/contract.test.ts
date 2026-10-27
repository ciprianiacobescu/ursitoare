import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import { oidcContract, startFakeOidc } from "./index.ts";
import type { OidcContractCredentials } from "./index.ts";

const NOW = new Date("2026-10-25T12:00:00Z");
const REDIRECT = "http://127.0.0.1:9/cb";

const ENCRYPTION_KEY = {
  kty: "RSA",
  use: "enc",
  alg: "RSA-OAEP",
  kid: "encryption-key",
  n: "encryption-modulus",
  e: "AQAB",
} as const;

const SIGNING_KEY = {
  kty: "RSA",
  use: "sig",
  alg: "RS256",
  kid: "signing-key",
  n: "signing-modulus",
  e: "AQAB",
} as const;

const credentials: OidcContractCredentials = {
  clientId: "ursitoare-engine",
  clientSecret: "stub-client-secret",
  redirectUri: REDIRECT,
  username: "alice",
  password: "stub-user-password",
  organization: "org-a",
  groups: ["ursitoare-authors", "team-finance"],
};

type StubProvider = Readonly<{ baseUrl: string; close(): Promise<void> }>;

function startStubProvider(keys: readonly unknown[]): Promise<StubProvider> {
  return new Promise<StubProvider>((resolve, reject) => {
    let baseUrl = "";
    const server = http.createServer((request, response) => {
      const path = new URL(request.url ?? "/", "http://placeholder.invalid").pathname;
      if (path === "/.well-known/openid-configuration") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ issuer: baseUrl, jwks_uri: `${baseUrl}/certs` }));
        return;
      }
      if (path === "/certs") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ keys }));
        return;
      }
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "not_found" }));
    });
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("the stub provider has no TCP address"));
        return;
      }
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve({
        baseUrl,
        close: () =>
          new Promise<void>((done, fail) => {
            server.closeAllConnections();
            server.close((error) => {
              if (error === undefined) done();
              else fail(error);
            });
          }),
      });
    });
  });
}

function jwksCheck(baseUrl: string) {
  const check = oidcContract(baseUrl, credentials).find(
    (candidate) => candidate.name === "jwks keys",
  );
  assert.ok(check !== undefined, "the contract does not expose the jwks keys check");
  return check;
}

test("C-eae09bbb the jwks keys check accepts an RS256 key after keys of another alg and rejects a JWKS without one", async () => {
  const accepted = await startStubProvider([ENCRYPTION_KEY, SIGNING_KEY]);
  try {
    await assert.doesNotReject(async () => {
      await jwksCheck(accepted.baseUrl).run();
    });
  } finally {
    await accepted.close();
  }

  const rejected = await startStubProvider([ENCRYPTION_KEY]);
  try {
    await assert.rejects(jwksCheck(rejected.baseUrl).run(), (error: unknown) => {
      return error instanceof assert.AssertionError;
    });
  } finally {
    await rejected.close();
  }
});

test("C-34b4df4c C-eae09bbb all checks pass on the fake and the jwks check finds a later signing key", async () => {
  const fake = await startFakeOidc({ now: () => NOW });
  fake.registerRedirect(REDIRECT);
  const accepted = await startStubProvider([ENCRYPTION_KEY, SIGNING_KEY]);
  try {
    const checks = oidcContract(fake.issuer, {
      ...credentials,
      password: fake.passwordOf("alice"),
      clientSecret: fake.clientSecret("ursitoare-engine"),
    });
    assert.equal(checks.length, 10);
    for (const check of checks) {
      await assert.doesNotReject(async () => {
        await check.run();
      });
    }
    await assert.doesNotReject(async () => {
      await jwksCheck(accepted.baseUrl).run();
    });
  } finally {
    await fake.close();
    await accepted.close();
  }
});
