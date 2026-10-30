// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

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

export function parseAccount(_raw: unknown): AccountRow | null {
  throw new Error("not implemented");
}

export function accountCells(_account: AccountRow): AccountCells {
  throw new Error("not implemented");
}

export function accountAction(_account: AccountRow, _selfId: string | null): AccountAction {
  throw new Error("not implemented");
}

export async function patchAccountState(
  _client: Api<"patch">,
  _userId: string,
  _state: AccountRow["state"],
): Promise<AccountRow> {
  throw new Error("not implemented");
}
