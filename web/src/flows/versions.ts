// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";
import type { FetchPage } from "../kit/data/cursor-list.ts";
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

export function parseVersion(_raw: unknown): VersionRow | null {
  throw new Error("not implemented");
}

export function parseVersionDetail(_raw: unknown): VersionDetailRow | null {
  throw new Error("not implemented");
}

export function versionListFetcher(_client: Api<"get">, _flowId: string): FetchPage<VersionRow> {
  throw new Error("not implemented");
}

export async function loadVersion(
  _client: Api<"get">,
  _flowId: string,
  _hash: string,
  _signal?: AbortSignal,
): Promise<VersionDetailRow> {
  throw new Error("not implemented");
}

export async function saveVersion(
  _client: Api<"post">,
  _input: { flowId: string; text: string },
  _key: string,
): Promise<SaveResult> {
  throw new Error("not implemented");
}

export async function validateVersion(
  _client: Api<"post">,
  _flowId: string,
  _hash: string,
): Promise<ValidateResult> {
  throw new Error("not implemented");
}

export function detectFormat(_text: string): FlowFormat {
  throw new Error("not implemented");
}

export function starterText(_flowId: string): string {
  throw new Error("not implemented");
}
