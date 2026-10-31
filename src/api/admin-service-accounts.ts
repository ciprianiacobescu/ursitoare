import type { FastifyInstance, FastifyRequest } from "fastify";

import { grantRole, revokeRole } from "../identity/index.ts";
import type { UserState } from "../identity/index.ts";
import {
  getAccount,
  listAccounts,
  provisionServiceAccount,
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
const ROLE_ID_PATTERN = "^[a-z][a-z0-9_]{0,31}$";
const SERVICE_ACCOUNTS_SCOPE = "service_accounts";
const SERVICE_ACCOUNT_ROLES_SCOPE = "service_account_roles";

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

const ROLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["roleId"],
  properties: {
    roleId: { type: "string" },
  },
};

const ROLE_PAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "next_cursor"],
  properties: {
    items: { type: "array", items: ROLE_SCHEMA },
    next_cursor: { type: ["string", "null"] },
  },
};

const GRANT_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["roleId", "result"],
  properties: {
    roleId: { type: "string" },
    result: { type: "string", enum: ["granted", "exists"] },
  },
};

const ACCOUNT_PARAMS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["userId"],
  properties: {
    userId: { type: "string", pattern: USER_ID_PATTERN },
  },
};

const ROLE_PARAMS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["userId", "roleId"],
  properties: {
    userId: { type: "string", pattern: USER_ID_PATTERN },
    roleId: { type: "string", pattern: ROLE_ID_PATTERN },
  },
};

const SERVICE_ACCOUNTS_QUERY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...PAGE_PROPERTIES,
    state: { type: "string", enum: ["active", "disabled"] },
  },
};

const ROLES_QUERY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...PAGE_PROPERTIES,
  },
};

const CREATE_BODY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["displayName"],
  properties: {
    displayName: { type: "string", minLength: 1, maxLength: 200 },
    ownerUserId: { type: "string", pattern: USER_ID_PATTERN },
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

function validationFailed(): ApiError {
  return new ApiError(400, "VALIDATION_FAILED", "Request validation failed");
}

function paramOf(request: FastifyRequest, name: string): string {
  const params = request.params as Record<string, unknown>;
  const value = params[name];
  if (typeof value !== "string") throw validationFailed();
  return value;
}

function stateOf(request: FastifyRequest): UserState | undefined {
  const query = request.query as Record<string, unknown>;
  const value = query.state;
  if (value === undefined) return undefined;
  if (value === "active" || value === "disabled") return value;
  throw validationFailed();
}

function userIdAfter(position: CursorPosition): string {
  const first = position[0];
  if (position.length !== 1 || typeof first !== "string") throw cursorInvalid();
  return first;
}

export function registerAdminServiceAccountRoutes(
  server: FastifyInstance,
  deps: AdminRouteDeps,
): void {
  defineRoute(server, {
    method: "GET",
    url: "/api/v1/service-accounts",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: { querystring: SERVICE_ACCOUNTS_QUERY_SCHEMA, response: { 200: ACCOUNT_PAGE_SCHEMA } },
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
    handler: adminHandler(async (request) => {
      const { tenant } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const page = readPage(request.query);
      const state = stateOf(request);
      const key = deps.key;
      const binding =
        key === null ? null : { key, tenantId: tenant.tenantId, scope: SERVICE_ACCOUNTS_SCOPE };
      if (binding === null && page.cursor !== null) throw engineKeyRequired();
      const position = binding === null ? null : startAfter(binding, page.cursor);
      const after = position === null ? undefined : userIdAfter(position);

      const result = await withTenantTx(pool, tenant, (tx) =>
        listAccounts(tx, tenant, {
          kind: "service",
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
    }),
  });

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/service-accounts",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: {
      headers: IDEMPOTENCY_HEADER_SCHEMA,
      body: CREATE_BODY_SCHEMA,
      response: { 201: ACCOUNT_SCHEMA },
    },
    errors: [
      "IDEMPOTENCY_IN_PROGRESS",
      "IDEMPOTENCY_KEY_REUSED",
      "OPERATION_REFUSED",
      "VALIDATION_FAILED",
    ],
    handler: adminHandler(async (request, reply) => {
      const { tenant, principal } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const body = request.body as { displayName: string; ownerUserId?: string };
      const actor = adminActorOf(principal);
      const identityOpts = { clock: deps.clock, ids: deps.ids };
      return respondIdempotent({ pool, clock: deps.clock }, request, reply, async (tx) => {
        const user = await provisionServiceAccount(
          tx,
          tenant,
          { displayName: body.displayName, ownerUserId: body.ownerUserId ?? actor.userId },
          actor,
          identityOpts,
        );
        const account = await getAccount(tx, tenant, user.userId, "service");
        if (account === null) throw adminNotFound();
        return { status: 201, body: account };
      });
    }),
  });

  defineRoute(server, {
    method: "PATCH",
    url: "/api/v1/service-accounts/:userId",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: {
      params: ACCOUNT_PARAMS_SCHEMA,
      body: STATE_BODY_SCHEMA,
      response: { 200: ACCOUNT_SCHEMA },
    },
    errors: ["NOT_FOUND", "OPERATION_REFUSED", "VALIDATION_FAILED"],
    handler: adminHandler(async (request) => {
      const { tenant, principal } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const userId = paramOf(request, "userId");
      const body = request.body as { state: UserState };
      const account = await withTenantTx(pool, tenant, async (tx) => {
        await setAccountState(
          tx,
          tenant,
          { userId, kind: "service", state: body.state },
          adminActorOf(principal),
          { clock: deps.clock },
        );
        return getAccount(tx, tenant, userId, "service");
      });
      if (account === null) throw adminNotFound();
      return account;
    }),
  });

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/service-accounts/:userId/roles",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: {
      params: ACCOUNT_PARAMS_SCHEMA,
      querystring: ROLES_QUERY_SCHEMA,
      response: { 200: ROLE_PAGE_SCHEMA },
    },
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "NOT_FOUND", "VALIDATION_FAILED"],
    handler: adminHandler(async (request) => {
      const { tenant } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const userId = paramOf(request, "userId");
      const account = await withTenantTx(pool, tenant, (tx) =>
        getAccount(tx, tenant, userId, "service"),
      );
      if (account === null) throw adminNotFound();
      return pageRows(
        account.localRoles.map((roleId) => ({ roleId })),
        readPage(request.query),
        { key: deps.key, tenantId: tenant.tenantId, scope: SERVICE_ACCOUNT_ROLES_SCOPE },
        (row) => [row.roleId],
      );
    }),
  });

  defineRoute(server, {
    method: "PUT",
    url: "/api/v1/service-accounts/:userId/roles/:roleId",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: {
      params: ROLE_PARAMS_SCHEMA,
      response: { 200: GRANT_RESULT_SCHEMA },
    },
    errors: ["ELEVATION_REFUSED", "NOT_FOUND", "VALIDATION_FAILED"],
    handler: adminHandler(async (request) => {
      const { tenant, principal } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const userId = paramOf(request, "userId");
      const roleId = paramOf(request, "roleId");
      const actor = adminActorOf(principal);
      const result = await withTenantTx(pool, tenant, async (tx) => {
        const account = await getAccount(tx, tenant, userId, "service");
        if (account === null) throw adminNotFound();
        return grantRole(tx, tenant, { userId, roleId }, actor, {
          clock: deps.clock,
          ids: deps.ids,
        });
      });
      return { roleId, result };
    }),
  });

  defineRoute(server, {
    method: "DELETE",
    url: "/api/v1/service-accounts/:userId/roles/:roleId",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: {
      params: ROLE_PARAMS_SCHEMA,
    },
    errors: ["ELEVATION_REFUSED", "NOT_FOUND", "VALIDATION_FAILED"],
    handler: adminHandler(async (request, reply) => {
      const { tenant, principal } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const userId = paramOf(request, "userId");
      const roleId = paramOf(request, "roleId");
      const actor = adminActorOf(principal);
      const revoked = await withTenantTx(pool, tenant, async (tx) => {
        const account = await getAccount(tx, tenant, userId, "service");
        if (account === null) throw adminNotFound();
        return revokeRole(tx, tenant, { userId, roleId }, actor, {
          clock: deps.clock,
          ids: deps.ids,
        });
      });
      if (!revoked) throw adminNotFound();
      reply.code(204).send(undefined);
      return reply;
    }),
  });
}
