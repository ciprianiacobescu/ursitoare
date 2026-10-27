import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import { renderLoginPage } from "./login-page.ts";
import type { Provider } from "./provider.ts";
import type { ParsedRequest, Reply } from "./server.ts";

export const AUTHORIZATION_PATH = "/realms/ursitoare/protocol/openid-connect/auth";

const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
} as const;

const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CODE_LIFETIME_MS = 60000;
const MAX_CODES = 1000;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function htmlReply(status: number, body: string): Reply {
  return { status, headers: HTML_HEADERS, body };
}

function errorPage(message: string): Reply {
  return htmlReply(
    400,
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Invalid request</title>
</head>
<body>
<main>
<h1>Invalid request</h1>
<p>${escapeHtml(message)}</p>
</main>
</body>
</html>
`,
  );
}

function param(request: ParsedRequest, key: string): string | undefined {
  const queryValue = request.query[key];
  if (queryValue !== undefined) return queryValue;
  return request.form[key];
}

function actionOf(request: ParsedRequest): string {
  return request.rawQuery === "" ? request.path : `${request.path}?${request.rawQuery}`;
}

function redirectReply(uri: URL, extra: ReadonlyArray<readonly [string, string]>): Reply {
  for (const [key, value] of extra) {
    uri.searchParams.set(key, value);
  }
  return {
    status: 302,
    headers: { location: uri.toString(), "cache-control": "no-store" },
    body: "",
  };
}

function errorRedirect(
  redirectUri: string,
  error: string,
  description: string,
  state: string | undefined,
): Reply {
  const extra: Array<readonly [string, string]> = [
    ["error", error],
    ["error_description", description],
  ];
  if (state !== undefined) extra.push(["state", state]);
  return redirectReply(new URL(redirectUri), extra);
}

type AuthorizeInput = Readonly<{
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string | undefined;
  nonce: string | undefined;
  challenge: string;
}>;

type ParseResult = Readonly<{ reply: Reply }> | Readonly<{ input: AuthorizeInput }>;

function parseAuthorize(provider: Provider, request: ParsedRequest): ParseResult {
  const clientId = param(request, "client_id");
  const client = clientId === undefined ? undefined : provider.clients.get(clientId);
  if (client === undefined || clientId === undefined) {
    return { reply: errorPage("Invalid parameter: client_id") };
  }

  const redirectUri = param(request, "redirect_uri");
  if (redirectUri === undefined || !client.redirectUris.has(redirectUri)) {
    return { reply: errorPage("Invalid parameter: redirect_uri") };
  }

  const state = param(request, "state");
  const responseType = param(request, "response_type");
  if (responseType !== "code") {
    return {
      reply: errorRedirect(
        redirectUri,
        "unsupported_response_type",
        "response_type must be code",
        state,
      ),
    };
  }

  const scope = param(request, "scope") ?? "";
  if (!scope.split(/\s+/).includes("openid")) {
    return {
      reply: errorRedirect(redirectUri, "invalid_scope", "scope must contain openid", state),
    };
  }

  const challenge = param(request, "code_challenge");
  if (challenge === undefined || !CHALLENGE_PATTERN.test(challenge)) {
    return {
      reply: errorRedirect(redirectUri, "invalid_request", "invalid code_challenge", state),
    };
  }

  const method = param(request, "code_challenge_method");
  if (method !== "S256") {
    return {
      reply: errorRedirect(
        redirectUri,
        "invalid_request",
        "code_challenge_method must be S256",
        state,
      ),
    };
  }

  return {
    input: {
      clientId,
      redirectUri,
      scope,
      state,
      nonce: param(request, "nonce"),
      challenge,
    },
  };
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function passwordMatches(provider: Provider, username: string, password: string): boolean {
  const user = provider.users.get(username);
  const expected = user === undefined ? randomBytes(32) : sha256(user.password);
  const actual = sha256(password);
  return timingSafeEqual(actual, expected) && user !== undefined;
}

function pruneCodes(provider: Provider, nowMs: number): void {
  for (const [code, record] of provider.codes) {
    if (nowMs >= record.expiresAt) provider.codes.delete(code);
  }
  while (provider.codes.size >= MAX_CODES) {
    const oldest = provider.codes.keys().next();
    if (oldest.done === true) break;
    provider.codes.delete(oldest.value);
  }
}

export function authorizeGet(provider: Provider, request: ParsedRequest): Reply {
  const parsed = parseAuthorize(provider, request);
  if ("reply" in parsed) return parsed.reply;
  return htmlReply(200, renderLoginPage({ action: actionOf(request) }));
}

export function authorizePost(provider: Provider, request: ParsedRequest): Reply {
  const parsed = parseAuthorize(provider, request);
  if ("reply" in parsed) return parsed.reply;

  const username = (param(request, "username") ?? "").toLowerCase();
  const password = param(request, "password") ?? "";
  if (!passwordMatches(provider, username, password)) {
    return htmlReply(
      200,
      renderLoginPage({
        action: actionOf(request),
        username,
        error: "Invalid username or password.",
      }),
    );
  }

  const nowMs = provider.now().getTime();
  pruneCodes(provider, nowMs);
  const code = randomBytes(32).toString("base64url");
  provider.codes.set(code, {
    code,
    clientId: parsed.input.clientId,
    redirectUri: parsed.input.redirectUri,
    challenge: parsed.input.challenge,
    scope: parsed.input.scope,
    ...(parsed.input.nonce === undefined ? {} : { nonce: parsed.input.nonce }),
    username,
    sid: randomUUID(),
    expiresAt: nowMs + CODE_LIFETIME_MS,
  });

  const extra: Array<readonly [string, string]> = [["code", code]];
  if (parsed.input.state !== undefined) extra.push(["state", parsed.input.state]);
  return redirectReply(new URL(parsed.input.redirectUri), extra);
}
