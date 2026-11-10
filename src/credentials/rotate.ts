import { appendAudit, formatAt } from "../audit/index.ts";
import type { AuditEventInput } from "../audit/index.ts";
import type { VaultAuthScheme } from "../gateway/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantTx } from "../tenancy/index.ts";
import { CredentialsError } from "./types.ts";
import type { CredentialDeps, CredentialRecord } from "./types.ts";
import { checkValue } from "./validate.ts";
import { putVerified } from "./vault-call.ts";

interface CredentialRow {
  credential_id: string;
  tool_server_id: string;
  mintkey_service_id: string;
  auth_scheme: VaultAuthScheme;
  header_name: string | null;
  target_origin: string;
  key_version: number;
  provisioned_by: string;
  provisioned_at: Date;
  rotated_at: Date | null;
}

const SELECT_ROW = `SELECT credential_id, tool_server_id, mintkey_service_id, auth_scheme, header_name,
    target_origin, key_version, provisioned_by, provisioned_at, rotated_at
  FROM ursitoare.credential_ref
  WHERE tenant_id = $1 AND credential_id = $2
  FOR UPDATE`;

const UPDATE_ROW = `UPDATE ursitoare.credential_ref
  SET key_version = $3, rotated_at = $4
  WHERE tenant_id = $1 AND credential_id = $2
  RETURNING credential_id, tool_server_id, mintkey_service_id, auth_scheme, header_name,
    target_origin, key_version, provisioned_by, provisioned_at, rotated_at`;

function toRecord(row: CredentialRow): CredentialRecord {
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
    rotatedAt: row.rotated_at === null ? null : formatAt(row.rotated_at),
  };
}

export async function rotateCredential(
  deps: CredentialDeps,
  ctx: TenantContext,
  credentialId: string,
  value: string,
  actor: AuditEventInput["actor"],
): Promise<CredentialRecord> {
  checkValue(value);
  return withTenantTx(deps.pool, ctx, async (tx: TenantTx) => {
    const selected = await tx.query<CredentialRow>(SELECT_ROW, [ctx.tenantId, credentialId]);
    const row = selected.rows[0];
    if (row === undefined) {
      throw new CredentialsError("CREDENTIALS_NOT_FOUND", "credential not found", { credentialId });
    }
    const { keyVersion } = await putVerified(deps, ctx, {
      serviceId: row.mintkey_service_id,
      authScheme: row.auth_scheme,
      value: new TextEncoder().encode(value),
      headerName: row.header_name,
      callerActorId: actor.id,
      targetUrl: row.target_origin,
    });
    const rotatedAt = deps.clock.now();
    const updated = await tx.query<CredentialRow>(UPDATE_ROW, [
      ctx.tenantId,
      credentialId,
      keyVersion,
      rotatedAt,
    ]);
    const rotated = updated.rows[0];
    if (rotated === undefined) throw new Error("credential update returned no row");
    await appendAudit(
      tx,
      ctx,
      {
        eventType: "credentials.rotated",
        actor,
        target: { kind: "credential", id: credentialId },
        payload: { serviceId: row.mintkey_service_id, keyVersion },
      },
      { clock: deps.clock },
    );
    return toRecord(rotated);
  });
}
