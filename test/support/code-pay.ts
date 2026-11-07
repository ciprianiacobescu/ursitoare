import type { Flow } from "../../src/authoring/index.ts";
import { parseFlowText } from "../../src/authoring/index.ts";
import type { LoadedVersion } from "../../src/interpreter/index.ts";

export const CODE_PAY_TEXT = `ursitoare: "0.1"
flow: code-pay
version: 1.0.0
inputs:
  type: object
  properties:
    vendor: { type: string }
    invoice: { type: string }
    amount: { type: number }
    currency: { type: string }
  required: [vendor, invoice, amount, currency]
start: lookup
nodes:
  lookup:
    kind: block
    uses: erp.lookup_vendor@1
    with:
      vendor_name: "\${{ inputs.vendor }}"
    next: normalize
  normalize:
    kind: code
    language: js
    input:
      amount: "\${{ inputs.amount }}"
      currency: "\${{ inputs.currency }}"
    source: |
      return {
        amount: Math.round(input.amount * 100) / 100,
        currency: input.currency.toUpperCase(),
        is_large: input.amount > 1000
      };
    output_schema:
      type: object
      properties:
        amount: { type: number }
        currency: { type: string }
        is_large: { type: boolean }
      required: [amount, currency, is_large]
    next: pay
  pay:
    kind: block
    uses: erp.create_payment@1
    with:
      vendor_id: "\${{ nodes.lookup.output.vendor_id }}"
      amount: "\${{ nodes.normalize.output.amount }}"
      currency: "\${{ nodes.normalize.output.currency }}"
      reference: "\${{ inputs.invoice }}"
    next: done
  done:
    kind: end
    status: completed
    output:
      payment_id: "\${{ nodes.pay.output.payment_id }}"
`;

let cached: Flow | null = null;

function flow(): Flow {
  if (cached === null) {
    const parsed = parseFlowText(CODE_PAY_TEXT, "yaml");
    if (!parsed.ok) {
      throw new Error(`code-pay does not parse: ${parsed.error.code}`);
    }
    cached = parsed.doc as unknown as Flow;
  }
  return cached;
}

export function codePayVersion(): LoadedVersion {
  return {
    flowId: "code-pay",
    hash: `sha256:${"c".repeat(64)}`,
    state: "validated",
    ownerTeam: "finance",
    flow: flow(),
  };
}
