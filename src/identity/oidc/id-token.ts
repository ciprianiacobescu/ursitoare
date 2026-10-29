import { createHash, createPublicKey, timingSafeEqual, verify as cryptoVerify } from "node:crypto";
import type { JsonWebKey } from "node:crypto";

import type { Clock } from "../../core/index.ts";
import type { TokenClaims } from "../users.ts";
import type { OidcConfigShape } from "./config-shape.ts";
import { OidcError } from "./errors.ts";

const SKEW_SECONDS = 60;
const MAX_SUBJECT_LENGTH = 512;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

function invalid(reason: string): OidcError {
  return new OidcError("OIDC_TOKEN_INVALID", "invalid ID token", { reason });
}

function decodePart(part: string): Record<string, unknown> {
  if (!BASE64URL.test(part)) throw invalid("malformed");
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    throw invalid("malformed");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw invalid("malformed");
  }
  return parsed as Record<string, unknown>;
}

function sameDigest(left: string, right: string): boolean {
  const a = createHash("sha256").update(left, "utf8").digest();
  const b = createHash("sha256").update(right, "utf8").digest();
  return timingSafeEqual(a, b);
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function verifiedSignature(
  headerPart: string,
  payloadPart: string,
  signaturePart: string,
  jwk: JsonWebKey,
): boolean {
  let signature: Buffer;
  try {
    signature = Buffer.from(signaturePart, "base64url");
  } catch {
    return false;
  }
  try {
    const key = createPublicKey({ key: jwk, format: "jwk" });
    return cryptoVerify(
      "sha256",
      Buffer.from(`${headerPart}.${payloadPart}`, "utf8"),
      key,
      signature,
    );
  } catch {
    return false;
  }
}

export async function verifyIdToken(
  token: string,
  opts: {
    config: OidcConfigShape;
    nonce: string;
    clock: Clock;
    keyFor(kid: string): Promise<JsonWebKey | null>;
  },
): Promise<TokenClaims & { organization: unknown }> {
  const parts = token.split(".");
  if (parts.length !== 3) throw invalid("malformed");
  const headerPart = parts[0];
  const payloadPart = parts[1];
  const signaturePart = parts[2];
  if (headerPart === undefined || payloadPart === undefined || signaturePart === undefined) {
    throw invalid("malformed");
  }

  const header = decodePart(headerPart);
  const payload = decodePart(payloadPart);

  if (header["alg"] !== "RS256") throw invalid("alg");
  const kid = header["kid"];
  if (typeof kid !== "string" || kid.length === 0) throw invalid("alg");

  const jwk = await opts.keyFor(kid);
  if (jwk === null) throw invalid("kid");

  if (!verifiedSignature(headerPart, payloadPart, signaturePart, jwk)) {
    throw invalid("signature");
  }

  if (payload["iss"] !== opts.config.issuer) throw invalid("issuer");

  const clientId = opts.config.clientId;
  const aud = payload["aud"];
  const audiences: unknown[] = Array.isArray(aud) ? aud : [aud];
  if (!audiences.includes(clientId)) throw invalid("audience");

  const azp = payload["azp"];
  if (audiences.length > 1) {
    if (azp !== clientId) throw invalid("azp");
  } else if (azp !== undefined && azp !== clientId) {
    throw invalid("azp");
  }

  const now = Math.floor(opts.clock.now().getTime() / 1000);
  const exp = payload["exp"];
  if (typeof exp !== "number" || !Number.isFinite(exp)) throw invalid("expired");
  if (!(now < exp + SKEW_SECONDS)) throw invalid("expired");

  const iat = payload["iat"];
  if (typeof iat !== "number" || !Number.isFinite(iat)) throw invalid("iat");
  if (!(iat <= now + SKEW_SECONDS)) throw invalid("iat");

  const nonce = payload["nonce"];
  if (typeof nonce !== "string" || !sameDigest(nonce, opts.nonce)) throw invalid("nonce");

  const subject = payload["sub"];
  if (
    typeof subject !== "string" ||
    subject.length < 1 ||
    subject.length > MAX_SUBJECT_LENGTH
  ) {
    throw invalid("subject");
  }

  const result: TokenClaims & { organization: unknown } = {
    issuer: opts.config.issuer,
    subject,
    organization: payload["organization"],
  };
  const email = optionalText(payload["email"]);
  if (email !== undefined) result.email = email;
  const name = optionalText(payload["name"]);
  if (name !== undefined) result.name = name;
  const preferredUsername = optionalText(payload["preferred_username"]);
  if (preferredUsername !== undefined) result.preferredUsername = preferredUsername;
  return result;
}
