// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type { IdentityErrorCode } from "./errors.ts";
export { IdentityError } from "./errors.ts";
export type { UserKind, UserState, User, IdentityOptions, TokenClaims, UserPage } from "./users.ts";
export { upsertUserFromClaims, getUser, listUsers, createServiceAccount } from "./users.ts";
export { IDP_ROUTE_KIND, idpRouteKey, organizationFromClaim } from "./route.ts";
export type { IdpPair } from "./tenant-idp.ts";
export { provisionTenantIdp, resolveTenantForToken } from "./tenant-idp.ts";
export { OidcError } from "./oidc/errors.ts";
export { SESSION_COOKIE, parseCookies, serializeCookie } from "./oidc/cookies.ts";
export { sanitizeReturnTo } from "./oidc/return-to.ts";
export type { OidcClient } from "./oidc/client.ts";
export { createOidcClient } from "./oidc/client.ts";
export { verifyIdToken } from "./oidc/id-token.ts";
export type { OidcOptions, SessionContext } from "./oidc/sessions.ts";
export {
  createSession,
  resolveSession,
  revokeSession,
  issueCsrfToken,
  verifyCsrfToken,
} from "./oidc/sessions.ts";
export type { Principal } from "./oidc/principal.ts";
export { principalOf } from "./oidc/principal.ts";
export type { OidcRoutesDeps } from "./oidc/routes.ts";
export { registerOidcRoutes } from "./oidc/routes.ts";
