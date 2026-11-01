// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type { RegistryErrorCode } from "./errors.ts";
export { RegistryError } from "./errors.ts";
export type { BlockBinding, BlockImport, NormalizedBlock } from "./block-input.ts";
export { normalizeBlockImport, blockContentHash } from "./block-input.ts";
export type { BlockVersion, ImportReport } from "./block-store.ts";
export { importCatalogue, getBlockVersion, listBlockVersions } from "./block-store.ts";
export type { RegistryCatalogue } from "./catalogue.ts";
export { registryCatalogue, loadRegistryCatalogue } from "./catalogue.ts";
