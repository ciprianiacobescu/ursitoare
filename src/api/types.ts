import type { Principal, SessionContext } from "../identity/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import type { DefinedRoute } from "./route.ts";

export interface ObservedRoute {
  method: string;
  url: string;
}

export interface UrsitoareRouteState {
  listener: "public" | "internal";
  defined: DefinedRoute[];
  observed: ObservedRoute[];
}

declare module "fastify" {
  interface FastifyInstance {
    ursitoareRoutes?: UrsitoareRouteState;
  }

  interface FastifyRequest {
    principal?: Principal;
    tenant?: TenantContext;
    sessionContext?: SessionContext;
  }
}
