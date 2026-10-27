// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { SessionContext } from "./sessions.ts";

export interface Principal {
  tenantId: string;
  userId: string;
  kind: "human" | "service";
  sessionId?: string;
  roles: string[];
  teams: string[];
  actorChain: string[];
}

export function principalOf(_session: SessionContext): Principal {
  throw new Error("not implemented");
}
