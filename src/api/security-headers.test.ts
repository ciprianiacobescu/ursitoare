import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { sequentialIds } from "../core/index.ts";
import { healthPayload } from "../health.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import { ApiError } from "./errors.ts";
import { SECURITY_HEADERS, registerSecurityHeaders } from "./security-headers.ts";
import { buildServer } from "./server.ts";

const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'";

interface InjectedResponse {
  statusCode: number;
  body: string;
  headers: Record<string, unknown>;
}

interface InjectOptions {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  payload?: string;
}

async function build(): Promise<FastifyInstance> {
  let server: FastifyInstance | undefined;
  await assert.doesNotReject(
    async () => {
      server = await buildServer({
        version: "0.0.0",
        ids: sequentialIds(1),
        logger: createLogger({ level: "silent" }),
        tracer: noopTracer,
      });
    },
    "buildServer must not reject",
  );
  assert.ok(server, "buildServer must return a server");
  return server;
}

function install(server: FastifyInstance): void {
  assert.doesNotThrow(
    () => {
      registerSecurityHeaders(server);
    },
    "registerSecurityHeaders must install the hook",
  );
}

async function inject(server: FastifyInstance, options: InjectOptions): Promise<InjectedResponse> {
  let response: InjectedResponse | undefined;
  await assert.doesNotReject(
    async () => {
      response = await server.inject(options);
    },
    "server.inject must not reject",
  );
  assert.ok(response, "server.inject must return a response");
  return response;
}

function assertSecurityHeaders(response: InjectedResponse): void {
  const csp = response.headers["content-security-policy"];
  assert.equal(csp, CONTENT_SECURITY_POLICY, "the exact content security policy is sent");
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["referrer-policy"], "no-referrer");
  assert.equal(response.headers["x-frame-options"], "DENY");
  assert.equal(typeof csp, "string", "the policy is a single value");
  assert.equal(String(csp).includes("unsafe-inline"), false, "no inline scripts are allowed");
  assert.equal(String(csp).includes("unsafe-eval"), false, "no eval is allowed");
}

test("C-ba861867 success error and not-found responses carry the exact security headers", async () => {
  assert.equal(typeof buildServer, "function");
  assert.equal(typeof healthPayload, "function");

  const server = await build();
  install(server);
  server.get("/throw", async () => {
    throw new Error("boom");
  });
  server.get("/throw-api", async () => {
    throw new ApiError(401, "AUTH_REQUIRED", "x");
  });
  server.post("/json", async () => ({ ok: true }));

  const health = await inject(server, { method: "GET", url: "/health" });
  assert.equal(health.statusCode, 200);
  assertSecurityHeaders(health);

  const missing = await inject(server, { method: "GET", url: "/missing" });
  assert.equal(missing.statusCode, 404);
  assertSecurityHeaders(missing);

  const thrown = await inject(server, { method: "GET", url: "/throw" });
  assert.equal(thrown.statusCode, 500);
  assertSecurityHeaders(thrown);

  const apiError = await inject(server, { method: "GET", url: "/throw-api" });
  assert.equal(apiError.statusCode, 401);
  assertSecurityHeaders(apiError);

  const badJson = await inject(server, {
    method: "POST",
    url: "/json",
    headers: { "content-type": "application/json" },
    payload: "{bad",
  });
  assert.equal(badJson.statusCode, 400);
  assertSecurityHeaders(badJson);
});

test("C-61225ade a handler cannot weaken the CSP and a second registration changes nothing", async () => {
  const server = await build();
  install(server);
  install(server);
  server.get("/spoof", async (_request, reply) => {
    reply.header("content-security-policy", "*");
    return { ok: true };
  });

  const response = await inject(server, { method: "GET", url: "/spoof" });
  assert.equal(response.statusCode, 200);

  const csp = response.headers["content-security-policy"];
  assert.equal(typeof csp, "string", "the policy is one value, not a list");
  assert.equal(csp, CONTENT_SECURITY_POLICY, "the hook replaces the handler value");

  assert.equal(SECURITY_HEADERS["x-frame-options"], "DENY");
});
