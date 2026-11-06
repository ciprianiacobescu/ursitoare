// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type { EffectClass, HookPhase, NodeMeta, HookPlacement } from "./model.ts";
export {
  HOOKLESS_KINDS,
  nodeMeta,
  selectorMatches,
  whenMatches,
  hookPlacements,
  hookRoutes,
  augmentedSuccessors,
  declaresHooks,
} from "./model.ts";
export { checkHooks } from "./check.ts";
export { HOOK_ERROR_CODES, HOOK_WARNING_CODES } from "./codes.ts";
