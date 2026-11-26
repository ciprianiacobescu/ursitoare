// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { EgressContractTarget } from "../fake-egress/contract.ts";
import type { Env, MainIo } from "./conformance.ts";
import type { signInThroughKeycloak } from "./keycloak-login.ts";
import type { OverlayUser } from "./project.ts";

export interface SinkCounts {
  broker: number;
  proxy: number;
  mismatch: number;
}

export interface SinkProbeOpts {
  engineOrigin: string;
  user: OverlayUser;
  egress: EgressContractTarget;
  foreignTenantUuid: string;
  pollMs?: number;
  timeoutMs?: number;
  signIn?: typeof signInThroughKeycloak;
}

export function countSinkRows(_rows: {
  issued: readonly object[];
  proxy: readonly object[];
  refused: readonly object[];
}): SinkCounts {
  throw new Error("not implemented");
}

export function sinkProblems(_before: SinkCounts, _after: SinkCounts, _timeoutMs: number): string[] {
  throw new Error("not implemented");
}

export async function sinkProbe(
  _opts: SinkProbeOpts,
): Promise<{ tenantId: string; before: SinkCounts; after: SinkCounts; problems: string[] }> {
  throw new Error("not implemented");
}

export async function sinkProbeMain(
  _argv: readonly string[],
  _io: MainIo,
  _opts?: { env?: Env; probe?: typeof sinkProbe },
): Promise<number> {
  throw new Error("not implemented");
}
