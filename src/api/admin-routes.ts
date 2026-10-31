import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import type { Principal, RbacActor } from "../identity/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { adminApiError } from "./admin-errors.ts";
import { AdminError } from "../identity/index.ts";
import { ApiError } from "./errors.ts";
import { deriveCursorKey } from "./cursor.ts";
import type { CursorKey } from "./cursor.ts";
import { registerAdminServiceAccountRoutes } from "./admin-service-accounts.ts";
import { registerAdminRbacRoutes } from "./admin-rbac.ts";
import { registerAdminTenantRoutes } from "./admin-tenant.ts";
import { registerAdminUsersRoutes } from "./admin-users.ts";

export interface AdminApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  ids: IdSource;
  engineKey: KeyMaterial | null;
}

export interface AdminRouteDeps extends AdminApiDeps {
  readonly key: CursorKey | null;
}

export type AdminRouteHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<unknown>;

export function adminHandler(handler: AdminRouteHandler): AdminRouteHandler {
  return async (request, reply) => {
    try {
      return await handler(request, reply);
    } catch (error) {
      throw adminApiError(error);
    }
  };
}

export function requireAdminPool(deps: AdminApiDeps): TenantPool {
  if (deps.pool === null) {
    throw new ApiError(503, "AUTHZ_UNAVAILABLE", "Authorization is unavailable");
  }
  return deps.pool;
}

export function requireAdminContext(request: FastifyRequest): {
  tenant: TenantContext;
  principal: Principal;
} {
  const tenant = request.tenant;
  const principal = request.principal;
  if (tenant === undefined || principal === undefined) {
    throw new ApiError(503, "AUTHZ_UNAVAILABLE", "Authorization is unavailable");
  }
  return { tenant, principal };
}

export function adminActorOf(
  principal: Principal,
): Extract<RbacActor, { userId: string }> {
  return {
    kind: principal.kind === "service" ? "service" : "user",
    userId: principal.userId,
    roles: principal.roles,
  };
}

export function adminNotFound(): AdminError {
  return new AdminError("ADMIN_NOT_FOUND", "admin target not found");
}

function emptyBodyJsonParser(
  request: FastifyRequest,
  body: string,
  done: (error: Error | null, value?: unknown) => void,
): void {
  if (body === "") {
    done(null, undefined);
    return;
  }
  try {
    done(null, JSON.parse(body));
  } catch (error) {
    done(error as Error);
  }
}

export function registerAdminRoutes(server: FastifyInstance, deps: AdminApiDeps): void {
  try {
    server.addContentTypeParser("application/json", { parseAs: "string" }, emptyBodyJsonParser);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { code?: unknown }).code !== "FST_ERR_CTP_ALREADY_PRESENT"
    ) {
      throw error;
    }
  }
  const key = deps.engineKey === null ? null : deriveCursorKey(deps.engineKey);
  const routeDeps: AdminRouteDeps = { ...deps, key };
  registerAdminUsersRoutes(server, routeDeps);
  registerAdminServiceAccountRoutes(server, routeDeps);
  registerAdminRbacRoutes(server, routeDeps);
  registerAdminTenantRoutes(server, routeDeps);
}
