// Format error types shared by the parser and the canonical functions (design Decisions 1 and 4).

export type FormatErrorCode =
  | "FORMAT_TOO_LARGE"
  | "FORMAT_TOO_DEEP"
  | "FORMAT_ALIAS_LIMIT"
  | "FORMAT_YAML_SYNTAX"
  | "FORMAT_JSON_SYNTAX"
  | "FORMAT_DUPLICATE_KEY"
  | "FORMAT_UNSUPPORTED_TAG"
  | "FORMAT_NOT_JSON";

export const FORMAT_ERROR_CODES: readonly FormatErrorCode[] = [
  "FORMAT_TOO_LARGE",
  "FORMAT_TOO_DEEP",
  "FORMAT_ALIAS_LIMIT",
  "FORMAT_YAML_SYNTAX",
  "FORMAT_JSON_SYNTAX",
  "FORMAT_DUPLICATE_KEY",
  "FORMAT_UNSUPPORTED_TAG",
  "FORMAT_NOT_JSON",
];

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

  constructor(code: FormatErrorCode, message: string, path?: string) {
    super(message);
    this.name = "FormatError";
    this.code = code;
    this.path = path ?? null;
  }
}
