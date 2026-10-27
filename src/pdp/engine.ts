import type { Clock, IdSource } from "../core/index.ts";
import type { Logger } from "../observability/index.ts";
import { runCheck } from "./check.ts";
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
  return {
    policySetVersion: "",
    actions: loaded.actions,
    policies: loaded.policies,
    check(req: PolicyRequest): Promise<Decision> {
      return runCheck(req);
    },
  };
}
