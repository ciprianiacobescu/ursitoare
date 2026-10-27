// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { createHash, generateKeyPairSync } from "node:crypto";
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

function thumbprint(n: string, e: string): string {
  const canonical = JSON.stringify({ e, kty: "RSA", n });
  return createHash("sha256").update(canonical).digest("base64url");
}

function generateSigningKey(): SigningKey {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const exported = publicKey.export({ format: "jwk" });
  const n = exported.n;
  const e = exported.e;
  if (n === undefined || e === undefined) {
    throw new Error("RSA public key has no JWK modulus or exponent");
  }
  const kid = thumbprint(n, e);
  return {
    kid,
    privateKey,
    jwk: { kty: "RSA", use: "sig", alg: "RS256", kid, n, e },
  };
}

export function createKeyRing(): KeyRing {
  let keys: SigningKey[] = [generateSigningKey()];
  let foreignKey: SigningKey | undefined;

  function current(): SigningKey {
    const key = keys[0];
    if (key === undefined) throw new Error("key ring is empty");
    return key;
  }

  return {
    current,
    rotate(): SigningKey {
      const next = generateSigningKey();
      keys = [next, ...keys];
      return next;
    },
    foreign(): SigningKey {
      foreignKey ??= generateSigningKey();
      return foreignKey;
    },
    jwks(): { keys: Jwk[] } {
      return { keys: keys.map((key) => key.jwk) };
    },
  };
}
