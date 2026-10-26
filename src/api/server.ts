import { fastify } from "fastify";
import type { FastifyBaseLogger, FastifyInstance } from "fastify";

import type { IdSource } from "../core/index.ts";
import { healthPayload } from "../health.ts";
import type { Logger, Span, Tracer } from "../observability/index.ts";
import { ApiError, toErrorResponse } from "./errors.ts";
import { createHealthRegistry } from "./health.ts";
import type { HealthRegistry } from "./health.ts";

export interface ServerDeps {
  readonly version: string;
  readonly ids: IdSource;
  readonly logger: Logger;
  readonly tracer: Tracer;
  readonly health?: HealthRegistry;
  readonly healthCheckTimeoutMs?: number;
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const DEFAULT_HEALTH_CHECK_TIMEOUT_MS = 2000;

const NOT_FOUND_RESPONSE = toErrorResponse(new ApiError(404, "NOT_FOUND", "Route not found"));

export function buildServer(deps: ServerDeps): Promise<FastifyInstance> {
  const health = deps.health ?? createHealthRegistry();
  const requestSpans = new WeakMap<object, Span>();

  const server = fastify({
    loggerInstance: deps.logger as FastifyBaseLogger,
    requestIdHeader: false,
    genReqId: (req) => {
      const value = req.headers["x-request-id"];
      if (typeof value === "string" && REQUEST_ID_PATTERN.test(value)) {
        return value;
      }
      return deps.ids.next("req");
    },
    return503OnClosing: false,
    ajv: { customOptions: { removeAdditional: false, allErrors: false } },
  });

  server.addHook("onRequest", async (request) => {
    try {
      const span = deps.tracer.startSpan("http.request", { "http.method": request.method });
      requestSpans.set(request, span);
    } catch {
      request.log.warn("tracer failed");
    }
  });

  server.addHook("onResponse", async (request, reply) => {
    const span = requestSpans.get(request);
    if (span === undefined) {
      return;
    }
    try {
      const route = request.routeOptions?.url;
      span.setAttribute("http.route", typeof route === "string" ? route : "unmatched");
      span.setAttribute("http.status_code", reply.statusCode);
      span.end();
    } catch {
      request.log.warn("tracer failed");
    }
  });

  server.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  server.get("/health", async (request, reply) => {
    const timeoutMs = deps.healthCheckTimeoutMs ?? DEFAULT_HEALTH_CHECK_TIMEOUT_MS;
    const report = await health.run(timeoutMs);

    for (const failure of report.failures) {
      request.log.warn(
        { check: failure.name, reason: failure.reason },
        "health check failed",
      );
    }

    reply.header("cache-control", "no-store");
    if (report.status === "ok") {
      return { ...healthPayload(deps.version), checks: report.checks };
    }
    reply.code(503);
    return { status: "fail", version: deps.version, checks: report.checks };
  });

  server.setErrorHandler((error, request, reply) => {
    const mapped = toErrorResponse(error);
    if (mapped.status >= 500) {
      request.log.error({ err: error }, "request failed");
    }
    reply.code(mapped.status).send(mapped.body);
  });

  server.setNotFoundHandler((_request, reply) => {
    reply.code(NOT_FOUND_RESPONSE.status).send(NOT_FOUND_RESPONSE.body);
  });

  return Promise.resolve(server);
}
