// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../api/client.ts";
import type { FlowRow } from "../flows/flows.ts";
import type { CapabilityState } from "../kit/capabilities.ts";
import type { RunView } from "../runs/types.ts";
import type { Tone } from "../ui/tones.ts";

export const HOME_LIMIT: number = 0;

export const HOME_PAGE_SIZE: number = 0;

export interface NextStep {
  id: string;
  label: string;
  href: string;
  description: string;
  badge: string | null;
}

export type Fact<T> = { kind: "unknown" } | { kind: "known"; value: T };

export interface Counted {
  count: number;
  complete: boolean;
}

export interface HomeFacts {
  runs: Fact<readonly RunView[]>;
  flows: Fact<{ items: readonly FlowRow[]; complete: boolean }>;
  servers: Fact<Counted>;
  policy: Fact<{ deployed: boolean; pendingGrants: number }>;
  unassigned: Fact<Counted>;
}

export type HomeView =
  | { kind: "public" }
  | { kind: "dashboard"; capabilities: ReadonlySet<string>; userId: string; displayName: string };

export function homeView(_session: CapabilityState | null): HomeView {
  return { kind: "public" };
}

export function recentRunLinkName(_run: { id: string; flowId: string }): string {
  throw new Error("not implemented");
}

export interface RunRowView {
  id: string;
  href: string;
  shortId: string;
  flowId: string;
  state: string;
  tone: Tone;
  started: string;
  startedIso: string;
  exact: string;
  duration: string;
  by: string | null;
}

export function runRows(
  _runs: readonly RunView[],
  _ctx: { nowMs: number; meId: string; names: ReadonlyMap<string, string> },
): RunRowView[] {
  return [];
}

export function recentFlows(_flows: readonly FlowRow[]): FlowRow[] {
  return [];
}

export interface FlowRowView {
  flowId: string;
  href: string;
  ownerTeam: string;
  version: string;
  tone: Tone;
  changed: string;
  changedIso: string;
  exact: string;
}

export function flowRows(_flows: readonly FlowRow[], _nowMs: number): FlowRowView[] {
  return [];
}

export function nextSteps(
  _capabilities: ReadonlySet<string>,
  _facts: HomeFacts,
): { steps: NextStep[]; settled: boolean } {
  return { steps: [], settled: false };
}

export async function loadRecentRuns(
  _client: Pick<ApiClient, "get">,
  _signal: AbortSignal,
): Promise<readonly RunView[]> {
  return [];
}

export async function loadFlowSet(
  _client: Pick<ApiClient, "get">,
  _signal: AbortSignal,
): Promise<{ items: readonly FlowRow[]; complete: boolean }> {
  return { items: [], complete: false };
}

export async function loadPendingServers(
  _client: Pick<ApiClient, "get">,
  _signal: AbortSignal,
): Promise<Counted> {
  return { count: 0, complete: false };
}

export async function loadUnassigned(
  _client: Pick<ApiClient, "get">,
  _signal: AbortSignal,
): Promise<Counted> {
  return { count: 0, complete: false };
}

export async function loadPolicyFact(
  _client: Pick<ApiClient, "get">,
  _signal: AbortSignal,
): Promise<{ deployed: boolean; pendingGrants: number }> {
  return { deployed: false, pendingGrants: 0 };
}
