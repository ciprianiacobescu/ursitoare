import { createHmac, hkdfSync } from "node:crypto";
import { AuditError } from "./errors.ts";

export interface KeyMaterial {
  reveal(): string;
}

export function anchorMac(engineKey: KeyMaterial, tenantId: string, seq: bigint, hashHex: string): string {
  if (!/^[0-9a-f]{64}$/.test(hashHex)) {
    throw new AuditError("AUDIT_OPTIONS_INVALID", "audit options invalid", { reason: "bad_hash" });
  }
  if (typeof seq !== "bigint" || seq < 1n) {
    throw new AuditError("AUDIT_OPTIONS_INVALID", "audit options invalid", { reason: "bad_seq" });
  }
  let text: unknown;
  try {
    text = engineKey.reveal();
  } catch {
    throw new AuditError("AUDIT_ANCHOR_KEY_INVALID", "audit anchor key invalid", { reason: "invalid" });
  }
  if (typeof text !== "string") {
    throw new AuditError("AUDIT_ANCHOR_KEY_INVALID", "audit anchor key invalid", { reason: "invalid" });
  }
  if (text.length < 32) {
    throw new AuditError("AUDIT_ANCHOR_KEY_INVALID", "audit anchor key invalid", { reason: "too_short" });
  }
  const key = Buffer.from(hkdfSync("sha256", Buffer.from(text, "utf8"), Buffer.alloc(0), "ursitoare/audit-anchor", 32));
  return createHmac("sha256", key).update(`${tenantId}|${seq}|${hashHex}`, "utf8").digest("hex");
}
