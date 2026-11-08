// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Clock, IdSource } from "../core/index.ts";
import type { VaultAuthScheme, VaultWriter } from "../gateway/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";

export interface CredentialRecord {
  id: string;
  toolServerId: string;
  serviceId: string;
  authScheme: VaultAuthScheme;
  headerName: string | null;
  targetOrigin: string;
  keyVersion: number;
  provisionedBy: string;
  provisionedAt: string;
  rotatedAt: string | null;
}

export interface ServiceTarget {
  serviceId: string;
  origin: string;
}

export interface ServiceResolver {
  resolve(ctx: TenantContext, toolServerId: string): Promise<ServiceTarget | null>;
}

export type CredentialsErrorCode =
  | "CREDENTIALS_INVALID"
  | "CREDENTIALS_NOT_FOUND"
  | "CREDENTIALS_EXISTS"
  | "CREDENTIALS_VAULT";

export class CredentialsError extends Error {
  readonly code: CredentialsErrorCode;
  readonly details: Readonly<Record<string, string>>;

  constructor(_code: CredentialsErrorCode, message: string, _details?: Record<string, string>) {
    super(message);
    throw new Error("not implemented");
  }
}

export interface CredentialDeps {
  pool: TenantPool;
  vault: VaultWriter;
  ids: IdSource;
  clock: Clock;
}
