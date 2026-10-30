import type { FastifyInstance, FastifyReply, FastifyRequest, FastifySchema } from "fastify";

import type { ActionName, ResourceType } from "../pdp/index.ts";
import { ACTIONS } from "../pdp/index.ts";
import type { Principal, SessionContext } from "../identity/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { checkCsrf } from "./csrf.ts";
import { ApiError } from "./errors.ts";
import { listFilterHooks } from "./list-filter.ts";
import { decisionPreHandler } from "./pep.ts";
import type { PepDeps } from "./pep.ts";
import { auditRefusal } from "./refusal.ts";
import { sessionVerifier } from "./session-auth.ts";
import type { UrsitoareRouteState } from "./types.ts";

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

export type AuthVerifier = (
  req: FastifyRequest,
  auth: AuthKind,
  deps: PepDeps,
) => Promise<{ principal: Principal; tenant: TenantContext; session?: SessionContext } | null>;

export class RouteDefinitionError extends Error {
  code: string;
  details: Record<string, string>;
  constructor(code: string, message: string, details?: Record<string, string>) {
    super(message);
    this.name = "RouteDefinitionError";
    this.code = code;
    this.details = details ?? {};
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

const METHODS = new Set<string>(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const URL_PATTERN = /^\/[\x21-\x7e]*$/;
const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const HMAC_KIND_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;
const PUBLIC_REASONS: readonly PublicReason[] = ["health", "oidc", "static", "well_known"];

const authVerifiers = new Map<Exclude<AuthKind["kind"], "public" | "session">, AuthVerifier>();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isPublic(auth: AuthKind): auth is { kind: "public"; reason: PublicReason } {
  return auth.kind === "public";
}

function isValidAuth(auth: unknown): auth is AuthKind {
  if (!isPlainObject(auth)) {
    return false;
  }
  switch (auth.kind) {
    case "session":
    case "service_token":
      return true;
    case "bearer":
      return (
        typeof auth.audience === "string" &&
        auth.audience.length >= 1 &&
        auth.audience.length <= 200
      );
    case "hmac":
      return typeof auth.hmacKind === "string" && HMAC_KIND_PATTERN.test(auth.hmacKind);
    case "public":
      return PUBLIC_REASONS.includes(auth.reason as PublicReason);
    default:
      return false;
  }
}

function isValidErrors(errors: unknown): errors is readonly string[] {
  if (!Array.isArray(errors)) {
    return false;
  }
  const seen = new Set<string>();
  for (const code of errors) {
    if (typeof code !== "string" || !ERROR_CODE_PATTERN.test(code) || seen.has(code)) {
      return false;
    }
    seen.add(code);
  }
  return true;
}

function isInvalidListFilter(filter: unknown): boolean {
  if (!isPlainObject(filter)) {
    return true;
  }
  if (filter.kind === "sql") {
    return typeof filter.predicate !== "function";
  }
  if (filter.kind === "item") {
    return typeof filter.canRead !== "function";
  }
  return true;
}

function isAlreadyStarted(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "FST_ERR_INSTANCE_ALREADY_LISTENING"
  );
}

function routeState(server: FastifyInstance): UrsitoareRouteState {
  const existing = server.ursitoareRoutes;
  if (existing !== undefined) {
    return existing;
  }
  const created: UrsitoareRouteState = { listener: "public", defined: [], observed: [] };
  server.decorate("ursitoareRoutes", created);
  return created;
}

export function verifierFor(kind: Exclude<AuthKind["kind"], "public">): AuthVerifier | undefined {
  if (kind === "session") {
    return sessionVerifier;
  }
  return authVerifiers.get(kind);
}

function unavailable(): ApiError {
  return new ApiError(503, "AUTHZ_UNAVAILABLE", "Authorization is unavailable");
}

function authenticationHook(
  server: FastifyInstance,
  auth: Exclude<AuthKind, { kind: "public" }>,
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request, reply) => {
    reply.header("cache-control", "no-store");
    const pep = server.ursitoarePep;
    if (pep === undefined || pep.deps.pool === null || pep.deps.engine === null) {
      throw unavailable();
    }

    let result: Awaited<ReturnType<AuthVerifier>>;
    try {
      const verifier = verifierFor(auth.kind);
      if (verifier === undefined) {
        throw new Error("authentication kind is not wired");
      }
      result = await verifier(request, auth, pep.deps);
    } catch {
      request.log.warn(
        { code: "AUTHZ_UNAVAILABLE", reason: "verifier_failed" },
        "request refused",
      );
      throw unavailable();
    }

    if (result === null) {
      request.log.warn({ code: "UNAUTHENTICATED" }, "request refused");
      throw new ApiError(401, "UNAUTHENTICATED", "Authentication required");
    }
    if (result.principal.tenantId !== result.tenant.tenantId) {
      request.log.warn(
        { code: "AUTHZ_UNAVAILABLE", reason: "tenant_mismatch" },
        "request refused",
      );
      throw unavailable();
    }

    request.principal = result.principal;
    request.tenant = result.tenant;
    if (result.session !== undefined) {
      request.sessionContext = result.session;
    }

    if (auth.kind === "session" && request.method !== "GET" && request.method !== "HEAD") {
      const session = result.session;
      if (session === undefined) {
        request.log.warn(
          { code: "AUTHZ_UNAVAILABLE", reason: "session_missing" },
          "request refused",
        );
        throw unavailable();
      }

      let outcome: "ok" | "origin" | "token";
      try {
        outcome = await checkCsrf(request, pep.deps, session);
      } catch {
        request.log.warn(
          { code: "AUTHZ_UNAVAILABLE", reason: "csrf_failed" },
          "request refused",
        );
        throw unavailable();
      }

      if (outcome !== "ok") {
        await auditRefusal(request, pep.deps, {
          eventType: "authz.csrf_refused",
          actor: {
            kind: result.principal.kind === "service" ? "service" : "user",
            id: result.principal.userId,
          },
          payload: {
            method: request.method,
            route: request.routeOptions.url,
            reason: outcome,
          },
        });
        throw new ApiError(403, "CSRF_INVALID", "CSRF token missing or invalid");
      }
    }
  };
}

function impliedErrors(def: RouteDef): readonly string[] {
  const errors = new Set<string>(def.errors);
  if (!isPublic(def.auth)) {
    errors.add("UNAUTHENTICATED");
    errors.add("FORBIDDEN");
    errors.add("AUTHZ_UNAVAILABLE");
  }
  if (def.auth.kind === "session" && def.method !== "GET") {
    errors.add("CSRF_INVALID");
  }
  if (def.resource !== undefined) {
    errors.add("NOT_FOUND");
  }
  return [...errors].sort();
}

export function defineRoute(server: FastifyInstance, def: RouteDef): void {
  if (!METHODS.has(def.method)) {
    throw new RouteDefinitionError("ROUTE_DEF_INVALID", "Invalid route method", {
      reason: "method",
    });
  }
  if (
    typeof def.url !== "string" ||
    !URL_PATTERN.test(def.url) ||
    def.url.includes("?") ||
    def.url.includes("#")
  ) {
    throw new RouteDefinitionError("ROUTE_DEF_INVALID", "Invalid route url", { reason: "url" });
  }
  if (!isPlainObject(def.schema)) {
    throw new RouteDefinitionError("ROUTE_DEF_INVALID", "Invalid route schema", {
      reason: "schema",
    });
  }
  if (!isValidErrors(def.errors)) {
    throw new RouteDefinitionError("ROUTE_DEF_INVALID", "Invalid route errors", {
      reason: "errors",
    });
  }
  if (typeof def.handler !== "function") {
    throw new RouteDefinitionError("ROUTE_DEF_INVALID", "Invalid route handler", {
      reason: "handler",
    });
  }
  if (!isValidAuth(def.auth)) {
    throw new RouteDefinitionError("ROUTE_DEF_INVALID", "Invalid route auth", {
      reason: "auth",
    });
  }
  if (
    isPublic(def.auth) &&
    (def.action !== undefined || def.resource !== undefined || def.listFilter !== undefined)
  ) {
    throw new RouteDefinitionError("ROUTE_DEF_INVALID", "Public routes take no options", {
      reason: "public_options",
    });
  }
  if (def.resource !== undefined && def.action === undefined) {
    throw new RouteDefinitionError(
      "ROUTE_DEF_INVALID",
      "A resource route needs an action",
      { reason: "resource_without_action" },
    );
  }
  if (def.listFilter !== undefined && isInvalidListFilter(def.listFilter)) {
    throw new RouteDefinitionError("ROUTE_DEF_INVALID", "Invalid list filter", {
      reason: "list_filter",
    });
  }

  const state = routeState(server);
  if (state.listener === "internal" && def.auth.kind !== "service_token") {
    throw new RouteDefinitionError(
      "ROUTE_LISTENER_MISMATCH",
      "The internal listener serves only service-token routes",
      { listener: "internal" },
    );
  }
  if (state.listener === "public" && def.auth.kind === "service_token") {
    throw new RouteDefinitionError(
      "ROUTE_LISTENER_MISMATCH",
      "The public listener refuses service-token routes",
      { listener: "public" },
    );
  }

  if (!isPublic(def.auth)) {
    if (def.auth.kind !== "session" && verifierFor(def.auth.kind) === undefined) {
      throw new RouteDefinitionError("ROUTE_AUTH_UNWIRED", "Authentication kind is not wired", {
        kind: def.auth.kind,
      });
    }
    if (def.action === undefined) {
      throw new RouteDefinitionError("ROUTE_ACTION_MISSING", "A non-public route needs an action");
    }
    if (!Object.hasOwn(ACTIONS, def.action)) {
      throw new RouteDefinitionError("ROUTE_ACTION_UNKNOWN", "Unknown policy action", {
        action: def.action,
      });
    }
  }

  if (state.defined.some((route) => route.method === def.method && route.url === def.url)) {
    throw new RouteDefinitionError("ROUTE_DUPLICATE", "Route is already defined", {
      route: `${def.method} ${def.url}`,
    });
  }

  const options: {
    method: RouteDef["method"];
    url: string;
    schema: FastifySchema;
    handler: RouteDef["handler"];
    exposeHeadRoute?: boolean;
    config?: { listFilter: ListFilter };
    onRequest?: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    preHandler?: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    preSerialization?: (
      request: FastifyRequest,
      reply: FastifyReply,
      payload: unknown,
    ) => Promise<unknown>;
    onSend?: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  } = {
    method: def.method,
    url: def.url,
    schema: { ...def.schema },
    handler: def.handler,
  };
  if (!isPublic(def.auth)) {
    options.exposeHeadRoute = false;
    options.onRequest = authenticationHook(server, def.auth);
    options.preHandler = decisionPreHandler(server, def);
  }
  if (def.listFilter !== undefined) {
    const hooks = listFilterHooks(def.listFilter);
    options.config = { listFilter: def.listFilter };
    options.preSerialization = hooks.preSerialization;
    options.onSend = hooks.onSend;
  }
  try {
    server.route(options);
  } catch (error) {
    if (!isAlreadyStarted(error)) {
      throw error;
    }
  }

  state.defined.push({
    method: def.method,
    url: def.url,
    auth: def.auth,
    action: isPublic(def.auth) ? null : (def.action ?? null),
    errors: impliedErrors(def),
    schema: def.schema,
    listener: state.listener,
  });
}

export function registerAuthVerifier(
  kind: Exclude<AuthKind["kind"], "public">,
  verifier: AuthVerifier,
): void {
  if (kind === "session" || authVerifiers.has(kind)) {
    throw new RouteDefinitionError("ROUTE_DUPLICATE", "Authentication kind is already wired", {
      kind,
    });
  }
  authVerifiers.set(kind, verifier);
}

export function listDefinedRoutes(server: FastifyInstance): DefinedRoute[] {
  const state = server.ursitoareRoutes;
  if (state === undefined) {
    return [];
  }
  return [...state.defined];
}
