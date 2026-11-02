// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Catalogue } from "../../../src/authoring/index.ts";
import type { LoadedVersion, ToolInvoker } from "../../../src/interpreter/index.ts";
import type { PayloadValue } from "../../../src/runs/index.ts";

export const PAY_ONCE_HASH: string = "";

export const PAY_ONCE_INPUT: { vendor: string; invoice: string; amount: number } = {
  vendor: "",
  invoice: "",
  amount: 0,
};

export const PAY_ONCE_PAY_ARGS: PayloadValue = {};

export const PAY_ONCE_PAID_OUTPUT: PayloadValue = {};

export function payOnceVersion(): LoadedVersion {
  throw new Error("not implemented");
}

export function payOnceCatalogue(_opts?: { unsafePay?: boolean }): Catalogue {
  throw new Error("not implemented");
}

export function effectLogInvoker(_file: string): ToolInvoker {
  throw new Error("not implemented");
}
