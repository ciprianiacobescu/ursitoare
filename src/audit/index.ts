// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type { AuditErrorCode } from "./errors.ts";
export { AuditError } from "./errors.ts";
export { canonicalize } from "./canonical.ts";
export type { AuditOrigin, AuditRecord } from "./hash.ts";
export { GENESIS_HASH, formatAt, canonicalEvent, chainHash } from "./hash.ts";
export type { AuditEventInput, ValidatedEvent } from "./event.ts";
export { validateEvent, isSecretKeyName } from "./event.ts";
export type { AppendOptions } from "./append.ts";
export { appendAudit, appendAuditCommitted } from "./append.ts";
export type { KeyMaterial } from "./mac.ts";
export { anchorMac } from "./mac.ts";
export type { ChainReport } from "./verify.ts";
export { verifyChain } from "./verify.ts";
export type { Anchor } from "./anchor.ts";
export { anchorHead } from "./anchor.ts";
export type { AuditEventFilter, AuditEventRecord } from "./query.ts";
export { countAnchors, isUtcTime, listAuditEvents } from "./query.ts";
