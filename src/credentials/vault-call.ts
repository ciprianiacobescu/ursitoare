import { GatewayError, mintkeyTenantId } from "../gateway/index.ts";
import type { PutCredentialInput, VaultWriter } from "../gateway/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { CredentialsError } from "./types.ts";

const REASONS: Readonly<Record<string, string>> = {
  GATEWAY_TOKEN_REFUSED: "token_refused",
  GATEWAY_INVALID: "vault_refused",
  GATEWAY_UNAVAILABLE: "unavailable",
};

export async function putVerified(
  deps: { vault: VaultWriter },
  ctx: TenantContext,
  input: Omit<PutCredentialInput, "tenantId">,
): Promise<{ keyVersion: number }> {
  try {
    return await deps.vault.putCredential({ ...input, tenantId: mintkeyTenantId(ctx.tenantId) });
  } catch (error) {
    const reason = error instanceof GatewayError ? REASONS[error.code] : undefined;
    if (reason === undefined) throw error;
    throw new CredentialsError("CREDENTIALS_VAULT", "the vault refused or is unavailable", { reason });
  }
}
