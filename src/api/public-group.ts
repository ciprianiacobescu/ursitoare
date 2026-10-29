import type { FastifyInstance, FastifySchema } from "fastify";

import { RouteDefinitionError } from "./route.ts";
import type { PublicReason } from "./route.ts";
import type { UrsitoareRouteState } from "./types.ts";

const PUBLIC_REASONS: readonly PublicReason[] = ["health", "oidc", "static", "well_known"];

function routeState(server: FastifyInstance): UrsitoareRouteState {
  const existing = server.ursitoareRoutes;
  if (existing !== undefined) {
    return existing;
  }
  const created: UrsitoareRouteState = { listener: "public", defined: [], observed: [] };
  server.decorate("ursitoareRoutes", created);
  return created;
}

export async function definePublicRoutes(
  server: FastifyInstance,
  reason: PublicReason,
  register: (s: FastifyInstance) => unknown,
): Promise<void> {
  if (!PUBLIC_REASONS.includes(reason)) {
    throw new RouteDefinitionError("ROUTE_DEF_INVALID", "Invalid public route reason", {
      reason: "auth",
    });
  }

  const state = routeState(server);
  if (state.listener !== "public") {
    throw new RouteDefinitionError(
      "ROUTE_LISTENER_MISMATCH",
      "The internal listener serves only service-token routes",
      { listener: "internal" },
    );
  }

  await server.register(async (scoped) => {
    scoped.addHook("onRoute", (routeOptions) => {
      const methods = Array.isArray(routeOptions.method)
        ? routeOptions.method
        : [routeOptions.method];
      for (const method of methods) {
        if (method === "HEAD") {
          continue;
        }
        state.defined.push({
          method,
          url: routeOptions.url,
          auth: { kind: "public", reason },
          action: null,
          errors: [],
          schema: (routeOptions.schema ?? {}) as FastifySchema,
          listener: "public",
        });
      }
    });
    await register(scoped);
  });
}
