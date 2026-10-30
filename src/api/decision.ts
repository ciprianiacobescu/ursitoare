import type { FastifyRequest } from "fastify";

import type { Principal } from "../identity/index.ts";
import { recordDecision, scopedId, userEntity } from "../pdp/index.ts";
import type { ActionName, Decision, PolicyRequest } from "../pdp/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import { ApiError } from "./errors.ts";
import type { PepDeps } from "./pep.ts";
import { auditRefusal } from "./refusal.ts";
import type { ResourceRef } from "./route.ts";

function resourceUid(ref: ResourceRef): { type: string; id: string } {
  return {
    type: ref.type,
    id: ref.type === "Tenant" ? ref.id : scopedId(ref.tenantId, ref.id),
  };
}

export function buildPolicyRequest(
  principal: Principal,
  action: ActionName,
  ref: ResourceRef,
): PolicyRequest {
  const user = userEntity(principal);
  const uid = resourceUid(ref);
  return {
    principal: user.uid,
    action,
    resource: uid,
    context: {},
    entities: [
      user,
      { uid, attrs: { ...ref.attrs, tenant: ref.tenantId }, parents: [] },
    ],
  };
}

function unavailable(): ApiError {
  return new ApiError(503, "AUTHZ_UNAVAILABLE", "Authorization is unavailable");
}

export async function enforce(
  request: FastifyRequest,
  deps: PepDeps,
  action: ActionName,
  ref: ResourceRef,
): Promise<void> {
  const principal = request.principal;
  const tenant = request.tenant;
  if (principal === undefined || tenant === undefined || deps.pool === null || deps.engine === null) {
    throw unavailable();
  }

  const policyRequest = buildPolicyRequest(principal, action, ref);

  let decision: Decision;
  try {
    decision = await deps.engine.check(policyRequest);
  } catch {
    request.log.warn(
      { code: "AUTHZ_UNAVAILABLE", reason: "check_failed" },
      "request refused",
    );
    throw unavailable();
  }

  try {
    await withTenantTx(deps.pool, tenant, (tx) =>
      recordDecision(tx, tenant, decision, policyRequest),
    );
  } catch {
    request.log.warn(
      { code: "AUTHZ_UNAVAILABLE", reason: "record_failed" },
      "request refused",
    );
    throw unavailable();
  }

  if (decision.decision === "allow" && decision.errors.length === 0) {
    return;
  }

  await auditRefusal(request, deps, {
    eventType: "authz.denied",
    actor: {
      kind: principal.kind === "service" ? "service" : "user",
      id: principal.userId,
    },
    target: { kind: "action", id: action },
    payload: {
      decisionId: decision.decisionId,
      method: request.method,
      route: request.routeOptions.url,
      resourceType: ref.type,
    },
  });

  throw new ApiError(403, "FORBIDDEN", "Action not permitted", {
    decisionId: decision.decisionId,
  });
}
