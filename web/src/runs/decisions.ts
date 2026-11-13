import { ApiRequestError } from "../api/client.ts";
import type { ApiClient, QueryValue } from "../api/client.ts";
import { parseCursorPage } from "../kit/data/page-fetcher.ts";
import { runErrorMessage } from "./messages.ts";
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

const DECISION_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;
const METHOD_PATTERN = /^[A-Z]{3,10}$/;
const HOST_PATTERN = /^[a-z0-9.-]{1,253}(:[0-9]{1,5})?$/;
const PATH_PATTERN = /^\/[\x21-\x7e]{0,2047}$/;
const SERVICE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_REASONS = 64;
const PAGE_SIZE = 100;
const MAX_PAGES = 5;
const NO_NODE = "(unknown)";
const DENY_REASON = "No grant or policy allows this call.";
const UNREADABLE = "Policy decisions could not be read.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasControl(text: string): boolean {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

function cleanString(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.length >= min && value.length <= max && !hasControl(value);
}

function parsePermit(raw: unknown): DecisionViewWeb["permit"] | undefined {
  if (raw === null) return null;
  if (!isRecord(raw)) return undefined;
  const { method, host, path, serviceId, ttlSeconds } = raw;
  if (!cleanString(method, 1, 64) || !METHOD_PATTERN.test(method)) return undefined;
  if (!cleanString(host, 1, 300) || !HOST_PATTERN.test(host)) return undefined;
  if (!cleanString(path, 1, 2100) || !PATH_PATTERN.test(path)) return undefined;
  if (!cleanString(serviceId, 1, 128) || !SERVICE_ID_PATTERN.test(serviceId)) return undefined;
  if (typeof ttlSeconds !== "number" || !Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 3600) {
    return undefined;
  }
  return { method, host, path, serviceId, ttlSeconds };
}

function parseDecision(raw: unknown): DecisionViewWeb | null {
  if (!isRecord(raw)) return null;
  const { decisionId, nodeId, resource, decision, reasons } = raw;
  if (!cleanString(decisionId, 1, 128) || !DECISION_ID_PATTERN.test(decisionId)) return null;
  if (nodeId !== null && !cleanString(nodeId, 1, 256)) return null;
  if (!cleanString(resource, 1, 512)) return null;
  if (decision !== "allow" && decision !== "deny") return null;
  if (!Array.isArray(reasons) || reasons.length > MAX_REASONS) return null;
  const kept: string[] = [];
  for (const reason of reasons as unknown[]) {
    if (!cleanString(reason, 1, 256)) return null;
    kept.push(reason);
  }
  const permit = parsePermit(raw["permit"]);
  if (permit === undefined) return null;
  return { decisionId, nodeId, resource, decision, reasons: kept, permit };
}

export function parseDecisions(raw: unknown): DecisionViewWeb[] | null {
  if (!Array.isArray(raw)) return null;
  const out: DecisionViewWeb[] = [];
  for (const item of raw as unknown[]) {
    const view = parseDecision(item);
    if (view === null) return null;
    out.push(view);
  }
  return out;
}

export function permitText(p: NonNullable<DecisionViewWeb["permit"]>): string {
  return `${p.method} ${p.host}${p.path}`;
}

function resourceLabel(resource: string): string | null {
  const match = /^Block::"(.*)"$/.exec(resource);
  if (match === null) return null;
  const parts = (match[1] ?? "").split("/");
  if (parts.length < 3 || parts.some((part) => part.length === 0)) return null;
  return parts.slice(2).join("/");
}

function lastStep(steps: readonly StepView[], nodeId: string): StepView | null {
  let found: StepView | null = null;
  for (const step of steps) {
    if (step.nodeId === nodeId && (found === null || step.seq > found.seq)) found = step;
  }
  return found;
}

function isStubbed(
  run: RunView,
  steps: readonly StepView[],
  decision: DecisionViewWeb,
  label: string,
): boolean {
  if (run.mode !== "stub" || decision.decision !== "allow" || decision.nodeId === null) return false;
  const step = lastStep(steps, decision.nodeId);
  if (step === null || step.kind !== "block") return false;
  if (label === decision.nodeId) return step.idemKey !== null;
  const prefix = `${decision.nodeId}:`;
  if (!label.startsWith(prefix)) return false;
  const hookLabel = label.slice(prefix.length);
  const entry = step.hooks?.entries.find((candidate) => candidate.label === hookLabel);
  return entry !== undefined && entry.idemKey !== null;
}

export function decisionRows(
  run: RunView,
  steps: readonly StepView[],
  decisions: readonly DecisionViewWeb[],
): DecisionRowView[] {
  return decisions.map((decision) => {
    const label = resourceLabel(decision.resource) ?? decision.nodeId ?? NO_NODE;
    const parts = [label, decision.decision];
    if (isStubbed(run, steps, decision, label)) parts.push("stubbed");
    if (decision.permit !== null) parts.push(permitText(decision.permit));
    const reasons =
      decision.reasons.length > 0
        ? decision.reasons.join(", ")
        : decision.decision === "allow"
          ? "none"
          : DENY_REASON;
    const details: { term: string; value: string }[] = [
      { term: "Decision id", value: decision.decisionId },
      { term: "Resource", value: decision.resource },
      { term: "Reasons", value: reasons },
    ];
    if (decision.permit !== null) {
      details.push({ term: "Service", value: decision.permit.serviceId });
      details.push({ term: "Token lifetime", value: `${decision.permit.ttlSeconds} s` });
    }
    return { nodeId: label, text: parts.join(" · "), details };
  });
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

export function decisionsWanted(run: RunView | null): boolean {
  if (run === null || run.mode === "mock") return false;
  return run.state === "completed" || run.state === "failed" || run.state === "cancelled";
}

export function decisionsView(
  run: RunView | null,
  steps: readonly StepView[],
  load: DecisionLoad | undefined,
): DecisionsSection {
  if (run === null || !decisionsWanted(run)) return { kind: "hidden" };
  if (load === undefined || load.phase === "loading") return { kind: "loading" };
  if (load.phase === "error") {
    const error = load.error;
    if (error instanceof ApiRequestError && error.code !== "INVALID_RESPONSE") {
      return { kind: "error", message: runErrorMessage(error) };
    }
    return { kind: "error", message: UNREADABLE };
  }
  if (load.decisions.length === 0) {
    return { kind: "empty", text: "No policy decisions were recorded." };
  }
  return {
    kind: "rows",
    rows: decisionRows(run, steps, load.decisions),
    note: load.truncated ? "Showing the first 500 decisions." : null,
  };
}

export async function loadDecisions(
  client: Pick<ApiClient, "get">,
  runId: string,
  signal?: AbortSignal,
): Promise<{ decisions: DecisionViewWeb[]; truncated: boolean }> {
  if (typeof runId !== "string" || !RUN_ID_PATTERN.test(runId)) {
    throw new RangeError("runId must match ^[A-Za-z0-9_-]{1,128}$");
  }
  const decisions: DecisionViewWeb[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query: Record<string, QueryValue> = { limit: PAGE_SIZE };
    if (cursor !== null) query.cursor = cursor;
    const body: unknown = await client.get<unknown>(
      `/runs/${runId}/decisions`,
      signal === undefined ? { query } : { query, signal },
    );
    const parsedPage = parseCursorPage(body);
    const items = parsedPage === null ? null : parseDecisions(parsedPage.items);
    if (parsedPage === null || items === null) {
      throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid decisions");
    }
    decisions.push(...items);
    if (parsedPage.next_cursor === null) return { decisions, truncated: false };
    cursor = parsedPage.next_cursor;
  }
  return { decisions, truncated: true };
}
