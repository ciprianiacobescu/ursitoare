import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";

import { ApiError } from "./errors.ts";

export type CursorPosition = readonly (string | number)[];

export interface KeyMaterial {
  reveal(): string;
}

export interface CursorKey {
  readonly bytes: Uint8Array;
}

export interface CursorScope {
  tenantId: string;
  scope: string;
}

const CURSOR_INFO = "ursitoare/cursor";
const CURSOR_KEY_MIN_LENGTH = 32;
const CURSOR_KEY_BYTES = 32;
const CURSOR_MAC_BYTES = 32;
const CURSOR_MAX_LENGTH = 1024;
const POSITION_MAX_ENTRIES = 4;
const POSITION_ENTRY_MAX_LENGTH = 256;
const SCOPE_PATTERN = /^[a-z][a-z0-9_.:-]{0,63}$/;
const CURSOR_ALPHABET = /^[A-Za-z0-9_-]+$/;
const CURSOR_VERSION = 1;

const CURSOR_INVALID_STATUS = 400;
const CURSOR_INVALID_CODE = "CURSOR_INVALID";
const CURSOR_INVALID_MESSAGE = "Cursor is invalid";

function tenantIdRangeError(): RangeError {
  return new RangeError("cursor tenantId must be a string of 1 to 64 characters");
}

function scopeRangeError(): RangeError {
  return new RangeError(
    "cursor scope must match /^[a-z][a-z0-9_.:-]{0,63}$/",
  );
}

function positionRangeError(reason: string): RangeError {
  return new RangeError(`cursor position ${reason}`);
}

function isPositionEntryValid(entry: string | number): boolean {
  if (typeof entry === "string") {
    return entry.length <= POSITION_ENTRY_MAX_LENGTH;
  }
  return Number.isFinite(entry);
}

function isPositionValid(position: readonly (string | number)[]): boolean {
  if (!Array.isArray(position)) return false;
  if (position.length < 1 || position.length > POSITION_MAX_ENTRIES) return false;
  return position.every(isPositionEntryValid);
}

interface Claims {
  v: number;
  t: string;
  s: string;
  p: readonly (string | number)[];
}

function isClaimsShapeValid(value: unknown): value is Claims {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const claims = value as Record<string, unknown>;
  if (claims.v !== CURSOR_VERSION) return false;
  if (typeof claims.t !== "string") return false;
  if (typeof claims.s !== "string") return false;
  if (!Array.isArray(claims.p)) return false;
  if (!isPositionValid(claims.p as readonly (string | number)[])) return false;
  return true;
}

function claimsRangeError(claims: CursorScope & { position: CursorPosition }): RangeError | undefined {
  if (typeof claims.tenantId !== "string" || claims.tenantId.length < 1 || claims.tenantId.length > 64) {
    return tenantIdRangeError();
  }
  if (typeof claims.scope !== "string" || !SCOPE_PATTERN.test(claims.scope)) {
    return scopeRangeError();
  }
  if (!isPositionValid(claims.position)) {
    return positionRangeError(
      "must have 1 to 4 entries, each a finite number or a string of at most 256 characters",
    );
  }
  return undefined;
}

function unsignedCursor(payload: Buffer, key: CursorKey): Buffer {
  return Buffer.concat([payload, createHmac("sha256", Buffer.from(key.bytes)).update(payload).digest()]);
}

export function deriveCursorKey(engineKey: KeyMaterial | null): CursorKey {
  let text: string;
  try {
    text = engineKey === null ? "" : engineKey.reveal();
  } catch {
    throw new RangeError("deriving the cursor key failed");
  }
  if (typeof text !== "string" || text.length < CURSOR_KEY_MIN_LENGTH) {
    throw new RangeError("the engine key is missing or shorter than 32 characters");
  }
  const bytes = hkdfSync("sha256", text, "", CURSOR_INFO, CURSOR_KEY_BYTES);
  return { bytes: new Uint8Array(bytes) };
}

export function encodeCursor(
  key: CursorKey,
  claims: CursorScope & { position: CursorPosition },
): string {
  const bad = claimsRangeError(claims);
  if (bad !== undefined) throw bad;
  if (
    !Buffer.isBuffer(key.bytes) &&
    !(key.bytes instanceof Uint8Array)
  ) {
    throw new RangeError("the cursor key must hold bytes");
  }
  const payload = Buffer.from(
    JSON.stringify({
      v: CURSOR_VERSION,
      t: claims.tenantId,
      s: claims.scope,
      p: claims.position,
    } satisfies Claims),
    "utf8",
  );
  const cursor = unsignedCursor(payload, key).toString("base64url");
  if (cursor.length > CURSOR_MAX_LENGTH) {
    throw new RangeError(`the encoded cursor is longer than ${CURSOR_MAX_LENGTH} characters`);
  }
  return cursor;
}

export function decodeCursor(
  key: CursorKey,
  cursor: string,
  expect: CursorScope,
): CursorPosition {
  assertCursorUsable(key, expect);
  const signed = ssl(cursor);
  return decodeSigned(signed, key, expect);
}

function ssl(cursor: string): Buffer {
  if (typeof cursor !== "string" || cursor.length === 0 || cursor.length > CURSOR_MAX_LENGTH) {
    throw cursorInvalid();
  }
  if (!CURSOR_ALPHABET.test(cursor)) {
    throw cursorInvalid();
  }
  const canonical = Buffer.from(cursor, "base64url").toString("base64url");
  if (canonical !== cursor) {
    throw cursorInvalid();
  }
  return Buffer.from(cursor, "base64url");
}

function decodeSigned(signed: Buffer, key: CursorKey, expect: CursorScope): CursorPosition {
  if (signed.length < CURSOR_MAC_BYTES + 1) {
    throw cursorInvalid();
  }
  const payload = signed.subarray(0, signed.length - CURSOR_MAC_BYTES);
  const mac = signed.subarray(signed.length - CURSOR_MAC_BYTES);
  const expected = createHmac("sha256", Buffer.from(key.bytes)).update(payload).digest();
  const ok = mac.length === expected.length && timingSafeEqual(mac, expected);
  if (!ok) {
    throw cursorInvalid();
  }
  let value: unknown;
  try {
    value = JSON.parse(payload.toString("utf8"));
  } catch {
    throw cursorInvalid();
  }
  if (!isClaimsShapeValid(value)) {
    throw cursorInvalid();
  }
  const claims = value as Claims;
  if (claims.t !== expect.tenantId || claims.s !== expect.scope) {
    throw cursorInvalid();
  }
  return claims.p;
}

function assertCursorUsable(key: CursorKey, _expect: CursorScope): void {
  if (
    !(key.bytes instanceof Uint8Array) &&
    !Buffer.isBuffer(key.bytes)
  ) {
    throw cursorInvalid();
  }
  if (key.bytes.length !== CURSOR_KEY_BYTES) {
    throw cursorInvalid();
  }
}

function cursorInvalid(): ApiError {
  return new ApiError(
    CURSOR_INVALID_STATUS,
    CURSOR_INVALID_CODE,
    CURSOR_INVALID_MESSAGE,
  );
}
