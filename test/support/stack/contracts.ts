// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { EgressContractTarget } from "../fake-egress/contract.ts";
import type { OidcContractCredentials } from "../fake-oidc/index.ts";
import type { Env, MainIo } from "./conformance.ts";
import type { OverlayUser } from "./project.ts";

export interface StackContractTarget {
  oidc: { baseUrl: string; credentials: OidcContractCredentials };
  egress: EgressContractTarget;
}

export function stackContractTarget(
  _dir: string,
  _users: Readonly<Record<string, OverlayUser>>,
): StackContractTarget {
  throw new Error("not implemented");
}

export interface ContractRow {
  suite: "oidc" | "egress" | "extra";
  name: string;
  ok: boolean;
  detail: string;
}

export interface ExtraCheckDeps {
  keycloakBackchannel: string;
  callerSecrets: Readonly<Record<"e2e-mcp-caller" | "e2e-plain-caller", string>>;
}

export const STACK_EXTRA_CHECKS: readonly string[] = [];

export const STACK_CONTRACT_REPORT: string = "";

export const EXIT_ROWS: Readonly<
  Record<12 | 19, readonly { suite: "egress" | "extra"; names: readonly string[] }[]>
> = { 12: [], 19: [] };

export function redactDetail(_text: string, _secrets: readonly string[]): string {
  throw new Error("not implemented");
}

export async function runStackContracts(
  _target: StackContractTarget,
  _extra: ExtraCheckDeps,
  _opts?: { flood?: boolean; checkTimeoutMs?: number },
): Promise<ContractRow[]> {
  throw new Error("not implemented");
}

export async function floodCheck(
  _vaultUrl: string,
  _who: { identity: string; token: string },
  _opts?: { calls?: number; concurrency?: number; healthWaitMs?: number },
): Promise<{ ok: boolean; detail: string }> {
  throw new Error("not implemented");
}

export function contractProblems(
  _rows: readonly ContractRow[],
  _wants: readonly { suite: ContractRow["suite"]; names?: readonly string[] }[],
): string[] {
  throw new Error("not implemented");
}

export function summaryLines(_rows: readonly ContractRow[]): string[] {
  throw new Error("not implemented");
}

export async function contractsMain(
  _argv: readonly string[],
  _io: MainIo,
  _opts?: { env?: Env; runChecks?: typeof runStackContracts; flood?: typeof floodCheck },
): Promise<number> {
  throw new Error("not implemented");
}
