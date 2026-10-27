import { createHash, timingSafeEqual } from "node:crypto";

import { verifyPkce } from "./pkce.ts";
import type { Provider, ProviderClient } from "./provider.ts";
import type { ParsedRequest, Reply } from "./server.ts";
import { mintJwt } from "./tokens.ts";
import type { TokenContext } from "./tokens.ts";

export const TOKEN_PATH = "/realms/ursitoare/protocol/openid-connect/token";

const JSON_HEADERS = { "content-type": "application/json", "cache-control": "no-store" } as const;

const CLIENT_AUTH_CHALLENGE = { "www-authenticate": 'Basic realm="ursitoare"' } as const;

function jsonReply(value: unknown, status = 200, extra: Record<string, string> = {}): Reply {
  return {
    status,
    headers: { ...JSON_HEADERS, ...extra },
    body: JSON.stringify(value),
  };
}

function errorReply(status: number, error: string, extra: Record<string, string> = {}): Reply {
  return jsonReply({ error }, status, extra);
}

function isForm(contentType: string | undefined): boolean {
  if (contentType === undefined) return false;
  return contentType.split(";")[0]?.trim().toLowerCase() === "application/x-www-form-urlencoded";
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function secretMatches(actual: string, expected: string): boolean {
  return timingSafeEqual(digest(actual), digest(expected));
}

function decodeBasic(value: string): string | undefined {
  let decoded: string;
  try {
    decoded = Buffer.from(value, "base64").toString("utf8");
  } catch {
    return undefined;
  }
  const separator = decoded.indexOf(":");
  if (separator < 0) return undefined;
  try {
    const id = decodeURIComponent(decoded.slice(0, separator));
    const secret = decodeURIComponent(decoded.slice(separator + 1));
    return `${id}:${secret}`;
  } catch {
    return undefined;
  }
}

type AuthenticatedClient = Readonly<{ client: ProviderClient; clientId: string }>;

function authenticate(
  provider: Provider,
  request: ParsedRequest,
): AuthenticatedClient | undefined {
  const header = request.headers.authorization;
  const formClientId = request.form["client_id"];

  if (typeof header === "string" && /^basic\s/i.test(header)) {
    const encoded = header.replace(/^basic\s+/i, "").trim();
    const credentials = decodeBasic(encoded);
    if (credentials === undefined) return undefined;
    const separator = credentials.indexOf(":");
    const id = credentials.slice(0, separator);
    const secret = credentials.slice(separator + 1);

    const client = provider.clients.get(id);
    if (client === undefined || !client.confidential) return undefined;
    if (!secretMatches(secret, client.secret)) return undefined;
    if (formClientId !== undefined && formClientId !== id) return undefined;
    return { client, clientId: id };
  }

  if (formClientId === undefined) return undefined;
  if (request.form["client_secret"] !== undefined) return undefined;
  const client = provider.clients.get(formClientId);
  if (client === undefined || client.confidential) return undefined;
  return { client, clientId: formClientId };
}

export function tokenPost(provider: Provider, request: ParsedRequest): Reply {
  if (!isForm(typeof request.headers["content-type"] === "string" ? request.headers["content-type"] : undefined)) {
    return errorReply(400, "invalid_request");
  }

  const grantType = request.form["grant_type"];
  if (grantType === undefined) {
    return errorReply(400, "invalid_request");
  }
  if (grantType !== "authorization_code") {
    return errorReply(400, "unsupported_grant_type");
  }

  const authenticated = authenticate(provider, request);
  if (authenticated === undefined) {
    return errorReply(401, "invalid_client", CLIENT_AUTH_CHALLENGE);
  }

  const code = request.form["code"];
  const redirectUri = request.form["redirect_uri"];
  const verifier = request.form["code_verifier"];
  if (code === undefined || redirectUri === undefined || verifier === undefined) {
    return errorReply(400, "invalid_request");
  }

  const nowMs = provider.now().getTime();
  const record = provider.codes.get(code);
  if (record !== undefined) provider.codes.delete(code);
  if (record === undefined || nowMs >= record.expiresAt) {
    return errorReply(400, "invalid_grant");
  }

  if (
    record.clientId !== authenticated.clientId ||
    record.redirectUri !== redirectUri ||
    !verifyPkce(verifier, record.challenge)
  ) {
    return errorReply(400, "invalid_grant");
  }

  provider.sessions.set(record.sid, "live");

  const ctx: TokenContext = { issuer: provider.issuer, now: provider.now, keys: provider.keys };
  const nonce = record.nonce === undefined ? {} : { nonce: record.nonce };
  const accessToken = mintJwt(ctx, {
    user: record.username,
    clientId: record.clientId,
    kind: "access",
    scope: record.scope,
    sid: record.sid,
    ...nonce,
  });
  const idToken = mintJwt(ctx, {
    user: record.username,
    clientId: record.clientId,
    kind: "id",
    scope: record.scope,
    sid: record.sid,
    ...nonce,
  });

  return jsonReply({
    access_token: accessToken,
    id_token: idToken,
    token_type: "Bearer",
    expires_in: 300,
    scope: record.scope,
  });
}
