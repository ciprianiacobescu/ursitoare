import { generateKeyPairSync, sign } from "node:crypto";
import type { KeyObject } from "node:crypto";

export interface SigningKey {
  privateKey: KeyObject;
  publicJwk: { kty: string; crv: string; x: string };
}

export function generateSigningKey(): SigningKey {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const jwk = publicKey.export({ format: "jwk" });
  return { privateKey, publicJwk: { kty: String(jwk.kty), crv: String(jwk.crv), x: String(jwk.x) } };
}

export function signJwt(privateKey: KeyObject, kid: string, claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "EdDSA", typ: "JWT", kid })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = sign(null, Buffer.from(`${header}.${payload}`), privateKey).toString("base64url");
  return `${header}.${payload}.${signature}`;
}
