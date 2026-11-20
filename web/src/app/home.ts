// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../api/client.ts";
import type { FlowRow } from "../flows/flows.ts";
import type { CapabilityState } from "../kit/capabilities.ts";
import type { RunView } from "../runs/types.ts";
import { formatAgo, formatDuration, formatInstant } from "../ui/format.ts";
import { runStateTone } from "../ui/tones.ts";
import type { Tone } from "../ui/tones.ts";

export const HOME_LIMIT = 5;

export const HOME_PAGE_SIZE = 200;

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

export function homeView(session: CapabilityState | null): HomeView {
  if (session === null || session.status !== "ready") return { kind: "public" };
  return {
    kind: "dashboard",
    capabilities: session.me.capabilities,
    userId: session.me.user.id,
    displayName: session.me.user.displayName,
  };
}

const SHORT_ID_LENGTH = 8;

function shortRunId(id: string): string {
  return id.length > SHORT_ID_LENGTH ? id.slice(-SHORT_ID_LENGTH) : id;
}

function isoWithMicros(iso: string): string {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/.exec(iso);
  if (match === null) return iso;
  return `${match[1] ?? ""}.${(match[2] ?? "").slice(0, 6).padEnd(6, "0")}Z`;
}

export function recentRunLinkName(run: { id: string; flowId: string }): string {
  return `Run ${shortRunId(run.id)} of ${run.flowId}`;
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
  runs: readonly RunView[],
  ctx: { nowMs: number; meId: string; names: ReadonlyMap<string, string> },
): RunRowView[] {
  return runs.slice(0, HOME_LIMIT).map((run) => {
    const at = run.startedAt ?? run.createdAt;
    const userId = run.principal.userId;
    const name = ctx.names.get(userId)?.trim() ?? "";
    let by: string | null = null;
    if (userId === ctx.meId) by = "by you";
    else if (name !== "") by = `by ${name}`;
    return {
      id: run.id,
      href: `/runs/${run.id}`,
      shortId: shortRunId(run.id),
      flowId: run.flowId,
      state: run.state,
      tone: runStateTone(run.state),
      started: formatAgo(at, ctx.nowMs),
      startedIso: isoWithMicros(at),
      exact: formatInstant(at),
      duration:
        run.startedAt === null ? "—" : formatDuration(run.startedAt, run.endedAt, ctx.nowMs),
      by,
    };
  });
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
