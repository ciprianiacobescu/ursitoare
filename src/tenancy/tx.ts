import type pg from "pg";

import { assertTenantContext, type TenantContext } from "./context.ts";
import { TenancyError } from "./errors.ts";

export type TenantPool = Pick<pg.Pool, "connect">;

export type TenantTx = Pick<pg.PoolClient, "query">;

function noop(): void {
  // A checked-out client needs an error listener so a dropped connection never crashes the process.
}

export async function withTenantTx<T>(
  pool: TenantPool,
  ctx: TenantContext,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  assertTenantContext(ctx);
  return inTransaction(pool, async (client) => {
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [ctx.tenantId]);
    return fn(client);
  });
}

// Module-internal: exported from this file, not from index.ts.
export async function inTransaction<T>(
  pool: TenantPool,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  client.on("error", noop);

  let result: T | undefined;
  let failure: unknown;
  let aborted = false;
  let destroy = false;

  try {
    await client.query("BEGIN");
    result = await fn(client);
    const committed = await client.query("COMMIT");
    if (committed.command === "ROLLBACK") {
      aborted = true;
    }
  } catch (error) {
    failure = error;
    try {
      await client.query("ROLLBACK");
    } catch {
      destroy = true;
    }
  }

  try {
    await client.query("SELECT set_config('app.tenant_id', '', false)");
  } catch (error) {
    destroy = true;
    if (failure === undefined) {
      failure = error;
    }
  }

  client.removeListener("error", noop);
  client.release(destroy);

  if (aborted) {
    throw new TenancyError("TENANT_TX_ABORTED", "transaction aborted");
  }
  if (failure !== undefined) {
    throw failure;
  }
  return result as T;
}
