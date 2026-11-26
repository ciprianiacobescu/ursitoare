// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { StackControlOptions } from "./control.ts";
import type { OverlayUser } from "./project.ts";
import type { ResetDeps } from "./reset.ts";

export interface StackSeed {
  tenants: readonly { name: string; organization: string; sink: boolean; bootstrapAdmin: boolean }[];
  catalogue: string;
  team: string;
  groupMaps: readonly { group: string; roleId: string | null; teamId: string | null }[];
  tenantMaps: readonly { tenant: string; group: string; roleId: string }[];
  toolServer: { id: "acme"; origin: "https://tools.fake.test" };
}

export const STACK_SEED: StackSeed = {
  tenants: [],
  catalogue: "",
  team: "",
  groupMaps: [],
  tenantMaps: [],
  toolServer: { id: "acme", origin: "https://tools.fake.test" },
};

export const STACK_ISSUER: string = "";

export type SeedArg = string | { tenantIdOf: string };

export type SeedStep =
  | { kind: "cli"; argv: readonly SeedArg[] }
  | { kind: "catalogue"; tenant: string }
  | { kind: "groupmap"; tenant: string; group: string; roleId: string }
  | { kind: "api"; as: "carol"; method: string; path: string; body: unknown };

export function seedPlan(_seed: StackSeed, _issuer: string): SeedStep[] {
  throw new Error("not implemented");
}

export class SeedError extends Error {
  readonly step: string;
  readonly reason: string;

  constructor(step: string, reason: string) {
    super("");
    this.step = step;
    this.reason = reason;
  }
}

export interface SeedDeps {
  ownerEnv: Readonly<Record<string, string>>;
  engineOrigin: string;
  issuer: string;
  users: Readonly<Record<string, OverlayUser>>;
  fetch?: typeof fetch;
}

export async function seedStack(_deps: SeedDeps): Promise<{ steps: number }> {
  throw new Error("not implemented");
}

export function stackSeedDeps(_dir: string): SeedDeps {
  throw new Error("not implemented");
}

export function stackControlOptions(
  _dir: string,
  _hooks?: {
    reset?: (deps: ResetDeps) => Promise<unknown>;
    seed?: (deps: SeedDeps) => Promise<unknown>;
  },
): StackControlOptions {
  throw new Error("not implemented");
}
