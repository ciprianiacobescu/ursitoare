import { ApiRequestError } from "../api/client.ts";
import { errorPanelModel } from "../kit/error-panel.ts";

export function flowErrorMessage(error: unknown): string {
  if (error instanceof RangeError) return error.message;
  if (error instanceof ApiRequestError) {
    if (error.code === "ALREADY_EXISTS") {
      return "A flow with this name already exists. Choose another name.";
    }
    if (error.code === "FLOW_TEXT_INVALID") {
      return "The text is not a flow document. See the diagnostics.";
    }
  }
  const model = errorPanelModel(error);
  if (model.decisionId !== null) return `${model.message} Decision id: ${model.decisionId}`;
  return model.message;
}
