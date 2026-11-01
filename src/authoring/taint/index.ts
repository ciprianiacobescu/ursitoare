// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type { TaintLabel, Taint } from "./labels.ts";
export {
  TAINT_LABELS,
  NO_TAINT,
  normalizeTaint,
  joinTaint,
  relabelExtract,
  taintIncludes,
} from "./labels.ts";
export type { NodeTaint, TaintEdge, TaintAnalysis } from "./analyze.ts";
export { analyzeTaint } from "./analyze.ts";
export type { TaintErrorCode } from "./errors.ts";
export { TAINT_LIMITS, TaintError } from "./errors.ts";
export type { FlowCapabilities, CapabilitySite, CapabilityEvidence } from "./capabilities.ts";
export { capabilityEvidence, flowCapabilities } from "./capabilities.ts";
