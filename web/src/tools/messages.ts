import { registerAdminMessages } from "../admin/messages.ts";
import { ApiRequestError } from "../api/client.ts";
import { errorPanelModel } from "../kit/error-panel.ts";

const REASON_MESSAGES: Readonly<Record<string, string>> = {
  nothing_pending: "Nothing to approve.",
  digest_mismatch:
    "The surface changed while you were reading it. Reload the page and review it again.",
  approver_is_submitter: "Another admin must approve this surface.",
  self_approval_required:
    'You submitted this surface. Tick "I approve my own surface" to approve it.',
  role_unknown: "That role does not exist.",
  user_unknown: "That user does not exist.",
  tool_unknown: "That tool is not in the registry.",
  flow_unknown: "That flow does not exist.",
  version_not_validated: "That flow has no validated version yet.",
  node_unknown: "That flow has no such step.",
  not_node_scoped: "Only a grant for one step can be confirmed.",
  revoked: "That grant is revoked.",
  policy_invalid: "The policy is not valid.",
};

export function registerToolMessages(): void {
  registerAdminMessages();
}

function refusalReason(error: unknown): string | null {
  if (!(error instanceof ApiRequestError)) return null;
  if (error.status !== 422 || error.code !== "OPERATION_REFUSED") return null;
  const details = error.details;
  if (typeof details !== "object" || details === null || !("reason" in details)) return null;
  const reason: unknown = (details as { reason?: unknown }).reason;
  return typeof reason === "string" ? reason : null;
}

export function toolsErrorMessage(error: unknown): string {
  const model = errorPanelModel(error);
  const reason = refusalReason(error);
  let message = model.message;
  if (reason !== null && Object.hasOwn(REASON_MESSAGES, reason)) {
    message = REASON_MESSAGES[reason] ?? message;
  }
  if (model.decisionId !== null) {
    message = `${message} Decision id: ${model.decisionId}`;
  }
  return message;
}
