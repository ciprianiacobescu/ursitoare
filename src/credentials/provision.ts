import { appendAudit, formatAt } from "../audit/index.ts";
import type { AuditEventInput } from "../audit/index.ts";
import type { VaultAuthScheme } from "../gateway/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantTx } from "../tenancy/index.ts";
import { CredentialsError } from "./types.ts";
import type { CredentialDeps, CredentialRecord } from "./types.ts";
import { checkProvision } from "./validate.ts";
import { putVerified } from "./vault-call.ts";

interface ProvisionInput {
  toolServerId: string;
  authScheme: VaultAuthScheme;
  headerName: string | null;
  value: string;
  serviceId?: string;
}

interface InsertedRow {
  credential_id: string;
  tool_server_id: string;
  mintkey_service_id: string;
  auth_scheme: VaultAuthScheme;
  header_name: string | null;
  target_origin: string;
  key_version: number;
  provisioned_by: string;
  provisioned_at: Date;
}

function mapInsertError(error: unknown, toolServerId: string, serviceId: string): unknown {
  const e = error as { code?: unknown; constraint?: unknown } | null;
  if (e !== null && typeof e === "object") {
    if (e.code === "23505" && e.constraint === "credential_ref_server_key") {
      return new CredentialsError("CREDENTIALS_EXISTS", "credential already exists", { toolServerId });
    }
    if (e.code === "23505" && e.constraint === "credential_ref_service_key") {
      return new CredentialsError("CREDENTIALS_EXISTS", "credential already exists", { serviceId });
    }
    if (e.code === "23503" && e.constraint === "credential_ref_tool_server_fkey") {
      return new CredentialsError("CREDENTIALS_NOT_FOUND", "tool server not found", { toolServerId });
    }
  }
  return error;
}

export async function provisionCredential(
  deps: CredentialDeps,
  ctx: TenantContext,
  input: ProvisionInput,
  actor: AuditEventInput["actor"],
): Promise<CredentialRecord> {
  return withTenantTx(deps.pool, ctx, (tx) => provisionCredentialTx(tx, deps, ctx, input, actor));
}

export async function provisionCredentialTx(
  tx: TenantTx,
  deps: CredentialDeps,
  ctx: TenantContext,
  input: ProvisionInput,
  actor: AuditEventInput["actor"],
): Promise<CredentialRecord> {
  checkProvision(input);
  const server = await tx.query<{ origin: string }>(
    "SELECT origin FROM ursitoare.tool_server WHERE tenant_id = $1 AND tool_server_id = $2",
    [ctx.tenantId, input.toolServerId],
  );
  const origin = server.rows[0]?.origin;
  if (origin === undefined) {
    throw new CredentialsError("CREDENTIALS_NOT_FOUND", "tool server not found", {
      toolServerId: input.toolServerId,
    });
  }
  const byServer = await tx.query(
    "SELECT 1 FROM ursitoare.credential_ref WHERE tenant_id = $1 AND tool_server_id = $2",
    [ctx.tenantId, input.toolServerId],
  );
  if (byServer.rows.length > 0) {
    throw new CredentialsError("CREDENTIALS_EXISTS", "credential already exists", {
      toolServerId: input.toolServerId,
    });
  }
  if (input.serviceId !== undefined) {
    const byService = await tx.query(
      "SELECT 1 FROM ursitoare.credential_ref WHERE tenant_id = $1 AND mintkey_service_id = $2",
      [ctx.tenantId, input.serviceId],
    );
    if (byService.rows.length > 0) {
      throw new CredentialsError("CREDENTIALS_EXISTS", "credential already exists", {
        serviceId: input.serviceId,
      });
    }
  }
  const serviceId = input.serviceId ?? deps.ids.next("svc").slice("svc_".length);
  const { keyVersion } = await putVerified(deps, ctx, {
    serviceId,
    authScheme: input.authScheme,
    value: new TextEncoder().encode(input.value),
    headerName: input.headerName,
    callerActorId: actor.id,
    targetUrl: origin,
  });
  const id = deps.ids.next("cred");
  let row: InsertedRow | undefined;
  try {
    const inserted = await tx.query<InsertedRow>(
      `INSERT INTO ursitoare.credential_ref
         (tenant_id, credential_id, tool_server_id, mintkey_service_id, auth_scheme, header_name,
          target_origin, key_version, provisioned_by, provisioned_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING credential_id, tool_server_id, mintkey_service_id, auth_scheme, header_name,
         target_origin, key_version, provisioned_by, provisioned_at`,
      [
        ctx.tenantId,
        id,
        input.toolServerId,
        serviceId,
        input.authScheme,
        input.headerName,
        origin,
        keyVersion,
        actor.id,
        deps.clock.now(),
      ],
    );
    row = inserted.rows[0];
  } catch (error) {
    throw mapInsertError(error, input.toolServerId, serviceId);
  }
  if (row === undefined) throw new Error("credential insert returned no row");
  await appendAudit(
    tx,
    ctx,
    {
      eventType: "credentials.provisioned",
      actor,
      target: { kind: "credential", id },
      payload: { serviceId, authScheme: input.authScheme, keyVersion, targetOrigin: origin },
    },
    { clock: deps.clock },
  );
  return {
    id: row.credential_id,
    toolServerId: row.tool_server_id,
    serviceId: row.mintkey_service_id,
    authScheme: row.auth_scheme,
    headerName: row.header_name,
    targetOrigin: row.target_origin,
    keyVersion: row.key_version,
    provisionedBy: row.provisioned_by,
    provisionedAt: formatAt(row.provisioned_at),
    rotatedAt: null,
  };
}
