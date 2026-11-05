import { createHash } from "node:crypto";

import { IntentError } from "./errors.ts";

const TENANT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const LINEAGE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const NODE_ID_PATTERN = /^[a-z][a-z0-9_]{0,127}$/;
const INT_MAX = 2_147_483_647;

function invalid(field: string): never {
  throw new IntentError("INTENT_INVALID", `invalid intent key: ${field}`);
}

function assertPattern(value: unknown, pattern: RegExp, field: string): asserts value is string {
  if (typeof value !== "string" || !pattern.test(value)) {
    invalid(field);
  }
}

function assertIndex(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > INT_MAX) {
    invalid(field);
  }
}

export function idemKey(
  tenantId: string,
  lineageId: string,
  nodeId: string,
  effectSeq: number,
  generation = 0,
): string {
  assertPattern(tenantId, TENANT_ID_PATTERN, "tenantId");
  assertPattern(lineageId, LINEAGE_ID_PATTERN, "lineageId");
  assertPattern(nodeId, NODE_ID_PATTERN, "nodeId");
  assertIndex(effectSeq, "effectSeq");
  assertIndex(generation, "generation");

  const text = JSON.stringify([tenantId, lineageId, nodeId, effectSeq, generation]);
  const digest = createHash("sha256").update(text, "utf8").digest("hex");
  return `ik1_${digest}`;
}

export function lineageOf(run: { runId: string; lineageId: string }): string {
  return run.lineageId;
}
