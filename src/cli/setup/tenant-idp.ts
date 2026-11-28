import { provisionTenantIdp } from "../../identity/index.ts";
import { CliError } from "../errors.ts";
import { safeText } from "../output.ts";
import type { CliCommand } from "../registry.ts";
import { resolveSetupTenant } from "./tenant-option.ts";

export const tenantIdpCommand: CliCommand = {
  summary: "register a tenant's identity provider",
  options: {
    tenant: { type: "string", summary: "the tenant id" },
    "tenant-name": { type: "string", summary: "the tenant name" },
    issuer: { type: "string", summary: "identity provider issuer", required: true },
    organization: { type: "string", summary: "organization alias", required: true },
  },
  database: true,
  async run(call) {
    const issuer = call.args.issuer;
    const organization = call.args.organization;
    if (call.owner === null || typeof issuer !== "string" || typeof organization !== "string") {
      throw new CliError("CLI_USAGE", "missing required option --issuer");
    }
    const tenant = await resolveSetupTenant(call.owner.pool, call.args);
    await provisionTenantIdp(
      call.owner.pool,
      tenant,
      { issuer, organization },
      { clock: call.clock },
    );
    call.stdout.write(
      `idp ${safeText(issuer)} ${safeText(organization)} → ${tenant.tenantId}\n`,
    );
    return 0;
  },
};
