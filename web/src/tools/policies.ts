// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";
import { ApiRequestError } from "../api/client.ts";
import { toolsErrorMessage } from "./messages.ts";

export interface PolicyView {
  version: string | null;
  source: string;
  pendingGrants: number;
}

const MAX_SOURCE = 65536;
const VERSION = /^[0-9a-f]{64}$/;

function withinSource(source: string): boolean {
  if (source.length <= MAX_SOURCE) return true;
  if (source.length > MAX_SOURCE * 2) return false;
  return Array.from(source).length <= MAX_SOURCE;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePolicyView(raw: unknown): PolicyView | null {
  if (!isRecord(raw)) return null;
  const pending = raw["pendingGrants"];
  if (typeof pending !== "number" || !Number.isSafeInteger(pending) || pending < 0) return null;
  const current = raw["current"];
  if (current === null) return { version: null, source: "", pendingGrants: pending };
  if (!isRecord(current)) return null;
  const version = current["version"];
  const source = current["source"];
  if (typeof version !== "string" || !VERSION.test(version)) return null;
  if (typeof source !== "string" || !withinSource(source)) return null;
  return { version, source, pendingGrants: pending };
}

export function validationText(v: {
  ok: boolean;
  problems: { stage: string; ids: string[]; message: string }[];
}): string {
  if (v.ok) return "Valid.";
  if (v.problems.length === 0) return "Not valid.";
  const parts = v.problems.map((p) => {
    let text = p.stage;
    if (p.ids.length > 0) text += ` ${p.ids.join(", ")}`;
    if (p.message !== "") text += `: ${p.message}`;
    return text;
  });
  return `Not valid: ${parts.join("; ")}`;
}

export function deployText(version: string): string {
  return `Deployed version ${version.slice(0, 12)}.`;
}

export function currentText(v: PolicyView): string {
  return v.version === null ? "No policy deployed." : `Current version ${v.version.slice(0, 12)}`;
}

export function pendingText(n: number): string {
  if (n === 0) return "All grant changes are deployed.";
  return n === 1 ? "1 grant change is not deployed." : `${n} grant changes are not deployed.`;
}

export function checkPolicySource(source: string): { ok: true } | { ok: false; message: string } {
  return withinSource(source)
    ? { ok: true }
    : { ok: false, message: "The policy must be at most 65,536 characters." };
}

function readProblems(
  raw: unknown,
): { stage: string; ids: string[]; message: string }[] | null {
  if (!Array.isArray(raw)) return null;
  const out: { stage: string; ids: string[]; message: string }[] = [];
  for (const item of raw as unknown[]) {
    if (!isRecord(item)) return null;
    const { stage, ids, message } = item;
    if (typeof stage !== "string" || typeof message !== "string") return null;
    if (!Array.isArray(ids) || !(ids as unknown[]).every((i) => typeof i === "string")) return null;
    out.push({ stage, ids: ids as string[], message });
  }
  return out;
}

export function policyErrorText(error: unknown): string {
  if (error instanceof ApiRequestError && error.status === 422 && error.code === "OPERATION_REFUSED") {
    const details: unknown = error.details;
    if (isRecord(details) && details["reason"] === "policy_invalid") {
      const problems = readProblems(details["problems"]);
      if (problems !== null) return validationText({ ok: false, problems });
    }
  }
  return toolsErrorMessage(error);
}

export async function loadPolicy(client: Api<"get">, signal?: AbortSignal): Promise<PolicyView> {
  const answer =
    signal === undefined
      ? await client.get<unknown>("/policies")
      : await client.get<unknown>("/policies", { signal });
  const view = parsePolicyView(answer);
  if (view === null) throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid policy");
  return view;
}

export async function validatePolicy(
  client: Api<"post">,
  source: string,
): Promise<{ ok: boolean; problems: { stage: string; ids: string[]; message: string }[] }> {
  const answer = await client.post<unknown>("/policies/validate", { source });
  const ok = isRecord(answer) ? answer["ok"] : undefined;
  const problems = isRecord(answer) ? readProblems(answer["problems"]) : null;
  if (typeof ok !== "boolean" || problems === null) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid validation");
  }
  return { ok, problems };
}

export async function deployPolicy(
  client: Api<"post">,
  source: string,
  key: string,
): Promise<string> {
  if (key.trim() === "") throw new RangeError("Idempotency key is blank");
  const answer = await client.post<unknown>(
    "/policies/deploy",
    { source },
    { headers: { "Idempotency-Key": key } },
  );
  const version = isRecord(answer) ? answer["version"] : undefined;
  if (typeof version !== "string" || !VERSION.test(version)) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid deployment");
  }
  return version;
}
