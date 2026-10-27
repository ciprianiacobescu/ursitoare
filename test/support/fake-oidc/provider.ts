import { randomBytes } from "node:crypto";

import { createKeyRing } from "./keys.ts";
import type { KeyRing } from "./keys.ts";
import { CLIENTS, USERS } from "./seed.ts";
import { mintJwt } from "./tokens.ts";
import { FakeOidcError } from "./types.ts";
import type { MintOptions, RecordedRequest } from "./types.ts";

export type ProviderUser = Readonly<{ username: string; password: string }>;

export type ProviderClient = {
  readonly clientId: string;
  readonly confidential: boolean;
  readonly secret: string;
  readonly redirectUris: Set<string>;
  readonly postLogoutUris: Set<string>;
};

export type CodeRecord = {
  readonly code: string;
  readonly clientId: string;
  readonly redirectUri: string;
  readonly challenge: string;
  readonly scope: string;
  readonly nonce?: string;
  readonly username: string;
  readonly sid: string;
  readonly expiresAt: number;
};

export type SessionState = "live" | "ended";

export type RecordedInput = Readonly<{
  method: string;
  path: string;
  query: Readonly<Record<string, string>>;
  form: Readonly<Record<string, string>>;
  status: number;
}>;

export type Provider = Readonly<{
  issuer: string;
  url: string;
  now: () => Date;
  users: Map<string, ProviderUser>;
  clients: Map<string, ProviderClient>;
  codes: Map<string, CodeRecord>;
  sessions: Map<string, SessionState>;
  keys: KeyRing;
  registerRedirect(uri: string, opts?: { clientId?: string; postLogout?: boolean }): void;
  clientSecret(clientId: string): string;
  passwordOf(username: string): string;
  mintToken(opts: MintOptions): string;
  rotateSigningKey(): void;
  requests(): RecordedRequest[];
  record(input: RecordedInput): void;
}>;

const MAX_REQUESTS = 5000;
const REDACTED = "[redacted]";
const SECRET_FIELDS = new Set([
  "id_token_hint",
  "code",
  "code_verifier",
  "client_secret",
  "password",
  "access_token",
  "id_token",
  "refresh_token",
]);

function drawSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function parseRedirectUri(uri: string): void {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch (cause) {
    throw new FakeOidcError("FAKE_OIDC_BAD_REDIRECT", "redirect URI is not a URL", { cause });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new FakeOidcError("FAKE_OIDC_BAD_REDIRECT", "redirect URI must use http or https");
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new FakeOidcError("FAKE_OIDC_BAD_REDIRECT", "redirect URI must not carry user information");
  }
  if (parsed.hash !== "") {
    throw new FakeOidcError("FAKE_OIDC_BAD_REDIRECT", "redirect URI must not carry a fragment");
  }
}

function redact(values: Readonly<Record<string, string>>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    result[key] = SECRET_FIELDS.has(key) ? REDACTED : value;
  }
  return result;
}

export function createProvider(config: {
  issuer: string;
  url: string;
  now: () => Date;
}): Provider {
  const users = new Map<string, ProviderUser>();
  for (const user of USERS) {
    users.set(user.username, { username: user.username, password: drawSecret() });
  }

  const clients = new Map<string, ProviderClient>();
  for (const client of CLIENTS) {
    clients.set(client.clientId, {
      clientId: client.clientId,
      confidential: client.confidential,
      secret: drawSecret(),
      redirectUris: new Set<string>(),
      postLogoutUris: new Set<string>(),
    });
  }

  const codes = new Map<string, CodeRecord>();
  const sessions = new Map<string, SessionState>();
  const keys = createKeyRing();
  const log: RecordedRequest[] = [];

  function registerRedirect(
    uri: string,
    opts: { clientId?: string; postLogout?: boolean } = {},
  ): void {
    parseRedirectUri(uri);
    const clientId = opts.clientId ?? "ursitoare-engine";
    const client = clients.get(clientId);
    if (client === undefined) {
      throw new FakeOidcError("FAKE_OIDC_UNKNOWN_CLIENT", `unknown client: ${clientId}`);
    }
    if (opts.postLogout === true) {
      client.postLogoutUris.add(uri);
    } else {
      client.redirectUris.add(uri);
    }
  }

  function clientSecret(clientId: string): string {
    const client = clients.get(clientId);
    if (client === undefined) {
      throw new FakeOidcError("FAKE_OIDC_UNKNOWN_CLIENT", `unknown client: ${clientId}`);
    }
    if (!client.confidential) {
      throw new FakeOidcError("FAKE_OIDC_PUBLIC_CLIENT", `client is public: ${clientId}`);
    }
    return client.secret;
  }

  function passwordOf(username: string): string {
    const user = users.get(username);
    if (user === undefined) {
      throw new FakeOidcError("FAKE_OIDC_UNKNOWN_USER", `unknown user: ${username}`);
    }
    return user.password;
  }

  function record(entry: RecordedInput): void {
    log.push({
      at: config.now().toISOString(),
      method: entry.method,
      path: entry.path,
      query: redact(entry.query),
      form: redact(entry.form),
      status: entry.status,
    });
    if (log.length > MAX_REQUESTS) {
      log.splice(0, log.length - MAX_REQUESTS);
    }
  }

  return {
    issuer: config.issuer,
    url: config.url,
    now: config.now,
    users,
    clients,
    codes,
    sessions,
    keys,
    registerRedirect,
    clientSecret,
    passwordOf,
    mintToken(opts: MintOptions): string {
      return mintJwt({ issuer: config.issuer, now: config.now, keys }, opts);
    },
    rotateSigningKey(): void {
      keys.rotate();
    },
    requests(): RecordedRequest[] {
      return log.map((entry) => ({
        at: entry.at,
        method: entry.method,
        path: entry.path,
        query: { ...entry.query },
        form: { ...entry.form },
        status: entry.status,
      }));
    },
    record,
  };
}
