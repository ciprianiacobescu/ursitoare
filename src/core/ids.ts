// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { Clock } from "./clock.ts";

export interface IdSource {
  next(prefix: string): string;
}

export function createIds(_clock: Clock, _randomBytes?: (size: number) => Uint8Array): IdSource {
  throw new Error("not implemented");
}

export const systemIds: IdSource = {
  next(_prefix: string): string {
    throw new Error("not implemented");
  },
};

export function sequentialIds(_seed?: number): IdSource {
  throw new Error("not implemented");
}
