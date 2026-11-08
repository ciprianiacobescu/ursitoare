// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ContractCheck } from "../fake-oidc/index.ts";

export interface EgressContractTarget {
  brokerUrl: string;
  proxyUrl: string;
  vaultUrl: string;
  brokerServiceToken: string;
  vaultAdmin: { identity: string; token: string };
  vaultDenied: { identity: string; token: string };
  tenantId: string;
  echo: { serviceId: string; targetUrl: string };
}

export function egressContract(_target: EgressContractTarget): ContractCheck[] {
  throw new Error("not implemented");
}
