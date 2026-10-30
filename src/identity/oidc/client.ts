import type { JsonWebKey } from "node:crypto";

import type { Clock } from "../../core/index.ts";
import type { OidcConfigShape } from "./config-shape.ts";
import { OidcError } from "./errors.ts";

export interface OidcClient {
  discovery(): Promise<{
    authorizeUrl: string;
    tokenUrl: string;
    jwksUrl: string;
    logoutUrl: string | null;
  }>;
  signingKey(kid: string): Promise<JsonWebKey | null>;
  exchangeCode(code: string, codeVerifier: string, redirectUri: string): Promise<string>;
}

const CACHE_TTL_MS = 3_600_000;
const MAX_BODY_BYTES = 262_144;
const MAX_KEYS = 32;
const DEFAULT_TIMEOUT_MS = 5_000;
const RS256 = "RS256";

type Discovery = Readonly<{
  authorizeUrl: string;
  tokenUrl: string;
  jwksUrl: string;
  logoutUrl: string | null;
}>;

function unavailable(reason: string, extra?: Record<string, string | number>): OidcError {
  return new OidcError(
    "OIDC_PROVIDER_UNAVAILABLE",
    "The OIDC provider is unavailable",
    extra === undefined ? { reason } : { reason, ...extra },
  );
}

function exchangeFailed(reason: string): OidcError {
  return new OidcError("OIDC_EXCHANGE_FAILED", "The authorization code could not be exchanged", {
    reason,
  });
}

async function readCapped(response: Response): Promise<string> {
  const body = response.body;
  if (body === null) return "";
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value === undefined) continue;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw unavailable("oversize");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

function endpoint(value: unknown, issuer: URL): string {
  if (typeof value !== "string") throw unavailable("endpoint");
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw unavailable("endpoint");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw unavailable("endpoint");
  if (parsed.origin !== issuer.origin) throw unavailable("origin");
  return value;
}

function parseDiscovery(value: unknown, issuer: string): Discovery {
  if (typeof value !== "object" || value === null) throw unavailable("discovery");
  const record = value as Record<string, unknown>;
  if (record["issuer"] !== issuer) throw unavailable("issuer");

  let base: URL;
  try {
    base = new URL(issuer);
  } catch {
    throw unavailable("issuer");
  }

  const authorizeUrl = endpoint(record["authorization_endpoint"], base);
  const tokenUrl = endpoint(record["token_endpoint"], base);
  const jwksUrl = endpoint(record["jwks_uri"], base);
  const endSession = record["end_session_endpoint"];
  const logoutUrl =
    endSession === undefined || endSession === null ? null : endpoint(endSession, base);

  return { authorizeUrl, tokenUrl, jwksUrl, logoutUrl };
}

function parseKeys(value: unknown): Map<string, JsonWebKey> {
  if (typeof value !== "object" || value === null) throw unavailable("jwks");
  const keys = (value as Record<string, unknown>)["keys"];
  if (!Array.isArray(keys)) throw unavailable("jwks");

  const counts = new Map<string, number>();
  for (const entry of keys) {
    if (typeof entry !== "object" || entry === null) continue;
    const kid = (entry as Record<string, unknown>)["kid"];
    if (typeof kid === "string" && kid.length > 0) {
      counts.set(kid, (counts.get(kid) ?? 0) + 1);
    }
  }

  const result = new Map<string, JsonWebKey>();
  for (const entry of keys) {
    if (result.size >= MAX_KEYS) break;
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const kid = record["kid"];
    if (typeof kid !== "string" || kid.length === 0) continue;
    if ((counts.get(kid) ?? 0) !== 1) continue;
    if (record["kty"] !== "RSA") continue;
    const use = record["use"];
    if (use !== undefined && use !== "sig") continue;
    const alg = record["alg"];
    if (alg !== undefined && alg !== RS256) continue;
    const n = record["n"];
    const e = record["e"];
    if (typeof n !== "string" || typeof e !== "string") continue;
    const modulus = Buffer.from(n, "base64url");
    if (modulus.length * 8 < 2_048) continue;
    result.set(kid, entry as unknown as JsonWebKey);
  }
  return result;
}

export function createOidcClient(deps: {
  config: OidcConfigShape;
  clock: Clock;
  fetch?: typeof fetch;
  timeoutMs?: number;
}): OidcClient {
  const { config, clock } = deps;
  const doFetch = deps.fetch ?? fetch;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let discoveryCache: Readonly<{ value: Discovery; expiresAt: number }> | null = null;
  let keysCache: Readonly<{ value: Map<string, JsonWebKey>; expiresAt: number }> | null = null;

  async function send(url: string, init: RequestInit): Promise<Response> {
    try {
      return await doFetch(url, init);
    } catch {
      throw unavailable("network");
    }
  }

  function requestInit(init: RequestInit): RequestInit {
    return { ...init, redirect: "error", signal: AbortSignal.timeout(timeoutMs) };
  }

  async function readJson(response: Response): Promise<unknown> {
    let text: string;
    try {
      text = await readCapped(response);
    } catch (error) {
      if (error instanceof OidcError) throw error;
      throw unavailable("body");
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw unavailable("json");
    }
  }

  async function fetchDiscovery(): Promise<Discovery> {
    const response = await send(
      `${config.issuer}/.well-known/openid-configuration`,
      requestInit({ method: "GET" }),
    );
    if (response.status < 200 || response.status >= 300) {
      throw unavailable("status", { status: response.status });
    }
    return parseDiscovery(await readJson(response), config.issuer);
  }

  async function discovery(): Promise<Discovery> {
    const now = clock.now().getTime();
    if (discoveryCache !== null && discoveryCache.expiresAt > now) {
      return discoveryCache.value;
    }
    const value = await fetchDiscovery();
    discoveryCache = { value, expiresAt: now + CACHE_TTL_MS };
    return value;
  }

  async function fetchKeys(): Promise<Map<string, JsonWebKey>> {
    const document = await discovery();
    const response = await send(document.jwksUrl, requestInit({ method: "GET" }));
    if (response.status < 200 || response.status >= 300) {
      throw unavailable("status", { status: response.status });
    }
    return parseKeys(await readJson(response));
  }

  async function loadKeys(): Promise<Map<string, JsonWebKey>> {
    const now = clock.now().getTime();
    const value = await fetchKeys();
    keysCache = { value, expiresAt: now + CACHE_TTL_MS };
    return value;
  }

  async function signingKey(kid: string): Promise<JsonWebKey | null> {
    const now = clock.now().getTime();
    const cached = keysCache !== null && keysCache.expiresAt > now ? keysCache.value : null;
    if (cached !== null && cached.has(kid)) return cached.get(kid) ?? null;
    const fresh = await loadKeys();
    return fresh.get(kid) ?? null;
  }

  async function exchangeCode(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<string> {
    const document = await discovery();
    const form = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });
    const credentials = `${encodeURIComponent(config.clientId)}:${encodeURIComponent(
      config.clientSecret.reveal(),
    )}`;
    const response = await send(
      document.tokenUrl,
      requestInit({
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: `Basic ${Buffer.from(credentials).toString("base64")}`,
        },
        body: form.toString(),
      }),
    );

    if (response.status >= 400 && response.status < 500) throw exchangeFailed("status");
    if (response.status < 200 || response.status >= 300) {
      throw unavailable("status", { status: response.status });
    }

    const value = await readJson(response);
    if (typeof value !== "object" || value === null) throw exchangeFailed("response");
    const idToken = (value as Record<string, unknown>)["id_token"];
    if (typeof idToken !== "string" || idToken.length === 0) throw exchangeFailed("id_token");
    return idToken;
  }

  return { discovery, signingKey, exchangeCode };
}
