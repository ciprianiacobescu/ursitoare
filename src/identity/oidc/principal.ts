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

export function principalOf(session: SessionContext): Principal {
  return {
    tenantId: session.tenant.tenantId,
    userId: session.userId,
    kind: "human",
    sessionId: session.sessionRef,
    roles: [],
    teams: [],
    actorChain: [],
  };
}
