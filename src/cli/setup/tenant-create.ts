import { ensureTenant } from "../../tenancy/index.ts";
import type { ReviewProfile } from "../../tenancy/index.ts";
import { CliError } from "../errors.ts";
import { safeText } from "../output.ts";
import type { CliCommand } from "../registry.ts";

export const tenantCreateCommand: CliCommand = {
  summary: "create a tenant with its review profile",
  options: {
    name: { type: "string", summary: "the tenant name", required: true },
    "review-profile": { type: "string", summary: "solo (default) or team" },
  },
  database: true,
  async run(call) {
    const profile = call.args["review-profile"] ?? "solo";
    if (profile !== "solo" && profile !== "team") {
      throw new CliError("CLI_USAGE", "--review-profile must be solo or team");
    }
    const name = call.args.name;
    if (typeof name !== "string" || call.owner === null) {
      throw new CliError("CLI_USAGE", "missing required option --name");
    }
    const { tenant, created } = await ensureTenant(
      call.owner.pool,
      { name, reviewProfile: profile as ReviewProfile },
      { ids: call.ids, clock: call.clock },
    );
    call.stdout.write(
      `tenant ${tenant.tenantId} "${safeText(name)}" ${created ? "created" : "unchanged"}\n`,
    );
    return 0;
  },
};
