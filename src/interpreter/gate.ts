import type { EffectGate } from "./types.ts";

export const NO_EFFECT_GATE: EffectGate = {
  async before() {
    return { action: "invoke", idemKey: null };
  },
  async after() {
    return;
  },
};
