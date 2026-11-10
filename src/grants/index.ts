// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type {
  GrantSubject,
  GrantScope,
  ArgConstraint,
  GrantRecord,
  GrantStatus,
  Reconfirmation,
  GrantsErrorCode,
  GrantDeps,
} from "./types.ts";
export { GrantsError } from "./types.ts";
export { nodeFingerprint } from "./fingerprint.ts";
export { compileGrant, compileGrants } from "./compile.ts";
export { grantStatus } from "./status.ts";
export {
  createGrant,
  revokeGrant,
  confirmGrant,
  listGrants,
  reconfirmationsFor,
} from "./store.ts";
export type { CedarArgs } from "./args.ts";
export { toolArgTypes, toCedarArgs } from "./args.ts";
export type { PolicyRuntime } from "./policy-runtime.ts";
export { createPolicyRuntime } from "./policy-runtime.ts";
export type { PolicySetRecord, PolicyValidation } from "./policy-sets.ts";
export {
  PolicyDeployError,
  validatePolicySet,
  deployPolicySet,
  currentPolicySet,
  pendingGrantCount,
} from "./policy-sets.ts";
