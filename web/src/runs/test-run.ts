// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../api/client.ts";
import type { VersionRow } from "../flows/versions.ts";
import type { CapabilityState } from "../kit/capabilities.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import type { RunView } from "./types.ts";

export type TestInputs =
  | { ok: true; input: Record<string, unknown>; mocks: Record<string, unknown> }
  | { ok: false; errors: FormErrors };

export type TestPanelView =
  | { kind: "loading" }
  | { kind: "message"; reason: "unavailable" | "denied" | "no_version"; text: string }
  | { kind: "form"; number: number; hash: string };

export function testPanelView(
  _session: CapabilityState | null,
  _version: VersionRow | null,
): TestPanelView {
  throw new Error("not implemented");
}

export function parseTestInputs(_inputText: string, _mocksText: string): TestInputs {
  throw new Error("not implemented");
}

export async function startTestRun(
  _client: Pick<ApiClient, "post">,
  _request: {
    flowId: string;
    hash: string;
    input: Record<string, unknown>;
    mocks: Record<string, unknown>;
  },
  _key: string,
): Promise<RunView> {
  throw new Error("not implemented");
}

export function testRunFormErrors(_error: unknown): FormErrors {
  throw new Error("not implemented");
}
