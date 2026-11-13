// The invoke harness: `acmeCatalogue` here; `invokeHarness` in task 3.2 (test-plan-runs.md § Harness).

import { registryVersionLoader } from "../../../src/api/test-run-routes.ts";
import type { BlockDef, Catalogue, Flow, JsonValue } from "../../../src/authoring/index.ts";
import { Secret } from "../../../src/config/index.ts";
import { fixedClock, sequentialIds } from "../../../src/core/index.ts";
import { createGateway, mintkeyTenantId } from "../../../src/gateway/index.ts";
import type { Gateway } from "../../../src/gateway/index.ts";
import {
  confirmGrant,
  createGrant,
  createPolicyRuntime,
  deployPolicySet,
} from "../../../src/grants/index.ts";
import type { GrantRecord, PolicyRuntime, PolicySetRecord } from "../../../src/grants/index.ts";
import { executeRun, memoryWorkflowOps, startRun, workflowIdOf } from "../../../src/interpreter/index.ts";
import type { InterpreterDeps, VersionLoader } from "../../../src/interpreter/index.ts";
import { defaultSrcDir, listPolicyDecisions } from "../../../src/pdp/index.ts";
import type { PolicyDecisionRecord, PrincipalEntity } from "../../../src/pdp/index.ts";
import {
  createFlow,
  loadRegistryCatalogue,
  saveFlowVersion,
  validateVersion,
} from "../../../src/registry/index.ts";
import { createEffectIntents, createRunStore } from "../../../src/runs/index.ts";
import type { RunRecord, RunStore, TenantContext, TenantPool } from "../../../src/runs/index.ts";
import { createInvokePath } from "../../../src/runtimes/index.ts";
import type { InvokePath, InvokePathDeps } from "../../../src/runtimes/index.ts";
import { createWorkerSandbox } from "../../../src/sandbox/index.ts";
import { withTenantTx } from "../../../src/tenancy/index.ts";
import {
  approveSurface,
  createToolDirectory,
  registerToolServer,
  surfaceDigest,
} from "../../../src/tools/index.ts";
import { loadTestCatalogue } from "../catalogue/loader.ts";
import type { FakeEgress } from "../fake-egress/index.ts";
import { startFakeEgress } from "../fake-egress/index.ts";
import type { FakeTools } from "../fake-tools/index.ts";
import { FAKE_TOOLS_HOST, FAKE_TOOLS_ORIGIN, startFakeTools } from "../fake-tools/index.ts";
import { seedFlowActors } from "../flow-actors.ts";
import { captureLogger } from "../gateway-kit.ts";
import { withTestDatabase } from "../pg.ts";
import type { TestDatabase } from "../pg.ts";
import { seedTwoTenants } from "../tenants.ts";
import { fixtureSurface } from "../tool-surface.ts";
import { loadInvokeRun } from "./index.ts";

interface AcmeRef {
  source: string;
  untrustedResult: boolean;
}

const ACME_REFS: ReadonlyMap<string, AcmeRef> = new Map([
  ["acme.lookup_vendor@1", { source: "erp.lookup_vendor@1", untrustedResult: false }],
  ["acme.create_payment@1", { source: "erp.create_payment@1", untrustedResult: false }],
  ["acme.get@1", { source: "invoices.get@1", untrustedResult: true }],
  ["acme.flag_vendor@1", { source: "erp.flag_vendor@1", untrustedResult: false }],
  ["acme.post_message@1", { source: "slack.post_message@1", untrustedResult: false }],
]);

export function acmeCatalogue(): Catalogue {
  const base = loadTestCatalogue();
  return {
    block(ref: string): BlockDef | undefined {
      const entry = ACME_REFS.get(ref);
      if (entry === undefined) {
        return base.block(ref);
      }
      const def = base.block(entry.source);
      if (def === undefined) {
        return undefined;
      }
      return { ...def, untrusted_result: entry.untrustedResult };
    },
    modelProfile(ref) {
      return base.modelProfile(ref);
    },
    role(name) {
      return base.role(name);
    },
    delegateTarget(target, workflow) {
      return base.delegateTarget(target, workflow);
    },
    flow(ref, major) {
      return base.flow(ref, major);
    },
  };
}

export type FlowKey = "H1" | "H2" | "HP" | "HU" | "HV";

export type HarnessWrap = {
  [K in "policy" | "tools" | "services" | "principals" | "loadVersion" | "catalogueFor"]?: (
    real: InvokePathDeps[K],
  ) => InvokePathDeps[K];
} & { gateway?: (real: Gateway, egress: FakeEgress) => Gateway };

export interface InvokeHarness {
  ctx: TenantContext;
  pool: TenantPool;
  tools: FakeTools;
  egress: FakeEgress;
  gateway: Gateway & { calls: unknown[] };
  runtime: PolicyRuntime;
  path: InvokePath;
  store: RunStore;
  loadVersion: InterpreterDeps["loadVersion"];
  catalogueFor: InterpreterDeps["catalogueFor"];
  db: TestDatabase;
  hashes: Readonly<Record<FlowKey, string>>;
  start(key: FlowKey, input: JsonValue, runId: string): Promise<RunRecord>;
  run(key: FlowKey, input: JsonValue, runId: string): Promise<RunRecord>;
  deploy(source: string): Promise<PolicySetRecord>;
  grant(spec: Record<string, unknown>): Promise<GrantRecord>;
  decisions(runId: string): Promise<PolicyDecisionRecord[]>;
  intents(runId: string): Promise<number>;
  logs(): Record<string, unknown>[];
  close(): Promise<void>;
}

const T0 = "2026-11-06T10:00:00.000Z";
const SERVICE_ID = "87caf624-f579-8435-9540-24d6eb57aeff";
const TENANT = "tenant_a";
const FLOW_IDS: Readonly<Record<FlowKey, string>> = {
  H1: "read-then-pay",
  H2: "read-then-pay",
  HP: "hooked-pay",
  HU: "untrusted-into-write",
  HV: "pre-taint-pay",
};
const PRINCIPALS: ReadonlyMap<string, PrincipalEntity> = new Map([
  ["alice", { tenantId: TENANT, userId: "alice", kind: "human", roles: ["author"], teams: ["finance"] }],
  ["bob", { tenantId: TENANT, userId: "bob", kind: "human", roles: ["approver"], teams: [] }],
  ["carol", { tenantId: TENANT, userId: "carol", kind: "human", roles: ["tenant_admin"], teams: [] }],
]);
const STAMP_SOURCE =
  "return { action: 'continue', input: { ...ctx.input, reference: String(ctx.args.note).slice(0, 7) } };";

function surfaceRefs(): string[] {
  return [
    "erp.lookup_vendor@1",
    "erp.create_payment@1",
    "invoices.get@1",
    "erp.flag_vendor@1",
    "slack.post_message@1",
  ];
}

function preTaintPay(): Flow {
  const base = structuredClone(loadInvokeRun("read-then-pay")) as unknown as Record<string, unknown>;
  const nodes = base["nodes"] as Record<string, Record<string, unknown>>;
  const pay = { ...(nodes["pay"] as Record<string, unknown>) };
  pay["pre"] = [
    {
      id: "stamp",
      kind: "code",
      input: { note: "${{ nodes.fetch.output.raw_text }}" },
      source: STAMP_SOURCE,
    },
  ];
  return {
    ...base,
    flow: "pre-taint-pay",
    start: "fetch",
    nodes: {
      fetch: {
        kind: "block",
        uses: "acme.get@1",
        with: { invoice_id: "INV-1001" },
        next: "lookup",
      },
      lookup: nodes["lookup"],
      pay,
      done: nodes["done"],
    },
  } as unknown as Flow;
}

function twin(): Flow {
  const base = structuredClone(loadInvokeRun("read-then-pay")) as unknown as Record<string, unknown>;
  const nodes = base["nodes"] as Record<string, Record<string, unknown>>;
  const pay = nodes["pay"] as Record<string, unknown>;
  const withs = { ...(pay["with"] as Record<string, unknown>), reference: "inv-2" };
  return { ...base, nodes: { ...nodes, pay: { ...pay, with: withs } } } as unknown as Flow;
}

function flowOf(key: FlowKey): Flow {
  switch (key) {
    case "H1":
      return loadInvokeRun("read-then-pay");
    case "H2":
      return twin();
    case "HP":
      return loadInvokeRun("hooked-pay");
    case "HU":
      return loadInvokeRun("untrusted-into-write");
    case "HV":
      return preTaintPay();
  }
}

// The runtime's engine is frozen; a wrapper that overrides `check` needs a writable copy to derive from.
function unfrozen(runtime: PolicyRuntime): PolicyRuntime {
  return {
    engine: { ...runtime.engine },
    toolArgs: (tenantId: string) => runtime.toolArgs(tenantId),
    reload: (tenantId: string) => runtime.reload(tenantId),
  };
}

export async function invokeHarness(wrap?: HarnessWrap): Promise<InvokeHarness> {
  const closers: (() => Promise<void>)[] = [];
  try {
    const clock = fixedClock(T0);
    const capture = captureLogger();
    const db = await withTestDatabase();
    closers.push(() => db.close());
    const { a: ctx } = await seedTwoTenants(db);
    const pool = db.appPool;
    const users = await seedFlowActors(
      db,
      ctx,
      [
        { subject: "alice", roles: ["author"], teams: ["finance"] },
        { subject: "bob", roles: ["approver"], teams: [] },
        { subject: "carol", roles: ["tenant_admin"], teams: [] },
      ],
      clock,
    );
    const carol = users["carol"] as string;
    const principalsById = new Map(PRINCIPALS);
    for (const [subject, userId] of Object.entries(users)) {
      const entity = PRINCIPALS.get(subject);
      if (entity !== undefined) {
        principalsById.set(userId, entity);
      }
    }

    const tools = await startFakeTools();
    closers.push(() => tools.close());
    const egress = await startFakeEgress({ now: () => new Date(T0) });
    closers.push(() => egress.close());
    egress.addUpstream(FAKE_TOOLS_HOST, tools.origin);
    egress.addCredentialless(SERVICE_ID, mintkeyTenantId(TENANT), FAKE_TOOLS_ORIGIN);

    const realGateway = createGateway(
      {
        brokerUrl: egress.brokerUrl,
        proxyUrl: egress.proxyUrl,
        brokerToken: new Secret(egress.brokerServiceToken),
        agentId: "ursitoare-engine",
        vault: null,
      },
      { clock, logger: capture.logger },
    );
    const inner = wrap?.gateway === undefined ? realGateway : wrap.gateway(realGateway, egress);
    const calls: unknown[] = [];
    const gateway: Gateway & { calls: unknown[] } = {
      calls,
      requestToken(permit, tag) {
        calls.push({ op: "requestToken", permit, tag });
        return inner.requestToken(permit, tag);
      },
      send(permit, request, token, tag) {
        calls.push({ op: "send", permit, tag });
        return inner.send(permit, request, token, tag);
      },
    };

    const runtime = await createPolicyRuntime({
      pool,
      srcDir: defaultSrcDir(),
      clock,
      ids: sequentialIds(1),
      logger: capture.logger,
    });
    const sandbox = createWorkerSandbox({ size: 1 });
    closers.push(() => sandbox.close());

    const surface = fixtureSurface(surfaceRefs(), {
      untrustedResult: Object.fromEntries(surfaceRefs().map((ref) => [ref, ref === "invoices.get@1"])),
    });
    const carolActor = { kind: "user", id: carol } as const;
    await registerToolServer(
      pool,
      ctx,
      { id: "acme", adapter: "fixture", origin: FAKE_TOOLS_ORIGIN, local: false, surface },
      carolActor,
      { clock },
    );
    await approveSurface(
      pool,
      ctx,
      "acme",
      { digest: surfaceDigest(surface), selfApproval: true },
      { userId: carol, kind: "user" },
      { clock },
    );

    const catalogue = await loadRegistryCatalogue(pool, ctx);
    const hashes: Record<string, string> = {};
    const savedFlows = new Set<string>();
    const flowActor = { kind: "user", userId: carol } as const;
    for (const key of ["H1", "H2", "HP", "HU", "HV"] as const) {
      const flowId = FLOW_IDS[key];
      const text = JSON.stringify(flowOf(key));
      if (!savedFlows.has(flowId)) {
        savedFlows.add(flowId);
        await withTenantTx(pool, ctx, (tx) =>
          createFlow(tx, ctx, { name: flowId, ownerTeam: "finance" }, flowActor, { clock }),
        );
      }
      const saved = await withTenantTx(pool, ctx, (tx) =>
        saveFlowVersion(tx, ctx, { flowId, format: "json", text }, flowActor, { clock }),
      );
      hashes[key] = saved.version.hash;
      try {
        await withTenantTx(pool, ctx, (tx) =>
          validateVersion(tx, ctx, { flowId, hash: saved.version.hash, catalogue }, flowActor, {
            clock,
          }),
        );
      } catch {
        // the validator refuses some flows (untrusted-into-write); the loader forces `validated`
      }
    }

    const baseLoader = registryVersionLoader(pool);
    const realLoadVersion: VersionLoader = async (c, flowId, hash) => {
      const loaded = await baseLoader(c, flowId, hash);
      return loaded === null ? null : { ...loaded, state: "validated" };
    };
    const real: InvokePathDeps = {
      pool,
      policy: runtime,
      gateway,
      tools: createToolDirectory(pool),
      services: {
        async resolve(_ctx, serverId) {
          return serverId === "acme" ? { serviceId: SERVICE_ID, origin: FAKE_TOOLS_ORIGIN } : null;
        },
      },
      principals: async (c, userId) => {
        const found = principalsById.get(userId);
        return found !== undefined && found.tenantId === c.tenantId ? found : null;
      },
      loadVersion: realLoadVersion,
      catalogueFor: (c) => loadRegistryCatalogue(pool, c),
      clock,
      logger: capture.logger,
    };
    const deps: InvokePathDeps = {
      ...real,
      policy: wrap?.policy === undefined ? real.policy : wrap.policy(unfrozen(real.policy)),
      tools: wrap?.tools?.(real.tools) ?? real.tools,
      services: wrap?.services?.(real.services) ?? real.services,
      principals: wrap?.principals?.(real.principals) ?? real.principals,
      loadVersion: wrap?.loadVersion?.(real.loadVersion) ?? real.loadVersion,
      catalogueFor: wrap?.catalogueFor?.(real.catalogueFor) ?? real.catalogueFor,
    };
    const path = createInvokePath(deps);

    const store = createRunStore(pool);
    const interpreter: InterpreterDeps = {
      store,
      durable: null,
      loadVersion: realLoadVersion,
      catalogueFor: (c) => loadRegistryCatalogue(pool, c),
      invokerFor: (_mode, run) => path.liveInvoker(run),
      effects: createEffectIntents(pool),
      clock,
      ids: sequentialIds(1),
      sandbox,
    };
    const grantDeps = { ids: sequentialIds(1), clock, catalogueFor: real.catalogueFor };

    const start = (key: FlowKey, input: JsonValue, runId: string): Promise<RunRecord> =>
      startRun(interpreter, ctx, {
        flowId: FLOW_IDS[key],
        hash: hashes[key] as string,
        mode: "live",
        input,
        mocks: null,
        principal: { userId: "alice", kind: "human" },
        actorChain: [],
        runId,
      });

    // A run to completion: the same start, then the interpreter over memory ops (durable is null).
    const run = async (key: FlowKey, input: JsonValue, runId: string): Promise<RunRecord> => {
      const stored = await start(key, input, runId);
      const ops = memoryWorkflowOps(workflowIdOf(ctx.tenantId, stored.runId));
      return executeRun(ops, interpreter, ctx, stored.runId);
    };

    let closed = false;
    return {
      ctx,
      pool,
      tools,
      egress,
      gateway,
      runtime,
      path,
      store,
      loadVersion: realLoadVersion,
      catalogueFor: (c) => loadRegistryCatalogue(pool, c),
      db,
      hashes: hashes as Record<FlowKey, string>,
      start,
      run,
      deploy: (source) => deployPolicySet(runtime, pool, ctx, source, carolActor, { clock }),
      async grant(spec) {
        const { confirm, ...input } = spec;
        return withTenantTx(pool, ctx, async (tx) => {
          const created = await createGrant(
            tx,
            ctx,
            input as unknown as Parameters<typeof createGrant>[2],
            carolActor,
            grantDeps,
          );
          if (typeof confirm !== "string") return created;
          return confirmGrant(tx, ctx, created.id, confirm, carolActor, grantDeps);
        });
      },
      decisions: (runId) =>
        listPolicyDecisions(pool, ctx, { filter: { runId }, order: "asc", limit: 50 }),
      async intents(runId) {
        const { rows } = await db.ownerPool.query<{ n: string }>(
          "SELECT count(*)::text AS n FROM ursitoare.effect_intent WHERE tenant_id = $1 AND run_id = $2",
          [ctx.tenantId, runId],
        );
        return Number(rows[0]?.n ?? "0");
      },
      logs: () => capture.lines(),
      async close() {
        if (closed) return;
        closed = true;
        for (const closer of [...closers].reverse()) {
          await closer().catch(() => undefined);
        }
      },
    };
  } catch (error) {
    for (const closer of [...closers].reverse()) {
      await closer().catch(() => undefined);
    }
    throw error;
  }
}
