// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Catalogue, JsonValue } from "../../../src/authoring/index.ts";
import type { Gateway } from "../../../src/gateway/index.ts";
import type { GrantRecord, PolicyRuntime, PolicySetRecord } from "../../../src/grants/index.ts";
import type { PolicyDecisionRecord } from "../../../src/pdp/index.ts";
import type { RunRecord, TenantContext, TenantPool } from "../../../src/runs/index.ts";
import type { InvokePath, InvokePathDeps } from "../../../src/runtimes/index.ts";
import type { FakeEgress } from "../fake-egress/index.ts";
import type { FakeTools } from "../fake-tools/index.ts";

export function acmeCatalogue(): Catalogue {
  throw new Error("not implemented");
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
