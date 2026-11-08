// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Env } from "./config.ts";
import type { Secret, SecretReader } from "./secret.ts";

export interface EgressConfig {
  readonly brokerUrl: string;
  readonly proxyUrl: string;
  readonly brokerToken: Secret;
  readonly agentId: string;
  readonly vault: {
    readonly url: string;
    readonly identity: string;
    readonly token: Secret;
  } | null;
}

export function loadEgressConfig(_env: Env, _readSecret: SecretReader): EgressConfig | undefined {
  throw new Error("not implemented");
}
