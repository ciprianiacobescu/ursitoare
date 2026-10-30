// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantPool } from "../../tenancy/index.ts";
import type { Principal } from "../oidc/principal.ts";
import type { SessionContext } from "../oidc/sessions.ts";

export async function resolvePrincipal(_pool: TenantPool, _session: SessionContext): Promise<Principal> {
  throw new Error("not implemented");
}
