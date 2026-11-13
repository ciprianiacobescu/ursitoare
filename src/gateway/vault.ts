// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import http2 from "node:http2";

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

const PUT_PATH = "/mintkey.vault.v1.VaultAdapter/PutCredential";
const MAX_FRAME = 65536;

function unavailable(): GatewayError {
  return new GatewayError("GATEWAY_UNAVAILABLE", "Vault is unavailable", { stage: "vault" });
}

function frame(message: Uint8Array): Buffer {
  const out = Buffer.alloc(5 + message.length);
  out.writeUInt32BE(message.length, 1);
  out.set(message, 5);
  return out;
}

function exchange(
  vault: NonNullable<EgressConfig["vault"]>,
  body: Buffer,
  timeoutMs: number,
): Promise<{ status: string | undefined; httpStatus: unknown; data: Buffer }> {
  return new Promise((resolve, reject) => {
    let done = false;
    let session: http2.ClientHttp2Session | undefined;
    const finish = (error: unknown, value?: { status: string | undefined; httpStatus: unknown; data: Buffer }): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      session?.destroy();
      if (value === undefined) reject(error);
      else resolve(value);
    };
    const timer = setTimeout(() => finish(unavailable()), timeoutMs);
    try {
      session = http2.connect(vault.url);
      session.on("error", () => finish(unavailable()));
      const stream = session.request({
        ":method": "POST",
        ":path": PUT_PATH,
        "content-type": "application/grpc",
        te: "trailers",
        "x-mintkey-service-token": vault.token.reveal(),
        "x-mintkey-service-identity": vault.identity,
        "x-mintkey-token": vault.token.reveal(),
        "x-mintkey-identity": vault.identity,
      });
      let httpStatus: unknown;
      let status: string | undefined;
      const chunks: Buffer[] = [];
      let size = 0;
      const readStatus = (headers: http2.IncomingHttpHeaders): void => {
        const value = headers["grpc-status"];
        if (typeof value === "string") status = value;
      };
      stream.on("response", (headers) => {
        httpStatus = headers[":status"];
        readStatus(headers);
      });
      stream.on("trailers", readStatus);
      stream.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_FRAME + 5) finish(unavailable());
        else chunks.push(chunk);
      });
      stream.on("error", () => finish(unavailable()));
      stream.on("close", () => finish(null, { status, httpStatus, data: Buffer.concat(chunks) }));
      stream.end(body);
    } catch {
      finish(unavailable());
    }
  });
}

function parseFrame(data: Buffer): Uint8Array {
  if (data.length < 5 || data[0] !== 0) throw unavailable();
  const length = data.readUInt32BE(1);
  if (length > MAX_FRAME || data.length !== 5 + length) throw unavailable();
  return data.subarray(5);
}

export function createVaultWriter(
  vault: NonNullable<EgressConfig["vault"]>,
  deps: { logger: Logger; timeoutMs?: number },
): VaultWriter {
  const timeoutMs = deps.timeoutMs ?? 10000;
  return {
    async putCredential(input) {
      try {
        const reply = await exchange(vault, frame(encodePutCredentialRequest(input)), timeoutMs);
        let keyVersion: number;
        if (reply.status === "0") {
          if (reply.httpStatus !== 200) throw unavailable();
          keyVersion = decodePutCredentialResponse(parseFrame(reply.data)).keyVersion;
        } else if (reply.status === "16" || reply.status === "7") {
          throw new GatewayError("GATEWAY_TOKEN_REFUSED", "Vault refused the service token", { status: reply.status });
        } else if (reply.status === "3") {
          throw new GatewayError("GATEWAY_INVALID", "Vault refused the credential", { reason: "vault_refused" });
        } else {
          throw unavailable();
        }
        deps.logger.info({ serviceId: input.serviceId, keyVersion }, "vault put");
        return { keyVersion };
      } catch (error) {
        const failure = error instanceof GatewayError ? error : unavailable();
        deps.logger.warn({ serviceId: input.serviceId, code: failure.code }, "vault put failed");
        throw failure;
      }
    },
  };
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
