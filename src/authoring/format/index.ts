// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type {
  JsonValue,
  JsonSchema,
  Effect,
  Values,
  NodeKind,
  HookScope,
  HookSelector,
  HookWhen,
  CodeHook,
  BlockHook,
  HookDef,
  HookRule,
  NodeBase,
  ContextSource,
  LlmTuning,
  BlockNode,
  CodeNode,
  LlmExtractNode,
  LlmGenerateNode,
  LlmDecideNode,
  AgentNode,
  SwitchNode,
  HumanApprovalNode,
  HumanFormNode,
  ForeachNode,
  SubflowNode,
  DelegateNode,
  WaitNode,
  EndNode,
  FlowNode,
  Flow,
} from "./types.ts";
export { NODE_KINDS, FLOW_TOP_LEVEL_FIELDS } from "./types.ts";
export type {
  BlockDef,
  ModelProfileDef,
  RoleDef,
  DelegateTargetDef,
  FlowSignature,
  Catalogue,
} from "./catalogue.ts";
export { emptyCatalogue, parseVersionedRef } from "./catalogue.ts";
export type { FormatErrorCode, ParseError } from "./errors.ts";
export { FORMAT_ERROR_CODES, FormatError } from "./errors.ts";
export type { FlowFormat, ParseLimits, ParseResult } from "./parse.ts";
export { DEFAULT_PARSE_LIMITS, parseFlowText, formatOf } from "./parse.ts";
export { canonicalizeFlow, stableStringify, canonicalJson, canonicalEqual } from "./canonical.ts";
export { contentHash, isContentHash } from "./hash.ts";
export type { Ref, Seg } from "./refs.ts";
export {
  parseRef,
  scanTemplate,
  isSingleRef,
  refToString,
  suspiciousInterpolation,
  walkStrings,
  escapePointer,
} from "./refs.ts";
export type { ValueField, SuccessorField } from "./nodes.ts";
export { valueFields, hookValueFields, successorFields, requiredSuccessorFields } from "./nodes.ts";
export { documentedTerms, missingDocTerms } from "./doc-terms.ts";
