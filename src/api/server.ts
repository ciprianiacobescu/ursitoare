import { fastify } from "fastify";
import type { FastifyBaseLogger, FastifyInstance } from "fastify";

import type { IdSource } from "../core/index.ts";
import type { Logger, Tracer } from "../observability/index.ts";
import { ApiError, toErrorResponse } from "./errors.ts";
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

const NOT_FOUND_RESPONSE = toErrorResponse(new ApiError(404, "NOT_FOUND", "Route not found"));

export function buildServer(deps: ServerDeps): Promise<FastifyInstance> {
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

  server.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
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
