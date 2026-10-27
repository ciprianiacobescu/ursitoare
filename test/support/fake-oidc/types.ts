// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export class FakeOidcError extends Error {
  readonly code: string;
  constructor(_code: string, message: string, _options?: { cause?: unknown }) {
    super(message);
    throw new Error("not implemented");
  }
}

export type MintFlaw =
  | "none"
  | "wrong_aud"
  | "wrong_iss"
  | "alg_none"
  | "hs256_public_key"
  | "expired"
  | "missing_nonce"
  | "wrong_nonce"
  | "two_organizations"
  | "unknown_kid"
  | "foreign_key";

export type MintOptions = Readonly<{
  user?: string;
  clientId?: string;
  kind?: "id" | "access";
  flaw?: MintFlaw;
  nonce?: string;
  scope?: string;
}>;

export type RecordedRequest = Readonly<{
  at: string;
  method: string;
  path: string;
  query: Readonly<Record<string, string>>;
  form: Readonly<Record<string, string>>;
  status: number;
}>;

export interface FakeOidc {
  readonly issuer: string;
  readonly url: string;
  clientSecret(clientId: string): string;
  passwordOf(username: string): string;
  mintToken(opts: MintOptions): string;
  rotateSigningKey(): void;
  registerRedirect(uri: string, opts?: { clientId?: string; postLogout?: boolean }): void;
  requests(): RecordedRequest[];
  close(): Promise<void>;
}
