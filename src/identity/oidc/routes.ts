import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { Clock } from "../../core/index.ts";
import type { TenantPool } from "../../tenancy/index.ts";
import { registerCallbackRoute } from "./callback.ts";
import { createOidcClient } from "./client.ts";
import type { OidcConfigShape } from "./config-shape.ts";
import { OidcError } from "./errors.ts";
import { registerLoginRoute } from "./login.ts";

export interface OidcRoutesDeps {
  config: OidcConfigShape | null;
  publicBaseUrl: string;
  pool: TenantPool | null;
  engineKey: { reveal(): string } | null;
  clock: Clock;
  fetch?: typeof fetch;
}

const NOT_CONFIGURED = {
  error: { code: "OIDC_NOT_CONFIGURED", message: "Sign-in is not configured" },
} as const;

function unavailable(): OidcError {
  return new OidcError("OIDC_NOT_CONFIGURED", "Sign-in is not configured");
}

function registerUnavailableRoutes(server: FastifyInstance): void {
  const unavailableHandler = async (
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    reply.header("cache-control", "no-store");
    reply.code(503).send(NOT_CONFIGURED);
  };

  server.get("/auth/oidc/login", unavailableHandler);
  server.get("/auth/oidc/callback", unavailableHandler);
  server.post("/auth/oidc/logout", unavailableHandler);
}

export function registerOidcRoutes(server: FastifyInstance, deps: OidcRoutesDeps): void {
  if (deps.config === null) {
    registerUnavailableRoutes(server);
    return;
  }
  if (deps.pool === null || deps.engineKey === null) {
    throw unavailable();
  }

  const client = createOidcClient({
    config: deps.config,
    clock: deps.clock,
    ...(deps.fetch === undefined ? {} : { fetch: deps.fetch }),
  });

  registerLoginRoute(server, {
    config: deps.config,
    client,
    publicBaseUrl: deps.publicBaseUrl,
    engineKey: deps.engineKey,
    clock: deps.clock,
  });

  registerCallbackRoute(server, {
    config: deps.config,
    client,
    publicBaseUrl: deps.publicBaseUrl,
    pool: deps.pool,
    engineKey: deps.engineKey,
    clock: deps.clock,
  });
}
