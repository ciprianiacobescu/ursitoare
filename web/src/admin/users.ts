import { ApiRequestError } from "../api/client.ts";
import { clip } from "./shared.ts";
import type { Api, ConfirmSpec } from "./shared.ts";

export interface AccountRow {
  userId: string;
  kind: "human" | "service";
  displayName: string;
  email: string | null;
  state: "active" | "disabled";
  roles: string[];
  teams: string[];
  localRoles: string[];
}

export type AccountAction =
  | { kind: "none"; note: string }
  | {
      kind: "disable" | "enable";
      buttonLabel: string;
      confirm: ConfirmSpec | null;
      done: string;
    };

export interface AccountCells {
  name: string;
  email: string;
  state: string;
  rolesTeams: string;
}

const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const ROLE_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;
const TEAM_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
const MAX_DISPLAY_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 320;
const MAX_DESCRIPTION_LENGTH = 300;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringList(value: unknown, pattern: RegExp): string[] | null {
  if (!Array.isArray(value)) return null;
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || !pattern.test(entry)) return null;
    result.push(entry);
  }
  return result;
}

export function parseAccount(raw: unknown): AccountRow | null {
  if (!isRecord(raw)) return null;

  const userId = raw["userId"];
  if (typeof userId !== "string" || !USER_ID_PATTERN.test(userId)) return null;

  const kind = raw["kind"];
  if (kind !== "human" && kind !== "service") return null;

  const displayName = raw["displayName"];
  if (typeof displayName !== "string" || displayName.length > MAX_DISPLAY_NAME_LENGTH) return null;

  const email = raw["email"];
  if (email !== null && (typeof email !== "string" || email.length > MAX_EMAIL_LENGTH)) return null;

  const state = raw["state"];
  if (state !== "active" && state !== "disabled") return null;

  const roles = stringList(raw["roles"], ROLE_PATTERN);
  if (roles === null) return null;
  const teams = stringList(raw["teams"], TEAM_PATTERN);
  if (teams === null) return null;
  const localRoles = stringList(raw["localRoles"], ROLE_PATTERN);
  if (localRoles === null) return null;

  return { userId, kind, displayName, email, state, roles, teams, localRoles };
}

function nameOf(account: AccountRow): string {
  const trimmed = account.displayName.trim();
  return trimmed.length > 0 ? trimmed : account.userId;
}

function rolesTeamsOf(account: AccountRow): string {
  const roles = account.roles.map((role) =>
    account.localRoles.includes(role) ? `${role} (direct)` : role,
  );
  const parts: string[] = [];
  if (roles.length > 0) parts.push(roles.join(", "));
  if (account.teams.length > 0) parts.push(account.teams.join(", "));
  return parts.length === 0 ? "—" : parts.join(" · ");
}

export function accountCells(account: AccountRow): AccountCells {
  return {
    name: clip(nameOf(account)),
    email: account.email === null ? "—" : clip(account.email),
    state: account.state === "active" ? "Active" : "Disabled",
    rolesTeams: clip(rolesTeamsOf(account)),
  };
}

export function accountAction(account: AccountRow, selfId: string | null): AccountAction {
  if (selfId !== null && selfId === account.userId) {
    return { kind: "none", note: "This is your account" };
  }

  const name = clip(nameOf(account));

  if (account.state === "active") {
    const description = clip(
      `${name} can no longer sign in, and open sessions stop working while the account is disabled. Enabling it again restores the sessions that have not expired.`,
      MAX_DESCRIPTION_LENGTH,
    );
    return {
      kind: "disable",
      buttonLabel: clip(`Disable ${name}`),
      confirm: {
        title: clip(`Disable ${name}?`),
        description,
        action: "Disable user",
      },
      done: clip(`Disabled ${name}.`),
    };
  }

  return {
    kind: "enable",
    buttonLabel: clip(`Enable ${name}`),
    confirm: null,
    done: clip(`Enabled ${name}.`),
  };
}

export async function patchAccountState(
  client: Api<"patch">,
  userId: string,
  state: AccountRow["state"],
): Promise<AccountRow> {
  if (!USER_ID_PATTERN.test(userId)) {
    throw new RangeError("userId must match ^[A-Za-z0-9_-]{1,64}$");
  }
  const answer = await client.patch<unknown>(`/users/${encodeURIComponent(userId)}`, { state });
  const account = parseAccount(answer);
  if (account === null) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid account");
  }
  return account;
}
