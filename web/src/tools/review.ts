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

export function parseReviewTools(_surface: unknown): ReviewTool[] | null {
  throw new Error("not implemented");
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

export function callRows(_tools: readonly ReviewTool[]): {
  name: string;
  call: string;
  effect: string;
  retry: string;
  result: string;
  hints: string;
}[] {
  throw new Error("not implemented");
}

export function readNote(_tools: readonly ReviewTool[]): string | null {
  throw new Error("not implemented");
}

export const REVIEW_NAMES: Readonly<Record<string, string>> = {};
