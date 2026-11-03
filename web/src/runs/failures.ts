// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ErrorPanelModel } from "../kit/error-panel.ts";
import type { RunSnapshot } from "./polling.ts";

export interface FailureView {
  model: ErrorPanelModel;
  retryLabel: "Try again";
}

export function failureView(_error: unknown): FailureView {
  throw new Error("not implemented");
}

export function runPageView(
  _snapshot: RunSnapshot | null,
  _error: unknown,
): { loading: boolean; polling: boolean; snapshot: RunSnapshot | null; failure: FailureView | null } {
  throw new Error("not implemented");
}
