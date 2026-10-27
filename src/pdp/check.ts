import type { Clock, IdSource } from "../core/index.ts";
import type { Logger } from "../observability/index.ts";
import { cedar } from "./cedar.ts";
import type { Decision, PolicyRequest } from "./types.ts";

export interface CheckOptions {
  readonly policySetVersion: string;
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

export async function runCheck(req: PolicyRequest, opts: CheckOptions): Promise<Decision> {
  const decisionId = opts.ids.next("dec");
  const decidedAt = opts.clock.now().toISOString();
  const state: DecisionState = {
    decisionId,
    decidedAt,
    policySetVersion: opts.policySetVersion,
  };

  try {
    const answer = cedar.statefulIsAuthorized({
      principal: req.principal,
      action: { type: "Action", id: req.action },
      resource: req.resource,
      context: req.context as cedar.Context,
      entities: req.entities as cedar.EntityJson[],
      preparsedPolicySetId: opts.preparsedPolicySetId,
      preparsedSchemaName: opts.preparsedSchemaName,
      validateRequest: true,
    });
    return interpret(state, answer, opts.logger);
  } catch (err) {
    opts.logger.error({ err }, "pdp internal error");
    return denied(state, [], ["PDP_INTERNAL"]);
  }
}
