// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type FormatErrorCode =
  | "FORMAT_TOO_LARGE"
  | "FORMAT_TOO_DEEP"
  | "FORMAT_ALIAS_LIMIT"
  | "FORMAT_YAML_SYNTAX"
  | "FORMAT_JSON_SYNTAX"
  | "FORMAT_DUPLICATE_KEY"
  | "FORMAT_UNSUPPORTED_TAG"
  | "FORMAT_NOT_JSON";

export const FORMAT_ERROR_CODES: readonly FormatErrorCode[] = [];

export interface ParseError {
  code: FormatErrorCode;
  message: string;
  line?: number;
  column?: number;
  path?: string;
}

export class FormatError extends Error {
  readonly code: FormatErrorCode;
  readonly path: string | null;

  constructor(_code: FormatErrorCode, message: string, _path?: string) {
    super(message);
    throw new Error("not implemented");
  }
}
