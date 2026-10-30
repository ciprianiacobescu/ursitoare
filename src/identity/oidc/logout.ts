import type { FastifyInstance } from "fastify";

import type { Clock } from "../../core/index.ts";
import type { TenantPool } from "../../tenancy/index.ts";
import type { OidcClient } from "./client.ts";
import type { OidcConfigShape } from "./config-shape.ts";
import { SESSION_COOKIE, parseCookies, serializeCookie } from "./cookies.ts";
import { createSealer } from "./seal.ts";
import { resolveSession, revokeSession, verifyCsrfToken } from "./sessions.ts";

const SESSION_HINT_INFO = "ursitoare/session-hint";
const SIGN_IN_PATH = "/sign-in";
const SESSION_COOKIE_PATH = "/";

export interface LogoutDeps {
  config: OidcConfigShape;
  client: OidcClient;
  publicBaseUrl: string;
  pool: TenantPool;
  engineKey: { reveal(): string };
  clock: Clock;
}

function envelope(code: string, message: string): { error: { code: string; message: string } } {
  return { error: { code, message } };
}

function csrfHeader(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export function registerLogoutRoute(server: FastifyInstance, deps: LogoutDeps): void {
  const hintSealer = createSealer(SESSION_HINT_INFO, deps.engineKey);
  const secure = deps.publicBaseUrl.startsWith("https:");
  const signInUrl = `${deps.publicBaseUrl}${SIGN_IN_PATH}`;
  const clearSession = (): string =>
    serializeCookie(SESSION_COOKIE, "", {
      path: SESSION_COOKIE_PATH,
      secure,
      maxAgeS: 0,
    });

  server.post("/auth/oidc/logout", async (request, reply) => {
    reply.header("cache-control", "no-store");

    const cookies = parseCookies(request.headers.cookie);
    const cookieValue = cookies[SESSION_COOKIE];
    const session = await resolveSession(deps.pool, cookieValue, { clock: deps.clock });
    if (session === null) {
      reply.header("set-cookie", clearSession());
      reply
        .code(401)
        .send(envelope("UNAUTHENTICATED", "Authentication required"));
      return;
    }

    const token = csrfHeader(request.headers["x-csrf-token"]);
    const csrfValid = await verifyCsrfToken(deps.pool, session, token);
    if (!csrfValid) {
      reply
        .code(403)
        .send(envelope("OIDC_CSRF_INVALID", "CSRF token missing or invalid"));
      return;
    }

    await revokeSession(deps.pool, session, { clock: deps.clock });

    let redirect = signInUrl;
    if (session.endSessionHint !== null) {
      try {
        const discovery = await deps.client.discovery();
        if (discovery.logoutUrl !== null) {
          const hint = hintSealer.open<string>(
            session.endSessionHint,
            `${session.tenant.tenantId}\n${session.userId}`,
          );
          if (typeof hint === "string" && hint.length > 0) {
            const url = new URL(discovery.logoutUrl);
            url.searchParams.set("id_token_hint", hint);
            url.searchParams.set("post_logout_redirect_uri", signInUrl);
            url.searchParams.set("client_id", deps.config.clientId);
            redirect = url.toString();
          }
        }
      } catch {
        redirect = signInUrl;
      }
    }

    reply.header("set-cookie", clearSession());
    reply.code(200).send({ redirect });
  });
}
