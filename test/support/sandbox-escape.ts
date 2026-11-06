// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type {
  SandboxFaultCode,
  SandboxJson,
  SandboxLimits,
  SandboxResult,
} from "../../src/sandbox/index.ts";

export type EscapeExpect =
  | { ok: true; value?: SandboxJson }
  | { fault: SandboxFaultCode | readonly SandboxFaultCode[] };

export interface EscapeCase {
  id: string;
  title: string;
  source: string;
  input: SandboxJson;
  limits?: Partial<SandboxLimits>;
  expect: EscapeExpect;
  hookExpect?: EscapeExpect;
}

export const ESCAPE_CASES: readonly EscapeCase[] = [];

export function checkEscapeCase(
  _c: EscapeCase,
  _result: SandboxResult,
  _mode: "node" | "hook",
): string | null {
  throw new Error("not implemented");
}
