import { createHash } from "node:crypto";

import type { FastifyInstance, FastifyRequest } from "fastify";

import type { IdpLinkRecord, UserState } from "../identity/index.ts";
import {
  addIdpLink,
  getAccount,
  listAccounts,
  listIdpLinks,
  setAccountState,
} from "../identity/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import { encodeCursor } from "./cursor.ts";
import type { CursorPosition } from "./cursor.ts";
import { pageRows } from "./admin-page.ts";
import {
  adminActorOf,
  adminHandler,
  adminNotFound,
  requireAdminContext,
  requireAdminPool,
} from "./admin-routes.ts";
import type { AdminRouteDeps } from "./admin-routes.ts";
import { ApiError } from "./errors.ts";
import { IDEMPOTENCY_HEADER_SCHEMA, respondIdempotent } from "./idempotency.ts";
import { PAGE_QUERY_SCHEMA, readPage, startAfter } from "./pagination.ts";
import { defineRoute } from "./route.ts";

const USER_ID_PATTERN = "^[A-Za-z0-9_-]{1,64}$";
const USERS_SCOPE = "users";
const IDP_LINKS_SCOPE = "idp_links";

const PAGE_PROPERTIES = PAGE_QUERY_SCHEMA["properties"] as Record<string, unknown>;

const ACCOUNT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "userId",
    "kind",
    "ownerUserId",
    "displayName",
    "email",
    "state",
    "roles",
    "teams",
    "localRoles",
  ],
  properties: {
    userId: { type: "string" },
    kind: { type: "string", enum: ["human", "service"] },
    ownerUserId: { type: ["string", "null"] },
    displayName: { type: "string" },
    email: { type: ["string", "null"] },
    state: { type: "string", enum: ["active", "disabled"] },
    roles: { type: "array", items: { type: "string" } },
    teams: { type: "array", items: { type: "string" } },
    localRoles: { type: "array", items: { type: "string" } },
  },
};

const ACCOUNT_PAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "next_cursor"],
  properties: {
    items: { type: "array", items: ACCOUNT_SCHEMA },
    next_cursor: { type: ["string", "null"] },
  },
};

const IDP_LINK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["issuer", "subject", "linkedAt"],
  properties: {
    issuer: { type: "string" },
    subject: { type: "string" },
    linkedAt: { type: "string" },
  },
};

const IDP_LINK_PAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "next_cursor"],
  properties: {
    items: { type: "array", items: IDP_LINK_SCHEMA },
    next_cursor: { type: ["string", "null"] },
  },
};

const USER_PARAMS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["userId"],
  properties: {
    userId: { type: "string", pattern: USER_ID_PATTERN },
  },
};

const USERS_QUERY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...PAGE_PROPERTIES,
    state: { type: "string", enum: ["active", "disabled"] },
  },
};

const IDP_LINKS_QUERY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...PAGE_PROPERTIES,
  },
};

const STATE_BODY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["state"],
  properties: {
    state: { type: "string", enum: ["active", "disabled"] },
  },
};

const IDP_LINK_BODY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["issuer", "subject"],
  properties: {
    issuer: { type: "string", minLength: 1, maxLength: 2048 },
    subject: { type: "string", minLength: 1, maxLength: 512 },
  },
};

function engineKeyRequired(): ApiError {
  return new ApiError(
    503,
    "ENGINE_KEY_REQUIRED",
    "Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)",
  );
}

function cursorInvalid(): ApiError {
  return new ApiError(400, "CURSOR_INVALID", "Cursor is invalid");
}

function userIdOf(request: FastifyRequest): string {
  const params = request.params as { userId?: unknown };
  const userId = params.userId;
  if (typeof userId !== "string") {
    throw new ApiError(400, "VALIDATION_FAILED", "Request validation failed");
  }
  return userId;
}

function stateOf(request: FastifyRequest): UserState | undefined {
  const query = request.query as Record<string, unknown>;
  const value = query.state;
  if (value === undefined) return undefined;
  if (value === "active" || value === "disabled") return value;
  throw new ApiError(400, "VALIDATION_FAILED", "Request validation failed");
}

function userIdAfter(position: CursorPosition): string {
  const first = position[0];
  if (position.length !== 1 || typeof first !== "string") throw cursorInvalid();
  return first;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function idpLinkPosition(link: IdpLinkRecord): CursorPosition {
  return [sha256Hex(link.issuer), link.subject];
}

export function registerAdminUsersRoutes(
  server: FastifyInstance,
  deps: AdminRouteDeps,
): void {
  defineRoute(server, {
    method: "GET",
    url: "/api/v1/users",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: { querystring: USERS_QUERY_SCHEMA, response: { 200: ACCOUNT_PAGE_SCHEMA } },
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
    handler: adminHandler(async (request) => {
      const { tenant } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const page = readPage(request.query);
      const state = stateOf(request);
      const key = deps.key;
      const binding =
        key === null ? null : { key, tenantId: tenant.tenantId, scope: USERS_SCOPE };
      if (binding === null && page.cursor !== null) throw engineKeyRequired();
      const position = binding === null ? null : startAfter(binding, page.cursor);
      const after = position === null ? undefined : userIdAfter(position);

      const result = await withTenantTx(pool, tenant, (tx) =>
        listAccounts(tx, tenant, {
          kind: "human",
          state,
          limit: page.limit,
          after,
        }),
      );

      if (binding === null) {
        if (result.next !== null) throw engineKeyRequired();
        return { items: result.users, next_cursor: null };
      }

      const last = result.users[result.users.length - 1];
      const next_cursor =
        result.next !== null && last !== undefined
          ? encodeCursor(binding.key, {
              tenantId: binding.tenantId,
              scope: binding.scope,
              position: [last.userId],
            })
          : null;
      return { items: result.users, next_cursor };
    }, deps),
  });

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/users/:userId",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: {
      params: USER_PARAMS_SCHEMA,
      response: { 200: ACCOUNT_SCHEMA },
    },
    errors: ["NOT_FOUND", "VALIDATION_FAILED"],
    handler: adminHandler(async (request) => {
      const { tenant } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const userId = userIdOf(request);
      const account = await withTenantTx(pool, tenant, (tx) =>
        getAccount(tx, tenant, userId, "human"),
      );
      if (account === null) throw adminNotFound();
      return account;
    }, deps),
  });

  defineRoute(server, {
    method: "PATCH",
    url: "/api/v1/users/:userId",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: {
      params: USER_PARAMS_SCHEMA,
      body: STATE_BODY_SCHEMA,
      response: { 200: ACCOUNT_SCHEMA },
    },
    errors: ["NOT_FOUND", "OPERATION_REFUSED", "VALIDATION_FAILED"],
    handler: adminHandler(async (request) => {
      const { tenant, principal } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const userId = userIdOf(request);
      const body = request.body as { state: UserState };
      const account = await withTenantTx(pool, tenant, async (tx) => {
        await setAccountState(
          tx,
          tenant,
          { userId, kind: "human", state: body.state },
          adminActorOf(principal),
          { clock: deps.clock },
        );
        return getAccount(tx, tenant, userId, "human");
      });
      if (account === null) throw adminNotFound();
      return account;
    }, deps),
  });

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/users/:userId/idp-links",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: {
      params: USER_PARAMS_SCHEMA,
      querystring: IDP_LINKS_QUERY_SCHEMA,
      response: { 200: IDP_LINK_PAGE_SCHEMA },
    },
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "NOT_FOUND", "VALIDATION_FAILED"],
    handler: adminHandler(async (request) => {
      const { tenant } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const userId = userIdOf(request);
      const links = await withTenantTx(pool, tenant, (tx) =>
        listIdpLinks(tx, tenant, userId),
      );
      return pageRows(
        links,
        readPage(request.query),
        { key: deps.key, tenantId: tenant.tenantId, scope: IDP_LINKS_SCOPE },
        idpLinkPosition,
      );
    }, deps),
  });

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/users/:userId/idp-links",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: {
      params: USER_PARAMS_SCHEMA,
      headers: IDEMPOTENCY_HEADER_SCHEMA,
      body: IDP_LINK_BODY_SCHEMA,
      response: { 201: IDP_LINK_SCHEMA },
    },
    errors: [
      "ALREADY_EXISTS",
      "IDEMPOTENCY_IN_PROGRESS",
      "IDEMPOTENCY_KEY_REUSED",
      "NOT_FOUND",
      "OPERATION_REFUSED",
      "UNKNOWN_ISSUER",
      "VALIDATION_FAILED",
    ],
    handler: adminHandler(async (request, reply) => {
      const { tenant, principal } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const userId = userIdOf(request);
      const body = request.body as { issuer: string; subject: string };
      return respondIdempotent(
        { pool, clock: deps.clock },
        request,
        reply,
        async (tx) => {
          const link = await addIdpLink(
            tx,
            tenant,
            { userId, issuer: body.issuer, subject: body.subject },
            adminActorOf(principal),
            { clock: deps.clock },
          );
          return { status: 201, body: link };
        },
      );
    }, deps),
  });
}
