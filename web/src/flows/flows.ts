// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api, Check } from "../admin/shared.ts";
import type { FetchPage } from "../kit/data/cursor-list.ts";
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

export function parseFlow(_raw: unknown): FlowRow | null {
  throw new Error("not implemented");
}

export function flowCells(_row: FlowRow): FlowCells {
  throw new Error("not implemented");
}

export function checkFlowName(_text: string): Check<string> {
  throw new Error("not implemented");
}

export function checkOwnerTeam(_text: string): Check<string> {
  throw new Error("not implemented");
}

export async function postFlow(
  _client: Api<"post">,
  _input: { name: string; ownerTeam: string },
  _key: string,
): Promise<FlowRow> {
  throw new Error("not implemented");
}

export function flowListFetcher(_client: Api<"get">): FetchPage<FlowRow> {
  throw new Error("not implemented");
}

export async function loadFlow(
  _client: Api<"get">,
  _flowId: string,
  _signal?: AbortSignal,
): Promise<FlowRow> {
  throw new Error("not implemented");
}
