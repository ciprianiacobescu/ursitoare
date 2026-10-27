// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { createHmac, createPublicKey, sign as cryptoSign, verify as cryptoVerify } from "node:crypto";
import type { KeyObject } from "node:crypto";

import type { Jwk } from "./keys.ts";
import { FakeOidcError } from "./types.ts";

export type JwtSigner =
  | { alg: "RS256"; kid: string; privateKey: KeyObject }
  | { alg: "HS256"; kid?: string; secret: string }
  | { alg: "none" };

export type DecodedJwt = Readonly<{
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: Buffer;
}>;

const BASE64URL = /^[A-Za-z0-9_-]*$/;

function badJwt(cause?: unknown): FakeOidcError {
  const base = new FakeOidcError("FAKE_OIDC_BAD_JWT", "malformed JWT");
  if (cause === undefined) return base;
  return new FakeOidcError("FAKE_OIDC_BAD_JWT", "malformed JWT", { cause });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function encodePart(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function isBase64Url(part: string): boolean {
  return BASE64URL.test(part) && part.length % 4 !== 1;
}

function decodePart(part: string): Record<string, unknown> {
  if (!isBase64Url(part)) throw badJwt();
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch (cause) {
    throw badJwt(cause);
  }
  if (!isRecord(parsed)) throw badJwt();
  return parsed;
}

export function signJwt(payload: Record<string, unknown>, signer: JwtSigner): string {
  const header: Record<string, unknown> = { alg: signer.alg, typ: "JWT" };
  if (signer.alg !== "none" && signer.kid !== undefined) {
    header["kid"] = signer.kid;
  }
  const signingInput = `${encodePart(header)}.${encodePart(payload)}`;
  let signature: string;
  if (signer.alg === "RS256") {
    signature = cryptoSign("sha256", Buffer.from(signingInput), signer.privateKey).toString("base64url");
  } else if (signer.alg === "HS256") {
    signature = createHmac("sha256", signer.secret).update(signingInput).digest("base64url");
  } else {
    signature = "";
  }
  return `${signingInput}.${signature}`;
}

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.split(".");
  if (parts.length !== 3) throw badJwt();
  const [headerPart, payloadPart, signaturePart] = parts;
  if (headerPart === undefined || payloadPart === undefined || signaturePart === undefined) {
    throw badJwt();
  }
  if (!isBase64Url(signaturePart)) throw badJwt();
  return {
    header: decodePart(headerPart),
    payload: decodePart(payloadPart),
    signature: Buffer.from(signaturePart, "base64url"),
  };
}

export function verifyRs256(token: string, jwk: Jwk): boolean {
  try {
    const decoded = decodeJwt(token);
    if (decoded.header["alg"] !== "RS256") return false;
    if (decoded.header["kid"] !== jwk.kid) return false;
    if (decoded.signature.length === 0) return false;
    const [headerPart, payloadPart] = token.split(".");
    if (headerPart === undefined || payloadPart === undefined) return false;
    const key = createPublicKey({
      key: { kty: jwk.kty, n: jwk.n, e: jwk.e },
      format: "jwk",
    });
    return cryptoVerify(
      "sha256",
      Buffer.from(`${headerPart}.${payloadPart}`),
      key,
      decoded.signature,
    );
  } catch {
    return false;
  }
}
