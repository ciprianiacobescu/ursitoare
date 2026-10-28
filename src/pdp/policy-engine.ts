import type { Clock, IdSource } from "../core/index.ts";
import type { Logger } from "../observability/index.ts";
import type { ActionName } from "./actions.ts";
import { allowedActions } from "./capabilities.ts";
import type { ToolArgType } from "./cedar-schema.ts";
import { buildSchema } from "./cedar-schema.ts";
import { createPdp } from "./engine.ts";
import { PdpError } from "./errors.ts";
import { loadPolicyFragments } from "./fragments.ts";
import type { PrincipalEntity } from "./principal.ts";
import { PLATFORM_SOURCE } from "./platform.ts";
import type { Pdp, PolicySource } from "./types.ts";

export interface PolicyEngine extends Pdp {
  allowedActions(principal: PrincipalEntity, actions: readonly ActionName[]): Promise<ActionName[]>;
}

export interface PolicyEngineOptions {
  srcDir: string;
  tenantPolicies?: readonly PolicySource[];
  toolArgs?: Readonly<Record<string, ToolArgType>> | undefined;
  clock: Clock;
  ids: IdSource;
  logger: Logger;
}

function optionsInvalid(reason: string): never {
  throw new PdpError("PDP_OPTIONS_INVALID", `PDP_OPTIONS_INVALID: options ${reason}`, {
    reason,
  });
}

function checkTenantPolicies(tenantPolicies: unknown): readonly PolicySource[] {
  if (!Array.isArray(tenantPolicies)) {
    optionsInvalid("policies");
  }
  for (const candidate of tenantPolicies as readonly unknown[]) {
    if (typeof candidate !== "object" || candidate === null) {
      optionsInvalid("policies");
    }
    if ((candidate as { layer?: unknown }).layer !== "tenant") {
      optionsInvalid("layer");
    }
  }
  return tenantPolicies as readonly PolicySource[];
}

export async function createPolicyEngine(opts: PolicyEngineOptions): Promise<PolicyEngine> {
  if (typeof opts.srcDir !== "string") {
    optionsInvalid("src_dir");
  }
  const tenantPolicies = opts.tenantPolicies === undefined ? [] : checkTenantPolicies(opts.tenantPolicies);
  const schema = opts.toolArgs === undefined ? buildSchema() : buildSchema({ toolArgs: opts.toolArgs });
  const fragments = await loadPolicyFragments(opts.srcDir);
  const pdp = await createPdp({
    schema,
    policies: [PLATFORM_SOURCE, ...fragments, ...tenantPolicies],
    clock: opts.clock,
    ids: opts.ids,
    logger: opts.logger,
  });
  const engine: PolicyEngine = {
    ...pdp,
    allowedActions(principal: PrincipalEntity, actions: readonly ActionName[]) {
      return allowedActions(pdp, opts.logger, principal, actions);
    },
  };
  return Object.freeze(engine);
}
