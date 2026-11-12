import { ApiRequestError } from "../api/client.ts";
import type { ApiClient } from "../api/client.ts";
import { mapEnvelopeErrors } from "../kit/data/form-errors.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { testRunFormErrors } from "./test-run.ts";
import { parseRunView } from "./types.ts";
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

const FLOW_ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const FLOW_ID_MAX_LENGTH = 64;
const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;
const MAX_FAKES_PARTS = 3;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function startDryRun(
  api: ApiClient,
  flowId: string,
  hash: string,
  input: unknown,
  fakes: Record<string, unknown[]>,
  key: string,
): Promise<RunView> {
  if (flowId.length > FLOW_ID_MAX_LENGTH || !FLOW_ID_PATTERN.test(flowId)) {
    throw new RangeError("flowId must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$");
  }
  if (!HASH_PATTERN.test(hash)) {
    throw new RangeError("hash must match ^sha256:[0-9a-f]{64}$");
  }
  if (key === "") {
    throw new RangeError("key must not be empty");
  }
  const answer: unknown = await api.post<unknown>(
    `/flows/${flowId}/versions/${encodeURIComponent(hash)}/dry-run`,
    { input, fakes },
    { headers: { "Idempotency-Key": key } },
  );
  const run = isRecord(answer) ? parseRunView(answer["run"]) : null;
  if (run === null) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid dry run answer");
  }
  return run;
}

function plainText(text: string): string {
  let replaced = "";
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    replaced += code <= 0x1f || code === 0x7f ? " " : character;
  }
  return replaced.replace(/\s+/g, " ").trim().slice(0, 200);
}

export function dryRunFormErrors(error: unknown): FormErrors {
  if (
    !(error instanceof ApiRequestError) ||
    error.status !== 400 ||
    error.code !== "VALIDATION_FAILED" ||
    !isRecord(error.details) ||
    !Array.isArray(error.details["fields"])
  ) {
    return testRunFormErrors(error);
  }
  const fakeParts: string[] = [];
  let inputMessage: string | null = null;
  const others: unknown[] = [];
  for (const raw of error.details["fields"] as unknown[]) {
    if (!isRecord(raw) || typeof raw["field"] !== "string" || typeof raw["message"] !== "string") {
      others.push(raw);
      continue;
    }
    const field = raw["field"];
    const message = plainText(raw["message"]);
    if (field === "body/fakes") {
      fakeParts.push(message);
    } else if (field.startsWith("body/fakes/")) {
      fakeParts.push(`${plainText(field.slice("body/fakes/".length))}: ${message}`);
    } else if (field === "body/input" || field.startsWith("body/input/")) {
      inputMessage ??= message;
    } else {
      others.push(raw);
    }
  }
  const result: Record<string, string> = {};
  if (fakeParts.length > 0) result["fakes"] = fakeParts.slice(0, MAX_FAKES_PARTS).join("; ");
  if (inputMessage !== null) result["input"] = inputMessage;
  if (others.length > 0 || Object.keys(result).length === 0) {
    const rest = new ApiRequestError(400, "VALIDATION_FAILED", error.message, {
      details: { fields: others },
    });
    Object.assign(result, mapEnvelopeErrors(rest, []));
  }
  return result;
}
