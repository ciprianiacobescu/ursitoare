import type { FastifyRequest } from "fastify";

import { appendAuditCommitted } from "../audit/index.ts";
import type { AuditEventInput } from "../audit/index.ts";
import type { PepDeps } from "./pep.ts";

export async function auditRefusal(
  request: FastifyRequest,
  deps: PepDeps,
  event: AuditEventInput,
): Promise<void> {
  if (deps.pool === null || request.tenant === undefined) {
    return;
  }
  try {
    await appendAuditCommitted(deps.pool, request.tenant, event, { clock: deps.clock });
  } catch {
    request.log.warn({ code: "AUDIT_FAILED" }, "refusal audit failed");
  }
}
