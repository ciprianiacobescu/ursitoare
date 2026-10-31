import { ApiRequestError } from "../api/client.ts";
import type { Api, Check, ConfirmSpec } from "./shared.ts";

const ROLE_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;
const TEAM_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
const KEY_PATTERN = /^[\x21-\x7e]{1,128}$/;
const DELETE_DESCRIPTION = "The team is removed. A team that is still in use is refused.";
const TEAM_PATTERN_MESSAGE =
  "Use a lower-case letter first, then lower-case letters, digits, hyphens or underscores (up to 64 characters).";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseNamed(raw: unknown, key: "roleId" | "teamId"): string | null {
  if (!isRecord(raw) || !Object.hasOwn(raw, key)) return null;
  const value = raw[key];
  if (typeof value !== "string") return null;
  return (key === "roleId" ? ROLE_PATTERN : TEAM_PATTERN).test(value) ? value : null;
}

export function checkTeamId(text: string): Check<string> {
  const value = text.trim();
  if (value.length === 0) {
    return { ok: false, message: "Enter a team name." };
  }
  if (!TEAM_PATTERN.test(value)) {
    return { ok: false, message: TEAM_PATTERN_MESSAGE };
  }
  return { ok: true, value };
}

export function deleteTeamConfirm(teamId: string): ConfirmSpec {
  return {
    title: `Delete team ${teamId}?`,
    description: DELETE_DESCRIPTION,
    action: "Delete team",
  };
}

export async function postTeam(
  client: Api<"post">,
  teamId: string,
  key: string,
): Promise<string> {
  if (!TEAM_PATTERN.test(teamId)) {
    throw new RangeError("teamId must match ^[a-z][a-z0-9_-]{0,63}$");
  }
  if (!KEY_PATTERN.test(key)) {
    throw new RangeError("key must match ^[\\x21-\\x7e]{1,128}$");
  }
  const answer = await client.post<unknown>(
    "/teams",
    { teamId },
    { headers: { "Idempotency-Key": key } },
  );
  const created = parseNamed(answer, "teamId");
  if (created === null) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid team");
  }
  return created;
}

export async function removeTeamById(client: Api<"delete">, teamId: string): Promise<void> {
  if (!TEAM_PATTERN.test(teamId)) {
    throw new RangeError("teamId must match ^[a-z][a-z0-9_-]{0,63}$");
  }
  await client.delete<unknown>(`/teams/${encodeURIComponent(teamId)}`);
}
