import { ApiRequestError } from "../api/client.ts";
import type { Api } from "../admin/shared.ts";
import type { FetchPage } from "../kit/data/cursor-list.ts";
import { cursorPageFetcher } from "../kit/data/page-fetcher.ts";
import { parseValidation } from "./diagnostics.ts";
import type { ValidationView } from "./diagnostics.ts";

export type FlowFormat = "yaml" | "json";

export type VersionState =
  | "draft"
  | "validated"
  | "tested"
  | "reviewed"
  | "published"
  | "deprecated";

export interface VersionRow {
  flowId: string;
  number: number;
  hash: string;
  state: VersionState;
  surface: FlowFormat;
  author: string;
  requestedBy: string | null;
  createdAt: string;
  validatedAt: string | null;
  validationOk: boolean | null;
}

export interface VersionDetailRow extends VersionRow {
  text: string;
  canonical: unknown;
  result: ValidationView | null;
}

export interface SaveResult {
  version: VersionRow;
  created: boolean;
}

export interface ValidateResult {
  version: VersionRow;
  result: ValidationView;
}

const FLOW_ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const FLOW_ID_MAX_LENGTH = 64;
const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;
const TIMESTAMP_PATTERN =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$/;
const USER_ID_MIN_LENGTH = 1;
const USER_ID_MAX_LENGTH = 200;
const MAX_TEXT_LENGTH = 1_048_576;

const STATES: readonly VersionState[] = [
  "draft",
  "validated",
  "tested",
  "reviewed",
  "published",
  "deprecated",
];

const SURFACES: readonly FlowFormat[] = ["yaml", "json"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFlowId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= FLOW_ID_MAX_LENGTH &&
    FLOW_ID_PATTERN.test(value)
  );
}

function isHash(value: unknown): value is string {
  return typeof value === "string" && HASH_PATTERN.test(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && TIMESTAMP_PATTERN.test(value);
}

function isUserId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= USER_ID_MIN_LENGTH &&
    value.length <= USER_ID_MAX_LENGTH
  );
}

function isState(value: unknown): value is VersionState {
  return typeof value === "string" && (STATES as readonly string[]).includes(value);
}

function isSurface(value: unknown): value is FlowFormat {
  return typeof value === "string" && (SURFACES as readonly string[]).includes(value);
}

function parseOptionalUserId(value: unknown): string | null | undefined {
  if (value === null) return null;
  return isUserId(value) ? value : undefined;
}

function parseOptionalTimestamp(value: unknown): string | null | undefined {
  if (value === null) return null;
  return isTimestamp(value) ? value : undefined;
}

export function parseVersion(raw: unknown): VersionRow | null {
  if (!isRecord(raw)) return null;
  const flowId = raw["flowId"];
  const number = raw["number"];
  const hash = raw["hash"];
  const state = raw["state"];
  const surface = raw["surface"];
  const author = raw["author"];
  const createdAt = raw["createdAt"];
  const requestedBy = parseOptionalUserId(raw["requestedBy"]);
  const validatedAt = parseOptionalTimestamp(raw["validatedAt"]);
  const validationOk = raw["validationOk"];

  if (!isFlowId(flowId)) return null;
  if (typeof number !== "number" || !Number.isInteger(number) || number < 1) return null;
  if (!isHash(hash)) return null;
  if (!isState(state)) return null;
  if (!isSurface(surface)) return null;
  if (!isUserId(author)) return null;
  if (requestedBy === undefined) return null;
  if (!isTimestamp(createdAt)) return null;
  if (validatedAt === undefined) return null;
  if (validationOk !== null && typeof validationOk !== "boolean") return null;

  return {
    flowId,
    number,
    hash,
    state,
    surface,
    author,
    requestedBy,
    createdAt,
    validatedAt,
    validationOk,
  };
}

export function parseVersionDetail(raw: unknown): VersionDetailRow | null {
  const version = parseVersion(raw);
  if (version === null || !isRecord(raw)) return null;
  const text = raw["text"];
  const result = raw["result"];
  if (typeof text !== "string") return null;
  if (!Object.hasOwn(raw, "canonical")) return null;
  const parsedResult = result === null ? null : parseValidation(result);
  if (result !== null && parsedResult === null) return null;
  return {
    ...version,
    text,
    canonical: raw["canonical"],
    result: parsedResult,
  };
}

export function versionListFetcher(client: Api<"get">, flowId: string): FetchPage<VersionRow> {
  if (!isFlowId(flowId)) {
    throw new RangeError("flowId must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$");
  }
  return cursorPageFetcher(client, `/flows/${flowId}/versions`, { parseItem: parseVersion });
}

export async function loadVersion(
  client: Api<"get">,
  flowId: string,
  hash: string,
  signal?: AbortSignal,
): Promise<VersionDetailRow> {
  if (!isFlowId(flowId)) {
    throw new RangeError("flowId must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$");
  }
  if (!isHash(hash)) {
    throw new RangeError("hash must match ^sha256:[0-9a-f]{64}$");
  }
  const path = `/flows/${flowId}/versions/${encodeURIComponent(hash)}`;
  const answer: unknown = await client.get<unknown>(path, signal === undefined ? undefined : { signal });
  const detail = parseVersionDetail(answer);
  if (detail === null) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid version");
  }
  return detail;
}

function parseSaveResult(raw: unknown): SaveResult | null {
  if (!isRecord(raw)) return null;
  const version = parseVersion(raw["version"]);
  const created = raw["created"];
  if (version === null || typeof created !== "boolean") return null;
  return { version, created };
}

export async function saveVersion(
  client: Api<"post">,
  input: { flowId: string; text: string },
  key: string,
): Promise<SaveResult> {
  if (!isFlowId(input.flowId)) {
    throw new RangeError("flowId must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$");
  }
  if (input.text.length === 0) {
    throw new RangeError("Enter the flow text first.");
  }
  if (input.text.length > MAX_TEXT_LENGTH) {
    throw new RangeError("The text is longer than 1,048,576 characters.");
  }
  const answer: unknown = await client.post<unknown>(
    `/flows/${input.flowId}/versions`,
    { format: detectFormat(input.text), text: input.text },
    { headers: { "Idempotency-Key": key } },
  );
  const saved = parseSaveResult(answer);
  if (saved === null) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid save answer");
  }
  return saved;
}

export async function validateVersion(
  client: Api<"post">,
  flowId: string,
  hash: string,
): Promise<ValidateResult> {
  if (!isFlowId(flowId)) {
    throw new RangeError("flowId must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$");
  }
  if (!isHash(hash)) {
    throw new RangeError("hash must match ^sha256:[0-9a-f]{64}$");
  }
  const path = `/flows/${flowId}/versions/${encodeURIComponent(hash)}/validate`;
  const answer: unknown = await client.post<unknown>(path);
  if (!isRecord(answer)) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid validation answer");
  }
  const version = parseVersion(answer["version"]);
  const result = parseValidation(answer["result"]);
  if (version === null || result === null) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid validation answer");
  }
  return { version, result };
}

export function detectFormat(text: string): FlowFormat {
  return text.trimStart().startsWith("{") ? "json" : "yaml";
}

export function starterText(flowId: string): string {
  if (!isFlowId(flowId)) {
    throw new RangeError("flowId must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$");
  }
  return [
    'ursitoare: "0.1"',
    `flow: ${flowId}`,
    "version: 1.0.0",
    "inputs:",
    "  type: object",
    "  properties: {}",
    "start: done",
    "nodes:",
    "  done:",
    "    kind: end",
    "    status: completed",
    "",
  ].join("\n");
}
