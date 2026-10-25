// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { Logger } from "../observability/index.ts";

export type Signal = "SIGTERM" | "SIGINT";

export interface SignalSource {
  on(signal: Signal, handler: () => void): unknown;
  off(signal: Signal, handler: () => void): unknown;
}

export function installGracefulShutdown(_opts: {
  close: () => Promise<unknown>;
  forceClose?: () => void;
  drainTimeoutMs: number;
  exit: (code: number) => void;
  logger: Logger;
  signals?: SignalSource;
}): { shutdown(reason: string): Promise<void>; dispose(): void } {
  throw new Error("not implemented");
}
