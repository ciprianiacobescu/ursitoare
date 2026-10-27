import { createHash, timingSafeEqual } from "node:crypto";

const VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;

export function pkceChallengeS256(verifier: string): string {
  return createHash("sha256").update(verifier, "utf8").digest("base64url");
}

export function verifyPkce(verifier: string, challenge: string): boolean {
  if (!VERIFIER_PATTERN.test(verifier)) return false;
  const expected = Buffer.from(pkceChallengeS256(verifier), "utf8");
  const actual = Buffer.from(challenge, "utf8");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
