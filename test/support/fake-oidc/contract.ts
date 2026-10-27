import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import { decodeJwt } from "./jwt.ts";
import { pkceChallengeS256 } from "./pkce.ts";
import { FakeOidcError } from "./types.ts";

export type OidcContractCredentials = Readonly<{
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  username: string;
  password: string;
  organization: string;
  groups: readonly string[];
}>;

export type ContractCheck = Readonly<{ name: string; run(): Promise<void> }>;

const DISCOVERY_SUFFIX = "/.well-known/openid-configuration";
const PROTOCOL_SUFFIX = "/protocol/openid-connect";
const SCOPE = "openid profile email organization";
const PASSWORD_ERROR = "Invalid username or password";

type Discovery = Record<string, unknown>;
type CookieJar = Map<string, string>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function randomValue(): string {
  return randomBytes(32).toString("base64url");
}

function unescapeHtml(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function cookieHeader(jar: CookieJar): string | undefined {
  if (jar.size === 0) return undefined;
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function absorbCookies(jar: CookieJar, response: Response): void {
  for (const header of response.headers.getSetCookie()) {
    const pair = header.split(";")[0]?.trim();
    if (pair === undefined || pair === "") continue;
    const separator = pair.indexOf("=");
    if (separator <= 0) continue;
    jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

async function send(jar: CookieJar, url: string | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const cookies = cookieHeader(jar);
  if (cookies !== undefined) headers.set("cookie", cookies);
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers, redirect: "manual" });
  } catch (cause) {
    throw new FakeOidcError("FAKE_OIDC_CONTRACT_UNREACHABLE", `cannot reach ${String(url)}`, {
      cause,
    });
  }
  absorbCookies(jar, response);
  return response;
}

function endpointOf(discovery: Discovery, key: string): string {
  const value = discovery[key];
  assert.equal(typeof value, "string", `${key} must be a string`);
  return value as string;
}

async function discoveryOf(baseUrl: string, jar: CookieJar): Promise<Discovery> {
  const response = await send(jar, `${baseUrl}${DISCOVERY_SUFFIX}`);
  assert.equal(response.status, 200, "the discovery document is not 200");
  const body: unknown = await response.json();
  assert.ok(isRecord(body), "the discovery document is not a JSON object");
  return body;
}

function authorizeUrl(
  discovery: Discovery,
  credentials: OidcContractCredentials,
  extra: Record<string, string>,
): string {
  const url = new URL(endpointOf(discovery, "authorization_endpoint"));
  url.search = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: credentials.redirectUri,
    response_type: "code",
    scope: SCOPE,
    ...extra,
  }).toString();
  return url.toString();
}

async function loadForm(jar: CookieJar, url: string): Promise<string> {
  const response = await send(jar, url);
  assert.equal(response.status, 200, "the authorization endpoint did not render a form");
  const html = await response.text();
  const match = /<form id="kc-form-login" method="post" action="([^"]*)"/.exec(html);
  assert.ok(match !== null, "the login page has no form action");
  const action = match[1];
  assert.ok(action !== undefined);
  return new URL(unescapeHtml(action), url).toString();
}

async function submitLogin(
  jar: CookieJar,
  action: string,
  username: string,
  password: string,
): Promise<Response> {
  return send(jar, action, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }).toString(),
  });
}

type SignInResult = Readonly<{ code: string; state: string; nonce: string; verifier: string }>;

async function signIn(
  jar: CookieJar,
  discovery: Discovery,
  credentials: OidcContractCredentials,
): Promise<SignInResult> {
  const state = randomValue();
  const nonce = randomValue();
  const verifier = randomValue();
  const url = authorizeUrl(discovery, credentials, {
    state,
    nonce,
    code_challenge: pkceChallengeS256(verifier),
    code_challenge_method: "S256",
  });
  const action = await loadForm(jar, url);
  const response = await submitLogin(jar, action, credentials.username, credentials.password);
  assert.equal(response.status, 302, "sign-in did not redirect");
  const location = response.headers.get("location");
  assert.ok(location !== null, "sign-in has no Location header");
  assert.ok(
    location.startsWith(credentials.redirectUri),
    "sign-in redirected outside the registered redirect URI",
  );
  const redirected = new URL(location);
  assert.equal(redirected.searchParams.get("state"), state, "sign-in changed the state");
  const code = redirected.searchParams.get("code");
  assert.ok(nonEmptyString(code), "sign-in returned no code");
  return { code, state, nonce, verifier };
}

async function exchange(
  jar: CookieJar,
  discovery: Discovery,
  credentials: OidcContractCredentials,
  code: string,
  verifier: string,
): Promise<Response> {
  const basic = Buffer.from(
    `${credentials.clientId}:${credentials.clientSecret}`,
    "utf8",
  ).toString("base64");
  return send(jar, endpointOf(discovery, "token_endpoint"), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: credentials.redirectUri,
      code_verifier: verifier,
    }).toString(),
  });
}

async function tokenBody(response: Response): Promise<Record<string, unknown>> {
  const body: unknown = await response.json();
  assert.ok(isRecord(body), "the token response is not a JSON object");
  return body;
}

type Tokens = Readonly<{ body: Record<string, unknown>; accessToken: string; idToken: string }>;

async function signInAndExchange(
  jar: CookieJar,
  discovery: Discovery,
  credentials: OidcContractCredentials,
): Promise<Tokens> {
  const { code, verifier } = await signIn(jar, discovery, credentials);
  const response = await exchange(jar, discovery, credentials, code, verifier);
  assert.equal(response.status, 200, "the code exchange did not return 200");
  const body = await tokenBody(response);
  const accessToken = body["access_token"];
  const idToken = body["id_token"];
  assert.ok(nonEmptyString(accessToken), "the token response has no access_token");
  assert.ok(nonEmptyString(idToken), "the token response has no id_token");
  return { body, accessToken, idToken };
}

function includesValue(discovery: Discovery, key: string, value: string): void {
  const list = discovery[key];
  assert.ok(Array.isArray(list), `${key} must be an array`);
  assert.ok(list.includes(value), `${key} must include ${value}`);
}

async function checkDiscovery(baseUrl: string, jar: CookieJar): Promise<void> {
  const response = await send(jar, `${baseUrl}${DISCOVERY_SUFFIX}`);
  assert.equal(response.status, 200, "the discovery document is not 200");
  const body: unknown = await response.json();
  assert.ok(isRecord(body), "the discovery document is not a JSON object");
  assert.equal(body["issuer"], baseUrl);
  assert.equal(body["authorization_endpoint"], `${baseUrl}${PROTOCOL_SUFFIX}/auth`);
  assert.equal(body["token_endpoint"], `${baseUrl}${PROTOCOL_SUFFIX}/token`);
  assert.equal(body["userinfo_endpoint"], `${baseUrl}${PROTOCOL_SUFFIX}/userinfo`);
  assert.equal(body["end_session_endpoint"], `${baseUrl}${PROTOCOL_SUFFIX}/logout`);
  assert.equal(body["jwks_uri"], `${baseUrl}${PROTOCOL_SUFFIX}/certs`);
  includesValue(body, "grant_types_supported", "authorization_code");
  includesValue(body, "id_token_signing_alg_values_supported", "RS256");
  includesValue(body, "code_challenge_methods_supported", "S256");
  includesValue(body, "token_endpoint_auth_methods_supported", "client_secret_basic");
  includesValue(body, "scopes_supported", "openid");
}

async function checkJwks(baseUrl: string, jar: CookieJar): Promise<void> {
  const discovery = await discoveryOf(baseUrl, jar);
  const response = await send(jar, endpointOf(discovery, "jwks_uri"));
  assert.equal(response.status, 200, "the JWKS is not 200");
  const body: unknown = await response.json();
  assert.ok(isRecord(body), "the JWKS is not a JSON object");
  const keys = body["keys"];
  assert.ok(Array.isArray(keys) && keys.length > 0, "the JWKS has no keys");
  const key = keys.find(
    (candidate: unknown) =>
      isRecord(candidate) &&
      candidate["alg"] === "RS256" &&
      nonEmptyString(candidate["kid"]) &&
      nonEmptyString(candidate["n"]) &&
      nonEmptyString(candidate["e"]),
  );
  assert.ok(key !== undefined, "the JWKS has no RS256 key with a kid, n and e");
}

async function checkCodeFlow(baseUrl: string, jar: CookieJar, credentials: OidcContractCredentials): Promise<void> {
  const discovery = await discoveryOf(baseUrl, jar);
  const tokens = await signInAndExchange(jar, discovery, credentials);
  assert.equal(String(tokens.body["token_type"]).toLowerCase(), "bearer");
  const expiresIn = tokens.body["expires_in"];
  assert.ok(typeof expiresIn === "number" && expiresIn > 0, "expires_in is not positive");
}

async function checkClaims(baseUrl: string, jar: CookieJar, credentials: OidcContractCredentials): Promise<void> {
  const discovery = await discoveryOf(baseUrl, jar);
  const { code, verifier, nonce } = await signIn(jar, discovery, credentials);
  const response = await exchange(jar, discovery, credentials, code, verifier);
  assert.equal(response.status, 200, "the code exchange did not return 200");
  const body = await tokenBody(response);
  const idToken = body["id_token"];
  assert.ok(nonEmptyString(idToken), "the token response has no id_token");
  const payload = decodeJwt(idToken).payload;
  assert.equal(payload["iss"], baseUrl);
  const audience = payload["aud"];
  assert.ok(
    audience === credentials.clientId ||
      (Array.isArray(audience) && audience.includes(credentials.clientId)),
    "the id token audience does not name the client",
  );
  assert.equal(payload["nonce"], nonce);
  const iat = payload["iat"];
  const exp = payload["exp"];
  assert.ok(typeof iat === "number", "the id token has no iat");
  assert.ok(typeof exp === "number", "the id token has no exp");
  assert.ok(exp - iat > 0 && exp - iat <= 3600, "the id token lifetime is not sane");
  assert.deepEqual(payload["organization"], [credentials.organization]);
  const groups = payload["groups"];
  assert.ok(Array.isArray(groups), "the id token has no groups");
  for (const group of credentials.groups) {
    assert.ok(groups.includes(group), `the id token lacks the group ${group}`);
  }
  for (const group of groups) {
    assert.ok(typeof group === "string" && !group.startsWith("/"));
  }
}

async function checkUserinfo(baseUrl: string, jar: CookieJar, credentials: OidcContractCredentials): Promise<void> {
  const discovery = await discoveryOf(baseUrl, jar);
  const tokens = await signInAndExchange(jar, discovery, credentials);
  const idPayload = decodeJwt(tokens.idToken).payload;
  const userinfo = endpointOf(discovery, "userinfo_endpoint");
  const response = await send(jar, userinfo, {
    headers: { authorization: `Bearer ${tokens.accessToken}` },
  });
  assert.equal(response.status, 200, "userinfo did not return 200 for a live access token");
  const profile: unknown = await response.json();
  assert.ok(isRecord(profile), "userinfo is not a JSON object");
  assert.equal(profile["sub"], idPayload["sub"]);
  const anonymous = await send(jar, userinfo);
  assert.equal(anonymous.status, 401, "userinfo answered without an access token");
}

async function checkWrongPassword(baseUrl: string, jar: CookieJar, credentials: OidcContractCredentials): Promise<void> {
  const discovery = await discoveryOf(baseUrl, jar);
  const url = authorizeUrl(discovery, credentials, {
    state: randomValue(),
    nonce: randomValue(),
    code_challenge: pkceChallengeS256(randomValue()),
    code_challenge_method: "S256",
  });
  const action = await loadForm(jar, url);
  const response = await submitLogin(
    jar,
    action,
    credentials.username,
    `wrong-${credentials.password}`,
  );
  assert.equal(response.status, 200, "a wrong password did not re-render the form");
  assert.equal(response.headers.get("location"), null, "a wrong password redirected");
  const html = await response.text();
  assert.ok(html.includes(PASSWORD_ERROR), "the form does not show the wrong-password error");
  assert.ok(html.includes('type="password"'), "the form has no password input");
}

async function checkPlainPkce(baseUrl: string, jar: CookieJar, credentials: OidcContractCredentials): Promise<void> {
  const discovery = await discoveryOf(baseUrl, jar);
  const verifier = randomValue();
  const url = authorizeUrl(discovery, credentials, {
    state: randomValue(),
    nonce: randomValue(),
    code_challenge: verifier,
    code_challenge_method: "plain",
  });
  const response = await send(jar, url);
  const location = response.headers.get("location");
  const refused =
    (response.status >= 400 && response.status < 500) ||
    (response.status === 302 && location !== null && location.includes("error="));
  assert.ok(refused, "plain PKCE was not refused");
  const html = await response.text();
  assert.equal(html.includes('type="password"'), false, "plain PKCE reached the login form");
}

async function checkSingleUse(baseUrl: string, jar: CookieJar, credentials: OidcContractCredentials): Promise<void> {
  const discovery = await discoveryOf(baseUrl, jar);
  const { code, verifier } = await signIn(jar, discovery, credentials);
  const first = await exchange(jar, discovery, credentials, code, verifier);
  assert.equal(first.status, 200, "the first exchange did not return 200");
  await first.text();
  const second = await exchange(jar, discovery, credentials, code, verifier);
  assert.equal(second.status, 400, "the second exchange of a code did not return 400");
  const body = await second.json();
  assert.ok(isRecord(body), "the error response is not a JSON object");
  assert.equal(body["error"], "invalid_grant");
}

async function checkRedirectExactness(
  baseUrl: string,
  jar: CookieJar,
  credentials: OidcContractCredentials,
): Promise<void> {
  const discovery = await discoveryOf(baseUrl, jar);
  const evil: OidcContractCredentials = { ...credentials, redirectUri: "https://evil.example/cb" };
  const url = authorizeUrl(discovery, evil, {
    state: randomValue(),
    nonce: randomValue(),
    code_challenge: pkceChallengeS256(randomValue()),
    code_challenge_method: "S256",
  });
  const response = await send(jar, url);
  assert.ok(
    response.status >= 400 && response.status < 500,
    "a foreign redirect URI was not refused with a 4xx",
  );
  assert.equal(response.headers.get("location"), null, "a foreign redirect URI redirected");
  const html = await response.text();
  assert.equal(html.includes('type="password"'), false, "a foreign redirect URI reached the login form");
}

async function checkLogout(baseUrl: string, jar: CookieJar, credentials: OidcContractCredentials): Promise<void> {
  const discovery = await discoveryOf(baseUrl, jar);
  const tokens = await signInAndExchange(jar, discovery, credentials);
  const logout = new URL(endpointOf(discovery, "end_session_endpoint"));
  const state = randomValue();
  logout.searchParams.set("id_token_hint", tokens.idToken);
  logout.searchParams.set("post_logout_redirect_uri", credentials.redirectUri);
  logout.searchParams.set("state", state);
  const response = await send(jar, logout.toString());
  assert.equal(response.status, 302, "logout did not redirect");
  const location = response.headers.get("location");
  assert.ok(location !== null, "logout has no Location header");
  assert.ok(
    location.startsWith(credentials.redirectUri),
    "logout redirected outside the registered redirect URI",
  );
  assert.equal(new URL(location).searchParams.get("state"), state, "logout changed the state");
  const userinfo = await send(jar, endpointOf(discovery, "userinfo_endpoint"), {
    headers: { authorization: `Bearer ${tokens.accessToken}` },
  });
  assert.equal(userinfo.status, 401, "userinfo still answered after logout");
}

export function oidcContract(baseUrl: string, credentials: OidcContractCredentials): ContractCheck[] {
  return [
    {
      name: "discovery document",
      run: () => checkDiscovery(baseUrl, new Map<string, string>()),
    },
    {
      name: "jwks keys",
      run: () => checkJwks(baseUrl, new Map<string, string>()),
    },
    {
      name: "code flow with PKCE",
      run: () => checkCodeFlow(baseUrl, new Map<string, string>(), credentials),
    },
    {
      name: "claims of the id token",
      run: () => checkClaims(baseUrl, new Map<string, string>(), credentials),
    },
    {
      name: "userinfo with the access token",
      run: () => checkUserinfo(baseUrl, new Map<string, string>(), credentials),
    },
    {
      name: "wrong password shows the error",
      run: () => checkWrongPassword(baseUrl, new Map<string, string>(), credentials),
    },
    {
      name: "plain PKCE is refused",
      run: () => checkPlainPkce(baseUrl, new Map<string, string>(), credentials),
    },
    {
      name: "code is single use",
      run: () => checkSingleUse(baseUrl, new Map<string, string>(), credentials),
    },
    {
      name: "redirect uri must match exactly",
      run: () => checkRedirectExactness(baseUrl, new Map<string, string>(), credentials),
    },
    {
      name: "logout ends the session",
      run: () => checkLogout(baseUrl, new Map<string, string>(), credentials),
    },
  ];
}
