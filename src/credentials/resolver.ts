import { createHash } from "node:crypto";

import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import type { ServiceResolver, ServiceTarget } from "./types.ts";

interface TargetRow {
  mintkey_service_id: string;
  target_origin: string;
}

const SELECT_TARGET = `SELECT mintkey_service_id, target_origin
  FROM ursitoare.credential_ref
  WHERE tenant_id = $1 AND tool_server_id = $2`;

export function createServiceResolver(pool: TenantPool): ServiceResolver {
  return {
    async resolve(ctx: TenantContext, toolServerId: string): Promise<ServiceTarget | null> {
      return withTenantTx(pool, ctx, async (tx) => {
        const { rows } = await tx.query<TargetRow>(SELECT_TARGET, [ctx.tenantId, toolServerId]);
        const row = rows[0];
        if (row === undefined) return null;
        return { serviceId: row.mintkey_service_id, origin: row.target_origin };
      });
    },
  };
}

export function seedServiceId(tenantId: string, toolServerId: string): string {
  const digest = createHash("sha256")
    .update(`ursitoare-service:${tenantId}/${toolServerId}`, "utf8")
    .digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x80;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
