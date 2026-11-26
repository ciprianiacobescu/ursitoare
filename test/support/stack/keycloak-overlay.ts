// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { OverlayUser } from "./project.ts";

export const MAX_OVERLAY_ROUNDS: number = 0;

export interface RealmOverlay {
  groups: readonly string[];
  organizations: readonly string[];
  users: readonly OverlayUser[];
  clients: readonly { clientId: string; secret: string; mcpAudience: boolean }[];
}

export function stackOverlay(
  _users: Readonly<Record<string, OverlayUser>>,
  _clientSecrets: Readonly<Record<"e2e-mcp-caller" | "e2e-plain-caller", string>>,
): RealmOverlay {
  throw new Error("not implemented");
}

export interface AdminState {
  groups: { id: string; name: string }[];
  organizations: { id: string; alias: string; members: string[] }[];
  users: { id: string; username: string; groups: string[] }[];
  clients: string[];
}

export type OverlayRequest = { method: "POST" | "PUT"; path: string; body: unknown };

export function planOverlay(_state: AdminState, _overlay: RealmOverlay): OverlayRequest[] {
  throw new Error("not implemented");
}

export function overlayGaps(_state: AdminState, _overlay: RealmOverlay): string[] {
  throw new Error("not implemented");
}

export interface AdminDeps {
  adminBaseUrl: string;
  adminUser: string;
  adminPassword: string;
  fetch?: typeof fetch;
  requestTimeoutMs?: number;
}

export async function readAdminState(_deps: AdminDeps): Promise<AdminState> {
  throw new Error("not implemented");
}

export async function applyRealmOverlay(
  _deps: AdminDeps,
  _overlay: RealmOverlay,
): Promise<{ applied: number }> {
  throw new Error("not implemented");
}

export function stackAdminDeps(_dir: string): AdminDeps {
  throw new Error("not implemented");
}

export async function overlayMain(
  _argv: readonly string[],
  _io: { stdout(text: string): void; stderr(text: string): void },
  _opts?: { dir?: string; adminBaseUrl?: string; fetch?: typeof fetch },
): Promise<number> {
  throw new Error("not implemented");
}
