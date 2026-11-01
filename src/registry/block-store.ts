// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { appendAudit, appendAuditCommitted, formatAt } from "../audit/index.ts";
import type { BlockDef, Effect, JsonSchema } from "../authoring/index.ts";
import { systemClock } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool, TenantTx } from "../tenancy/index.ts";
import { normalizeBlockImport } from "./block-input.ts";
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

const MAX_IMPORT_BLOCKS = 200;

function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export async function importCatalogue(
  pool: TenantPool,
  ctx: TenantContext,
  blocks: { [ref: string]: BlockImport },
  actor: { kind: "user" | "service" | "system"; id: string },
  opts?: { clock?: Clock },
): Promise<ImportReport> {
  const proto: unknown =
    typeof blocks === "object" && blocks !== null ? Object.getPrototypeOf(blocks) : undefined;
  if (typeof blocks !== "object" || blocks === null || (proto !== Object.prototype && proto !== null)) {
    throw new RegistryError("REGISTRY_INVALID", "blocks must be an object", {
      field: "blocks",
      reason: "not_object",
    });
  }
  const refs = Object.keys(blocks).sort(byCodeUnit);
  if (refs.length > MAX_IMPORT_BLOCKS) {
    throw new RegistryError("REGISTRY_INVALID", "too many blocks in one import", {
      field: "blocks",
      reason: "too_many",
    });
  }
  const normalized = refs.map((ref) => normalizeBlockImport(ref, blocks[ref]));
  if (normalized.length === 0) return { imported: [], unchanged: [] };

  const clock = opts?.clock ?? systemClock;
  try {
    return await withTenantTx(pool, ctx, async (tx) => {
      await tx.query(
        "SELECT pg_advisory_xact_lock(hashtextextended('ursitoare:block_import:' || $1::text, 0))",
        [ctx.tenantId],
      );
      const held = await tx.query<{ ref: string; content_hash: string }>(
        `SELECT ref, content_hash FROM ursitoare.block_version
         WHERE tenant_id = $1 AND ref = ANY($2::text[])`,
        [ctx.tenantId, refs],
      );
      const heldHashes = new Map(held.rows.map((row) => [row.ref, row.content_hash]));
      for (const block of normalized) {
        const hash = heldHashes.get(block.ref);
        if (hash !== undefined && hash !== block.contentHash) {
          throw new RegistryError("REGISTRY_CONFLICT", "block version already exists", {
            ref: block.ref,
          });
        }
      }
      const report: ImportReport = { imported: [], unchanged: [] };
      for (const block of normalized) {
        if (heldHashes.has(block.ref)) {
          report.unchanged.push(block.ref);
          continue;
        }
        await appendAudit(
          tx,
          ctx,
          {
            eventType: "registry.block_imported",
            actor,
            target: { kind: "block", id: block.ref },
            payload: { contentHash: block.contentHash, effect: block.def.effect },
          },
          { clock },
        );
        const d = block.def;
        await tx.query(
          `INSERT INTO ursitoare.block_version
             (tenant_id, ref, effect, description, input, output, untrusted_fields, data_class,
              untrusted_result, unsafe_to_retry, binding, content_hash, imported_by, imported_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::text[], $8, $9, $10, $11::jsonb, $12, $13, $14)`,
          [
            ctx.tenantId,
            block.ref,
            d.effect,
            d.description ?? null,
            JSON.stringify(d.input),
            JSON.stringify(d.output),
            d.untrusted_fields ?? [],
            d.data_class ?? null,
            d.untrusted_result ?? false,
            d.unsafe_to_retry ?? false,
            block.binding === null ? null : JSON.stringify(block.binding),
            block.contentHash,
            actor.id,
            clock.now(),
          ],
        );
        report.imported.push(block.ref);
      }
      return report;
    });
  } catch (error) {
    if (error instanceof RegistryError && error.code === "REGISTRY_CONFLICT") {
      try {
        await appendAuditCommitted(
          pool,
          ctx,
          {
            eventType: "registry.import_refused",
            actor,
            target: { kind: "block", id: String(error.details["ref"]) },
            payload: { code: "REGISTRY_CONFLICT" },
          },
          { clock },
        );
      } catch {
        // the original conflict is what the caller needs
      }
    }
    throw error;
  }
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
