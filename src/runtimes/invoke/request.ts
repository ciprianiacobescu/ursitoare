// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { JsonValue } from "../../authoring/index.ts";
import type { ServiceTarget } from "../../credentials/index.ts";
import type { Approval, StepContext } from "../../interpreter/index.ts";
import { bodyDigest } from "../../gateway/index.ts";
import { entityRef, scopedId, userEntity } from "../../pdp/index.ts";
import type {
  ApproversByRole,
  Egress,
  Entity,
  EntityRef,
  PolicyRequest,
  PrincipalEntity,
  ToolArgs,
} from "../../pdp/index.ts";
import type { ToolBinding } from "../../tools/index.ts";
import { INVOKE_LIMITS } from "./types.ts";
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

const PDP_ROLES = ["tenant_admin", "author", "approver", "auditor"] as const;

export function pdpApprovals(
  approvals: readonly Approval[],
  rolesOf: ReadonlyMap<string, readonly string[]>,
  tenantId: string,
): { approvals: { approver: EntityRef; role: EntityRef }[]; approvers_by_role: ApproversByRole } {
  const out: { approver: EntityRef; role: EntityRef }[] = [];
  const byRole: ApproversByRole = {};
  const seen = new Set<string>();
  for (const approval of approvals) {
    if (approval.decision !== "approved" || approval.approver === null) continue;
    const held = rolesOf.get(approval.approver);
    if (held === undefined) continue;
    const approver = entityRef("User", scopedId(tenantId, approval.approver));
    for (const role of PDP_ROLES.filter((r) => held.includes(r)).sort()) {
      const key = `${approval.approver}\u0000${role}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ approver, role: entityRef("Role", role) });
      (byRole[role] ??= []).push(approver);
    }
  }
  return { approvals: out, approvers_by_role: byRole };
}

export function invokeToolRequest(input: {
  ctx: StepContext;
  principal: PrincipalEntity;
  binding: ToolBinding;
  flow: { ownerTeam: string };
  args: ToolArgs;
  fingerprint: string;
  approvals: ReturnType<typeof pdpApprovals>;
  egress: Egress;
}): PolicyRequest {
  const { ctx, principal, binding, flow, approvals } = input;
  const tenantId = ctx.tenant.tenantId;
  const initiator = entityRef("User", scopedId(tenantId, principal.userId));
  const resourceId = blockResourceId(ctx);
  const flowId = scopedId(tenantId, ctx.flowId);
  const teamId = scopedId(tenantId, flow.ownerTeam);
  const toolId = scopedId(tenantId, binding.ref);
  const entities: Entity[] = [
    userEntity(principal),
    {
      uid: { type: "Block", id: resourceId },
      attrs: {
        tenant: tenantId,
        kind: ctx.hook === undefined ? ctx.kind : "hook",
        flow: entityRef("Flow", flowId),
      },
      parents: [],
    },
    {
      uid: { type: "Flow", id: flowId },
      attrs: { tenant: tenantId, owner_team: entityRef("Team", teamId), reviewed: false },
      parents: [],
    },
    { uid: { type: "Team", id: teamId }, attrs: { tenant: tenantId }, parents: [] },
    { uid: { type: "Tool", id: toolId }, attrs: { tenant: tenantId, effect: binding.effect }, parents: [] },
  ];
  const rolesByApprover = new Map<string, string[]>();
  for (const { approver, role } of approvals.approvals) {
    const id = approver.__entity.id;
    const roles = rolesByApprover.get(id) ?? [];
    roles.push(role.__entity.id);
    rolesByApprover.set(id, roles);
  }
  for (const [id, roles] of rolesByApprover) {
    if (entities.length >= INVOKE_LIMITS.maxEntities) break;
    if (id === initiator.__entity.id) continue;
    entities.push(
      userEntity({
        tenantId,
        userId: id.slice(tenantId.length + 1),
        kind: "human",
        roles,
        teams: [],
      }),
    );
  }
  // `taint` is not on the scaffold's StepContext yet (the interpreter task adds it).
  const taint = (ctx as StepContext & { taint?: readonly string[] }).taint;
  return {
    principal: { type: "User", id: initiator.__entity.id },
    action: "invoke_tool",
    resource: { type: "Block", id: resourceId },
    context: {
      tool: entityRef("Tool", toolId),
      args: input.args,
      taint: taint === undefined ? ["untrusted"] : [...taint],
      run_initiator: initiator,
      sod_excluded: [initiator],
      approvals: approvals.approvals,
      approvers_by_role: approvals.approvers_by_role,
      node_fingerprint: input.fingerprint,
    },
    entities,
    egress: input.egress,
  };
}
