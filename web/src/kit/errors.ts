// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type KitErrorCode =
  | "KIT_PROP_INVALID"
  | "KIT_CONFIRM_LABEL_GENERIC"
  | "KIT_MESSAGE_INVALID"
  | "KIT_MESSAGE_DUPLICATE"
  | "KIT_TOAST_INVALID"
  | "KIT_TOKEN_INVALID";

export class KitError extends Error {
  readonly code: KitErrorCode;
  constructor(_code: KitErrorCode, message: string) {
    super(message);
    throw new Error("not implemented");
  }
}
