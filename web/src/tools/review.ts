// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";
import type { ToolServerView } from "./servers.ts";

export interface ReviewTool {
  name: string;
  effect: string;
  untrusted_result: boolean;
  unsafe_to_retry: boolean;
  call: string;
  hints: string;
  serverName: string | null;
}

const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const MCP_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;
const EFFECTS: readonly string[] = ["read", "write", "send", "pay"];
const HTTP_METHODS: readonly string[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const PROTOCOL_VERSIONS: readonly string[] = [
  "2026-07-28",
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
];
const MAX_TOOLS = 100;
const MAX_CODE_SOURCE = 65_536;
const NO_HINTS = "—";
const READ_NOTE =
  "Read tools are called for real, even in a dry run. Check that each one changes nothing.";

type HintName = readonly [key: string, yes: string, no: string];
const HINT_NAMES: readonly HintName[] = [
  ["readOnly", "read-only", "not read-only"],
  ["destructive", "destructive", "not destructive"],
  ["idempotent", "idempotent", "not idempotent"],
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function member(src: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(src, key) ? src[key] : undefined;
}

function hasControl(v: string): boolean {
  for (let i = 0; i < v.length; i += 1) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return true;
  }
  return false;
}

function text(v: unknown, min: number, max: number): string | null {
  if (typeof v !== "string" || v.length < min || v.length > max || hasControl(v)) return null;
  return v;
}

function optionalBool(src: Record<string, unknown>, key: string, dflt: boolean): boolean | null {
  const v = member(src, key);
  if (v === undefined) return dflt;
  return typeof v === "boolean" ? v : null;
}

interface CallView {
  call: string;
  hints: string;
  serverName: string | null;
}

function hintsText(v: unknown): string | null {
  if (v === undefined) return NO_HINTS;
  if (!isRecord(v)) return null;
  const parts: string[] = [];
  for (const [key, yes, no] of HINT_NAMES) {
    if (!Object.hasOwn(v, key)) continue;
    const value = v[key];
    if (typeof value !== "boolean") return null;
    parts.push(value ? yes : no);
  }
  return parts.length === 0 ? NO_HINTS : parts.join(", ");
}

function parseHttpCall(v: Record<string, unknown>): CallView | null {
  const method = member(v, "method");
  const path = text(member(v, "path"), 1, 1_024);
  if (typeof method !== "string" || !HTTP_METHODS.includes(method) || path === null) return null;
  const params = member(v, "params");
  if (!Array.isArray(params)) return null;
  for (const param of params as unknown[]) {
    if (!isRecord(param)) return null;
    if (typeof member(param, "name") !== "string") return null;
    const where = member(param, "in");
    if (where !== "path" && where !== "query") return null;
  }
  if (typeof member(v, "body") !== "boolean") return null;
  return { call: `${method} ${path}`, hints: NO_HINTS, serverName: null };
}

function parseMcpCall(v: Record<string, unknown>): CallView | null {
  if (text(member(v, "endpoint"), 1, 1_024) === null) return null;
  const name = member(v, "name");
  if (typeof name !== "string" || !MCP_NAME_PATTERN.test(name)) return null;
  const version = member(v, "protocolVersion");
  if (typeof version !== "string" || !PROTOCOL_VERSIONS.includes(version)) return null;
  const output = member(v, "output");
  if (output !== "structured" && output !== "text") return null;
  const hints = hintsText(member(v, "hints"));
  if (hints === null) return null;
  return { call: `mcp ${name} (${version})`, hints, serverName: name };
}

function parseCodeCall(v: Record<string, unknown>): CallView | null {
  const source = member(v, "source");
  if (
    typeof source !== "string" ||
    source.length < 1 ||
    source.length > MAX_CODE_SOURCE ||
    source.includes("\u0000")
  ) {
    return null;
  }
  return { call: `code (${source.length} characters)`, hints: NO_HINTS, serverName: null };
}

function parseCall(v: unknown): CallView | null {
  if (!isRecord(v)) return null;
  const kind = member(v, "kind");
  if (kind === "http") return parseHttpCall(v);
  if (kind === "mcp") return parseMcpCall(v);
  if (kind === "code") return parseCodeCall(v);
  return null;
}

function parseToolHttp(v: unknown): CallView | null {
  if (!isRecord(v)) return null;
  const method = text(member(v, "method"), 1, 16);
  const path = text(member(v, "path"), 1, 2_048);
  if (method === null || path === null) return null;
  return { call: `${method} ${path}`, hints: NO_HINTS, serverName: null };
}

function parseTool(v: unknown): ReviewTool | null {
  if (!isRecord(v)) return null;
  const name = member(v, "name");
  const effect = member(v, "effect");
  if (typeof name !== "string" || !TOOL_NAME_PATTERN.test(name)) return null;
  if (typeof effect !== "string" || !EFFECTS.includes(effect)) return null;
  const untrusted = optionalBool(v, "untrusted_result", true);
  const unsafe = optionalBool(v, "unsafe_to_retry", false);
  if (untrusted === null || unsafe === null) return null;
  const description = member(v, "description");
  if (description !== undefined && typeof description !== "string") return null;
  const http = member(v, "http");
  const call = member(v, "call");
  const hasHttp = http !== undefined && http !== null;
  const hasCall = call !== undefined && call !== null;
  if (hasHttp === hasCall) return null;
  const view = hasHttp ? parseToolHttp(http) : parseCall(call);
  if (view === null) return null;
  return {
    name,
    effect,
    untrusted_result: untrusted,
    unsafe_to_retry: unsafe,
    call: view.call,
    hints: view.hints,
    serverName: view.serverName,
  };
}

export function parseReviewTools(surface: unknown): ReviewTool[] | null {
  if (!isRecord(surface)) return null;
  const list = member(surface, "tools");
  if (!Array.isArray(list) || list.length > MAX_TOOLS) return null;
  const out: ReviewTool[] = [];
  const names = new Set<string>();
  for (const item of list as unknown[]) {
    const tool = parseTool(item);
    if (tool === null || names.has(tool.name)) return null;
    names.add(tool.name);
    out.push(tool);
  }
  return out;
}

export interface SurfaceChange {
  name: string;
  kind: "added" | "removed" | "changed";
  fields: string[];
  description?: { old: string | null; new: string | null };
  input?: { property: string; text: string }[];
}

export function surfaceDiff(_approved: unknown, _pending: unknown): SurfaceChange[] {
  throw new Error("not implemented");
}

export function changeText(_c: SurfaceChange): string {
  throw new Error("not implemented");
}

export function changesView(
  _approved: unknown,
  _pending: unknown,
): { text: string | null; items: { text: string; lines: string[] }[] } {
  throw new Error("not implemented");
}

export interface DiscoverDraft {
  effects: Readonly<Record<string, "" | "read" | "write" | "send" | "pay" | "skip">>;
  names?: Readonly<Record<string, string>>;
}

export function initialDraft(_tools: readonly ReviewTool[]): DiscoverDraft {
  throw new Error("not implemented");
}

export function discoverBody(_d: DiscoverDraft): {
  tools: Record<string, { effect?: string; name?: string; skip?: true }>;
} {
  throw new Error("not implemented");
}

export function parseDiscovery(_raw: unknown): {
  protocolVersion: string;
  era: string;
  count: number;
  excluded: { name: string; reason: string }[];
} | null {
  throw new Error("not implemented");
}

export async function discoverTools(
  _api: Api<"post">,
  _serverId: string,
  _body: unknown,
  _key: string,
  _signal?: AbortSignal,
): Promise<NonNullable<ReturnType<typeof parseDiscovery>>> {
  throw new Error("not implemented");
}

export function discoveryText(_d: NonNullable<ReturnType<typeof parseDiscovery>>): string {
  throw new Error("not implemented");
}

export function discoveryErrorText(_error: unknown): string {
  throw new Error("not implemented");
}

export function collidingNames(_error: unknown): string[] {
  throw new Error("not implemented");
}

export interface ServerReview {
  server: ToolServerView;
  approved: unknown;
  pending: unknown;
}

export async function loadServerReview(
  _api: Api<"get">,
  _serverId: string,
  _signal?: AbortSignal,
): Promise<ServerReview> {
  throw new Error("not implemented");
}

export function callRows(tools: readonly ReviewTool[]): {
  name: string;
  call: string;
  effect: string;
  retry: string;
  result: string;
  hints: string;
}[] {
  return tools.map((tool) => ({
    name: tool.name,
    call: tool.call,
    effect: tool.effect,
    retry: tool.unsafe_to_retry ? "unsafe to retry" : "safe to retry",
    result: tool.untrusted_result ? "untrusted" : "trusted",
    hints: tool.hints,
  }));
}

export function readNote(tools: readonly ReviewTool[]): string | null {
  return tools.some((tool) => tool.effect === "read") ? READ_NOTE : null;
}

export const REVIEW_NAMES: Readonly<Record<string, string>> = {};
