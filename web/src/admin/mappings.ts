import { ApiRequestError } from "../api/client.ts";
import { createCursorList } from "../kit/data/cursor-list.ts";
import type { FetchPage } from "../kit/data/cursor-list.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { clip } from "./shared.ts";
import type { Api, ConfirmSpec } from "./shared.ts";

export interface MappingRow {
  issuer: string;
  group: string;
  roleId: string | null;
  teamId: string | null;
  reviewedBy: string;
}

export interface GrantOption {
  value: string;
  label: string;
}

export type MappingBody =
  | { issuer: string; group: string; roleId: string }
  | { issuer: string; group: string; teamId: string };

export interface MappingCells {
  group: string;
  grants: string;
  issuer: string;
  reviewedBy: string;
}

const ROLE_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;
const TEAM_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
const MAX_ISSUER_LENGTH = 2048;
const MAX_GROUP_LENGTH = 255;
const MAX_REVIEWER_LENGTH = 200;

const ISSUER_EMPTY = "Enter the issuer URL.";
const ISSUER_TOO_LONG = "An issuer has at most 2048 characters.";
const ISSUER_CONTROL = "Use no line breaks or control characters in an issuer.";
const GROUP_EMPTY = "Enter the group name exactly as the identity provider sends it.";
const GROUP_TOO_LONG = "A group name has at most 255 characters.";
const GROUP_CONTROL = "Use no line breaks or control characters in a group name.";
const GRANT_INVALID = "Choose a role or a team.";

export const ISSUER_HINT: string = "The issuer URL your identity provider puts in tokens (iss).";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function isText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= maxLength &&
    !hasControlCharacter(value)
  );
}

export function parseGroupMapping(raw: unknown): MappingRow | null {
  if (!isRecord(raw)) return null;

  const issuer = raw["issuer"];
  if (!isText(issuer, MAX_ISSUER_LENGTH)) return null;

  const group = raw["group"];
  if (!isText(group, MAX_GROUP_LENGTH)) return null;

  const roleId = raw["roleId"];
  if (roleId !== null && (typeof roleId !== "string" || !ROLE_PATTERN.test(roleId))) {
    return null;
  }

  const teamId = raw["teamId"];
  if (teamId !== null && (typeof teamId !== "string" || !TEAM_PATTERN.test(teamId))) {
    return null;
  }

  if ((roleId === null) === (teamId === null)) return null;

  const reviewedBy = raw["reviewedBy"];
  if (!isText(reviewedBy, MAX_REVIEWER_LENGTH)) return null;

  return { issuer, group, roleId, teamId, reviewedBy };
}

export function mappingCells(m: MappingRow): MappingCells {
  return {
    group: clip(m.group),
    grants: m.roleId !== null ? clip(`Role: ${m.roleId}`) : clip(`Team: ${m.teamId ?? ""}`),
    issuer: clip(m.issuer),
    reviewedBy: clip(m.reviewedBy),
  };
}

export function grantOptions(roles: readonly string[], teams: readonly string[]): GrantOption[] {
  const options: GrantOption[] = [];
  for (const role of roles) {
    options.push({ value: `role:${role}`, label: clip(`Role: ${role}`) });
  }
  for (const team of teams) {
    options.push({ value: `team:${team}`, label: clip(`Team: ${team}`) });
  }
  return options;
}

export function defaultIssuer(rows: readonly MappingRow[]): string {
  return rows.length > 0 ? (rows[0]?.issuer ?? "") : "";
}

function issuerError(text: string): string | null {
  if (text.length === 0) return ISSUER_EMPTY;
  if (text.length > MAX_ISSUER_LENGTH) return ISSUER_TOO_LONG;
  if (hasControlCharacter(text)) return ISSUER_CONTROL;
  return null;
}

function groupError(text: string): string | null {
  if (text.length === 0) return GROUP_EMPTY;
  if (text.length > MAX_GROUP_LENGTH) return GROUP_TOO_LONG;
  if (hasControlCharacter(text)) return GROUP_CONTROL;
  return null;
}

export function mappingRequest(
  input: { issuer: string; group: string; grant: string },
  options: readonly GrantOption[],
): { ok: true; body: MappingBody } | { ok: false; errors: FormErrors } {
  const issuer = input.issuer.trim();
  const group = input.group.trim();
  const errors: Record<string, string> = {};

  const issuerProblem = issuerError(issuer);
  if (issuerProblem !== null) errors["issuer"] = issuerProblem;

  const groupProblem = groupError(group);
  if (groupProblem !== null) errors["group"] = groupProblem;

  const grant = options.find((option) => option.value === input.grant);
  if (grant === undefined) {
    errors["grant"] = GRANT_INVALID;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  if (grant !== undefined && grant.value.startsWith("role:")) {
    return { ok: true, body: { issuer, group, roleId: grant.value.slice("role:".length) } };
  }
  return {
    ok: true,
    body: { issuer, group, teamId: (grant?.value ?? "").slice("team:".length) },
  };
}

export async function setMapping(client: Api<"put">, body: MappingBody): Promise<MappingRow> {
  const answer = await client.put<unknown>("/idp-group-map", body);
  const mapping = parseGroupMapping(answer);
  if (mapping === null) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid group mapping");
  }
  return mapping;
}

export function mappedMessage(group: string): string {
  return `Mapped ${clip(group)}. Members get it the next time they sign in.`;
}

export function removeMappingConfirm(_m: MappingRow): ConfirmSpec {
  throw new Error("not implemented");
}

export async function removeMapping(
  _client: Api<"delete">,
  _m: Pick<MappingRow, "issuer" | "group">,
): Promise<void> {
  throw new Error("not implemented");
}

export async function loadAllItems<T>(fetchPage: FetchPage<T>): Promise<T[]> {
  const list = createCursorList(fetchPage, { pageSize: 200 });
  await list.load();

  let pages = 1;
  while (pages < 5) {
    const state = list.getState();
    if (state.status !== "loaded" || state.nextCursor === null) break;
    await list.loadMore();
    pages += 1;
  }

  const state = list.getState();
  if (state.status === "error") {
    throw state.error;
  }
  return [...state.items];
}
