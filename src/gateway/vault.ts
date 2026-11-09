// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { GatewayError } from "./types.ts";
import type { EgressConfig } from "../config/index.ts";
import type { Logger } from "../observability/index.ts";

export type VaultAuthScheme = "API_KEY_HEADER" | "BEARER_TOKEN";

export interface PutCredentialInput {
  tenantId: string;
  serviceId: string;
  authScheme: VaultAuthScheme;
  value: Uint8Array;
  headerName: string | null;
  callerActorId: string;
  targetUrl: string;
}

export interface VaultWriter {
  putCredential(input: PutCredentialInput): Promise<{ keyVersion: number }>;
}

export function createVaultWriter(
  _vault: NonNullable<EgressConfig["vault"]>,
  _deps: { logger: Logger; timeoutMs?: number },
): VaultWriter {
  throw new Error("not implemented");
}

function varint(value: number): number[] {
  const out: number[] = [];
  let rest = value;
  while (rest >= 0x80) {
    out.push((rest % 0x80) | 0x80);
    rest = Math.floor(rest / 0x80);
  }
  out.push(rest);
  return out;
}

export function encodePutCredentialRequest(input: PutCredentialInput): Uint8Array {
  const text = new TextEncoder();
  const parts: number[] = [];
  const bytesField = (tag: number, data: Uint8Array): void => {
    parts.push(tag, ...varint(data.length));
    for (const byte of data) parts.push(byte);
  };
  bytesField(0x0a, text.encode(input.tenantId));
  bytesField(0x12, text.encode(input.serviceId));
  parts.push(0x18, input.authScheme === "API_KEY_HEADER" ? 1 : 3);
  bytesField(0x22, input.value);
  if (input.headerName !== null) bytesField(0x32, text.encode(input.headerName));
  bytesField(0x42, text.encode(input.callerActorId));
  bytesField(0x4a, text.encode(input.targetUrl));
  return Uint8Array.from(parts);
}

function malformed(): GatewayError {
  return new GatewayError("GATEWAY_UNAVAILABLE", "Vault response is malformed", { stage: "vault" });
}

export function decodePutCredentialResponse(message: Uint8Array): { keyVersion: number } {
  let pos = 0;
  const readVarint = (): bigint => {
    let result = 0n;
    for (let shift = 0n; shift < 70n; shift += 7n) {
      const byte = message[pos++];
      if (byte === undefined) throw malformed();
      result |= BigInt(byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) return result;
    }
    throw malformed();
  };
  const skip = (count: number): void => {
    if (pos + count > message.length) throw malformed();
    pos += count;
  };
  let keyVersion: bigint | null = null;
  while (pos < message.length) {
    const tag = readVarint();
    const field = tag >> 3n;
    const wire = Number(tag & 7n);
    if (wire === 0) {
      const value = readVarint();
      if (field === 1n) keyVersion = value;
    } else if (field === 1n) {
      throw malformed();
    } else if (wire === 1) {
      skip(8);
    } else if (wire === 5) {
      skip(4);
    } else if (wire === 2) {
      const length = readVarint();
      if (length > BigInt(message.length)) throw malformed();
      skip(Number(length));
    } else {
      throw malformed();
    }
  }
  if (keyVersion === null || keyVersion < 1n || keyVersion > 2147483647n) throw malformed();
  return { keyVersion: Number(keyVersion) };
}
