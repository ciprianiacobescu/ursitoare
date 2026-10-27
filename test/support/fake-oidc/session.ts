import { decodeJwt, verifyRs256 } from "./jwt.ts";
import type { DecodedJwt } from "./jwt.ts";
import type { Jwk } from "./keys.ts";
import type { Provider } from "./provider.ts";
import type { ParsedRequest, Reply } from "./server.ts";

export const USERINFO_PATH = "/realms/ursitoare/protocol/openid-connect/userinfo";
export const LOGOUT_PATH = "/realms/ursitoare/protocol/openid-connect/logout";

const JSON_HEADERS = { "content-type": "application/json", "cache-control": "no-store" } as const;
const INVALID_TOKEN_CHALLENGE = { "www-authenticate": 'Bearer error="invalid_token"' } as const;
const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
} as const;

function jsonReply(value: unknown, status = 200, extra: Record<string, string> = {}): Reply {
  return {
    status,
    headers: { ...JSON_HEADERS, ...extra },
    body: JSON.stringify(value),
  };
}

function htmlReply(status: number, body: string): Reply {
  return { status, headers: HTML_HEADERS, body };
}

function invalidToken(): Reply {
  return jsonReply({ error: "invalid_token" }, 401, INVALID_TOKEN_CHALLENGE);
}

function invalidLogout(): Reply {
  return jsonReply({ error: "invalid_request" }, 400);
}

function findKey(provider: Provider, kid: unknown): Jwk | undefined {
  if (typeof kid !== "string") return undefined;
  return provider.keys.jwks().keys.find((key) => key.kid === kid);
}

function verifiedToken(provider: Provider, token: string): DecodedJwt | undefined {
  let decoded: DecodedJwt;
  try {
    decoded = decodeJwt(token);
  } catch {
    return undefined;
  }
  const key = findKey(provider, decoded.header["kid"]);
  if (key === undefined) return undefined;
  if (!verifyRs256(token, key)) return undefined;
  if (decoded.payload["iss"] !== provider.issuer) return undefined;
  return decoded;
}

function bearerToken(request: ParsedRequest): string | undefined {
  const header = request.headers.authorization;
  if (typeof header !== "string") return undefined;
  const match = /^bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim();
}

function liveAccessToken(provider: Provider, token: string): DecodedJwt | undefined {
  const decoded = verifiedToken(provider, token);
  if (decoded === undefined) return undefined;
  const exp = decoded.payload["exp"];
  if (typeof exp !== "number" || exp * 1000 <= provider.now().getTime()) return undefined;
  const sid = decoded.payload["sid"];
  if (typeof sid === "string" && provider.sessions.get(sid) === "ended") return undefined;
  return decoded;
}

function profileReply(decoded: DecodedJwt): Reply {
  const payload = decoded.payload;
  const profile: Record<string, unknown> = {
    sub: payload["sub"],
    email: payload["email"],
    email_verified: payload["email_verified"],
    name: payload["name"],
    preferred_username: payload["preferred_username"],
  };
  if ("organization" in payload) profile["organization"] = payload["organization"];
  if ("groups" in payload) profile["groups"] = payload["groups"];
  return jsonReply(profile);
}

export function userinfoGet(provider: Provider, request: ParsedRequest): Reply {
  const token = bearerToken(request);
  if (token === undefined) return invalidToken();
  const decoded = liveAccessToken(provider, token);
  if (decoded === undefined) return invalidToken();
  return profileReply(decoded);
}

export function userinfoPost(provider: Provider, request: ParsedRequest): Reply {
  return userinfoGet(provider, request);
}

function loggedOutPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Logged out</title>
</head>
<body>
<main>
<h1>You are logged out</h1>
<p>You have been signed out of ursitoare.</p>
</main>
</body>
</html>
`;
}

export function logoutGet(provider: Provider, request: ParsedRequest): Reply {
  const hint = request.query["id_token_hint"];
  if (hint === undefined) return invalidLogout();
  const decoded = verifiedToken(provider, hint);
  if (decoded === undefined) return invalidLogout();

  const clientId = decoded.payload["azp"];
  if (typeof clientId !== "string") return invalidLogout();
  const client = provider.clients.get(clientId);
  if (client === undefined) return invalidLogout();

  const target = request.query["post_logout_redirect_uri"];
  if (target !== undefined) {
    if (!client.redirectUris.has(target) && !client.postLogoutUris.has(target)) {
      return invalidLogout();
    }
    const sid = decoded.payload["sid"];
    if (typeof sid === "string") provider.sessions.set(sid, "ended");
    const uri = new URL(target);
    const state = request.query["state"];
    if (state !== undefined) uri.searchParams.set("state", state);
    return {
      status: 302,
      headers: { location: uri.toString(), "cache-control": "no-store" },
      body: "",
    };
  }

  const sid = decoded.payload["sid"];
  if (typeof sid === "string") provider.sessions.set(sid, "ended");
  return htmlReply(200, loggedOutPage());
}
