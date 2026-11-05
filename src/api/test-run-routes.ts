// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { Flow } from "../authoring/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import type { InterpreterDeps, VersionLoader } from "../interpreter/index.ts";
import { flowOwnerTeam, getVersion } from "../registry/index.ts";
import type { TenantPool } from "../runs/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTenantTx } from "../tenancy/index.ts";

export function registryVersionLoader(pool: TenantPool): VersionLoader {
  return async (ctx: TenantContext, flowId: string, hash: string) =>
    withTenantTx(pool, ctx, async (tx) => {
      const version = await getVersion(tx, ctx, flowId, hash);
      if (version === null) {
        return null;
      }
      const ownerTeam = await flowOwnerTeam(tx, ctx, flowId);
      if (ownerTeam === null) {
        return null;
      }
      return {
        flowId,
        hash,
        state: version.state,
        ownerTeam,
        flow: version.canonical as Flow,
      };
    });
}

export interface TestRunApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  ids: IdSource;
  interpreter: InterpreterDeps | null;
}

export function registerTestRunRoutes(_server: FastifyInstance, _deps: TestRunApiDeps): void {
  throw new Error("not implemented");
}
