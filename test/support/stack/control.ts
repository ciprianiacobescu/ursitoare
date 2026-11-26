// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { OverlayUser } from "./project.ts";

export interface StackControlOptions {
  port?: number;
  reset: () => Promise<void>;
  users: () => Readonly<Record<string, OverlayUser>>;
}

export async function startStackControl(
  _opts: StackControlOptions,
): Promise<{ url: string; close(): Promise<void> }> {
  throw new Error("not implemented");
}
