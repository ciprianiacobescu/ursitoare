// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { E2eStackPart, PartHandle } from "./part.ts";

export const WEB_DIST_PATH: string = "";

export const webPart: E2eStackPart = {
  name: "web",
  start(): Promise<PartHandle> {
    throw new Error("not implemented");
  },
};
