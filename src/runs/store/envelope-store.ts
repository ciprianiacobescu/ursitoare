import { createHash } from "node:crypto";

import { canonicalJson } from "./canonical.ts";
import { RunDataError } from "./errors.ts";
import { assertTenantTx, isSqlState } from "./tenant.ts";
import type { EnvelopeStore, PayloadValue, StoredPayload } from "./types.ts";

const MAX_PAYLOAD_BYTES = 1_048_576;

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function invalid(message: string): never {
  throw new RunDataError("RUN_DATA_INVALID", message);
}

export const envelopeStore: EnvelopeStore = {
  async put(tx, ctx, value: PayloadValue) {
    const text = canonicalJson(value);
    const size = Buffer.byteLength(text, "utf8");
    if (size > MAX_PAYLOAD_BYTES) {
      throw new RunDataError("RUN_DATA_TOO_LARGE", "payload too large");
    }

    const sha256 = payloadDigestOf(text);
    await assertTenantTx(tx, ctx);

    try {
      await tx.query(
        "INSERT INTO ursitoare.envelope_payload (tenant_id, sha256, size, data) VALUES ($1, $2, $3, $4::jsonb) ON CONFLICT (tenant_id, sha256) DO NOTHING",
        [ctx.tenantId, sha256, size, text],
      );
    } catch (error) {
      if (isSqlState(error, "23503")) {
        invalid("unknown_tenant");
      }
      throw error;
    }

    return { sha256, size };
  },

  async get(tx, ctx, sha256: string): Promise<StoredPayload | null> {
    if (typeof sha256 !== "string" || !SHA256_PATTERN.test(sha256)) {
      invalid("invalid payload digest");
    }

    await assertTenantTx(tx, ctx);

    const { rows } = await tx.query<{
      sha256: string;
      media_type: string;
      size: number;
      data: PayloadValue;
      pinned: boolean;
    }>(
      "SELECT sha256, media_type, size, data, pinned FROM ursitoare.envelope_payload WHERE tenant_id = $1 AND sha256 = $2",
      [ctx.tenantId, sha256],
    );

    const row = rows[0];
    if (row === undefined) {
      return null;
    }

    return {
      sha256: row.sha256,
      mediaType: row.media_type,
      size: row.size,
      data: row.data,
      pinned: row.pinned,
    };
  },

  async referencedBy() {
    throw new Error("not implemented");
  },
};

function payloadDigestOf(canonical: string): string {
  return createHash("sha256").update(Buffer.from(canonical, "utf8")).digest("hex");
}
