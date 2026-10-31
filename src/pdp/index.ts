// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type {
  PolicyLayer,
  PolicySource,
  EntityUid,
  Entity,
  Egress,
  Permit,
  PolicyRequest,
  Decision,
  Pdp,
} from "./types.ts";
export { createPdp } from "./engine.ts";
export type { PdpErrorCode } from "./errors.ts";
export { PdpError } from "./errors.ts";
export {
  MAX_SLICE_ENTITIES,
  MAX_REQUEST_CHARS,
  MAX_PERMIT_TTL_SECONDS,
  formatUid,
  entityRef,
  toDecimal,
  hostOf,
} from "./values.ts";
export { recordDecision } from "./log.ts";
export { listPolicyDecisions } from "./decisions-query.ts";
export type {
  PolicyDecisionFilter,
  PolicyDecisionRecord,
} from "./decisions-query.ts";
export type {
  EntityRef,
  CedarDecimal,
  ToolArgs,
  Approval,
  ApproversByRole,
  LlmArgs,
  FlowCapabilities,
  ActivateFlowContext,
  ApproveTaskContext,
  InvokeLlmContext,
  InvokeToolContext,
  StartRunContext,
} from "./contexts.ts";
export type { ActionName, ResourceType, ContextsWithFields, ActionContext, ActionSpec } from "./actions.ts";
export { ACTIONS, ACTION_NAMES } from "./actions.ts";
export type { ToolArgType } from "./cedar-schema.ts";
export { buildSchema } from "./cedar-schema.ts";
export type { PrincipalEntity } from "./principal.ts";
export { isPrincipalEntity, scopedId, userEntity, tenantEntity } from "./principal.ts";
export { loadPolicyFragments, defaultSrcDir } from "./fragments.ts";
export { PLATFORM_SOURCE, PLATFORM_POLICY_IDS } from "./platform.ts";
export { probeRequest } from "./capabilities.ts";
export type { PolicyEngine, PolicyEngineOptions } from "./policy-engine.ts";
export { createPolicyEngine } from "./policy-engine.ts";
