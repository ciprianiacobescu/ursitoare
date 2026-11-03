import { RunDataError } from "./errors.ts";
import type { TenantContext, TenantTx } from "./types.ts";

export async function assertTenantTx(tx: TenantTx, ctx: TenantContext): Promise<void> {
  const { rows } = await tx.query<{ tenant_id: string | null }>(
    "SELECT current_setting('app.tenant_id', true) AS tenant_id",
  );
  if (rows[0]?.tenant_id !== ctx.tenantId) {
    throw new RunDataError("RUN_DATA_INVALID", "tenant mismatch");
  }
}

export function isSqlState(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === code
  );
}
