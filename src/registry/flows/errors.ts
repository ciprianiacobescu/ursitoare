// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FormatErrorCode } from "../../authoring/index.ts";

export type FlowErrorCode =
  | "FLOW_INVALID"
  | "FLOW_NOT_FOUND"
  | "FLOW_EXISTS"
  | "FLOW_UNKNOWN_TEAM"
  | "FLOW_TEXT_INVALID"
  | "FLOW_TENANT_MISMATCH";

export interface FlowTextDetails {
  reason: "parse" | "not_object" | "name_mismatch";
  code?: FormatErrorCode;
  message?: string;
  line?: number;
  column?: number;
}

export class FlowError extends Error {
  readonly code: FlowErrorCode;
  readonly details: FlowTextDetails | null;

  constructor(_code: FlowErrorCode, message: string, _details?: FlowTextDetails) {
    super(message);
    throw new Error("not implemented");
  }
}
