import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import { startControlServer } from "./control.ts";
import { createFaultTable } from "./faults.ts";
import type { FaultTable } from "./faults.ts";

const SEED_PATH = "/seed";

interface Envelope {
  error: {
    code: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

type Deps = Parameters<typeof startControlServer>[0];
type SeedData = () => Readonly<Record<string, unknown>>;

function controlDeps(
  faults: FaultTable,
  reset: () => Promise<void>,
  seedData?: SeedData,
): Deps {
  const record: {
    port: number;
    faults: FaultTable;
    reset: () => Promise<void>;
    seedData?: SeedData;
  } = { port: 0, faults, reset };
  if (seedData !== undefined) record.seedData = seedData;
  return record as unknown as Deps;
}

function rawRequest(
  baseUrl: string,
  options: { method: string; path: string; headers?: Record<string, string>; body?: string },
): Promise<RawResponse> {
  const url = new URL(baseUrl);
  return new Promise<RawResponse>((resolve, reject) => {
    let responded = false;
    const request = http.request(
      {
        hostname: url.hostname,
        port: Number(url.port),
        path: options.path,
        method: options.method,
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
          resolve({ status: response.statusCode ?? 0, headers: response.headers, body });
        });
      },
    );
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

function envelopeOf(response: RawResponse): Envelope {
  return JSON.parse(response.body) as Envelope;
}

test("C-bf32f3ba the seed route answers the JSON of seedData on the loopback control listener", async () => {
  assert.equal(typeof startControlServer, "function");

  const server = await startControlServer(
    controlDeps(
      createFaultTable(),
      async () => undefined,
      () => ({
        users: {
          alice: {
            username: "alice",
            password: "pw-alpha-1",
            displayName: "Alice Example",
            tenantName: "E2E tenant",
          },
        },
      }),
    ),
  );
  try {
    const response = await rawRequest(server.url, { method: "GET", path: SEED_PATH });

    assert.equal(response.status, 200);
    const contentType = headerOf(response, "content-type") ?? "";
    assert.ok(contentType.startsWith("application/json"), `content-type ${contentType}`);
    assert.equal(headerOf(response, "cache-control"), "no-store");
    const body = JSON.parse(response.body) as Record<string, unknown>;
    const users = body["users"] as Record<string, Record<string, string>>;
    assert.equal(users["alice"]?.["password"], "pw-alpha-1");
    assert.equal(users["alice"]?.["displayName"], "Alice Example");
  } finally {
    await server.close();
  }
});

test("C-bf32f3ba the seed route is guarded like reset for Host Origin method and unknown routes", async () => {
  const server = await startControlServer(
    controlDeps(createFaultTable(), async () => undefined, () => ({ users: {} })),
  );
  try {
    const bound = new URL(server.url);
    const foreign = await rawRequest(server.url, {
      method: "GET",
      path: SEED_PATH,
      headers: { host: `evil.example:${bound.port}` },
    });
    const origin = await rawRequest(server.url, {
      method: "GET",
      path: SEED_PATH,
      headers: { origin: "http://127.0.0.1:39080" },
    });
    const postSeed = await rawRequest(server.url, { method: "POST", path: SEED_PATH });
    const getReset = await rawRequest(server.url, { method: "GET", path: "/reset" });
    const postNowhere = await rawRequest(server.url, { method: "POST", path: "/nowhere" });

    assert.equal(foreign.status, 403);
    assert.equal(envelopeOf(foreign).error.code, "CONTROL_FORBIDDEN");
    assert.equal(origin.status, 403);
    assert.equal(envelopeOf(origin).error.code, "CONTROL_FORBIDDEN");
    assert.equal(postSeed.status, 405);
    assert.equal(envelopeOf(postSeed).error.code, "CONTROL_METHOD_NOT_ALLOWED");
    assert.equal(headerOf(postSeed, "allow"), "GET");
    assert.equal(getReset.status, 405);
    assert.equal(headerOf(getReset, "allow"), "POST");
    assert.equal(postNowhere.status, 404);
    assert.equal(envelopeOf(postNowhere).error.code, "CONTROL_NOT_FOUND");
  } finally {
    await server.close();
  }
});

test("C-bf32f3ba a missing seedData answers 404 and a throwing seedData answers 500 without the secret", async () => {
  const plainServer = await startControlServer(
    controlDeps(createFaultTable(), async () => undefined),
  );
  try {
    const missing = await rawRequest(plainServer.url, { method: "GET", path: SEED_PATH });
    assert.equal(missing.status, 404);
    assert.equal(envelopeOf(missing).error.code, "CONTROL_NOT_FOUND");
  } finally {
    await plainServer.close();
  }

  const secretServer = await startControlServer(
    controlDeps(createFaultTable(), async () => undefined, () => {
      throw new Error("secret");
    }),
  );
  try {
    const failing = await rawRequest(secretServer.url, { method: "GET", path: SEED_PATH });
    assert.equal(failing.status, 500);
    assert.equal(envelopeOf(failing).error.code, "CONTROL_SEED_FAILED");
    assert.ok(!failing.body.includes("secret"), "the body must not echo the thrown message");
  } finally {
    await secretServer.close();
  }
});
