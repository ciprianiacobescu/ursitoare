// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { EffectGate } from "./types.ts";

export const NO_EFFECT_GATE: EffectGate = {
  async before() {
    throw new Error("not implemented");
  },
  async after() {
    throw new Error("not implemented");
  },
};
