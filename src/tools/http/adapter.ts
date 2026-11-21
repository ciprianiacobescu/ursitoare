// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { CallAdapter, HttpCallSpec } from "../calls.ts";

export const httpCallAdapter: CallAdapter<HttpCallSpec> = {
  build() {
    throw new Error("not implemented");
  },
  answer() {
    throw new Error("not implemented");
  },
};

export const HTTP_EMPTY_OUTPUT: Readonly<{ type: "object"; additionalProperties: false }> = {} as unknown as Readonly<{
  type: "object";
  additionalProperties: false;
}>;
