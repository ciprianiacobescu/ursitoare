import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes as cryptoRandomBytes,
} from "node:crypto";

import { OidcError } from "./errors.ts";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const MIN_KEY_TEXT_LENGTH = 32;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

export interface Sealer {
  seal(value: unknown, extra?: string): string;
  open<T>(token: string, extra?: string): T | null;
}

function sealInvalid(reason: string): OidcError {
  return new OidcError("OIDC_SEAL_INVALID", "the value could not be sealed", { reason });
}

export function createSealer(info: string, key: { reveal(): string }): Sealer {
  const text = key.reveal();
  if (Buffer.byteLength(text, "utf8") < MIN_KEY_TEXT_LENGTH) {
    throw sealInvalid("key");
  }
  const derived = Buffer.from(hkdfSync("sha256", Buffer.from(text, "utf8"), "", info, KEY_BYTES));

  function aad(extra: string | undefined): Buffer {
    return Buffer.from(`${info}\n${extra ?? ""}`, "utf8");
  }

  function seal(value: unknown, extra?: string): string {
    const iv = cryptoRandomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, derived, iv);
    cipher.setAAD(aad(extra));
    const plaintext = Buffer.from(JSON.stringify(value), "utf8");
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, ciphertext, tag]).toString("base64url");
  }

  function open<T>(token: string, extra?: string): T | null {
    if (typeof token !== "string" || token.length === 0) return null;
    if (!BASE64URL.test(token)) return null;
    let combined: Buffer;
    try {
      combined = Buffer.from(token, "base64url");
    } catch {
      return null;
    }
    if (combined.length < IV_BYTES + TAG_BYTES) return null;
    if (combined.toString("base64url") !== token) return null;
    const iv = combined.subarray(0, IV_BYTES);
    const tag = combined.subarray(combined.length - TAG_BYTES);
    const ciphertext = combined.subarray(IV_BYTES, combined.length - TAG_BYTES);
    try {
      const decipher = createDecipheriv(ALGORITHM, derived, iv);
      decipher.setAAD(aad(extra));
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return JSON.parse(plaintext.toString("utf8")) as T;
    } catch {
      return null;
    }
  }

  return { seal, open };
}
