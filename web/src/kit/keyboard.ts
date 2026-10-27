// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export interface KeyBinding {
  keys: string;
  effect: string;
}

export const KEYBOARD: Readonly<Record<string, readonly KeyBinding[]>> = {};
