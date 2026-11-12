// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../api/client.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import type { RunView } from "./types.ts";

export const DRY_RUN_PANEL: Readonly<{ id: "dry-run"; title: "Dry run" }> = {
  id: "dry-run",
  title: "Dry run",
};

export function dryRunPanelView(
  capabilities: ReadonlySet<string>,
  version: { state: string } | null,
): { state: "not_allowed" | "needs_version" | "ready"; message: string | null } {
  if (!capabilities.has("dry_run_flow")) {
    return { state: "not_allowed", message: "Only members of the flow's owner team can dry-run it." };
  }
  if (version === null || version.state === "draft") {
    return { state: "needs_version", message: "Save and validate a version to dry-run it." };
  }
  return { state: "ready", message: null };
}

export function parseFakes(
  text: string,
): { ok: true; fakes: Record<string, unknown[]> } | { ok: false; message: string } {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: false, message: "Enter a JSON object." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, message: "This is not valid JSON." };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, message: "Enter a JSON object, for example {}." };
  }
  const fakes: Record<string, unknown[]> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!Array.isArray(value)) {
      return { ok: false, message: `The fakes for "${key}" must be a list.` };
    }
    Object.defineProperty(fakes, key, {
      value: [...value],
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return { ok: true, fakes };
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
