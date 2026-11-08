// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../api/client.ts";
import type { RunView, StepView } from "./types.ts";

export interface DecisionViewWeb {
  decisionId: string;
  nodeId: string | null;
  resource: string;
  decision: "allow" | "deny";
  reasons: string[];
  permit: {
    method: string;
    host: string;
    path: string;
    serviceId: string;
    ttlSeconds: number;
  } | null;
}

export interface DecisionRowView {
  nodeId: string;
  text: string;
  details: readonly { term: string; value: string }[];
}

export function parseDecisions(_raw: unknown): DecisionViewWeb[] | null {
  throw new Error("not implemented");
}

export function permitText(_p: NonNullable<DecisionViewWeb["permit"]>): string {
  throw new Error("not implemented");
}

export function decisionRows(
  _run: RunView,
  _steps: readonly StepView[],
  _decisions: readonly DecisionViewWeb[],
): DecisionRowView[] {
  throw new Error("not implemented");
}

export type DecisionLoad =
  | { phase: "loading" }
  | { phase: "ready"; decisions: DecisionViewWeb[]; truncated: boolean }
  | { phase: "error"; error: unknown };

export type DecisionsSection =
  | { kind: "hidden" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty"; text: string }
  | { kind: "rows"; rows: DecisionRowView[]; note: string | null };

export function decisionsWanted(_run: RunView | null): boolean {
  throw new Error("not implemented");
}

export function decisionsView(
  _run: RunView | null,
  _steps: readonly StepView[],
  _load: DecisionLoad | undefined,
): DecisionsSection {
  throw new Error("not implemented");
}

export async function loadDecisions(
  _client: Pick<ApiClient, "get">,
  _runId: string,
  _signal?: AbortSignal,
): Promise<{ decisions: DecisionViewWeb[]; truncated: boolean }> {
  throw new Error("not implemented");
}
