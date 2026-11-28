import { readFileSync } from "node:fs";

import { readSecretValue } from "../../config/index.ts";
import { TenancyError, bindSinkTokens } from "../../tenancy/index.ts";
import { CliError } from "../errors.ts";
import type { CliCommand } from "../registry.ts";
import { requireEnv } from "./errors.ts";
import { resolveSetupTenant } from "./tenant-option.ts";

const BROKER_VARIABLE = "URSITOARE_AUDIT_SINK_BROKER_TOKEN_FILE";
const PROXY_VARIABLE = "URSITOARE_AUDIT_SINK_PROXY_TOKEN_FILE";

const readFile = (path: string): string => readFileSync(path, "utf8");

export const tenantSinkCommand: CliCommand = {
  summary: "bind the audit sink tokens to a tenant",
  options: {
    tenant: { type: "string", summary: "the tenant id" },
    "tenant-name": { type: "string", summary: "the tenant name" },
  },
  database: true,
  async run(call) {
    if (call.owner === null) {
      throw new CliError("CLI_OWNER_REQUIRED", "owner connection required");
    }
    const broker = readSecretValue(BROKER_VARIABLE, requireEnv(call.env, BROKER_VARIABLE), readFile).reveal();
    const proxy = readSecretValue(PROXY_VARIABLE, requireEnv(call.env, PROXY_VARIABLE), readFile).reveal();
    if (broker === proxy) {
      throw new CliError("CLI_SINK_TOKENS_EQUAL", "the two sink tokens must differ");
    }
    const tenant = await resolveSetupTenant(call.owner.pool, call.args);
    let result;
    try {
      result = await bindSinkTokens(call.owner.pool, tenant, { broker, proxy });
    } catch (error) {
      if (error instanceof TenancyError && error.code === "TENANT_ROUTE_CONFLICT") {
        throw new CliError("CLI_SINK_TAKEN", "a sink token is already bound to another tenant");
      }
      throw error;
    }
    call.stdout.write(
      `sink tokens: broker ${result.broker}, proxy ${result.proxy} → ${tenant.tenantId}\n`,
    );
    return 0;
  },
};
