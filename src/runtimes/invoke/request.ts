// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { JsonValue } from "../../authoring/index.ts";
import type { ServiceTarget } from "../../credentials/index.ts";
import type { Approval, StepContext } from "../../interpreter/index.ts";
import { bodyDigest } from "../../gateway/index.ts";
import type {
  ApproversByRole,
  Egress,
  EntityRef,
  PolicyRequest,
  PrincipalEntity,
  ToolArgs,
} from "../../pdp/index.ts";
import type { ToolBinding } from "../../tools/index.ts";
import type { ToolRequest } from "./types.ts";

const BODY_LESS_METHODS = new Set(["GET", "DELETE"]);

function sortedCopy(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map((item) => sortedCopy(item));
  if (value === null || typeof value !== "object") return value;
  const out: Record<string, JsonValue> = {};
  for (const key of Object.keys(value).sort()) {
    out[key] = sortedCopy(value[key] as JsonValue);
  }
  return out;
}

const encoder = new TextEncoder();

export function toolRequest(
  binding: ToolBinding,
  target: ServiceTarget,
  args: JsonValue,
  idemKey: string | null,
): ToolRequest {
  const method = binding.http.method;
  const body = BODY_LESS_METHODS.has(method) ? null : encoder.encode(JSON.stringify(sortedCopy(args)));
  const headers: Record<string, string> = {};
  if (body !== null) headers["content-type"] = "application/json";
  if (idemKey !== null) headers["idempotency-key"] = idemKey;
  return {
    request: {
      method,
      origin: target.origin,
      path: binding.http.path,
      headers,
      body,
    },
    egress: {
      method,
      host: new URL(target.origin).host,
      path: binding.http.path,
      bodyDigest: bodyDigest(body),
      serviceId: target.serviceId,
      ttlSeconds: 60,
    },
  };
}

export function blockResourceId(
  ctx: Pick<StepContext, "tenant" | "flowId" | "nodeId" | "hook">,
): string {
  const id = `${ctx.tenant.tenantId}/${ctx.flowId}/${ctx.nodeId}`;
  return ctx.hook === undefined ? id : `${id}:${ctx.hook.phase}:${ctx.hook.label}`;
}

export function pdpApprovals(
  _approvals: readonly Approval[],
  _rolesOf: ReadonlyMap<string, readonly string[]>,
  _tenantId: string,
): { approvals: { approver: EntityRef; role: EntityRef }[]; approvers_by_role: ApproversByRole } {
  throw new Error("not implemented");
}

export function invokeToolRequest(_input: {
  ctx: StepContext;
  principal: PrincipalEntity;
  binding: ToolBinding;
  flow: { ownerTeam: string };
  args: ToolArgs;
  fingerprint: string;
  approvals: ReturnType<typeof pdpApprovals>;
  egress: Egress;
}): PolicyRequest {
  throw new Error("not implemented");
}
