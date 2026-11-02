import { ApiRequestError } from "../api/client.ts";
import type { Api, Check } from "../admin/shared.ts";
import { cursorPageFetcher } from "../kit/data/page-fetcher.ts";
import type { FetchPage } from "../kit/data/cursor-list.ts";
import { parseVersion } from "./versions.ts";
import type { VersionRow } from "./versions.ts";

export interface FlowRow {
  flowId: string;
  ownerTeam: string;
  createdBy: string;
  createdAt: string;
  versionCount: number;
  latest: VersionRow | null;
}

export interface FlowCells {
  flow: string;
  ownerTeam: string;
  versions: string;
  latest: string;
}

export const FLOW_NAME_MESSAGE =
  "Use lower-case words joined by single hyphens, starting with a letter (up to 64 characters), for example rf-1-core.";
export const TEAM_MESSAGE =
  "Use a lower-case letter first, then lower-case letters, digits, hyphens or underscores (up to 64 characters).";

const FLOW_ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const FLOW_ID_MAX_LENGTH = 64;
const OWNER_TEAM_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
const TIMESTAMP_PATTERN =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$/;
const USER_ID_MIN_LENGTH = 1;
const USER_ID_MAX_LENGTH = 200;

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

function isOwnerTeam(value: unknown): value is string {
  return typeof value === "string" && OWNER_TEAM_PATTERN.test(value);
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

export function parseFlow(raw: unknown): FlowRow | null {
  if (!isRecord(raw)) return null;
  const flowId = raw["flowId"];
  const ownerTeam = raw["ownerTeam"];
  const createdBy = raw["createdBy"];
  const createdAt = raw["createdAt"];
  const versionCount = raw["versionCount"];
  const latest = raw["latest"];

  if (!isFlowId(flowId)) return null;
  if (!isOwnerTeam(ownerTeam)) return null;
  if (!isUserId(createdBy)) return null;
  if (!isTimestamp(createdAt)) return null;
  if (
    typeof versionCount !== "number" ||
    !Number.isInteger(versionCount) ||
    versionCount < 0
  ) {
    return null;
  }
  let parsedLatest: VersionRow | null;
  if (latest === null) {
    parsedLatest = null;
  } else {
    const version = parseVersion(latest);
    if (version === null) return null;
    parsedLatest = version;
  }

  return { flowId, ownerTeam, createdBy, createdAt, versionCount, latest: parsedLatest };
}

export function flowCells(row: FlowRow): FlowCells {
  const latest =
    row.latest === null
      ? "Not saved yet"
      : `Version ${row.latest.number}, ${row.latest.state}` +
        (row.latest.validationOk === false ? ", validation found errors" : "");
  return {
    flow: row.flowId,
    ownerTeam: row.ownerTeam,
    versions: String(row.versionCount),
    latest,
  };
}

export function checkFlowName(text: string): Check<string> {
  const value = text.trim();
  if (value.length === 0) {
    return { ok: false, message: "Enter a flow name." };
  }
  if (!isFlowId(value)) {
    return { ok: false, message: FLOW_NAME_MESSAGE };
  }
  return { ok: true, value };
}

export function checkOwnerTeam(text: string): Check<string> {
  const value = text.trim();
  if (value.length === 0) {
    return { ok: false, message: "Enter the owner team." };
  }
  if (!isOwnerTeam(value)) {
    return { ok: false, message: TEAM_MESSAGE };
  }
  return { ok: true, value };
}

export async function postFlow(
  client: Api<"post">,
  input: { name: string; ownerTeam: string },
  key: string,
): Promise<FlowRow> {
  if (key.length === 0) {
    throw new RangeError("An idempotency key is required.");
  }
  if (!isFlowId(input.name)) {
    throw new RangeError("flowId must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$");
  }
  if (!isOwnerTeam(input.ownerTeam)) {
    throw new RangeError("ownerTeam must match ^[a-z][a-z0-9_-]{0,63}$");
  }
  const answer: unknown = await client.post<unknown>(
    "/flows",
    { name: input.name, ownerTeam: input.ownerTeam },
    { headers: { "Idempotency-Key": key } },
  );
  const flow = parseFlow(answer);
  if (flow === null) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid flow");
  }
  return flow;
}

export function flowListFetcher(client: Api<"get">): FetchPage<FlowRow> {
  return cursorPageFetcher(client, "/flows", { parseItem: parseFlow });
}

export async function loadFlow(
  client: Api<"get">,
  flowId: string,
  signal?: AbortSignal,
): Promise<FlowRow> {
  if (!isFlowId(flowId)) {
    throw new RangeError("flowId must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$");
  }
  const answer: unknown = await client.get<unknown>(
    `/flows/${flowId}`,
    signal === undefined ? undefined : { signal },
  );
  const flow = parseFlow(answer);
  if (flow === null) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid flow");
  }
  return flow;
}
