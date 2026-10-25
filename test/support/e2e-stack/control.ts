// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { FaultTable } from "./faults.ts";

export type ControlServer = Readonly<{ url: string; close(): Promise<void> }>;

export function startControlServer(_deps: { port: number; faults: FaultTable; reset(): Promise<void> }): Promise<ControlServer> {
  throw new Error("not implemented");
}
