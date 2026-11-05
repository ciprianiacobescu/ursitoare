import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { Catalogue } from "../../../src/authoring/index.ts";
import type {
  LoadedVersion,
  StepContext,
  ToolCall,
  ToolInvoker,
  ToolResult,
} from "../../../src/interpreter/index.ts";
import type { PayloadValue } from "../../../src/runs/index.ts";
import { parseCatalogueFlow } from "../catalogue/flows.ts";
import { loadTestCatalogue } from "../catalogue/loader.ts";
import { appendEffect } from "./effects.ts";

export const PAY_ONCE_HASH: string = `sha256:${"a".repeat(64)}`;

export const PAY_ONCE_INPUT: { vendor: string; invoice: string; amount: number } = {
  vendor: "Acme",
  invoice: "inv-1",
  amount: 120,
};

export const PAY_ONCE_PAY_ARGS: PayloadValue = {
  vendor_id: "v1",
  amount: 120,
  currency: "EUR",
  reference: "inv-1",
};

export const PAY_ONCE_PAID_OUTPUT: PayloadValue = { payment_id: "pay-1", status: "paid" };

const FLOW_PATH = fileURLToPath(new URL("./flows/pay-once.yaml", import.meta.url));

export function payOnceVersion(): LoadedVersion {
  const flow = parseCatalogueFlow(readFileSync(FLOW_PATH, "utf8"), "pay-once");
  return {
    flowId: "pay-once",
    hash: PAY_ONCE_HASH,
    state: "validated",
    ownerTeam: "finance",
    flow,
  };
}

export function payOnceCatalogue(opts: { unsafePay?: boolean } = {}): Catalogue {
  const base = loadTestCatalogue();
  return {
    block(ref: string) {
      const def = base.block(ref);
      if (def === undefined) {
        return undefined;
      }
      if (opts.unsafePay === true && ref === "erp.create_payment@1") {
        return { ...def, unsafe_to_retry: true };
      }
      return def;
    },
    modelProfile(ref: string) {
      return base.modelProfile(ref);
    },
    role(name: string) {
      return base.role(name);
    },
    delegateTarget(target: string, workflow: string) {
      return base.delegateTarget(target, workflow);
    },
    flow(ref: string, major: number) {
      return base.flow(ref, major);
    },
  };
}

export function effectLogInvoker(file: string): ToolInvoker {
  return {
    async invoke(call: ToolCall, ctx: StepContext): Promise<ToolResult> {
      appendEffect(file, { tool: call.tool, idemKey: ctx.idemKey, nodeId: call.nodeId });
      switch (call.tool) {
        case "erp.lookup_vendor@1":
          return { output: { vendor_id: "v1", status: "active" } };
        case "erp.create_payment@1":
          return { output: PAY_ONCE_PAID_OUTPUT };
        default:
          throw new Error("no output for tool");
      }
    },
  };
}
