// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export interface FaultPoints {
  readonly armed: readonly string[];
  hit(point: string): void;
}

export const NO_FAULT_POINTS: FaultPoints = {
  armed: [],
  hit(_point: string): void {
    throw new Error("not implemented");
  },
};

export function createFaultPoints(_spec: {
  armed: readonly string[];
  markerDir: string;
  kill: () => void;
}): FaultPoints {
  throw new Error("not implemented");
}
