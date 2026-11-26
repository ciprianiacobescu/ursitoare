// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { CliCommand } from "../registry.ts";

export const dbRolesCommand: CliCommand = {
  summary: "",
  options: {},
  database: false,
  run: () => Promise.reject(new Error("not implemented")),
};
