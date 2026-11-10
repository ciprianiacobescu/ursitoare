import type { Clock, IdSource } from "../core/index.ts";
import type { Logger } from "../observability/index.ts";
import { cedar } from "./cedar.ts";
import { runCheck } from "./check.ts";
import { policySetVersionOf } from "./digest.ts";
import { PdpError } from "./errors.ts";
import { loadPolicySet } from "./load.ts";
import type { Decision, Pdp, PolicyRequest, PolicySource } from "./types.ts";

let instanceCounter = 0;

export async function createPdp(opts: {
  schema: string;
  policies: PolicySource[];
  clock: Clock;
  ids: IdSource;
  logger: Logger;
  instanceId?: string;
}): Promise<Pdp> {
  const loaded = loadPolicySet({ schema: opts.schema, policies: opts.policies });
  const policySetVersion = policySetVersionOf(opts.schema, opts.policies);

  const instance = instanceCounter++;
  const preparsedPolicySetId =
    opts.instanceId === undefined ? `pdp-pset-${instance}` : `${opts.instanceId}/pset`;
  const preparsedSchemaName =
    opts.instanceId === undefined ? `pdp-schema-${instance}` : `${opts.instanceId}/schema`;

  const preparedPolicies = cedar.preparsePolicySet(preparsedPolicySetId, {
    staticPolicies: loaded.policyMap,
  });
  if (preparedPolicies.type !== "success") {
    throw new PdpError("PDP_POLICY_INVALID", "PDP_POLICY_INVALID: parse");
  }
  const preparedSchema = cedar.preparseSchema(preparsedSchemaName, opts.schema);
  if (preparedSchema.type !== "success") {
    throw new PdpError("PDP_SCHEMA_INVALID", "PDP_SCHEMA_INVALID: schema");
  }

  opts.logger.info(
    { policySetVersion, policies: loaded.policies.length },
    "pdp loaded",
  );

  return {
    policySetVersion,
    actions: loaded.actions,
    policies: loaded.policies,
    check(req: PolicyRequest): Promise<Decision> {
      return runCheck(req, {
        policySetVersion,
        actions: loaded.actions,
        preparsedPolicySetId,
        preparsedSchemaName,
        clock: opts.clock,
        ids: opts.ids,
        logger: opts.logger,
      });
    },
  };
}
