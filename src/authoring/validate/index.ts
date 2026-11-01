// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type { Layer, Issue, ValidationResult } from "./types.ts";
export { FLOW_ERROR_CODES, FLOW_WARNING_CODES, FLOW_RESERVED_CODES } from "./codes.ts";
export { jsonSchemaProblem } from "./jsonschema.ts";
export { validateFlow, validateFlowText } from "./validate.ts";
export type { DiagnosticInfo } from "./diagnostics.ts";
export {
  DIAGNOSTICS_DOC_PATH,
  diagnosticAnchor,
  diagnosticLink,
  DIAGNOSTICS,
  renderDiagnosticsDoc,
} from "./diagnostics.ts";
export { catalogueFromJson, CatalogueFileError } from "./catalogue-file.ts";
