// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api, Check, ConfirmSpec } from "./shared.ts";

export function parseNamed(_raw: unknown, _key: "roleId" | "teamId"): string | null {
  throw new Error("not implemented");
}

export function checkTeamId(_text: string): Check<string> {
  throw new Error("not implemented");
}

export function deleteTeamConfirm(_teamId: string): ConfirmSpec {
  throw new Error("not implemented");
}

export async function postTeam(_client: Api<"post">, _teamId: string, _key: string): Promise<string> {
  throw new Error("not implemented");
}

export async function removeTeamById(_client: Api<"delete">, _teamId: string): Promise<void> {
  throw new Error("not implemented");
}
