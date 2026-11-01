// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { formatAt } from "../audit/index.ts";
import type { BlockDef, Effect, JsonSchema } from "../authoring/index.ts";
import type { Clock } from "../core/index.ts";
import type { TenantContext, TenantPool, TenantTx } from "../tenancy/index.ts";
import type { BlockBinding, BlockImport } from "./block-input.ts";
import { RegistryError } from "./errors.ts";

export interface BlockVersion {
  ref: string;
  def: BlockDef;
  binding: BlockBinding | null;
  contentHash: string;
  importedBy: string;
  importedAt: string;
}

export interface ImportReport {
  imported: string[];
  unchanged: string[];
}

interface BlockRow {
  ref: string;
  effect: Effect;
  description: string | null;
  input: JsonSchema;
  output: JsonSchema;
  untrusted_fields: string[];
  data_class: "public" | "private" | null;
  untrusted_result: boolean;
  unsafe_to_retry: boolean;
  binding: BlockBinding | null;
  content_hash: string;
  imported_by: string;
  imported_at: Date;
}

const VERSION_COLUMNS = `ref, effect, description, input, output, untrusted_fields, data_class,
  untrusted_result, unsafe_to_retry, binding, content_hash, imported_by, imported_at`;

function toVersion(row: BlockRow): BlockVersion {
  const def: BlockDef = {
    effect: row.effect,
    ...(row.description === null ? {} : { description: row.description }),
    input: row.input,
    output: row.output,
    untrusted_fields: [...row.untrusted_fields],
    ...(row.data_class === null ? {} : { data_class: row.data_class }),
    untrusted_result: row.untrusted_result,
    unsafe_to_retry: row.unsafe_to_retry,
  };
  return {
    ref: row.ref,
    def,
    binding: row.binding === null ? null : row.binding,
    contentHash: row.content_hash,
    importedBy: row.imported_by,
    importedAt: formatAt(row.imported_at),
  };
}

async function assertTenantMatches(tx: TenantTx, ctx: TenantContext): Promise<void> {
  const result = await tx.query<{ t: string | null }>(
    "SELECT current_setting('app.tenant_id', true) AS t",
  );
  if (result.rows[0]?.t !== ctx.tenantId) {
    throw new RegistryError("REGISTRY_TENANT_MISMATCH", "transaction belongs to another tenant");
  }
}

export async function importCatalogue(
  _pool: TenantPool,
  _ctx: TenantContext,
  _blocks: { [ref: string]: BlockImport },
  _actor: { kind: "user" | "service" | "system"; id: string },
  _opts?: { clock?: Clock },
): Promise<ImportReport> {
  throw new Error("not implemented");
}

export async function getBlockVersion(
  tx: TenantTx,
  ctx: TenantContext,
  ref: string,
): Promise<BlockVersion | null> {
  await assertTenantMatches(tx, ctx);
  const result = await tx.query<BlockRow>(
    `SELECT ${VERSION_COLUMNS} FROM ursitoare.block_version
     WHERE tenant_id = $1 AND ref = $2`,
    [ctx.tenantId, ref],
  );
  const row = result.rows[0];
  return row === undefined ? null : toVersion(row);
}

export async function listBlockVersions(
  tx: TenantTx,
  ctx: TenantContext,
  q: { limit: number; after?: string | undefined },
): Promise<BlockVersion[]> {
  if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 201) {
    throw new RegistryError("REGISTRY_INVALID", "block list limit is invalid", {
      field: "limit",
      reason: "bad_value",
    });
  }
  if (
    q.after !== undefined &&
    (typeof q.after !== "string" || q.after.length < 1 || q.after.length > 128)
  ) {
    throw new RegistryError("REGISTRY_INVALID", "block list cursor is invalid", {
      field: "after",
      reason: "bad_value",
    });
  }
  await assertTenantMatches(tx, ctx);
  const result = await tx.query<BlockRow>(
    `SELECT ${VERSION_COLUMNS} FROM ursitoare.block_version
     WHERE tenant_id = $1 AND ($2::text IS NULL OR ref COLLATE "C" > $2)
     ORDER BY ref COLLATE "C" LIMIT $3`,
    [ctx.tenantId, q.after ?? null, q.limit],
  );
  return result.rows.map(toVersion);
}

// Module-internal: exported from this file, not from index.ts.
export async function listAllBlockVersions(
  tx: TenantTx,
  ctx: TenantContext,
): Promise<BlockVersion[]> {
  await assertTenantMatches(tx, ctx);
  const result = await tx.query<BlockRow>(
    `SELECT ${VERSION_COLUMNS} FROM ursitoare.block_version
     WHERE tenant_id = $1 ORDER BY ref COLLATE "C"`,
    [ctx.tenantId],
  );
  return result.rows.map(toVersion);
}
