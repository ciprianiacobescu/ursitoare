import { createHash, randomBytes as cryptoRandomBytes } from "node:crypto";

import type { FastifyInstance } from "fastify";

import type { Clock } from "../../core/index.ts";
import type { OidcClient } from "./client.ts";
import type { OidcConfigShape } from "./config-shape.ts";
import { serializeCookie } from "./cookies.ts";
import { OidcError } from "./errors.ts";
import { sanitizeReturnTo } from "./return-to.ts";
import { createSealer } from "./seal.ts";

export const LOGIN_COOKIE = "ursitoare_login";

const LOGIN_INFO = "ursitoare/login";
const LOGIN_COOKIE_PATH = "/auth/oidc";
const LOGIN_COOKIE_MAX_AGE_S = 600;
const LOGIN_TTL_MS = LOGIN_COOKIE_MAX_AGE_S * 1000;
const RANDOM_BYTES = 32;
const SCOPE = "openid profile email organization";
const SIGN_IN_PATH = "/sign-in";

interface LoginState {
  v: 1;
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
  exp: number;
}

export interface LoginDeps {
  config: OidcConfigShape;
  client: OidcClient;
  publicBaseUrl: string;
  engineKey: { reveal(): string };
  clock: Clock;
}

function randomToken(): string {
  return cryptoRandomBytes(RANDOM_BYTES).toString("base64url");
}

function challengeOf(verifier: string): string {
  return createHash("sha256").update(verifier, "utf8").digest("base64url");
}

function refusalLocation(code: string): string {
  return `${SIGN_IN_PATH}?error=${encodeURIComponent(code)}`;
}

function refusalCode(error: unknown): string {
  if (error instanceof OidcError) {
    return error.code;
  }
  return "OIDC_INTERNAL";
}

export function registerLoginRoute(server: FastifyInstance, deps: LoginDeps): void {
  const sealer = createSealer(LOGIN_INFO, deps.engineKey);
  const secure = deps.publicBaseUrl.startsWith("https:");
  const redirectUri = `${deps.publicBaseUrl}/auth/oidc/callback`;

  server.get("/auth/oidc/login", async (request, reply) => {
    reply.header("cache-control", "no-store");

    let authorizeUrl: string;
    try {
      const discovery = await deps.client.discovery();
      const state = randomToken();
      const nonce = randomToken();
      const verifier = randomToken();
      const returnTo = sanitizeReturnTo(
        (request.query as Record<string, unknown> | undefined)?.["return_to"],
      );
      const payload: LoginState = {
        v: 1,
        state,
        nonce,
        verifier,
        returnTo,
        exp: deps.clock.now().getTime() + LOGIN_TTL_MS,
      };

      const url = new URL(discovery.authorizeUrl);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", deps.config.clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("scope", SCOPE);
      url.searchParams.set("state", state);
      url.searchParams.set("nonce", nonce);
      url.searchParams.set("code_challenge", challengeOf(verifier));
      url.searchParams.set("code_challenge_method", "S256");
      authorizeUrl = url.toString();

      const cookie = serializeCookie(LOGIN_COOKIE, sealer.seal(payload), {
        path: LOGIN_COOKIE_PATH,
        secure,
        maxAgeS: LOGIN_COOKIE_MAX_AGE_S,
      });
      reply.header("set-cookie", cookie);
    } catch (error) {
      const code = refusalCode(error);
      request.log.warn({ code }, "sign-in refused");
      reply.code(302).header("location", refusalLocation(code)).send();
      return;
    }

    reply.code(302).header("location", authorizeUrl).send();
  });
}
