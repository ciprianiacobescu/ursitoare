// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { KeyObject } from "node:crypto";

export type Jwk = Readonly<{
  kty: "RSA";
  use: "sig";
  alg: "RS256";
  kid: string;
  n: string;
  e: string;
}>;

export type SigningKey = Readonly<{ kid: string; privateKey: KeyObject; jwk: Jwk }>;

export interface KeyRing {
  current(): SigningKey;
  rotate(): SigningKey;
  foreign(): SigningKey;
  jwks(): { keys: Jwk[] };
}

export function createKeyRing(): KeyRing {
  throw new Error("not implemented");
}
