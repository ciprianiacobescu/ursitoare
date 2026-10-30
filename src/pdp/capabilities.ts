import type { Logger } from "../observability/index.ts";
import { ACTIONS } from "./actions.ts";
import type { ActionName } from "./actions.ts";
import { isPrincipalEntity, tenantEntity, userEntity } from "./principal.ts";
import type { PrincipalEntity } from "./principal.ts";
import type { Decision, PolicyRequest } from "./types.ts";

function isCapabilityAction(name: string): boolean {
  return Object.hasOwn(ACTIONS, name) && ACTIONS[name as ActionName].capability;
}

export function probeRequest(principal: PrincipalEntity, action: ActionName): PolicyRequest | null {
  if (!isPrincipalEntity(principal)) return null;
  if (!isCapabilityAction(action)) return null;
  const user = userEntity(principal);
  return {
    principal: user.uid,
    action,
    resource: { type: "Tenant", id: principal.tenantId },
    context: {},
    entities: [user, tenantEntity(principal.tenantId)],
  };
}

export async function allowedActions(
  pdp: { check(req: PolicyRequest): Promise<Decision> },
  logger: Logger,
  principal: PrincipalEntity,
  actions: readonly unknown[],
): Promise<ActionName[]> {
  if (!Array.isArray(actions) || !isPrincipalEntity(principal)) {
    logger.warn({}, "pdp capability principal invalid");
    return [];
  }

  const seen = new Set<string>();
  const names: ActionName[] = [];
  for (const entry of actions) {
    if (typeof entry !== "string" || seen.has(entry) || !isCapabilityAction(entry)) continue;
    seen.add(entry);
    names.push(entry as ActionName);
  }

  const probes: { name: ActionName; request: PolicyRequest }[] = [];
  for (const name of names) {
    const request = probeRequest(principal, name);
    if (request !== null) probes.push({ name, request });
  }

  const outcomes = await Promise.allSettled(
    probes.map((probe) => pdp.check(probe.request)),
  );

  const kept: ActionName[] = [];
  for (let index = 0; index < outcomes.length; index += 1) {
    const probe = probes[index];
    const outcome = outcomes[index];
    if (probe === undefined || outcome === undefined) continue;
    if (outcome.status === "rejected") {
      logger.warn({ action: probe.name }, "pdp capability probe failed");
      continue;
    }
    const decision = outcome.value;
    if (decision.decision === "allow" && decision.errors.length === 0) {
      kept.push(probe.name);
    }
  }
  return kept;
}
