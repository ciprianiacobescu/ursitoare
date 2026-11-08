// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type FakeAuthScheme = "API_KEY_HEADER" | "BEARER_TOKEN";

export interface FakeVaultIdentity {
  identity: string;
  token: string;
  scopes: readonly ("vault.put" | "vault.read")[];
}

export interface FakeEgressOptions {
  now?: () => Date;
  auditSink?: string | null;
}

export interface IssuedToken {
  jti: string;
  serviceId: string;
  tenantId: string;
  agentId: string;
  ttlSeconds: number;
  issuedAt: number;
  expiresAt: number;
}

export interface ForwardedRequest {
  serviceId: string;
  method: string;
  host: string;
  path: string;
  query: string;
  headers: Readonly<Record<string, string>>;
  bodySha256: string;
  status: number;
  outcome: "allowed" | "error" | "rejected";
}

export interface StoredCredential {
  tenantId: string;
  serviceId: string;
  authScheme: FakeAuthScheme;
  headerName: string | null;
  targetUrl: string;
  keyVersion: number;
  callerActorId: string;
  identity: string;
}

export interface FakeAuditEvent {
  emitter: "broker" | "proxy";
  event_type: string;
  tenant_id: string;
  actor_type: string;
  actor_id?: string;
  target_type?: string;
  target_id?: string;
  payload: Record<string, unknown>;
}

export interface FakeEgress {
  readonly brokerUrl: string;
  readonly proxyUrl: string;
  readonly vaultUrl: string;
  readonly brokerServiceToken: string;
  readonly proxyServiceToken: string;
  readonly vaultAdmin: FakeVaultIdentity;
  readonly vaultProxy: FakeVaultIdentity;
  readonly vaultDenied: FakeVaultIdentity;
  addUpstream(host: string, origin: string): void;
  addCredentialless(serviceId: string, tenantId: string, targetUrl: string): void;
  credentials(): StoredCredential[];
  issued(): IssuedToken[];
  requests(): ForwardedRequest[];
  events(): FakeAuditEvent[];
  clearRecords(): void;
  close(): Promise<void>;
}

export async function startFakeEgress(_opts?: FakeEgressOptions): Promise<FakeEgress> {
  throw new Error("not implemented");
}

export * from "./echo.ts";
