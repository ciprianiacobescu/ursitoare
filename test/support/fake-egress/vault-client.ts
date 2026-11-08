import http2 from "node:http2";

import { decodePutResponse, encodePutRequest, frame, unframe } from "./wire.ts";
import type { VaultPutInput } from "./wire.ts";

export const VAULT_PUT_PATH = "/mintkey.vault.v1.VaultAdapter/PutCredential";
export const VAULT_IDENTITY_HEADER = "x-mintkey-identity";
export const VAULT_TOKEN_HEADER = "x-mintkey-token";

export function callVault(
  vaultUrl: string,
  who: { identity: string; token: string } | null,
  body: Uint8Array,
  rpc?: { path?: string; method?: string },
): Promise<{ grpcStatus: number; grpcMessage: string; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const session = http2.connect(vaultUrl);
    let settled = false;
    const fail = (e: Error): void => {
      if (settled) return;
      settled = true;
      session.destroy();
      reject(e);
    };
    session.on("error", fail);
    const headers: http2.OutgoingHttpHeaders = {
      ":method": rpc?.method ?? "POST",
      ":path": rpc?.path ?? VAULT_PUT_PATH,
      "content-type": "application/grpc",
      te: "trailers",
    };
    if (who !== null) {
      headers[VAULT_IDENTITY_HEADER] = who.identity;
      headers[VAULT_TOKEN_HEADER] = who.token;
    }
    const stream = session.request(headers, { endStream: false });
    const chunks: Buffer[] = [];
    let status = -1;
    let message = "";
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("trailers", (t) => {
      status = Number(t["grpc-status"] ?? -1);
      const m = t["grpc-message"];
      message = typeof m === "string" ? m : "";
    });
    stream.on("error", fail);
    stream.on("close", () => {
      if (settled) return;
      settled = true;
      session.close();
      if (status < 0) reject(new Error("vault answered without grpc-status"));
      else resolve({ grpcStatus: status, grpcMessage: message, body: Buffer.concat(chunks) });
    });
    stream.end(Buffer.from(body));
  });
}

export async function putCredential(
  vaultUrl: string,
  who: { identity: string; token: string } | null,
  input: VaultPutInput,
): Promise<{ grpcStatus: number; grpcMessage: string; keyVersion: number | null }> {
  const answer = await callVault(vaultUrl, who, frame(encodePutRequest(input)));
  const keyVersion = answer.grpcStatus === 0 ? decodePutResponse(unframe(answer.body)) : null;
  return { grpcStatus: answer.grpcStatus, grpcMessage: answer.grpcMessage, keyVersion };
}
