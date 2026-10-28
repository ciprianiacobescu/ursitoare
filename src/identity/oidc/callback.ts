import { createHash, timingSafeEqual } from "node:crypto";

import type { FastifyInstance } from "fastify";

import type { Clock } from "../../core/index.ts";
import type { TenantPool } from "../../tenancy/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import { resolveTenantForToken } from "../tenant-idp.ts";
import { upsertUserFromClaims } from "../users.ts";
import type { OidcClient } from "./client.ts";
import type { OidcConfigShape } from "./config-shape.ts";
import { SESSION_COOKIE, parseCookies, serializeCookie } from "./cookies.ts";
import { OidcError } from "./errors.ts";
import { verifyIdToken } from "./id-token.ts";
import {
  LOGIN_COOKIE,
  LOGIN_COOKIE_PATH,
  LOGIN_INFO,
  type LoginState,
} from "./login.ts";
import { createSealer } from "./seal.ts";
import { createSession } from "./sessions.ts";

const SESSION_HINT_INFO = "ursitoare/session-hint";
const SIGN_IN_PATH = "/sign-in";
const SESSION_COOKIE_PATH = "/";
const MAX_STATE_LENGTH = 128;
const MAX_CODE_LENGTH = 2_048;

export interface CallbackDeps {
  config: OidcConfigShape;
  client: OidcClient;
  publicBaseUrl: string;
  pool: TenantPool;
  engineKey: { reveal(): string };
  clock: Clock;
}

interface CallbackQuery {
  state?: unknown;
  code?: unknown;
  error?: unknown;
}

function refusalLocation(code: string): string {
  return `${SIGN_IN_PATH}?error=${encodeURIComponent(code)}`;
}

function refusalCode(error: unknown): string {
  return error instanceof OidcError ? error.code : "OIDC_INTERNAL";
}

function sameState(left: string, right: string): boolean {
  const a = createHash("sha256").update(left, "utf8").digest();
  const b = createHash("sha256").update(right, "utf8").digest();
  return timingSafeEqual(a, b);
}

function validState(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_STATE_LENGTH
    ? value
    : null;
}

function validCode(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_CODE_LENGTH
    ? value
    : null;
}

export function registerCallbackRoute(server: FastifyInstance, deps: CallbackDeps): void {
  const loginSealer = createSealer(LOGIN_INFO, deps.engineKey);
  const hintSealer = createSealer(SESSION_HINT_INFO, deps.engineKey);
  const secure = deps.publicBaseUrl.startsWith("https:");
  const redirectUri = `${deps.publicBaseUrl}/auth/oidc/callback`;
  const clearedLogin = (): string =>
    serializeCookie(LOGIN_COOKIE, "", {
      path: LOGIN_COOKIE_PATH,
      secure,
      maxAgeS: 0,
    });

  server.get("/auth/oidc/callback", async (request, reply) => {
    reply.header("cache-control", "no-store");

    try {
      const cookies = parseCookies(request.headers.cookie);
      const sealed = cookies[LOGIN_COOKIE];
      const state = loginSealer.open<LoginState>(sealed ?? "");
      if (
        state === null ||
        state.v !== 1 ||
        typeof state.exp !== "number" ||
        state.exp <= deps.clock.now().getTime() ||
        typeof state.state !== "string" ||
        typeof state.nonce !== "string" ||
        typeof state.verifier !== "string" ||
        typeof state.returnTo !== "string"
      ) {
        throw new OidcError("OIDC_INTERNAL", "the sign-in could not be completed");
      }

      const query = (request.query ?? {}) as CallbackQuery;
      const returnedState = validState(query.state);
      if (returnedState === null || !sameState(returnedState, state.state)) {
        throw new OidcError("OIDC_INTERNAL", "the sign-in could not be completed");
      }
      if (query.error !== undefined) {
        throw new OidcError("OIDC_INTERNAL", "the sign-in could not be completed");
      }
      const code = validCode(query.code);
      if (code === null) {
        throw new OidcError("OIDC_INTERNAL", "the sign-in could not be completed");
      }

      const idToken = await deps.client.exchangeCode(code, state.verifier, redirectUri);
      const claims = await verifyIdToken(idToken, {
        config: deps.config,
        nonce: state.nonce,
        clock: deps.clock,
        keyFor: (kid) => deps.client.signingKey(kid),
      });
      const tenant = await resolveTenantForToken(deps.pool, {
        issuer: claims.issuer,
        organization: claims.organization,
      });
      const session = await withTenantTx(deps.pool, tenant, async (tx) => {
        const user = await upsertUserFromClaims(tx, tenant, claims, { clock: deps.clock });
        const endSessionHint = hintSealer.seal(idToken, `${tenant.tenantId}\n${user.userId}`);
        return createSession(
          tx,
          tenant,
          { userId: user.userId, endSessionHint },
          { clock: deps.clock },
        );
      });

      const sessionCookie = serializeCookie(SESSION_COOKIE, session.sessionId, {
        path: SESSION_COOKIE_PATH,
        secure,
      });
      reply.header("set-cookie", [clearedLogin(), sessionCookie]);
      reply.code(302).header("location", state.returnTo).send();
    } catch (error) {
      const code = refusalCode(error);
      const reason = error instanceof OidcError ? error.details["reason"] : undefined;
      request.log.warn(reason === undefined ? { code } : { code, reason }, "sign-in refused");
      reply.header("set-cookie", [clearedLogin()]);
      reply.code(302).header("location", refusalLocation(code)).send();
    }
  });
}
