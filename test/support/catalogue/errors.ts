// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type CatalogueDataErrorCode =
  | "CATALOGUE_READ"
  | "CATALOGUE_INVALID"
  | "CATALOGUE_UNKNOWN_FLOW"
  | "CATALOGUE_FLOW_PARSE";

export class CatalogueDataError extends Error {
  readonly code: CatalogueDataErrorCode;

  constructor(code: CatalogueDataErrorCode, message: string) {
    super(message);
    this.name = "CatalogueDataError";
    this.code = code;
  }
}
