import http from "node:http";
import type { IncomingHttpHeaders, IncomingMessage, Server, ServerResponse } from "node:http";

import { AUTHORIZATION_PATH, authorizeGet, authorizePost } from "./authorize.ts";
import { createProvider, parseRedirectUri } from "./provider.ts";
import type { Provider } from "./provider.ts";
import { FakeOidcError } from "./types.ts";
import type { FakeOidc, RecordedRequest } from "./types.ts";

const REALM = "ursitoare";
const REALM_PATH = `/realms/${REALM}`;
const DISCOVERY_PATH = `${REALM_PATH}/.well-known/openid-configuration`;
const PROTOCOL_PATH = `${REALM_PATH}/protocol/openid-connect`;
const CERTS_PATH = `${PROTOCOL_PATH}/certs`;
const MAX_BODY = 65536;

const JSON_HEADERS = { "content-type": "application/json", "cache-control": "no-store" } as const;

export type Reply = Readonly<{
  status: number;
  headers: Readonly<Record<string, string>>;
  body: string;
}>;

export type ParsedRequest = Readonly<{
  method: string;
  path: string;
  rawQuery: string;
  query: Readonly<Record<string, string>>;
  form: Readonly<Record<string, string>>;
  headers: IncomingHttpHeaders;
  body: string;
}>;

export type Handler = (provider: Provider, request: ParsedRequest) => Reply | Promise<Reply>;

function jsonReply(value: unknown, status = 200, extra: Record<string, string> = {}): Reply {
  return {
    status,
    headers: { ...JSON_HEADERS, ...extra },
    body: JSON.stringify(value),
  };
}

function discoveryDocument(provider: Provider): Record<string, unknown> {
  return {
    issuer: provider.issuer,
    authorization_endpoint: `${provider.issuer}/protocol/openid-connect/auth`,
    token_endpoint: `${provider.issuer}/protocol/openid-connect/token`,
    userinfo_endpoint: `${provider.issuer}/protocol/openid-connect/userinfo`,
    end_session_endpoint: `${provider.issuer}/protocol/openid-connect/logout`,
    jwks_uri: `${provider.issuer}/protocol/openid-connect/certs`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["client_secret_basic"],
    scopes_supported: ["openid", "profile", "email", "organization"],
  };
}

const ROUTES: Record<string, Handler> = {
  [`GET ${DISCOVERY_PATH}`]: (provider) => jsonReply(discoveryDocument(provider)),
  [`GET ${CERTS_PATH}`]: (provider) => jsonReply(provider.keys.jwks()),
  [`GET ${AUTHORIZATION_PATH}`]: authorizeGet,
  [`POST ${AUTHORIZATION_PATH}`]: authorizePost,
};

function methodsFor(path: string): string[] {
  const methods: string[] = [];
  for (const key of Object.keys(ROUTES)) {
    const separator = key.indexOf(" ");
    if (key.slice(separator + 1) === path) {
      methods.push(key.slice(0, separator));
    }
  }
  return methods;
}

function firstValues(params: URLSearchParams): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of new Set(params.keys())) {
    const value = params.get(key);
    if (value !== null) values[key] = value;
  }
  return values;
}

function isForm(contentType: string | undefined): boolean {
  if (contentType === undefined) return false;
  return contentType.split(";")[0]?.trim().toLowerCase() === "application/x-www-form-urlencoded";
}

function formValues(contentType: string | undefined, body: string): Record<string, string> {
  if (!isForm(contentType) || body.length === 0) return {};
  return firstValues(new URLSearchParams(body));
}

type BodyResult = Readonly<{ body: string; tooLarge: boolean }>;

function readBody(request: IncomingMessage): Promise<BodyResult> {
  return new Promise<BodyResult>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let tooLarge = false;
    let settled = false;

    function finish(result: BodyResult): void {
      if (settled) return;
      settled = true;
      resolve(result);
    }

    request.on("data", (chunk: Buffer) => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_BODY) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      finish({ body: tooLarge ? "" : Buffer.concat(chunks).toString("utf8"), tooLarge });
    });
    request.on("error", (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}

function send(response: ServerResponse, reply: Reply): void {
  response.writeHead(reply.status, reply.headers);
  response.end(reply.body);
}

function sendAndClose(response: ServerResponse, reply: Reply): void {
  const headers = { ...reply.headers, connection: "close" };
  response.writeHead(reply.status, headers);
  response.end(reply.body, () => {
    response.socket?.destroy();
  });
}

function headerHost(request: IncomingMessage): string {
  const host = request.headers.host;
  return (Array.isArray(host) ? (host[0] ?? "") : (host ?? "")).toLowerCase();
}

function recordRequest(provider: Provider, request: ParsedRequest, status: number): void {
  const entry: Omit<RecordedRequest, "at"> = {
    method: request.method,
    path: request.path,
    query: request.query,
    form: request.form,
    status,
  };
  provider.record(entry);
}

async function handle(
  provider: Provider,
  allowedHosts: ReadonlySet<string>,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", provider.url);
  const path = url.pathname;
  const rawQuery = url.search.startsWith("?") ? url.search.slice(1) : "";
  const query = firstValues(url.searchParams);
  let parsed: ParsedRequest = {
    method,
    path,
    rawQuery,
    query,
    form: {},
    headers: request.headers,
    body: "",
  };

  try {
    if (!allowedHosts.has(headerHost(request))) {
      request.resume();
      const reply = jsonReply({ error: "invalid_request" }, 400);
      recordRequest(provider, parsed, reply.status);
      send(response, reply);
      return;
    }

    const body = await readBody(request);
    const form = body.tooLarge ? {} : formValues(request.headers["content-type"], body.body);
    parsed = {
      method,
      path,
      rawQuery,
      query,
      form,
      headers: request.headers,
      body: body.body,
    };

    if (body.tooLarge) {
      const reply = jsonReply({ error: "invalid_request" }, 413);
      recordRequest(provider, parsed, reply.status);
      sendAndClose(response, reply);
      return;
    }

    const route = ROUTES[`${method} ${path}`];
    if (route === undefined) {
      const methods = methodsFor(path);
      const reply =
        methods.length > 0
          ? jsonReply({ error: "method_not_allowed" }, 405, { allow: methods.join(", ") })
          : jsonReply({ error: "not_found" }, 404);
      recordRequest(provider, parsed, reply.status);
      send(response, reply);
      return;
    }

    const reply = await route(provider, parsed);
    recordRequest(provider, parsed, reply.status);
    send(response, reply);
  } catch {
    const reply = jsonReply({ error: "server_error" }, 500);
    recordRequest(provider, parsed, reply.status);
    if (!response.headersSent) {
      send(response, reply);
    } else {
      response.end();
    }
  }
}

function normaliseStartOptions(opts: {
  port?: number;
  host?: string;
  now?: () => Date;
  redirectUri?: string;
}): { bindHost: string; displayHost: string; port: number; now: () => Date; redirectUri?: string } {
  const port = opts.port ?? 0;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new FakeOidcError("FAKE_OIDC_START_FAILED", "port must be an integer from 0 to 65535");
  }

  const host = opts.host ?? "127.0.0.1";
  let bindHost: string;
  switch (host) {
    case "127.0.0.1":
    case "localhost":
      bindHost = "127.0.0.1";
      break;
    case "::1":
      bindHost = "::1";
      break;
    default:
      throw new FakeOidcError("FAKE_OIDC_START_FAILED", `host must be a loopback host: ${host}`);
  }

  if (opts.now !== undefined && typeof opts.now !== "function") {
    throw new FakeOidcError("FAKE_OIDC_START_FAILED", "now must be a function");
  }
  const now = opts.now ?? ((): Date => new Date());

  if (opts.redirectUri !== undefined) {
    if (typeof opts.redirectUri !== "string") {
      throw new FakeOidcError("FAKE_OIDC_START_FAILED", "redirectUri must be a string");
    }
    parseRedirectUri(opts.redirectUri);
  }

  const displayHost = bindHost === "::1" ? "[::1]" : bindHost;
  return { bindHost, displayHost, port, now, ...(opts.redirectUri === undefined ? {} : { redirectUri: opts.redirectUri }) };
}

function listen(server: Server, port: number, host: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    function onError(error: Error): void {
      server.off("listening", onListening);
      reject(error);
    }
    function onListening(): void {
      server.off("error", onError);
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("server has no TCP address"));
        return;
      }
      resolve(address.port);
    }
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

export async function startFakeOidc(opts: {
  port?: number;
  host?: string;
  now?: () => Date;
  redirectUri?: string;
} = {}): Promise<FakeOidc> {
  let server: Server | undefined;
  try {
    const options = normaliseStartOptions(opts);
    const state: { provider?: Provider; allowedHosts: ReadonlySet<string> } = {
      allowedHosts: new Set<string>(),
    };

    server = http.createServer((request, response) => {
      const current = state.provider;
      if (current === undefined) {
        const reply = jsonReply({ error: "server_error" }, 500);
        send(response, reply);
        return;
      }
      void handle(current, state.allowedHosts, request, response);
    });

    const boundPort = await listen(server, options.port, options.bindHost);
    const url = `http://${options.displayHost}:${boundPort}`;
    const issuer = `${url}/realms/${REALM}`;
    const provider = createProvider({ issuer, url, now: options.now });
    state.provider = provider;

    if (options.redirectUri !== undefined) {
      provider.registerRedirect(options.redirectUri);
    }
    state.allowedHosts = new Set([
      `127.0.0.1:${boundPort}`,
      `localhost:${boundPort}`,
      `[::1]:${boundPort}`,
    ]);

    const ready = provider;
    let closing: Promise<void> | undefined;
    const close = (): Promise<void> => {
      if (closing !== undefined) return closing;
      const running = server;
      if (running === undefined) return Promise.resolve();
      closing = new Promise<void>((resolve, reject) => {
        running.closeAllConnections();
        running.close((error) => {
          if (error === undefined) resolve();
          else reject(new FakeOidcError("FAKE_OIDC_START_FAILED", "server did not close", { cause: error }));
        });
      });
      return closing;
    };

    return {
      issuer: ready.issuer,
      url: ready.url,
      clientSecret: (clientId) => ready.clientSecret(clientId),
      passwordOf: (username) => ready.passwordOf(username),
      mintToken: (mintOptions) => ready.mintToken(mintOptions),
      rotateSigningKey: () => ready.rotateSigningKey(),
      registerRedirect: (uri, registerOptions) => ready.registerRedirect(uri, registerOptions),
      requests: () => ready.requests(),
      close,
    };
  } catch (error) {
    if (server !== undefined) {
      server.closeAllConnections();
      if (server.listening) server.close();
    }
    if (error instanceof FakeOidcError) {
      throw new FakeOidcError("FAKE_OIDC_START_FAILED", error.message, { cause: error });
    }
    throw new FakeOidcError("FAKE_OIDC_START_FAILED", "fake OIDC provider did not start", {
      cause: error,
    });
  }
}
