// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { CliCommand } from "../registry.ts";

export const dbPrepareCommand: CliCommand = {
  summary: "",
  options: {},
  database: true,
  run: () => Promise.reject(new Error("not implemented")),
};
