export type {
  CredentialDeps,
  CredentialRecord,
  CredentialsErrorCode,
  ServiceResolver,
  ServiceTarget,
} from "./types.ts";
export { CredentialsError } from "./types.ts";
export { provisionCredential, provisionCredentialTx } from "./provision.ts";
export { rotateCredential } from "./rotate.ts";
export { listCredentials } from "./store.ts";
export { createServiceResolver, seedServiceId } from "./resolver.ts";
