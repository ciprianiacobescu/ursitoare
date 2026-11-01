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
}

export const emptyCatalogue: Catalogue = {
  block(_ref: string): BlockDef | undefined {
    throw new Error("not implemented");
  },
  modelProfile(_ref: string): ModelProfileDef | undefined {
    throw new Error("not implemented");
  },
  role(_name: string): RoleDef | undefined {
    throw new Error("not implemented");
  },
  delegateTarget(_target: string, _workflow: string): DelegateTargetDef | undefined {
    throw new Error("not implemented");
  },
  flow(_ref: string, _major: number): FlowSignature | undefined {
    throw new Error("not implemented");
  },
};

export function parseVersionedRef(_ref: string): { name: string; major: number } | undefined {
  throw new Error("not implemented");
}
