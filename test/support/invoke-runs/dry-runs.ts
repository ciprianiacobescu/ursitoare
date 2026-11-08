// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Flow } from "../../../src/authoring/index.ts";
import type { PolicyDecisionRecord } from "../../../src/pdp/index.ts";
import type { StepRecord } from "../../../src/runs/index.ts";
import type { InvokeHarness } from "./harness.ts";

export interface DryAnswer {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface DryHarness {
  post(body: unknown, flow?: string): Promise<DryAnswer>;
  get(path: string): Promise<DryAnswer>;
  execute(runId: string): Promise<void>;
  decisions(runId: string): Promise<PolicyDecisionRecord[]>;
  steps(runId: string): Promise<StepRecord[]>;
  save(name: string, flow: Flow): Promise<string>;
  close(): Promise<void>;
}

export async function dryHarness(_h: InvokeHarness): Promise<DryHarness> {
  throw new Error("not implemented");
}
