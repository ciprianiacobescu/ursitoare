import { errorPanelModel } from "../kit/error-panel.ts";
import { registerMessages } from "../kit/messages.ts";
import type { StringMap } from "../kit/contrast.ts";

export const RUN_MESSAGES: StringMap = {
  RUNS_UNAVAILABLE: "Runs are unavailable right now. Try again in a moment.",
  TEST_MOCK_MISSING: "A block node has no mock. Add a list of mocks for every block node.",
  TEST_MOCK_INVALID: "A mock does not fit its node. Check the mocks against the block's output.",
};

export function registerRunMessages(): void {
  registerMessages(RUN_MESSAGES);
}

export function runErrorMessage(error: unknown): string {
  if (error instanceof RangeError) return error.message;
  const model = errorPanelModel(error);
  if (model.decisionId !== null) {
    return `${model.message} Decision id: ${model.decisionId}`;
  }
  return model.message;
}
