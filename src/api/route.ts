// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance, FastifyReply, FastifyRequest, FastifySchema } from "fastify";

import type { ActionName, ResourceType } from "../pdp/index.ts";
import type { Principal, SessionContext } from "../identity/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import type { PepDeps } from "./pep.ts";

export type PublicReason = "health" | "oidc" | "static" | "well_known";

export type AuthKind =
  | { kind: "session" }
  | { kind: "bearer"; audience: string }
  | { kind: "hmac"; hmacKind: string }
  | { kind: "service_token" }
  | { kind: "public"; reason: PublicReason };

export interface ResourceRef {
  type: ResourceType;
  id: string;
  tenantId: string;
  attrs?: Record<string, unknown>;
}

export interface SqlPredicate {
  sql: string;
  values: unknown[];
}

export type ListFilter =
  | { kind: "sql"; predicate(p: Principal, first: number): SqlPredicate }
  | { kind: "item"; canRead(p: Principal, item: unknown): boolean | Promise<boolean> };

export interface RouteDef {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  auth: AuthKind;
  action?: ActionName;
  resource?: (req: FastifyRequest) => Promise<ResourceRef | null>;
  listFilter?: ListFilter;
  schema: FastifySchema;
  errors: readonly string[];
  handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
}

export function defineRoute(_server: FastifyInstance, _def: RouteDef): void {
  throw new Error("not implemented");
}

export type AuthVerifier = (
  req: FastifyRequest,
  auth: AuthKind,
  deps: PepDeps,
) => Promise<{ principal: Principal; tenant: TenantContext; session?: SessionContext } | null>;

export function registerAuthVerifier(
  _kind: Exclude<AuthKind["kind"], "public">,
  _verifier: AuthVerifier,
): void {
  throw new Error("not implemented");
}

export class RouteDefinitionError extends Error {
  code: string;
  details: Record<string, string>;
  constructor(_code: string, message: string, _details?: Record<string, string>) {
    super(message);
    throw new Error("not implemented");
  }
}

export interface DefinedRoute {
  method: string;
  url: string;
  auth: AuthKind;
  action: ActionName | null;
  errors: readonly string[];
  schema: FastifySchema;
  listener: "public" | "internal";
}

export function listDefinedRoutes(_server: FastifyInstance): DefinedRoute[] {
  throw new Error("not implemented");
}
