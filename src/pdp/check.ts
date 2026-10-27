import type { Clock, IdSource } from "../core/index.ts";
import type { Logger } from "../observability/index.ts";
import { cedar } from "./cedar.ts";
import { guardRequest } from "./guards.ts";
import { buildPermit } from "./permit.ts";
import type { Decision, Egress, Permit, PolicyRequest } from "./types.ts";

export interface CheckOptions {
  readonly policySetVersion: string;
  readonly actions: readonly string[];
  readonly preparsedPolicySetId: string;
  readonly preparsedSchemaName: string;
  readonly clock: Clock;
  readonly ids: IdSource;
  readonly logger: Logger;
}

interface DecisionState {
  readonly decisionId: string;
  readonly decidedAt: string;
  readonly policySetVersion: string;
}

function denied(
  state: DecisionState,
  reasons: readonly string[],
  errors: readonly string[],
): Decision {
  return {
    decision: "deny",
    decisionId: state.decisionId,
    decidedAt: state.decidedAt,
    reasons: [...reasons],
    errors: [...errors],
    policySetVersion: state.policySetVersion,
  };
}

function interpret(
  state: DecisionState,
  answer: ReturnType<typeof cedar.statefulIsAuthorized>,
  logger: Logger,
): Decision {
  if (answer.type === "failure") {
    return denied(state, [], ["PDP_REQUEST_INVALID"]);
  }

  const response = answer.response;
  const reasons = [...response.diagnostics.reason].sort();
  const errors = [
    ...new Set(
      response.diagnostics.errors.map((entry) => `PDP_EVALUATION_ERROR:${entry.policyId}`),
    ),
  ].sort();

  if (errors.length > 0) {
    logger.warn({ decisionId: state.decisionId, errors }, "pdp deny on error");
    return denied(state, reasons, errors);
  }

  if (response.decision === "allow") {
    return {
      decision: "allow",
      decisionId: state.decisionId,
      decidedAt: state.decidedAt,
      reasons,
      errors,
      policySetVersion: state.policySetVersion,
    };
  }

  return denied(state, reasons, errors);
}

function allowPermit(egress: Egress | undefined): Permit | undefined {
  return egress === undefined ? undefined : buildPermit(egress);
}

export async function runCheck(req: PolicyRequest, opts: CheckOptions): Promise<Decision> {
  const decisionId = opts.ids.next("dec");
  const decidedAt = opts.clock.now().toISOString();
  const state: DecisionState = {
    decisionId,
    decidedAt,
    policySetVersion: opts.policySetVersion,
  };

  const guard = guardRequest(req, opts.actions);
  if (!guard.ok) {
    return denied(state, [], [guard.code]);
  }
  const request = guard.request;

  try {
    const answer = cedar.statefulIsAuthorized({
      principal: request.principal,
      action: { type: "Action", id: request.action },
      resource: request.resource,
      context: request.context as cedar.Context,
      entities: request.entities as cedar.EntityJson[],
      preparsedPolicySetId: opts.preparsedPolicySetId,
      preparsedSchemaName: opts.preparsedSchemaName,
      validateRequest: true,
    });
    const decision = interpret(state, answer, opts.logger);
    if (decision.decision !== "allow") {
      return decision;
    }
    const permit = allowPermit(request.egress);
    return permit === undefined ? decision : { ...decision, permit };
  } catch (err) {
    opts.logger.error({ err }, "pdp internal error");
    return denied(state, [], ["PDP_INTERNAL"]);
  }
}
