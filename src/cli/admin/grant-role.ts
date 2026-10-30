// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { CliCall, CliCommand } from "../registry.ts";

export const grantRoleCommand: CliCommand = {
  summary: "",
  options: {},
  database: false,
  async run(_call: CliCall): Promise<number> {
    throw new Error("not implemented");
  },
};
