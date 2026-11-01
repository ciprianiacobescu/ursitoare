// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Effect, JsonSchema } from "./types.ts";

export interface BlockDef {
  effect: Effect;
  description?: string;
  input: JsonSchema;
  output: JsonSchema;
  untrusted_fields?: string[];
  data_class?: "public" | "private";
  untrusted_result?: boolean;
  unsafe_to_retry?: boolean;
}

export interface ModelProfileDef {
  ref: string;
}

export interface RoleDef {
  name: string;
}

export interface DelegateTargetDef {
  effect: Effect;
  untrusted_result: boolean;
}

export interface FlowSignature {
  input: JsonSchema;
  output: JsonSchema;
}

export interface Catalogue {
  block(ref: string): BlockDef | undefined;
  modelProfile(ref: string): ModelProfileDef | undefined;
  role(name: string): RoleDef | undefined;
  delegateTarget(target: string, workflow: string): DelegateTargetDef | undefined;
  flow(ref: string, major: number): FlowSignature | undefined;
  /** The workflows a delegate target offers, `undefined` when the target does not exist. */
  delegateWorkflows?(target: string): readonly string[] | undefined;
}

export const emptyCatalogue: Catalogue = Object.freeze({
  block(_ref: string): BlockDef | undefined {
    return undefined;
  },
  modelProfile(_ref: string): ModelProfileDef | undefined {
    return undefined;
  },
  role(_name: string): RoleDef | undefined {
    return undefined;
  },
  delegateTarget(_target: string, _workflow: string): DelegateTargetDef | undefined {
    return undefined;
  },
  flow(_ref: string, _major: number): FlowSignature | undefined {
    return undefined;
  },
});

const VERSIONED_REF = /^([a-z][a-z0-9._-]*)@(0|[1-9][0-9]{0,8})$/;

export function parseVersionedRef(ref: string): { name: string; major: number } | undefined {
  const match = VERSIONED_REF.exec(ref);
  if (match === null) {
    return undefined;
  }
  return { name: match[1] as string, major: Number(match[2]) };
}
