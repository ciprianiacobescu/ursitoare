import { ApiRequestError } from "../api/client.ts";
import type { StringMap } from "../kit/contrast.ts";
import { errorPanelModel } from "../kit/error-panel.ts";
import { registerMessages } from "../kit/messages.ts";

export const ADMIN_MESSAGES: StringMap = {
  ALREADY_EXISTS: "That name is already taken. Choose another.",
  IN_USE: "This team is still the target of a group mapping. Remove that mapping first.",
  ELEVATION_REFUSED: "You cannot manage a role you do not hold, or your own access.",
  UNKNOWN_ISSUER:
    "That issuer is not set up for this tenant. Check the issuer URL your identity provider uses.",
  OPERATION_REFUSED: "The engine refused this operation.",
  ENGINE_KEY_REQUIRED: "Paging is unavailable because the engine key is not configured.",
};

const OPERATION_REFUSED_REASONS: Readonly<Record<string, string>> = {
  self_disable: "You cannot disable your own account.",
  wrong_kind: "That account is not a person's account.",
  owner_invalid: "The owner must be an active person.",
};

export function registerAdminMessages(): void {
  registerMessages(ADMIN_MESSAGES);
}

function refusalReason(error: unknown): string | null {
  if (!(error instanceof ApiRequestError)) return null;
  if (error.status !== 422 || error.code !== "OPERATION_REFUSED") return null;
  const details = error.details;
  if (typeof details !== "object" || details === null || !("reason" in details)) return null;
  const reason: unknown = (details as { reason?: unknown }).reason;
  return typeof reason === "string" ? reason : null;
}

export function adminErrorMessage(error: unknown): string {
  const model = errorPanelModel(error);
  const reason = refusalReason(error);
  let message = model.message;
  if (reason !== null) {
    message = OPERATION_REFUSED_REASONS[reason] ?? message;
  }
  if (model.decisionId !== null) {
    message = `${message} Decision id: ${model.decisionId}`;
  }
  return message;
}
