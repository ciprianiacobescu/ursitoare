// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../api/client.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import type { RunView } from "./types.ts";

export const DRY_RUN_PANEL: Readonly<{ id: "dry-run"; title: "Dry run" }> = {} as unknown as Readonly<{
  id: "dry-run";
  title: "Dry run";
}>;

export function dryRunPanelView(
  _capabilities: ReadonlySet<string>,
  _version: { state: string } | null,
): { state: "not_allowed" | "needs_version" | "ready"; message: string | null } {
  throw new Error("not implemented");
}

export function parseFakes(
  _text: string,
): { ok: true; fakes: Record<string, unknown[]> } | { ok: false; message: string } {
  throw new Error("not implemented");
}

export async function startDryRun(
  _api: ApiClient,
  _flowId: string,
  _hash: string,
  _input: unknown,
  _fakes: Record<string, unknown[]>,
  _key: string,
): Promise<RunView> {
  throw new Error("not implemented");
}

export function dryRunFormErrors(_error: unknown): FormErrors {
  throw new Error("not implemented");
}
