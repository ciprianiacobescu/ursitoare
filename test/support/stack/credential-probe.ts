// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Env, MainIo } from "./conformance.ts";
import type { signInThroughKeycloak } from "./keycloak-login.ts";
import type { OverlayUser } from "./project.ts";

export interface CredentialProbeResult {
  serverStatus: number;
  credentialStatus: number;
  keyVersion: number | null;
}

export async function credentialProbe(_opts: {
  engineOrigin: string;
  user: OverlayUser;
  signIn?: typeof signInThroughKeycloak;
}): Promise<CredentialProbeResult> {
  throw new Error("not implemented");
}

export function credentialProblems(_result: CredentialProbeResult): string[] {
  throw new Error("not implemented");
}

export async function credentialProbeMain(
  _argv: readonly string[],
  _io: MainIo,
  _opts?: { env?: Env; probe?: typeof credentialProbe },
): Promise<number> {
  throw new Error("not implemented");
}
