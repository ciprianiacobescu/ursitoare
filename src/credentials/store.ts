import { formatAt } from "../audit/index.ts";
import type { VaultAuthScheme } from "../gateway/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import type { CredentialRecord } from "./types.ts";

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

const SELECT_ALL = `SELECT credential_id, tool_server_id, mintkey_service_id, auth_scheme, header_name,
    target_origin, key_version, provisioned_by, provisioned_at, rotated_at
  FROM ursitoare.credential_ref
  WHERE tenant_id = $1
  ORDER BY credential_id COLLATE "C"`;

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

export async function listCredentials(
  pool: TenantPool,
  ctx: TenantContext,
): Promise<CredentialRecord[]> {
  return withTenantTx(pool, ctx, async (tx) => {
    const { rows } = await tx.query<CredentialRow>(SELECT_ALL, [ctx.tenantId]);
    return rows.map(toRecord);
  });
}
