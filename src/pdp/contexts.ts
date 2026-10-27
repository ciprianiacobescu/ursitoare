// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { toDecimal, entityRef } from "./values.ts";

export type EntityRef = ReturnType<typeof entityRef>;

export type CedarDecimal = ReturnType<typeof toDecimal>;

export type ToolArgs = Readonly<
  Record<string, string | number | boolean | readonly string[] | CedarDecimal>
>;

export interface Approval {
  approver: EntityRef;
  role: EntityRef;
}

export interface ApproversByRole {
  tenant_admin?: EntityRef[];
  author?: EntityRef[];
  approver?: EntityRef[];
  auditor?: EntityRef[];
}

export interface LlmArgs {
  model_profile?: string;
  tools?: string[];
}

export interface FlowCapabilities {
  reads_untrusted: boolean;
  reads_private: boolean;
  has_send_or_pay: boolean;
}

export interface ActivateFlowContext {
  flow_capabilities: FlowCapabilities;
  review_profile: string;
}

export interface ApproveTaskContext {
  run_initiator: EntityRef;
  taint: string[];
}

export interface InvokeLlmContext {
  args: LlmArgs;
  taint: string[];
  provider: string;
  region: string;
  run_initiator?: EntityRef;
}

export interface InvokeToolContext {
  tool: EntityRef;
  args: ToolArgs;
  taint: string[];
  run_initiator: EntityRef;
  sod_excluded: EntityRef[];
  approvals: Approval[];
  approvers_by_role: ApproversByRole;
  node_fingerprint: string;
}

export interface StartRunContext {
  trigger_type?: string;
}
