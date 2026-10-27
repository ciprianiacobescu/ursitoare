// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type OidcContractCredentials = Readonly<{
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  username: string;
  password: string;
  organization: string;
  groups: readonly string[];
}>;

export type ContractCheck = Readonly<{ name: string; run(): Promise<void> }>;

export function oidcContract(_baseUrl: string, _credentials: OidcContractCredentials): ContractCheck[] {
  throw new Error("not implemented");
}
