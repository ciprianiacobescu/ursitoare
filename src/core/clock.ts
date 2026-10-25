// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now(): Date {
    throw new Error("not implemented");
  },
};

export function fixedClock(_iso: string): Clock {
  throw new Error("not implemented");
}
