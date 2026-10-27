import type { Clock, IdSource } from "../core/index.ts";
import type { Logger } from "../observability/index.ts";
import { runCheck } from "./check.ts";
import { policySetVersionOf } from "./digest.ts";
import { loadPolicySet } from "./load.ts";
import type { Decision, Pdp, PolicyRequest, PolicySource } from "./types.ts";

export async function createPdp(opts: {
  schema: string;
  policies: PolicySource[];
  clock: Clock;
  ids: IdSource;
  logger: Logger;
}): Promise<Pdp> {
  const loaded = loadPolicySet({ schema: opts.schema, policies: opts.policies });
  const policySetVersion = policySetVersionOf(opts.schema, opts.policies);
  opts.logger.info(
    { policySetVersion, policies: loaded.policies.length },
    "pdp loaded",
  );
  return {
    policySetVersion,
    actions: loaded.actions,
    policies: loaded.policies,
    check(req: PolicyRequest): Promise<Decision> {
      return runCheck(req);
    },
  };
}
