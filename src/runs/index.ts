// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type { TenantContext, TenantTx, TenantPool } from "./store/types.ts";
export type {
  PayloadValue,
  RunMode,
  RunState,
  StepState,
  RunError,
  RunPrincipalRecord,
  PayloadRef,
  StoredPayload,
  NewRun,
  RunRecord,
  RunTransition,
  RunCursor,
  RunListQuery,
  StepWrite,
  StepRecord,
  StepHookEntry,
  StepHooksWrite,
  StepHooks,
  RunRepository,
  StepRepository,
  EnvelopeStore,
} from "./store/types.ts";
export type { RunDataErrorCode } from "./store/errors.ts";
export { RunDataError } from "./store/errors.ts";
export { payloadDigest } from "./store/canonical.ts";
export { envelopeStore } from "./store/envelope-store.ts";
export { runRepository, RUN_LIST_FILTER_FIRST } from "./store/run-repository.ts";
export { stepRepository } from "./store/step-repository.ts";
export type { EventWrite } from "./store/events.ts";
export { appendEvent } from "./store/events.ts";
export type { RunStore } from "./store/run-store.ts";
export { createRunStore } from "./store/run-store.ts";
export { createMemoryRunStore } from "./store/memory-store.ts";
export type { IntentErrorCode } from "./intents/errors.ts";
export { IntentError } from "./intents/errors.ts";
export { idemKey, lineageOf } from "./intents/key.ts";
export type { IntentRecord, IntentState, IntentWrite } from "./intents/repository.ts";
export {
  completeIntent,
  getIntent,
  markIntentUnknown,
  recordIntent,
} from "./intents/repository.ts";
export type {
  EffectIntents,
  IntentCall,
  IntentContext,
  IntentDecision,
} from "./intents/gate.ts";
export { createEffectIntents } from "./intents/gate.ts";
