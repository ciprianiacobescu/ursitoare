// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";

export interface ToolServerView {
  id: string;
  adapter: string;
  origin: string;
  state: "pending" | "approved" | "drifted";
  registeredBy: string;
  pendingDigest: string | null;
  approvedDigest: string | null;
  tools: {
    name: string;
    effect: "read" | "write" | "send" | "pay";
    ref: string | null;
    untrusted_result: boolean;
    unsafe_to_retry: boolean;
    http: { method: string; path: string } | null;
  }[];
  pendingSubmittedBy: string | null;
}

export function parseToolServer(_raw: unknown): ToolServerView | null {
  throw new Error("not implemented");
}

export function serverRowText(_s: ToolServerView): string {
  throw new Error("not implemented");
}

export function approvalView(
  _s: ToolServerView,
  _me: { userId: string; reviewProfile: "solo" | "team" },
): { canApprove: boolean; selfApproval: boolean; message: string | null } {
  throw new Error("not implemented");
}

export const SURFACE_APPROVED: string = "";

export function toolRows(
  _s: ToolServerView,
): { name: string; effect: string; block: string; result: string; call: string }[] {
  throw new Error("not implemented");
}

export function stateNote(_s: ToolServerView): string | null {
  throw new Error("not implemented");
}

export function ownBoxShown(_view: { selfApproval: boolean }, _ownSurface: boolean): boolean {
  throw new Error("not implemented");
}

export function approveRequest(
  _s: ToolServerView,
  _me: { userId: string; reviewProfile: "solo" | "team" },
  _input: { ticked: boolean; ownSurface: boolean },
): { ok: true; body: { digest: string; selfApproval: boolean } } | { ok: false; message: string } {
  throw new Error("not implemented");
}

export function approveDialog(
  _s: ToolServerView,
): { title: string; description: string; action: string } | null {
  throw new Error("not implemented");
}

export function approveFailure(_error: unknown): {
  message: string;
  ownSurface: boolean;
  reload: boolean;
} {
  throw new Error("not implemented");
}

export function approveControl(
  _s: ToolServerView | null,
  _me: { userId: string; reviewProfile: "solo" | "team" } | null,
  _busy: boolean,
): { disabled: boolean; selfApproval: boolean; message: string | null } {
  throw new Error("not implemented");
}

export function serverLink(_id: string): string {
  throw new Error("not implemented");
}

export function serverIdFromSearch(_search: string): string | null {
  throw new Error("not implemented");
}

export async function loadToolServer(
  _client: Api<"get">,
  _id: string,
  _signal?: AbortSignal,
): Promise<ToolServerView> {
  throw new Error("not implemented");
}

export async function approveToolSurface(
  _client: Api<"post">,
  _id: string,
  _body: { digest: string; selfApproval: boolean },
): Promise<ToolServerView> {
  throw new Error("not implemented");
}
