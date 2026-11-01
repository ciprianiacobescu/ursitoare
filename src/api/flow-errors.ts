import { FlowError } from "../registry/index.ts";
import { ERROR_CODES } from "./error-codes.ts";
import { ApiError } from "./errors.ts";

interface Mapping {
  readonly code: string;
  readonly reason?: string;
}

const MAPPING: Readonly<Record<string, Mapping>> = {
  FLOW_INVALID: { code: "VALIDATION_FAILED" },
  FLOW_NOT_FOUND: { code: "NOT_FOUND" },
  FLOW_EXISTS: { code: "ALREADY_EXISTS" },
  FLOW_UNKNOWN_TEAM: { code: "OPERATION_REFUSED", reason: "unknown_team" },
  FLOW_TEXT_INVALID: { code: "FLOW_TEXT_INVALID" },
};

export function flowApiError(error: unknown): unknown {
  if (!(error instanceof FlowError)) return error;

  const mapping = MAPPING[error.code];
  if (mapping === undefined) return error;

  const entry = ERROR_CODES[mapping.code];
  if (entry === undefined) return error;

  let details: unknown;
  if (mapping.reason !== undefined) details = { reason: mapping.reason };
  else if (error.code === "FLOW_TEXT_INVALID" && error.details !== null) details = error.details;
  return new ApiError(entry.status, mapping.code, entry.message, details);
}
