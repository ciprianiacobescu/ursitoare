import type pg from "pg";

import { appendAudit, appendAuditCommitted } from "../../audit/index.ts";
import { ConfigError, type AppConfig, type Env } from "../../config/index.ts";
import type { Clock, IdSource } from "../../core/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import { CliError } from "../errors.ts";
import { safeJson } from "../output.ts";
import type { CliCall, CliCommand, CliOption } from "../registry.ts";
import { resolveCliTenant } from "../tenant.ts";

export interface AdminCall {
  tx: TenantTx;
  pool: pg.Pool;
  tenant: TenantContext;
  operator: string;
  args: CliCall["args"];
  env: Env;
  config: AppConfig;
  clock: Clock;
  ids: IdSource;
}

export interface AdminResult {
  lines: string[];
  data: Record<string, unknown>;
  audit: Record<string, string | number | boolean | null>;
  exitCode?: number;
}

export interface AdminSpec {
  summary: string;
  details?: string;
  options: Readonly<Record<string, CliOption>>;
  run(call: AdminCall): Promise<AdminResult>;
}

const RESERVED_OPTIONS = ["tenant", "operator", "json"] as const;
const OPERATOR_PATTERN = /^[A-Za-z0-9._@-]{1,64}$/;
const KNOWN_CODE = /^(CLI|RBAC|IDENTITY|AUDIT|TENANT)_[A-Z0-9_]+$/;

const ADMIN_OPTIONS: Readonly<Record<string, CliOption>> = {
  tenant: { type: "string", summary: "tenant to run the command in" },
  operator: { type: "string", summary: "operator recorded in the audit event" },
  json: { type: "boolean", summary: "print the result as JSON" },
};

interface DescribedError {
  code: string;
  message: string;
  refused: boolean;
}

function describeError(error: unknown): DescribedError {
  if (error instanceof ConfigError) {
    return { code: "CLI_CONFIG_INVALID", message: error.message, refused: true };
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && KNOWN_CODE.test(code)) {
      return {
        code,
        message: error instanceof Error ? error.message : "command failed",
        refused: true,
      };
    }
  }
  return { code: "CLI_INTERNAL", message: "command failed", refused: false };
}

function resolveOperator(args: CliCall["args"], env: Env): string {
  const requested = args.operator;
  if (typeof requested === "string") {
    if (!OPERATOR_PATTERN.test(requested)) {
      throw new CliError("CLI_USAGE", "--operator is not a valid operator name");
    }
    return requested;
  }
  const user = env.USER;
  if (user !== undefined && OPERATOR_PATTERN.test(user)) {
    return user;
  }
  return "cli";
}

function commandEvent(
  name: string,
  operator: string,
  tenantId: string,
  payload: Record<string, unknown>,
): Parameters<typeof appendAudit>[2] {
  return {
    eventType: "cli.command_run",
    actor: { kind: "system", id: `operator:${operator}` },
    target: { kind: "tenant", id: tenantId },
    payload,
  };
}

export function defineAdminCommand(name: string, spec: AdminSpec): CliCommand {
  for (const reserved of RESERVED_OPTIONS) {
    if (Object.hasOwn(spec.options, reserved)) {
      throw new CliError("CLI_INVALID_COMMAND", "invalid command name or options");
    }
  }

  const options: Record<string, CliOption> = { ...spec.options, ...ADMIN_OPTIONS };

  return {
    summary: spec.summary,
    ...(spec.details === undefined ? {} : { details: spec.details }),
    options,
    database: true,
    async run(call: CliCall): Promise<number> {
      const operator = resolveOperator(call.args, call.env);
      const requested = typeof call.args.tenant === "string" ? call.args.tenant : undefined;
      const owner = call.owner;
      if (owner === null) {
        throw new CliError(
          "CLI_OWNER_REQUIRED",
          "set URSITOARE_DATABASE_OWNER_URL and URSITOARE_DATABASE_OWNER_PASSWORD_FILE for this command",
        );
      }
      const tenant = await resolveCliTenant(owner.pool, requested);

      let result: AdminResult;
      try {
        result = await withTenantTx(owner.pool, tenant, async (tx) => {
          const adminResult = await spec.run({
            tx,
            pool: owner.pool,
            tenant,
            operator,
            args: call.args,
            env: call.env,
            config: owner.config,
            clock: call.clock,
            ids: call.ids,
          });
          await appendAudit(
            tx,
            tenant,
            commandEvent(name, operator, tenant.tenantId, {
              command: name,
              outcome: "ok",
              ...adminResult.audit,
            }),
            { clock: call.clock },
          );
          return adminResult;
        });
      } catch (error) {
        const described = describeError(error);
        try {
          await appendAuditCommitted(
            owner.pool,
            tenant,
            commandEvent(name, operator, tenant.tenantId, {
              command: name,
              outcome: described.refused ? "refused" : "failed",
              code: described.code,
            }),
            { clock: call.clock },
          );
        } catch {
          call.stderr.write(`${described.code}: ${described.message}\n`);
          call.stderr.write("CLI_AUDIT_FAILED: audit event could not be written\n");
          return 1;
        }
        throw error;
      }

      if (call.args.json === true) {
        call.stdout.write(`${safeJson(result.data)}\n`);
      } else {
        call.stdout.write(`${result.lines.join("\n")}\n`);
      }
      return result.exitCode ?? 0;
    },
  };
}
