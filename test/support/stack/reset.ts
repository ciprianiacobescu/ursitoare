// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Clock } from "../../../src/core/index.ts";

export const ENGINE_DATABASE: string = "";

export const TEMPLATE_DATABASE: string = "";

export interface ResetDeps {
  adminUrl: string;
  adminPassword: string;
  ownerUrl: string;
  ownerPassword: string;
  engineOrigin: string;
  clock?: Clock;
  healthTimeoutMs?: number;
  healthPollMs?: number;
}

export class ResetError extends Error {
  readonly step: "template" | "drop" | "create" | "health";
  readonly reason: string;

  constructor(step: ResetError["step"], reason: string) {
    super("");
    this.step = step;
    this.reason = reason;
  }
}

export async function prepareTemplate(_deps: ResetDeps): Promise<{ created: boolean; applied: number }> {
  throw new Error("not implemented");
}

export async function resetEngineDatabase(_deps: ResetDeps): Promise<{ engineRestarted: boolean }> {
  throw new Error("not implemented");
}

export async function waitForEngine(_deps: ResetDeps): Promise<{ sawFailure: boolean }> {
  throw new Error("not implemented");
}

export function stackResetDeps(_dir: string): ResetDeps {
  throw new Error("not implemented");
}

export async function resetMain(
  _argv: readonly string[],
  _io: { stdout(text: string): void; stderr(text: string): void },
  _opts?: { dir?: string; deps?: Partial<ResetDeps> },
): Promise<number> {
  throw new Error("not implemented");
}
