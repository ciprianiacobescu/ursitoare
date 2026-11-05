import type { RunMode, TenantContext, TenantTx } from "../store/types.ts";
import { IntentError } from "./errors.ts";
import type { IntentWrite } from "./repository.ts";

const IDEM_KEY_PATTERN = /^ik1_[0-9a-f]{64}$/;
const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const NODE_ID_PATTERN = /^[a-z][a-z0-9_]{0,127}$/;

const MAX_TOOL_LENGTH = 256;

function invalid(field: string): never {
  throw new IntentError("INTENT_INVALID", `invalid intent: ${field}`);
}

export function assertIdemKey(value: unknown): asserts value is string {
  if (typeof value !== "string" || !IDEM_KEY_PATTERN.test(value)) {
    invalid("idemKey");
  }
}

export function assertRunId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !RUN_ID_PATTERN.test(value)) {
    invalid("runId");
  }
}

export function assertNodeId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !NODE_ID_PATTERN.test(value)) {
    invalid("nodeId");
  }
}

export function assertTool(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_TOOL_LENGTH) {
    invalid("tool");
  }
}

export function assertMode(value: unknown): asserts value is RunMode {
  if (value !== "live" && value !== "mock" && value !== "stub") {
    invalid("mode");
  }
}

export function assertAt(value: unknown): asserts value is Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    invalid("at");
  }
  const year = value.getUTCFullYear();
  if (year < 1970 || year > 9999) {
    invalid("at");
  }
}

export function assertIntentWrite(intent: IntentWrite): void {
  assertIdemKey(intent.idemKey);
  assertRunId(intent.runId);
  assertNodeId(intent.nodeId);
  assertTool(intent.tool);
  assertMode(intent.mode);
}

export async function assertTenantMatches(tx: TenantTx, ctx: TenantContext): Promise<void> {
  const { rows } = await tx.query<{ tenant_id: string | null }>(
    "SELECT current_setting('app.tenant_id', true) AS tenant_id",
  );
  if (rows[0]?.tenant_id !== ctx.tenantId) {
    invalid("tenant");
  }
}

export function formatTimestamp(value: Date): string {
  assertAt(value);
  return `${value.toISOString().slice(0, -1)}000Z`;
}
