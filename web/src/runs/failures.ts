import { ApiRequestError } from "../api/client.ts";
import { errorPanelModel } from "../kit/error-panel.ts";
import type { ErrorPanelModel } from "../kit/error-panel.ts";
import type { RunSnapshot } from "./polling.ts";

export interface FailureView {
  model: ErrorPanelModel;
  retryLabel: "Try again";
}

export function failureView(error: unknown): FailureView {
  const shown =
    error instanceof RangeError ? new ApiRequestError(404, "NOT_FOUND", "Not found") : error;
  return { model: errorPanelModel(shown), retryLabel: "Try again" };
}

export function runPageView(
  snapshot: RunSnapshot | null,
  error: unknown,
): { loading: boolean; polling: boolean; snapshot: RunSnapshot | null; failure: FailureView | null } {
  if (error !== undefined) {
    return { loading: false, polling: false, snapshot, failure: failureView(error) };
  }
  const state = snapshot?.run.state;
  const terminal = state === "completed" || state === "failed" || state === "cancelled";
  return { loading: snapshot === null, polling: !terminal, snapshot, failure: null };
}
