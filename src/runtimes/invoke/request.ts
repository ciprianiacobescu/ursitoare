// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { JsonValue } from "../../authoring/index.ts";
import type { ServiceTarget } from "../../credentials/index.ts";
import type { Approval, StepContext } from "../../interpreter/index.ts";
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

export function toolRequest(
  _binding: ToolBinding,
  _target: ServiceTarget,
  _args: JsonValue,
  _idemKey: string | null,
): ToolRequest {
  throw new Error("not implemented");
}

export function blockResourceId(
  _ctx: Pick<StepContext, "tenant" | "flowId" | "nodeId" | "hook">,
): string {
  throw new Error("not implemented");
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
