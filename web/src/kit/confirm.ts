// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

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

export function confirmDialogModel(
  _props: Pick<ConfirmDialogProps, "title" | "description" | "action" | "destructive">,
): ConfirmDialogModel {
  throw new Error("not implemented");
}

export function dialogOutcome(_returnValue: string): "confirmed" | "cancelled" {
  throw new Error("not implemented");
}
