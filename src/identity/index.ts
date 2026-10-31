// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type { IdentityErrorCode } from "./errors.ts";
export { IdentityError } from "./errors.ts";
export type { UserKind, UserState, User, IdentityOptions, TokenClaims, UserPage } from "./users.ts";
export { upsertUserFromClaims, getUser, listUsers, createServiceAccount } from "./users.ts";
export type { AdminErrorCode } from "./admin/errors.ts";
export { AdminError } from "./admin/errors.ts";
export type { AdminAccount } from "./admin/accounts.ts";
export {
  getAccount,
  listAccounts,
  provisionServiceAccount,
  setAccountState,
} from "./admin/accounts.ts";
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
export type { RbacErrorCode } from "./rbac/errors.ts";
export { RbacError } from "./rbac/errors.ts";
export type { RbacActor } from "./rbac/names.ts";
export {
  DEFAULT_ROLES,
  DEFAULT_BOOTSTRAP_ADMIN_GROUP,
  BOOTSTRAP_ADMIN_GROUP_ENV,
} from "./rbac/names.ts";
export { listRoles, listTeams, createTeam, deleteTeam } from "./rbac/teams.ts";
export type { GroupMapping } from "./rbac/group-map.ts";
export {
  listGroupMappings,
  setGroupMapping,
  removeGroupMapping,
} from "./rbac/group-map.ts";
export type { SyncResult } from "./rbac/sync.ts";
export { groupsFromIdToken, syncMemberships } from "./rbac/sync.ts";
export type { MembershipSet } from "./rbac/memberships.ts";
export { loadMemberships } from "./rbac/memberships.ts";
export { grantRole, revokeRole } from "./rbac/grants.ts";
export { mapBootstrapAdminGroup, bootstrapAdminGroup } from "./rbac/bootstrap.ts";
export { resolvePrincipal } from "./rbac/principal.ts";
