// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../api/client.ts";
import type { FlowRow } from "../flows/flows.ts";
import type { CapabilityState } from "../kit/capabilities.ts";
import type { RunView } from "../runs/types.ts";
import { formatAgo, formatDuration, formatInstant } from "../ui/format.ts";
import { runStateTone, versionStateTone } from "../ui/tones.ts";
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

function changedAt(flow: FlowRow): string {
  return flow.latest?.createdAt ?? flow.createdAt;
}

function changedMs(flow: FlowRow): number {
  const ms = Date.parse(changedAt(flow));
  return Number.isFinite(ms) ? ms : 0;
}

function byRecency(a: FlowRow, b: FlowRow): number {
  const diff = changedMs(b) - changedMs(a);
  if (diff !== 0) return diff;
  return a.flowId < b.flowId ? -1 : a.flowId > b.flowId ? 1 : 0;
}

export function recentFlows(flows: readonly FlowRow[]): FlowRow[] {
  return [...flows].sort(byRecency).slice(0, HOME_LIMIT);
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

export function flowRows(flows: readonly FlowRow[], nowMs: number): FlowRowView[] {
  return recentFlows(flows).map((flow) => {
    const at = changedAt(flow);
    const latest = flow.latest;
    let version = "No version yet";
    let tone: Tone = "neutral";
    if (latest !== null) {
      if (latest.validationOk === false) {
        version = `v${latest.number} · has errors`;
        tone = "danger";
      } else {
        version = `v${latest.number} · ${latest.state}`;
        tone = versionStateTone(latest.state);
      }
    }
    return {
      flowId: flow.flowId,
      href: `/flows/${flow.flowId}`,
      ownerTeam: flow.ownerTeam,
      version,
      tone,
      changed: formatAgo(at, nowMs),
      changedIso: isoWithMicros(at),
      exact: formatInstant(at),
    };
  });
}

function flowSteps(capabilities: ReadonlySet<string>, facts: HomeFacts): NextStep[] {
  if (!capabilities.has("test_flow") || facts.flows.kind !== "known") return [];
  const items = facts.flows.value.items;
  if (items.length === 0) {
    return [
      {
        id: "create-first-flow",
        label: "Create your first flow",
        href: "/flows",
        description:
          "No flow of your teams exists yet. Name one, write it in YAML and validate it.",
        badge: null,
      },
    ];
  }
  const sorted = [...items].sort(byRecency);
  const validated = sorted.find(
    (flow) => flow.latest !== null && flow.latest.validationOk === true,
  );
  if (validated !== undefined && validated.latest !== null) {
    return [
      {
        id: "start-test-run",
        label: "Start a test run",
        href: `/flows/${validated.flowId}`,
        description: `${validated.flowId} has a validated version ${validated.latest.number}. Run it with mocked tools.`,
        badge: null,
      },
    ];
  }
  const last = sorted[0];
  if (last === undefined) return [];
  return [
    {
      id: "open-a-flow",
      label: "Open a flow",
      href: `/flows/${last.flowId}`,
      description: `None of your flows has a validated version yet. Open ${last.flowId} to write and validate one.`,
      badge: null,
    },
  ];
}

function failedRunSteps(capabilities: ReadonlySet<string>, facts: HomeFacts): NextStep[] {
  if (!capabilities.has("read_run") || facts.runs.kind !== "known") return [];
  const failed = facts.runs.value
    .slice(0, HOME_LIMIT)
    .find((run) => run.state === "failed");
  if (failed === undefined) return [];
  return [
    {
      id: "review-failed-run",
      label: "Review a failed run",
      href: `/runs/${failed.id}`,
      description: `Run ${shortRunId(failed.id)} of ${failed.flowId} failed. Open it to see which step stopped and why.`,
      badge: null,
    },
  ];
}

export function nextSteps(
  capabilities: ReadonlySet<string>,
  facts: HomeFacts,
): { steps: NextStep[]; settled: boolean } {
  const steps = [...flowSteps(capabilities, facts), ...failedRunSteps(capabilities, facts)];
  const asked: Fact<unknown>[] = [];
  if (capabilities.has("test_flow")) asked.push(facts.flows);
  if (capabilities.has("read_run")) asked.push(facts.runs);
  const settled = asked.length > 0 && asked.every((fact) => fact.kind === "known");
  return { steps, settled };
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
