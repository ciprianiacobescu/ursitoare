import type { FastifyInstance } from "fastify";

import type { Clock } from "../core/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import type { TenantPool } from "../tenancy/index.ts";
import { RouteDefinitionError } from "./route.ts";
import type { PepState } from "./types.ts";

export interface PepDeps {
  pool: TenantPool | null;
  engine: PolicyEngine | null;
  clock: Clock;
  publicBaseUrl: string;
}

function parsePublicBaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new RouteDefinitionError("ROUTE_DEF_INVALID", "Invalid public base URL", {
      reason: "public_base_url",
    });
  }
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new RouteDefinitionError("ROUTE_DEF_INVALID", "Invalid public base URL", {
      reason: "public_base_url",
    });
  }
  return parsed.origin;
}

export function installPep(server: FastifyInstance, deps: PepDeps): void {
  if (server.ursitoarePep !== undefined) {
    throw new RouteDefinitionError("ROUTE_DUPLICATE", "The server already carries a PEP", {
      what: "pep",
    });
  }
  const state: PepState = { deps, origin: parsePublicBaseUrl(deps.publicBaseUrl) };
  server.decorate("ursitoarePep", state);
}
