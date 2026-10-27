// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { Clock } from "../../core/index.ts";
import type { TenantPool } from "../../tenancy/index.ts";
import type { OidcConfigShape } from "./config-shape.ts";

export interface OidcRoutesDeps {
  config: OidcConfigShape | null;
  publicBaseUrl: string;
  pool: TenantPool | null;
  engineKey: { reveal(): string } | null;
  clock: Clock;
  fetch?: typeof fetch;
}

export function registerOidcRoutes(_server: FastifyInstance, _deps: OidcRoutesDeps): void {
  throw new Error("not implemented");
}
