import type { QueryResultRow } from "pg";

import { systemClock, systemIds, type Clock, type IdSource } from "../core/index.ts";
import type { TenantContext } from "./context.ts";
import { TenancyError } from "./errors.ts";
import { inTransaction, type TenantPool } from "./tx.ts";

export interface EnsureTenantOptions {
  ids?: IdSource;
  clock?: Clock;
}

const MAX_TENANT_NAME_LENGTH = 200;

const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/;

interface TenantRow extends QueryResultRow {
  tenant_id: string;
  review_profile: string;
}

interface CountRow extends QueryResultRow {
  n: number;
}

function assertTenantName(name: string): void {
  if (
    typeof name !== "string" ||
    name !== name.trim() ||
    Array.from(name).length < 1 ||
    Array.from(name).length > MAX_TENANT_NAME_LENGTH
  ) {
    throw new TenancyError("TENANT_INVALID", "invalid tenant name");
  }
}

function toContext(row: TenantRow): TenantContext {
  return {
    tenantId: row.tenant_id,
    reviewProfile: row.review_profile as TenantContext["reviewProfile"],
  };
}

function sqlState(error: unknown): string | undefined {
  if (error instanceof TenancyError) {
    return undefined;
  }
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && SQLSTATE_PATTERN.test(code) ? code : undefined;
}

export async function ensureDefaultTenant(
  pool: TenantPool,
  name: string,
  opts: EnsureTenantOptions = {},
): Promise<TenantContext> {
  assertTenantName(name);

  const ids = opts.ids ?? systemIds;
  const clock = opts.clock ?? systemClock;

  try {
    return await inTransaction(pool, async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended('ursitoare:ensure_default_tenant', 0))",
      );

      const existing = await client.query<TenantRow>(
        "SELECT tenant_id, review_profile FROM ursitoare.tenant WHERE name = $1",
        [name],
      );
      const existingRow = existing.rows[0];
      if (existingRow !== undefined) {
        return toContext(existingRow);
      }

      const count = await client.query<CountRow>(
        "SELECT count(*)::int AS n FROM ursitoare.tenant",
      );
      if ((count.rows[0]?.n ?? 0) > 0) {
        throw new TenancyError("TENANT_DEFAULT_CONFLICT", "a tenant already exists");
      }

      const inserted = await client.query<TenantRow>(
        `INSERT INTO ursitoare.tenant (tenant_id, name, created_at)
         VALUES ($1, $2, $3)
         RETURNING tenant_id, review_profile`,
        [ids.next("ten"), name, clock.now()],
      );
      const insertedRow = inserted.rows[0];
      if (insertedRow === undefined) {
        throw new TenancyError("TENANT_BOOTSTRAP_FAILED", "could not create the default tenant");
      }
      return toContext(insertedRow);
    });
  } catch (error) {
    if (error instanceof TenancyError) {
      throw error;
    }
    const state = sqlState(error);
    if (state !== undefined) {
      throw new TenancyError("TENANT_BOOTSTRAP_FAILED", "could not create the default tenant", {
        sqlstate: state,
      });
    }
    throw error;
  }
}
