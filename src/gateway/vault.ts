// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { EgressConfig } from "../config/index.ts";
import type { Logger } from "../observability/index.ts";

export type VaultAuthScheme = "API_KEY_HEADER" | "BEARER_TOKEN";

export interface PutCredentialInput {
  tenantId: string;
  serviceId: string;
  authScheme: VaultAuthScheme;
  value: Uint8Array;
  headerName: string | null;
  callerActorId: string;
  targetUrl: string;
}

export interface VaultWriter {
  putCredential(input: PutCredentialInput): Promise<{ keyVersion: number }>;
}

export function createVaultWriter(
  _vault: NonNullable<EgressConfig["vault"]>,
  _deps: { logger: Logger; timeoutMs?: number },
): VaultWriter {
  throw new Error("not implemented");
}

export function encodePutCredentialRequest(_input: PutCredentialInput): Uint8Array {
  throw new Error("not implemented");
}

export function decodePutCredentialResponse(_message: Uint8Array): { keyVersion: number } {
  throw new Error("not implemented");
}
