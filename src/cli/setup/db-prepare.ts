import { prepareDatabase } from "../../db/index.ts";
import { prepareDurable } from "../../durable/index.ts";
import { CliError } from "../errors.ts";
import type { CliCommand } from "../registry.ts";
import { prepareFailure } from "./errors.ts";

export const dbPrepareCommand: CliCommand = {
  summary: "apply the schema migrations and the durable-execution schema",
  options: {},
  database: true,
  async run(call) {
    const endpoint = call.owner?.config.database.owner ?? null;
    if (call.owner === null || endpoint === null) {
      throw new CliError("CLI_OWNER_REQUIRED", "the owner database is required");
    }
    try {
      const { applied, partitions } = await prepareDatabase(call.owner.pool, call.clock);
      const url = new URL(endpoint.url);
      if (endpoint.password !== null) {
        url.password = endpoint.password.reveal();
      }
      await prepareDurable(url.toString());
      call.stdout.write(
        `migrations: ${applied.length} applied; partitions: ${partitions.length}; dbos: ready\n`,
      );
      return 0;
    } catch (error) {
      throw prepareFailure(error) ?? error;
    }
  },
};
