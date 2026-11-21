// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Effect } from "../types.ts";

export interface OpenApiOverlayEntry {
  effect: Effect;
  name?: string;
  description?: string;
  untrusted_result?: boolean;
  unsafe_to_retry?: boolean;
  data_class?: "public" | "private";
}

export interface OpenApiOverlay {
  operations: Readonly<Record<string, OpenApiOverlayEntry>>;
}

export type OpenApiExclusion =
  | "no_operation_id"
  | "method_unsupported"
  | "param_location"
  | "param_schema"
  | "param_collision"
  | "path_template"
  | "body_media_type"
  | "body_not_object"
  | "response_not_object"
  | "ref_remote"
  | "ref_cycle"
  | "schema_invalid"
  | "reserved_name";

export interface OpenApiOperation {
  operationId: string | null;
  method: string;
  path: string;
  name: string | null;
  excluded: OpenApiExclusion | null;
}

export interface OpenApiPreview {
  version: "3.0" | "3.1";
  basePath: string;
  operations: OpenApiOperation[];
}
