import { createHmac, hkdfSync, randomBytes } from "node:crypto";

import type { FastifyInstance, FastifyRequest } from "fastify";

import type { AuditEventInput, KeyMaterial } from "../audit/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import {
  CredentialsError,
  listCredentials,
  provisionCredential,
  provisionCredentialTx,
  rotateCredential,
} from "../credentials/index.ts";
import type { CredentialDeps } from "../credentials/index.ts";
import type { VaultAuthScheme, VaultWriter } from "../gateway/index.ts";
import type { Principal } from "../identity/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { pageRows } from "./admin-page.ts";
import { deriveCursorKey } from "./cursor.ts";
import type { CursorKey } from "./cursor.ts";
import { ApiError } from "./errors.ts";
import { pageSchema } from "./flow-common.ts";
import {
  IDEMPOTENCY_HEADER_SCHEMA,
  idempotencyKeyOf,
  requestDigestOf,
  withIdempotency,
} from "./idempotency.ts";
import { PAGE_QUERY_SCHEMA, readPage } from "./pagination.ts";
import { defineRoute } from "./route.ts";

export interface CredentialApiDeps {
  pool: TenantPool | null;
  vault: VaultWriter | null;
  ids: IdSource;
  clock: Clock;
  engineKey: KeyMaterial | null;
}

const CREDENTIALS_SCOPE = "credentials";
const CREDENTIAL_DIGEST_INFO = "ursitoare-credential-digest-v1";
const DIGEST_KEY_BYTES = 32;

const VALUE = {
  type: "string",
  minLength: 1,
  maxLength: 4096,
  writeOnly: true,
};

const RECORD_PROPERTIES = {
  id: { type: "string" },
  toolServerId: { type: "string" },
  serviceId: { type: "string" },
  authScheme: { type: "string", enum: ["API_KEY_HEADER", "BEARER_TOKEN"] },
  headerName: { type: ["string", "null"] },
  targetOrigin: { type: "string" },
  keyVersion: { type: "integer" },
  provisionedBy: { type: "string" },
  provisionedAt: { type: "string" },
  rotatedAt: { type: ["string", "null"] },
};

const RECORD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(RECORD_PROPERTIES),
  properties: RECORD_PROPERTIES,
};

const PROVISION_BODY = {
  type: "object",
  additionalProperties: false,
  required: ["toolServerId", "authScheme", "value"],
  properties: {
    toolServerId: { type: "string", minLength: 1, maxLength: 32 },
    authScheme: { type: "string", enum: ["API_KEY_HEADER", "BEARER_TOKEN"] },
    headerName: { type: "string", minLength: 1, maxLength: 64 },
    value: VALUE,
  },
};

const ROTATE_PARAMS = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: { type: "string", minLength: 1, maxLength: 128 } },
};

const ROTATE_BODY = {
  type: "object",
  additionalProperties: false,
  required: ["value"],
  properties: { value: VALUE },
};

const QUERY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { ...(PAGE_QUERY_SCHEMA["properties"] as Record<string, unknown>) },
};

interface ProvisionBody {
  toolServerId: string;
  authScheme: VaultAuthScheme;
  headerName?: string;
  value: string;
}

function unavailable(): ApiError {
  return new ApiError(503, "AUTHZ_UNAVAILABLE", "Authorization is unavailable");
}

function vaultNotConfigured(): ApiError {
  return new ApiError(
    503,
    "EGRESS_UNAVAILABLE",
    "The egress broker or vault is unavailable",
    { reason: "vault_not_configured" },
  );
}

function apiErrorOf(error: unknown): unknown {
  if (!(error instanceof CredentialsError)) return error;
  const details = error.details;
  switch (error.code) {
    case "CREDENTIALS_INVALID":
      return new ApiError(400, "VALIDATION_FAILED", "Request validation failed", {
        fields: [
          {
            field: `body/${details["field"] ?? ""}`,
            message: details["reason"] ?? "bad_value",
          },
        ],
      });
    case "CREDENTIALS_NOT_FOUND":
      return new ApiError(404, "NOT_FOUND", "Resource not found", { ...details });
    case "CREDENTIALS_EXISTS":
      return new ApiError(409, "ALREADY_EXISTS", "Resource already exists", { ...details });
    case "CREDENTIALS_VAULT":
      return new ApiError(
        503,
        "EGRESS_UNAVAILABLE",
        "The egress broker or vault is unavailable",
        { reason: details["reason"] ?? "unavailable" },
      );
  }
}

async function mapped<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw apiErrorOf(error);
  }
}

function actorOf(principal: Principal): AuditEventInput["actor"] {
  return {
    kind: principal.kind === "service" ? "service" : "user",
    id: principal.userId,
  };
}

function digestKeyOf(engineKey: KeyMaterial | null): Buffer {
  if (engineKey === null) return randomBytes(DIGEST_KEY_BYTES);
  const text = engineKey.reveal();
  const bytes = hkdfSync(
    "sha256",
    Buffer.from(text, "utf8"),
    Buffer.alloc(0),
    CREDENTIAL_DIGEST_INFO,
    DIGEST_KEY_BYTES,
  );
  return Buffer.from(bytes);
}

function credentialDigestOf(request: FastifyRequest, key: Buffer): string {
  const body = request.body as Record<string, unknown>;
  const value = typeof body["value"] === "string" ? body["value"] : "";
  const hashed = createHmac("sha256", key).update(value, "utf8").digest("hex");
  return requestDigestOf({
    method: request.method,
    route: request.routeOptions.url ?? request.url,
    params: request.params,
    query: request.query,
    body: { ...body, value: hashed },
  });
}

export function registerCredentialRoutes(server: FastifyInstance, deps: CredentialApiDeps): void {
  const key: CursorKey | null = deps.engineKey === null ? null : deriveCursorKey(deps.engineKey);
  const digestKey = digestKeyOf(deps.engineKey);

  const context = (
    request: FastifyRequest,
  ): { pool: TenantPool; tenant: TenantContext; principal: Principal } => {
    const tenant = request.tenant;
    const principal = request.principal;
    if (deps.pool === null || tenant === undefined || principal === undefined) {
      throw unavailable();
    }
    return { pool: deps.pool, tenant, principal };
  };

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/credentials",
    auth: { kind: "session" },
    action: "manage_credentials",
    schema: {
      headers: IDEMPOTENCY_HEADER_SCHEMA,
      body: PROVISION_BODY,
      response: { 201: RECORD_SCHEMA },
    },
    errors: [
      "ALREADY_EXISTS",
      "EGRESS_UNAVAILABLE",
      "IDEMPOTENCY_IN_PROGRESS",
      "IDEMPOTENCY_KEY_REUSED",
      "NOT_FOUND",
      "VALIDATION_FAILED",
    ],
    handler: async (request, reply) => {
      const { pool, tenant, principal } = context(request);
      const vault = deps.vault;
      if (vault === null) throw vaultNotConfigured();
      const body = request.body as ProvisionBody;
      const actor = actorOf(principal);
      const domainDeps: CredentialDeps = {
        pool,
        vault,
        ids: deps.ids,
        clock: deps.clock,
      };
      const input = {
        toolServerId: body.toolServerId,
        authScheme: body.authScheme,
        headerName: body.headerName ?? null,
        value: body.value,
      };

      const idempotencyKey = idempotencyKeyOf(request);
      if (idempotencyKey === null) {
        const created = await mapped(() =>
          provisionCredential(domainDeps, tenant, input, actor),
        );
        reply.code(201);
        return created;
      }

      const digest = credentialDigestOf(request, digestKey);
      const result = await mapped(() =>
        withIdempotency(
          { pool, tenant, clock: deps.clock },
          { userId: principal.userId },
          idempotencyKey,
          digest,
          async (tx) => {
            const created = await provisionCredentialTx(tx, domainDeps, tenant, input, actor);
            return { status: 201, body: created };
          },
        ),
      );
      if (result.replayed) reply.header("Idempotent-Replayed", "true");
      reply.code(result.status);
      return result.body;
    },
  });

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/credentials/:id/rotate",
    auth: { kind: "session" },
    action: "manage_credentials",
    schema: {
      params: ROTATE_PARAMS,
      body: ROTATE_BODY,
      response: { 200: RECORD_SCHEMA },
    },
    errors: ["EGRESS_UNAVAILABLE", "NOT_FOUND", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant, principal } = context(request);
      const vault = deps.vault;
      if (vault === null) throw vaultNotConfigured();
      const { id } = request.params as { id: string };
      const body = request.body as { value: string };
      const domainDeps: CredentialDeps = {
        pool,
        vault,
        ids: deps.ids,
        clock: deps.clock,
      };
      return mapped(() =>
        rotateCredential(domainDeps, tenant, id, body.value, actorOf(principal)),
      );
    },
  });

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/credentials",
    auth: { kind: "session" },
    action: "manage_credentials",
    schema: {
      querystring: QUERY_SCHEMA,
      response: { 200: pageSchema(RECORD_SCHEMA) },
    },
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant } = context(request);
      const page = readPage(request.query);
      const rows = await listCredentials(pool, tenant);
      return pageRows(
        rows,
        page,
        { key, tenantId: tenant.tenantId, scope: CREDENTIALS_SCOPE },
        (record) => [record.id],
      );
    },
  });
}
