import type { Clock, IdSource } from "../core/index.ts";
import { TENANT_ID_PATTERN, withTenantTx } from "../tenancy/index.ts";
import type { TenantPool, TenantTx } from "../tenancy/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import type {
  ActionName,
  Decision,
  PolicyEngine,
  PolicyEngineOptions,
  PolicyRequest,
  PolicySource,
  PrincipalEntity,
  ToolArgType,
} from "../pdp/index.ts";

export interface PolicyRuntime {
  readonly engine: PolicyEngine;
  toolArgs(tenantId: string): Promise<Readonly<Record<string, ToolArgType>>>;
  reload(tenantId: string): Promise<void>;
}

export interface StoredPolicySet {
  tenantId: string;
  version: string;
  source: string;
  grantIds: string[];
  tenantSources: { id: string; text: string }[];
  toolArgs: Record<string, ToolArgType>;
  deployedBy: string;
  deployedAt: string;
}

export interface RuntimeInternals {
  srcDir: string;
  clock: Clock;
  ids: IdSource;
  logger: PolicyEngineOptions["logger"];
  instance: string;
}

export const runtimeInternals = new WeakMap<PolicyRuntime, RuntimeInternals>();

interface CurrentRow {
  tenant_id: string;
  version: string;
  source: string;
  grant_ids: string[];
  tenant_sources: { id: string; text: string }[];
  tool_args: Record<string, ToolArgType>;
  deployed_by: string;
  deployed_at: string;
}

export async function readCurrentSet(tx: TenantTx, tenantId: string): Promise<StoredPolicySet | null> {
  const result = await tx.query<CurrentRow>(
    `SELECT tenant_id, version, source, grant_ids, tenant_sources, tool_args, deployed_by,
            to_char(deployed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS deployed_at
       FROM ursitoare.policy_set
      WHERE tenant_id = $1 AND current`,
    [tenantId],
  );
  const row = result.rows[0];
  if (row === undefined) return null;
  return {
    tenantId: row.tenant_id,
    version: row.version,
    source: row.source,
    grantIds: row.grant_ids,
    tenantSources: row.tenant_sources,
    toolArgs: row.tool_args,
    deployedBy: row.deployed_by,
    deployedAt: row.deployed_at,
  };
}

interface Entry {
  engine: PolicyEngine;
  toolArgs: Readonly<Record<string, ToolArgType>>;
}

let runtimeCounter = 0;

function tenantOf(req: PolicyRequest): string | null {
  const id = (req as { principal?: { id?: unknown } }).principal?.id;
  if (typeof id !== "string") return null;
  const slash = id.indexOf("/");
  if (slash < 0) return null;
  const tenant = id.slice(0, slash);
  return TENANT_ID_PATTERN.test(tenant) ? tenant : null;
}

export async function createPolicyRuntime(deps: {
  pool: TenantPool | null;
  srcDir: string;
  clock: Clock;
  ids: IdSource;
  logger: PolicyEngineOptions["logger"];
}): Promise<PolicyRuntime> {
  const instance = `policy-runtime-${runtimeCounter++}`;
  const base = await createPolicyEngine({
    srcDir: deps.srcDir,
    clock: deps.clock,
    ids: deps.ids,
    logger: deps.logger,
    instanceId: `${instance}/base`,
  });
  const pool = deps.pool;
  const entries = new Map<string, Promise<Entry>>();
  const chains = new Map<string, Promise<unknown>>();

  async function loadEntry(tenantId: string): Promise<Entry> {
    if (pool === null) return { engine: base, toolArgs: {} };
    const stored = await withTenantTx(pool, { tenantId, reviewProfile: "solo" }, (tx) =>
      readCurrentSet(tx, tenantId),
    );
    if (stored === null) return { engine: base, toolArgs: {} };
    const tenantPolicies: PolicySource[] = stored.tenantSources.map((source) => ({
      id: source.id,
      text: source.text,
      layer: "tenant",
    }));
    const engine = await createPolicyEngine({
      srcDir: deps.srcDir,
      tenantPolicies,
      toolArgs: stored.toolArgs,
      clock: deps.clock,
      ids: deps.ids,
      logger: deps.logger,
      instanceId: `${instance}/live/${tenantId}`,
    });
    return { engine, toolArgs: stored.toolArgs };
  }

  function enqueue(tenantId: string): Promise<Entry> {
    const previous = chains.get(tenantId) ?? Promise.resolve();
    const next = previous.then(
      () => loadEntry(tenantId),
      () => loadEntry(tenantId),
    );
    chains.set(tenantId, next);
    const forget = (): void => {
      if (chains.get(tenantId) === next) chains.delete(tenantId);
    };
    next.then(forget, forget);
    return next;
  }

  function entryFor(tenantId: string): Promise<Entry> {
    const cached = entries.get(tenantId);
    if (cached !== undefined) return cached;
    return install(tenantId);
  }

  function install(tenantId: string): Promise<Entry> {
    const promise = enqueue(tenantId);
    entries.set(tenantId, promise);
    const drop = (): void => {
      if (entries.get(tenantId) === promise) entries.delete(tenantId);
    };
    promise.then(undefined, drop);
    return promise;
  }

  function unavailable(): Decision {
    return {
      decision: "deny",
      decisionId: deps.ids.next("dec"),
      decidedAt: deps.clock.now().toISOString(),
      reasons: [],
      errors: ["POLICY_SET_UNAVAILABLE"],
      policySetVersion: base.policySetVersion,
    };
  }

  const engine: PolicyEngine = Object.freeze({
    get policySetVersion(): string {
      return base.policySetVersion;
    },
    get actions() {
      return base.actions;
    },
    get policies() {
      return base.policies;
    },
    async check(req: PolicyRequest): Promise<Decision> {
      const tenantId = tenantOf(req);
      if (pool === null || tenantId === null || (req as { action?: unknown }).action === "deploy_policy") {
        return base.check(req);
      }
      let entry: Entry;
      try {
        entry = await entryFor(tenantId);
      } catch {
        return unavailable();
      }
      return entry.engine.check(req);
    },
    async allowedActions(principal: PrincipalEntity, actions: readonly ActionName[]): Promise<ActionName[]> {
      const tenantId = (principal as { tenantId?: unknown } | null)?.tenantId;
      if (pool === null || typeof tenantId !== "string" || !TENANT_ID_PATTERN.test(tenantId)) {
        return base.allowedActions(principal, actions);
      }
      const wantsDeploy = Array.isArray(actions) && actions.includes("deploy_policy" as ActionName);
      const deploy = wantsDeploy ? await base.allowedActions(principal, ["deploy_policy" as ActionName]) : [];
      let entry: Entry;
      try {
        entry = await entryFor(tenantId);
      } catch {
        return deploy;
      }
      const others = Array.isArray(actions) ? actions.filter((a) => a !== ("deploy_policy" as ActionName)) : actions;
      const allowed = new Set<string>(await entry.engine.allowedActions(principal, others));
      if (deploy.length > 0) allowed.add("deploy_policy");
      const result: ActionName[] = [];
      const seen = new Set<string>();
      for (const name of actions) {
        if (allowed.has(name) && !seen.has(name)) {
          seen.add(name);
          result.push(name);
        }
      }
      return result;
    },
  });

  const runtime: PolicyRuntime = {
    engine,
    async toolArgs(tenantId: string): Promise<Readonly<Record<string, ToolArgType>>> {
      if (pool === null || !TENANT_ID_PATTERN.test(tenantId)) return {};
      return (await entryFor(tenantId)).toolArgs;
    },
    async reload(tenantId: string): Promise<void> {
      if (pool === null || !TENANT_ID_PATTERN.test(tenantId)) return;
      entries.delete(tenantId);
      await install(tenantId);
    },
  };
  runtimeInternals.set(runtime, {
    srcDir: deps.srcDir,
    clock: deps.clock,
    ids: deps.ids,
    logger: deps.logger,
    instance,
  });
  return runtime;
}
