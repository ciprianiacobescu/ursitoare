import { createHash, timingSafeEqual } from "node:crypto";
import http2 from "node:http2";

import type { FakeVaultIdentity } from "./index.ts";
import { credentialKey } from "./state.ts";
import type { FakeState } from "./state.ts";
import { VAULT_IDENTITY_HEADER, VAULT_PUT_PATH, VAULT_TOKEN_HEADER } from "./vault-client.ts";
import { WireError, decodePutRequest, encodePutResponse, frame, unframe } from "./wire.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HTTP_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

const digest = (s: string): Buffer => createHash("sha256").update(s).digest();

function sameText(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

function isOrigin(text: string): boolean {
  try {
    const url = new URL(text);
    return (url.protocol === "http:" || url.protocol === "https:") && url.origin === text;
  } catch {
    return false;
  }
}

function findIdentity(state: FakeState, name: unknown, token: unknown): FakeVaultIdentity | null {
  if (typeof name !== "string" || typeof token !== "string") return null;
  const known = state.vaultIdentities.find((i) => i.identity === name);
  if (known === undefined || !sameText(known.token, token)) return null;
  return known;
}

function validate(m: ReturnType<typeof decodePutRequest>): string | null {
  if (!UUID.test(m.tenantId)) return "tenant_id must be a UUID";
  if (!UUID.test(m.serviceId)) return "service_id must be a UUID";
  if (m.authScheme !== 1 && m.authScheme !== 3) return "auth_scheme must be 1 or 3";
  if (m.value.length < 1 || m.value.length > 65536) return "value must be 1 to 65536 bytes";
  if (!m.value.every((b) => b >= 0x20 && b <= 0x7e)) return "value must be printable ASCII";
  if (m.authScheme === 1 && !HTTP_TOKEN.test(m.headerName)) {
    return "header_name must be an HTTP token for auth_scheme 1";
  }
  if (!isOrigin(m.targetUrl)) return "target_url must be an http or https origin";
  return null;
}

type Outcome = { status: number; message: string; body?: Buffer };

function handle(state: FakeState, headers: http2.IncomingHttpHeaders, body: Buffer): Outcome {
  const who = findIdentity(state, headers[VAULT_IDENTITY_HEADER], headers[VAULT_TOKEN_HEADER]);
  if (who === null) return { status: 16, message: "unauthenticated" };
  if (headers[":method"] !== "POST" || headers[":path"] !== VAULT_PUT_PATH) {
    return { status: 12, message: "unimplemented" };
  }
  if (!who.scopes.includes("vault.put")) return { status: 7, message: "permission denied" };
  let message: ReturnType<typeof decodePutRequest>;
  try {
    message = decodePutRequest(unframe(body));
  } catch (e) {
    if (e instanceof WireError) return { status: 3, message: "malformed request" };
    throw e;
  }
  const invalid = validate(message);
  if (invalid !== null) return { status: 3, message: invalid };

  const key = credentialKey(message.tenantId, message.serviceId);
  const keyVersion = (state.credentials.get(key)?.meta.keyVersion ?? 0) + 1;
  state.credentials.set(key, {
    meta: {
      tenantId: message.tenantId,
      serviceId: message.serviceId,
      authScheme: message.authScheme === 1 ? "API_KEY_HEADER" : "BEARER_TOKEN",
      headerName: message.authScheme === 1 ? message.headerName.toLowerCase() : null,
      targetUrl: message.targetUrl,
      keyVersion,
      callerActorId: message.callerActorId,
      identity: who.identity,
    },
    value: message.value,
  });
  return { status: 0, message: "", body: frame(encodePutResponse(keyVersion)) };
}

export function createVaultServer(state: FakeState): http2.Http2Server {
  const server = http2.createServer();
  server.on("stream", (stream, headers) => {
    stream.on("error", () => {});
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => {
      const out = handle(state, headers, Buffer.concat(chunks));
      stream.respond({ ":status": 200, "content-type": "application/grpc" }, { waitForTrailers: true });
      stream.on("wantTrailers", () => {
        stream.sendTrailers(
          out.status === 0
            ? { "grpc-status": "0" }
            : { "grpc-status": String(out.status), "grpc-message": out.message },
        );
      });
      stream.end(out.body);
    });
  });
  return server;
}
