import { KitError } from "./errors.ts";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  action: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface ConfirmDialogModel {
  title: string;
  description: string | null;
  confirmLabel: string;
  cancelLabel: "Cancel";
  initialFocus: "confirm" | "cancel";
}

const GENERIC_ACTIONS: ReadonlySet<string> = new Set([
  "ok",
  "yes",
  "no",
  "confirm",
  "submit",
  "continue",
  "proceed",
  "done",
  "accept",
  "agree",
]);

function normaliseAction(action: string): string {
  return action.trim().replace(/[.…]+$/u, "").trim().toLowerCase();
}

export function confirmDialogModel(
  props: Pick<ConfirmDialogProps, "title" | "description" | "action" | "destructive">,
): ConfirmDialogModel {
  const title = typeof props.title === "string" ? props.title.trim() : "";
  if (title.length < 1 || title.length > 120) {
    throw new KitError("KIT_PROP_INVALID", "The title must be 1 to 120 characters.");
  }

  let description: string | null = null;
  if (props.description !== undefined) {
    const trimmed = typeof props.description === "string" ? props.description.trim() : "";
    if (trimmed.length > 300) {
      throw new KitError("KIT_PROP_INVALID", "The description must be at most 300 characters.");
    }
    description = trimmed.length > 0 ? trimmed : null;
  }

  const confirmLabel = typeof props.action === "string" ? props.action.trim() : "";
  if (confirmLabel.length < 1 || confirmLabel.length > 40) {
    throw new KitError("KIT_PROP_INVALID", "The action must be 1 to 40 characters.");
  }

  const normalised = normaliseAction(confirmLabel);
  if (GENERIC_ACTIONS.has(normalised)) {
    throw new KitError(
      "KIT_CONFIRM_LABEL_GENERIC",
      "The action must name the action it performs.",
    );
  }
  if (normalised === "cancel") {
    throw new KitError("KIT_PROP_INVALID", "The action cannot be Cancel.");
  }

  return {
    title,
    description,
    confirmLabel,
    cancelLabel: "Cancel",
    initialFocus: props.destructive === true ? "cancel" : "confirm",
  };
}

export function dialogOutcome(returnValue: string): "confirmed" | "cancelled" {
  return returnValue === "confirm" ? "confirmed" : "cancelled";
}
