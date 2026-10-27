// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { KeyObject } from "node:crypto";

import type { Jwk } from "./keys.ts";

export type JwtSigner =
  | { alg: "RS256"; kid: string; privateKey: KeyObject }
  | { alg: "HS256"; kid?: string; secret: string }
  | { alg: "none" };

export type DecodedJwt = Readonly<{
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: Buffer;
}>;

export function signJwt(_payload: Record<string, unknown>, _signer: JwtSigner): string {
  throw new Error("not implemented");
}

export function decodeJwt(_token: string): DecodedJwt {
  throw new Error("not implemented");
}

export function verifyRs256(_token: string, _jwk: Jwk): boolean {
  throw new Error("not implemented");
}
