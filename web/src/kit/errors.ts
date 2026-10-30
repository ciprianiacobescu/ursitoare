export type KitErrorCode =
  | "KIT_PROP_INVALID"
  | "KIT_CONFIRM_LABEL_GENERIC"
  | "KIT_MESSAGE_INVALID"
  | "KIT_MESSAGE_DUPLICATE"
  | "KIT_TOAST_INVALID"
  | "KIT_TOKEN_INVALID";

export class KitError extends Error {
  readonly code: KitErrorCode;
  constructor(code: KitErrorCode, message: string) {
    super(message);
    this.name = "KitError";
    this.code = code;
  }
}
