// The invoke harness: `acmeCatalogue` here; `invokeHarness` in task 3.2 (test-plan-runs.md § Harness).

import type { BlockDef, Catalogue, JsonValue } from "../../../src/authoring/index.ts";
import type { Gateway } from "../../../src/gateway/index.ts";
import type { GrantRecord, PolicyRuntime, PolicySetRecord } from "../../../src/grants/index.ts";
import type { PolicyDecisionRecord } from "../../../src/pdp/index.ts";
import type { RunRecord, TenantContext, TenantPool } from "../../../src/runs/index.ts";
import type { InvokePath, InvokePathDeps } from "../../../src/runtimes/index.ts";
import { loadTestCatalogue } from "../catalogue/loader.ts";
import type { FakeEgress } from "../fake-egress/index.ts";
import type { FakeTools } from "../fake-tools/index.ts";

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

export async function invokeHarness(_wrap?: HarnessWrap): Promise<InvokeHarness> {
  throw new Error("not implemented");
}
