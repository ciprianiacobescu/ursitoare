import { SESSION_COOKIE, parseCookies, principalOf, resolveSession } from "../identity/index.ts";
import type { AuthKind, AuthVerifier } from "./route.ts";

export const sessionVerifier: AuthVerifier = async (req, auth: AuthKind, deps) => {
  if (auth.kind !== "session" || deps.pool === null) {
    return null;
  }
  const cookies = parseCookies(req.headers.cookie);
  const session = await resolveSession(deps.pool, cookies[SESSION_COOKIE], {
    clock: deps.clock,
  });
  if (session === null) {
    return null;
  }
  return { principal: principalOf(session), tenant: session.tenant, session };
};
