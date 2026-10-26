import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { sequentialIds } from "../core/index.ts";
import type { IdSource } from "../core/index.ts";
import { healthPayload } from "../health.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination, Span, SpanValue, Tracer } from "../observability/index.ts";
import { ApiError, toErrorResponse } from "./errors.ts";
import { createHealthRegistry } from "./health.ts";
import type { HealthCheck, HealthRegistry, HealthStatus } from "./health.ts";
import { buildServer } from "./server.ts";
import type { ServerDeps } from "./server.ts";

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

interface TestDepsOptions {
  ids?: IdSource;
  tracer?: Tracer;
  health?: HealthRegistry;
  healthCheckTimeoutMs?: number;
}

function testDeps(options?: TestDepsOptions): { deps: ServerDeps; lines: string[] } {
  const { destination, lines } = capture();
  const deps: ServerDeps = {
    version: "0.0.0",
    ids: options?.ids ?? sequentialIds(100),
    logger: createLogger({ level: "info", destination }),
    tracer: options?.tracer ?? noopTracer,
    ...(options?.health === undefined ? {} : { health: options.health }),
    ...(options?.healthCheckTimeoutMs === undefined
      ? {}
      : { healthCheckTimeoutMs: options.healthCheckTimeoutMs }),
  };
  return { deps, lines };
}

interface RecordedSpan {
  name: string;
  attributes: Record<string, SpanValue>;
  ends: number;
}

function recordingTracer(): { tracer: Tracer; spans: RecordedSpan[] } {
  const spans: RecordedSpan[] = [];
  return {
    spans,
    tracer: {
      startSpan(name: string, attrs?: Readonly<Record<string, SpanValue>>): Span {
        const span: RecordedSpan = { name, attributes: { ...(attrs ?? {}) }, ends: 0 };
        spans.push(span);
        return {
          setAttribute(key: string, value: SpanValue): void {
            span.attributes[key] = value;
          },
          end(): void {
            span.ends += 1;
          },
        };
      },
    },
  };
}

function logged(lines: readonly string[]): Record<string, unknown>[] {
  return lines.map((line) => parse(line));
}

function healthWarn(lines: readonly string[]): Record<string, unknown> | undefined {
  return logged(lines).find((line) => line["msg"] === "health check failed");
}

async function build(deps: ServerDeps): Promise<FastifyInstance> {
  let server: FastifyInstance | undefined;
  await assert.doesNotReject(
    async () => {
      server = await buildServer(deps);
    },
    "buildServer must not throw",
  );
  assert.ok(server, "buildServer must return a server");
  return server;
}

async function addRoutes(server: FastifyInstance, add: (s: FastifyInstance) => void): Promise<void> {
  await assert.doesNotReject(
    async () => {
      add(server);
    },
    "adding routes must not reject",
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

function jsonBody(response: InjectedResponse): Record<string, unknown> {
  let parsed: unknown;
  assert.doesNotThrow(() => {
    parsed = JSON.parse(response.body);
  }, "the response body must be JSON");
  assert.ok(typeof parsed === "object" && parsed !== null, "the response body is a JSON object");
  return parsed as Record<string, unknown>;
}

function record(value: unknown): Record<string, unknown> {
  assert.ok(typeof value === "object" && value !== null, "a record was present");
  return value as Record<string, unknown>;
}

function parse(line: string): Record<string, unknown> {
  return JSON.parse(line) as Record<string, unknown>;
}

function header(response: InjectedResponse, name: string): unknown {
  return response.headers[name];
}

function fieldsOf(response: InjectedResponse): unknown {
  return record(record(jsonBody(response)["error"])["details"])["fields"];
}

test("buildServer hands an injectable server to the routes a test adds", async () => {
  assert.equal(typeof buildServer, "function");
  assert.equal(typeof healthPayload, "function");

  const { deps } = testDeps();
  const server = await build(deps);

  assert.equal(typeof server.inject, "function");
});

test("C-3284ea9e buildServer answers an ApiError with its own status code and details", async () => {
  const { deps } = testDeps();
  const server = await build(deps);
  await addRoutes(server, (s) => {
    s.get("/throw-api", async () => {
      throw new ApiError(409, "FLOW_EXISTS", "Already exists", { id: "f1" });
    });
    s.get("/throw-api-plain", async () => {
      throw new ApiError(409, "FLOW_EXISTS", "Already exists");
    });
  });

  const withDetails = await inject(server, { method: "GET", url: "/throw-api" });
  assert.equal(withDetails.statusCode, 409);
  assert.deepEqual(jsonBody(withDetails), {
    error: { code: "FLOW_EXISTS", message: "Already exists", details: { id: "f1" } },
  });

  const withoutDetails = await inject(server, { method: "GET", url: "/throw-api-plain" });
  assert.equal(withoutDetails.statusCode, 409);
  const plainError = record(jsonBody(withoutDetails)["error"]);
  assert.deepEqual(plainError, { code: "FLOW_EXISTS", message: "Already exists" });
  assert.ok(!("details" in plainError), "the body has no details key");

  assert.throws(() => new ApiError(200, "X", "m"), RangeError);
});

test("C-240590ab buildServer reports the first body query or path schema fault", async () => {
  const { deps } = testDeps();
  const server = await build(deps);
  await addRoutes(server, (s) => {
    s.post(
      "/schema",
      {
        schema: {
          body: {
            type: "object",
            required: ["a", "b"],
            additionalProperties: false,
            properties: { a: { type: "integer" }, b: { type: "integer" } },
          },
        },
      },
      async () => ({ ok: true }),
    );
    s.get(
      "/query",
      {
        schema: {
          querystring: {
            type: "object",
            required: ["n"],
            properties: { n: { type: "integer" } },
          },
        },
      },
      async () => ({ ok: true }),
    );
    s.get(
      "/param/:id",
      {
        schema: {
          params: {
            type: "object",
            required: ["id"],
            properties: { id: { type: "integer" } },
          },
        },
      },
      async () => ({ ok: true }),
    );
  });

  const wrongType = await inject(server, {
    method: "POST",
    url: "/schema",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify({ a: "x", b: 1 }),
  });
  assert.equal(wrongType.statusCode, 400);
  assert.deepEqual(jsonBody(wrongType), {
    error: {
      code: "VALIDATION_FAILED",
      message: "Request validation failed",
      details: { fields: [{ field: "body/a", message: "must be integer" }] },
    },
  });

  const missing = await inject(server, {
    method: "POST",
    url: "/schema",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify({ a: 1 }),
  });
  assert.equal(missing.statusCode, 400);
  assert.deepEqual(fieldsOf(missing), [
    { field: "body/b", message: "must have required property 'b'" },
  ]);

  const additional = await inject(server, {
    method: "POST",
    url: "/schema",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify({ a: 1, b: 1, z: 1 }),
  });
  assert.equal(additional.statusCode, 400);
  assert.deepEqual(fieldsOf(additional), [
    { field: "body/z", message: "must NOT have additional properties" },
  ]);

  const query = await inject(server, { method: "GET", url: "/query?n=abc" });
  assert.equal(query.statusCode, 400);
  assert.deepEqual(fieldsOf(query), [{ field: "querystring/n", message: "must be integer" }]);

  const param = await inject(server, { method: "GET", url: "/param/abc" });
  assert.equal(param.statusCode, 400);
  assert.deepEqual(fieldsOf(param), [{ field: "params/id", message: "must be integer" }]);
});

test("C-d145c766 buildServer keeps the fixed codes for malformed oversized and wrongly typed bodies", async () => {
  const { deps } = testDeps();
  const server = await build(deps);
  await addRoutes(server, (s) => {
    s.post("/json", async () => ({ ok: true }));
  });

  const malformed = await inject(server, {
    method: "POST",
    url: "/json",
    headers: { "content-type": "application/json" },
    payload: "{bad",
  });
  assert.equal(malformed.statusCode, 400);
  assert.deepEqual(jsonBody(malformed), {
    error: {
      code: "VALIDATION_FAILED",
      message: "Request validation failed",
      details: { fields: [{ field: "body", message: "malformed JSON" }] },
    },
  });

  const oversizedPayload = `{"a":"${"x".repeat(1048569)}"}`;
  assert.equal(oversizedPayload.length, 1048577);
  const oversized = await inject(server, {
    method: "POST",
    url: "/json",
    headers: { "content-type": "application/json" },
    payload: oversizedPayload,
  });
  assert.equal(oversized.statusCode, 413);
  assert.deepEqual(jsonBody(oversized), {
    error: { code: "PAYLOAD_TOO_LARGE", message: "Payload too large" },
  });

  const wrongMediaType = await inject(server, {
    method: "POST",
    url: "/json",
    headers: { "content-type": "application/xml" },
    payload: "<x/>",
  });
  assert.equal(wrongMediaType.statusCode, 415);
  assert.deepEqual(jsonBody(wrongMediaType), {
    error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Unsupported media type" },
  });

  const tooManyRequests = Object.assign(new Error("slow down"), { statusCode: 429 });
  assert.deepEqual(toErrorResponse(tooManyRequests), {
    status: 429,
    body: { error: { code: "BAD_REQUEST", message: "Bad request" } },
  });
});

test("C-aea19ec5 unknown errors answer INTERNAL and never log hunter2", async () => {
  const { deps, lines } = testDeps();
  const server = await build(deps);
  await addRoutes(server, (s) => {
    s.get("/boom", async () => {
      throw new Error("db password=hunter2");
    });
    s.get("/boom-detail", async () => {
      throw Object.assign(new Error("oops"), {
        detail: "Failing row contains (hunter2)",
        code: "23505",
      });
    });
  });

  const boom = await inject(server, { method: "GET", url: "/boom" });
  assert.equal(boom.statusCode, 500);
  assert.equal(boom.body.includes("hunter2"), false, "the response leaks nothing");
  assert.deepEqual(jsonBody(boom), { error: { code: "INTERNAL", message: "Internal server error" } });

  const withDetail = await inject(server, { method: "GET", url: "/boom-detail" });
  assert.equal(withDetail.statusCode, 500);
  assert.deepEqual(jsonBody(withDetail), {
    error: { code: "INTERNAL", message: "Internal server error" },
  });

  assert.ok(!lines.some((line) => line.includes("hunter2")), "no log line contains hunter2");

  const failures = lines.map((line) => parse(line)).filter((r) => r["msg"] === "request failed");
  assert.equal(failures.length, 2);
  const boomLine = failures[0];
  const detailLine = failures[1];
  assert.ok(boomLine, "the first failure was logged");
  assert.ok(detailLine, "the second failure was logged");
  assert.equal(boomLine["reqId"], header(boom, "x-request-id"));
  assert.equal(detailLine["reqId"], header(withDetail, "x-request-id"));
  const detailError = record(detailLine["err"]);
  assert.equal(detailError["type"], "Error");
  assert.equal(detailError["code"], "23505");
});

test("C-71327adc a well-formed x-request-id is kept and the route is logged without the query", async () => {
  const { deps, lines } = testDeps({ ids: sequentialIds(50) });
  const server = await build(deps);
  await addRoutes(server, (s) => {
    s.get("/probe", async () => ({ ok: true }));
  });

  const response = await inject(server, {
    method: "GET",
    url: "/probe?token=abc",
    headers: { "x-request-id": "client-1.a_b" },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(header(response, "x-request-id"), "client-1.a_b");

  assert.ok(lines.length >= 2, "the request was logged");
  for (const line of lines) {
    assert.equal(parse(line)["reqId"], "client-1.a_b");
  }
  const incoming = lines.map((line) => parse(line)).find((r) => r["msg"] === "incoming request");
  assert.ok(incoming, "the incoming request was logged");
  assert.deepEqual(record(incoming["req"]), { method: "GET", url: "/probe" });
  assert.ok(!lines.some((line) => line.includes("abc")), "no log line contains the query token");
});

test("C-2490a98e a path that carries a token logs the wildcard route only", async () => {
  const { deps, lines } = testDeps({ ids: sequentialIds(50) });
  const server = await build(deps);
  await addRoutes(server, (s) => {
    s.get("/*", async () => ({ ok: true }));
  });

  const response = await inject(server, { method: "GET", url: "/t/tok-Q9z?x=1" });
  assert.equal(response.statusCode, 200);

  const incoming = lines.map((line) => parse(line)).find((r) => r["msg"] === "incoming request");
  assert.ok(incoming, "the incoming request was logged");
  assert.deepEqual(record(incoming["req"]), { method: "GET", url: "/*" });
  assert.ok(!lines.some((line) => line.includes("tok-Q9z")), "no log line contains the token");
});

test("C-c68d2bde missing malformed and oversized request ids are replaced", async () => {
  const { deps } = testDeps({ ids: sequentialIds(1) });
  const server = await build(deps);
  await addRoutes(server, (s) => {
    s.get("/probe", async () => ({ ok: true }));
  });

  const missing = await inject(server, { method: "GET", url: "/probe" });
  assert.equal(header(missing, "x-request-id"), "req_00000000-0000-7000-8000-000000000001");

  const malformed = await inject(server, {
    method: "GET",
    url: "/probe",
    headers: { "x-request-id": "bad id!" },
  });
  assert.equal(header(malformed, "x-request-id"), "req_00000000-0000-7000-8000-000000000002");

  const oversized = await inject(server, {
    method: "GET",
    url: "/probe",
    headers: { "x-request-id": "a".repeat(65) },
  });
  assert.equal(header(oversized, "x-request-id"), "req_00000000-0000-7000-8000-000000000003");
});

test("C-64866f0f a 404 and a thrown error both carry the request id", async () => {
  const { deps } = testDeps();
  const server = await build(deps);
  await addRoutes(server, (s) => {
    s.get("/boom", async () => {
      throw new Error("boom");
    });
  });

  const notFound = await inject(server, {
    method: "GET",
    url: "/nope",
    headers: { "x-request-id": "abc-1" },
  });
  assert.equal(notFound.statusCode, 404);
  assert.deepEqual(jsonBody(notFound), { error: { code: "NOT_FOUND", message: "Route not found" } });
  assert.equal(header(notFound, "x-request-id"), "abc-1");

  const thrown = await inject(server, {
    method: "GET",
    url: "/boom",
    headers: { "x-request-id": "abc-1" },
  });
  assert.equal(thrown.statusCode, 500);
  assert.equal(header(thrown, "x-request-id"), "abc-1");
});

test("C-3c17bb81 a recording tracer holds one ended http.request span per request", async () => {
  const { tracer, spans } = recordingTracer();
  const { deps } = testDeps({ tracer });
  const server = await build(deps);

  const health = await inject(server, { method: "GET", url: "/health" });
  assert.equal(health.statusCode, 200);

  const missing = await inject(server, { method: "GET", url: "/nope" });
  assert.equal(missing.statusCode, 404);

  assert.equal(spans.length, 2, "one span per request");
  assert.deepEqual(
    spans.map((span) => span.name),
    ["http.request", "http.request"],
  );
  assert.deepEqual(spans[0]?.attributes, {
    "http.method": "GET",
    "http.route": "/health",
    "http.status_code": 200,
  });
  assert.deepEqual(spans[1]?.attributes, {
    "http.method": "GET",
    "http.route": "unmatched",
    "http.status_code": 404,
  });
  assert.deepEqual(
    spans.map((span) => span.ends),
    [1, 1],
  );
});

test("C-595eb185 a failing tracer logs a warning and the request still succeeds", async () => {
  const tracer: Tracer = {
    startSpan(): Span {
      throw new Error("tracer unavailable");
    },
  };
  const { deps, lines } = testDeps({ tracer });
  const server = await build(deps);

  const health = await inject(server, { method: "GET", url: "/health" });
  assert.equal(health.statusCode, 200);

  const warning = logged(lines).find((line) => line["msg"] === "tracer failed");
  assert.ok(warning, "a warn line named tracer failed was logged");
});

test("C-14452135 GET /health with no checks reports ok and healthPayload is unchanged", async () => {
  const { deps } = testDeps();
  const server = await build(deps);

  const response = await inject(server, { method: "GET", url: "/health" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(jsonBody(response), { status: "ok", version: "0.0.0", checks: {} });
  assert.equal(header(response, "cache-control"), "no-store");

  assert.equal(typeof healthPayload, "function");
  const payload: { status: "ok"; version: string } = healthPayload("1.2.3");
  assert.deepEqual(payload, { status: "ok", version: "1.2.3" });
});

test("C-14452135 GET /health reports passing checks by name", async () => {
  const registry = createHealthRegistry();
  registry.registerHealthCheck("db", async () => "ok");
  registry.registerHealthCheck("cache", async () => "ok");
  const { deps } = testDeps({ health: registry });
  const server = await build(deps);

  const response = await inject(server, { method: "GET", url: "/health" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(jsonBody(response), {
    status: "ok",
    version: "0.0.0",
    checks: { db: "ok", cache: "ok" },
  });
});

test("C-ce3d89ea the health request log holds the route without the query token", async () => {
  const { deps, lines } = testDeps();
  const server = await build(deps);

  const response = await inject(server, { method: "GET", url: "/health?token=abc" });
  assert.equal(response.statusCode, 200);

  const incoming = logged(lines).find((line) => line["msg"] === "incoming request");
  assert.ok(incoming, "the incoming request was logged");
  assert.deepEqual(record(incoming["req"]), { method: "GET", url: "/health" });
  assert.ok(!lines.some((line) => line.includes("abc")), "no log line contains the query token");
});

test("C-609c36a3 GET /health reports a failing check without leaking its content", async () => {
  const registry = createHealthRegistry();
  registry.registerHealthCheck("db", async () => "fail");
  registry.registerHealthCheck("cache", async () => "ok");
  const { deps, lines } = testDeps({ health: registry });
  const server = await build(deps);

  const response = await inject(server, { method: "GET", url: "/health" });
  assert.equal(response.statusCode, 503);
  assert.deepEqual(jsonBody(response), {
    status: "fail",
    version: "0.0.0",
    checks: { db: "fail", cache: "ok" },
  });

  const warning = healthWarn(lines);
  assert.ok(warning, "the failing check was logged");
  assert.equal(warning["check"], "db");
  assert.equal(warning["reason"], "returned_fail");
});

test("C-609c36a3 GET /health reports a throwing check without its message", async () => {
  const registry = createHealthRegistry();
  registry.registerHealthCheck("db", async () => {
    throw new Error("postgres://u:pw@h/db refused");
  });
  registry.registerHealthCheck("cache", async () => "ok");
  const { deps, lines } = testDeps({ health: registry });
  const server = await build(deps);

  const response = await inject(server, { method: "GET", url: "/health" });
  assert.equal(response.statusCode, 503);
  assert.deepEqual(jsonBody(response), {
    status: "fail",
    version: "0.0.0",
    checks: { db: "fail", cache: "ok" },
  });
  assert.ok(!response.body.includes("pw"), "the response does not leak the error message");

  const warning = healthWarn(lines);
  assert.ok(warning, "the failing check was logged");
  assert.equal(warning["check"], "db");
  assert.equal(warning["reason"], "threw");
  assert.ok(!lines.some((line) => line.includes("pw")), "no log line leaks the error message");
});

test("C-609c36a3 GET /health reports a hanging check as a timeout", async () => {
  const registry = createHealthRegistry();
  const hanging: HealthCheck = () => new Promise<HealthStatus>(() => undefined);
  registry.registerHealthCheck("db", hanging);
  registry.registerHealthCheck("cache", async () => "ok");
  const { deps, lines } = testDeps({ health: registry, healthCheckTimeoutMs: 10 });
  const server = await build(deps);

  const response = await inject(server, { method: "GET", url: "/health" });
  assert.equal(response.statusCode, 503);
  assert.deepEqual(jsonBody(response), {
    status: "fail",
    version: "0.0.0",
    checks: { db: "fail", cache: "ok" },
  });

  const warning = healthWarn(lines);
  assert.ok(warning, "the failing check was logged");
  assert.equal(warning["check"], "db");
  assert.equal(warning["reason"], "timeout");
});

test("C-609c36a3 GET /health reports a junk check result as invalid", async () => {
  const registry = createHealthRegistry();
  const junk = (async () => "maybe") as unknown as HealthCheck;
  registry.registerHealthCheck("db", junk);
  registry.registerHealthCheck("cache", async () => "ok");
  const { deps, lines } = testDeps({ health: registry });
  const server = await build(deps);

  const response = await inject(server, { method: "GET", url: "/health" });
  assert.equal(response.statusCode, 503);
  assert.deepEqual(jsonBody(response), {
    status: "fail",
    version: "0.0.0",
    checks: { db: "fail", cache: "ok" },
  });

  const warning = healthWarn(lines);
  assert.ok(warning, "the failing check was logged");
  assert.equal(warning["check"], "db");
  assert.equal(warning["reason"], "invalid_result");
});
