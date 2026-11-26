// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { OperationRowView } from "./register.ts";

export type DataClass = "public" | "private";

export interface ToolTrust {
  trusted: boolean;
  dataClass: DataClass | null;
}

export const DEFAULT_TRUST: Readonly<ToolTrust> = Object.freeze({}) as unknown as Readonly<ToolTrust>;

export interface StoredTool {
  name: string;
  effect: string;
  untrusted_result: boolean;
  unsafe_to_retry: boolean | null;
  data_class: DataClass | null;
  serverName: string | null;
}

export function storedTools(_surface: unknown): ReadonlyMap<string, StoredTool> | null {
  throw new Error("not implemented");
}

export function trustOf(_t: StoredTool | undefined): ToolTrust {
  throw new Error("not implemented");
}

export type OverlayAdapter = "openapi" | "mcp";

export interface Carried {
  name?: string;
  unsafe_to_retry?: boolean;
}

export function carriedFields(
  _adapter: OverlayAdapter,
  _stored: StoredTool | undefined,
  _next: { effect: string; derivedName: string | null },
): Carried {
  throw new Error("not implemented");
}

export function carriedAfterEffect(
  _adapter: OverlayAdapter,
  _stored: ReadonlyMap<string, StoredTool> | null,
  _lookup: string | null,
  _effect: string,
  _derivedName: string | null,
): Carried {
  throw new Error("not implemented");
}

export function overlayEntry(
  _adapter: OverlayAdapter,
  _effect: string | null,
  _trust: ToolTrust,
  _carried: Carried,
): Record<string, string | boolean> {
  throw new Error("not implemented");
}

export function prefillTrust(
  _stored: ReadonlyMap<string, StoredTool>,
  _operations: readonly OperationRowView[],
): { trust: Record<string, ToolTrust>; carried: Record<string, Carried> } {
  throw new Error("not implemented");
}

export function discoverSettings(_stored: ReadonlyMap<string, StoredTool>): {
  trust: Record<string, ToolTrust>;
  carried: Record<string, Carried>;
} {
  throw new Error("not implemented");
}

export function trustAckMissing(
  _trust: Readonly<Record<string, ToolTrust>>,
  _ack: Readonly<Record<string, boolean>>,
): string[] {
  throw new Error("not implemented");
}

export function ackStatus(
  _trust: Readonly<Record<string, ToolTrust>>,
  _baseline: Readonly<Record<string, ToolTrust>>,
  _ticks: Readonly<Record<string, boolean>>,
): { shown: string[]; missing: string[]; message: string | null } {
  throw new Error("not implemented");
}

export function valueChangeLines(_approved: unknown, _pending: unknown): ReadonlyMap<string, string[]> {
  throw new Error("not implemented");
}

export interface ChangesText {
  text: string | null;
  items: { text: string; lines: string[] }[];
}

export function withValueLines(_view: ChangesText, _values: ReadonlyMap<string, string[]>): ChangesText {
  throw new Error("not implemented");
}

export function fillName(_template: string, _key: string): string {
  throw new Error("not implemented");
}

export const TRUST_WARNING: string = "";

export const TRUST_NAMES: Readonly<Record<string, string>> = {};
