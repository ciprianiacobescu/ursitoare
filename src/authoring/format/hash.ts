/**
 * The content hash of a canonical flow (design Decision 6).
 *
 * `contentHash` is `sha256:` plus the lowercase hex digits of the SHA-256 of the
 * UTF-8 bytes of `canonicalJson(doc)`. `isContentHash` accepts exactly that form.
 */

import { createHash } from "node:crypto";

import { canonicalJson } from "./canonical.ts";

const CONTENT_HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;

export function contentHash(doc: unknown): string {
  const digest = createHash("sha256").update(canonicalJson(doc), "utf8").digest("hex");
  return `sha256:${digest}`;
}

export function isContentHash(value: unknown): value is string {
  return typeof value === "string" && CONTENT_HASH_PATTERN.test(value);
}
