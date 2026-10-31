import { withTenantTx, type TenantPool } from "../../tenancy/index.ts";
import { principalOf, type Principal } from "../oidc/principal.ts";
import type { SessionContext } from "../oidc/sessions.ts";
import { rbacError } from "./errors.ts";
import { loadMemberships } from "./memberships.ts";

const MAX_MEMBERSHIPS = 64;

export async function resolvePrincipal(
  pool: TenantPool,
  session: SessionContext,
): Promise<Principal> {
  const memberships = await withTenantTx(pool, session.tenant, (tx) =>
    loadMemberships(tx, session.tenant, session.userId),
  );
  if (
    memberships.roles.length > MAX_MEMBERSHIPS ||
    memberships.teams.length > MAX_MEMBERSHIPS
  ) {
    throw rbacError("RBAC_TOO_MANY_MEMBERSHIPS");
  }
  return {
    ...principalOf(session),
    roles: memberships.roles,
    teams: memberships.teams,
  };
}
