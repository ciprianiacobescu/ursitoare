import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_ROLES } from "../../../src/identity/index.ts";
import type { CatalogueDocument } from "./document.ts";
import { readCatalogueDocument } from "./document.ts";
import type { TestCatalogue } from "./loader.ts";
import { catalogueFromDocument, loadTestCatalogue } from "./loader.ts";

const PAYMENT_DEFINITION = {
  effect: "pay",
  description:
    "Create a vendor payment. Idempotent on the engine-supplied idempotency key.",
  input: {
    type: "object",
    properties: {
      vendor_id: { type: "string" },
      amount: { type: "number" },
      currency: { type: "string" },
      reference: { type: "string" },
    },
    required: ["vendor_id", "amount", "currency", "reference"],
  },
  output: {
    type: "object",
    properties: {
      payment_id: { type: "string" },
      status: { type: "string" },
    },
    required: ["payment_id", "status"],
  },
};

const NOTIFY_CUSTOMER_SIGNATURE = {
  input: {
    type: "object",
    properties: {
      customer_id: { type: "string" },
      message: { type: "string" },
    },
    required: ["customer_id", "message"],
  },
  output: {
    type: "object",
    properties: { delivered: { type: "boolean" } },
    required: ["delivered"],
  },
};

function emptyDocument(): CatalogueDocument {
  return {
    catalogue: "t",
    version: "0.0.1",
    blocks: {},
    model_profiles: [],
    roles: [],
    delegate_targets: {},
    flows_registry: {},
  };
}

function emptyCatalogue(): TestCatalogue {
  let result: TestCatalogue | undefined;
  assert.doesNotThrow(() => {
    result = catalogueFromDocument(emptyDocument());
  });
  assert.ok(result !== undefined);
  return result;
}

function shippedCatalogue(): TestCatalogue {
  let result: TestCatalogue | undefined;
  assert.doesNotThrow(() => {
    result = loadTestCatalogue();
  });
  assert.ok(result !== undefined);
  return result;
}

test("C-aac9afa1 Block lookups answer exactly", () => {
  const cat = shippedCatalogue();

  assert.deepEqual(cat.block("erp.create_payment@1"), PAYMENT_DEFINITION);

  const def = cat.block("erp.create_payment@1");
  assert.ok(def);
  def.effect = "read";
  def.input = {};

  assert.deepEqual(cat.block("erp.create_payment@1"), PAYMENT_DEFINITION);

  for (const ref of [
    "ghost.tool@1",
    "invoices.get",
    "",
    "INVOICES.GET@1",
    "__proto__",
    "constructor",
    "toString",
    "hasOwnProperty",
  ]) {
    assert.equal(cat.block(ref), undefined, ref);
  }

  assert.deepEqual(cat.blockRefs(), Object.keys(readCatalogueDocument().blocks));

  const empty = emptyCatalogue();
  assert.equal(empty.block("invoices.get@1"), undefined);
  assert.deepEqual(empty.blockRefs(), []);
});

test("C-6a2eb6e4 Roles profiles delegate targets and flows answer from the document", () => {
  const cat = shippedCatalogue();

  assert.deepEqual(cat.roleNames(), ["tenant_admin", "author", "approver", "auditor"]);
  assert.deepEqual(cat.roleNames(), [...DEFAULT_ROLES]);

  assert.deepEqual(cat.role("approver"), { name: "approver" });
  for (const name of ["finance-approver", "Approver", "__proto__", ""]) {
    assert.equal(cat.role(name), undefined, name);
  }

  assert.deepEqual(cat.modelProfileRefs(), ["default", "fast", "careful"]);
  assert.deepEqual(cat.modelProfile("fast"), { ref: "fast" });
  assert.equal(cat.modelProfile("slow"), undefined);

  for (const workflow of ["archive-invoice", "sync-crm", "generate-report"]) {
    assert.deepEqual(
      cat.delegateTarget("n8n", workflow),
      { effect: "send", untrusted_result: true },
      workflow,
    );
  }
  assert.equal(cat.delegateTarget("n8n", "ghost"), undefined);
  assert.equal(cat.delegateTarget("ghost", "archive-invoice"), undefined);
  assert.equal(cat.delegateTarget("__proto__", "archive-invoice"), undefined);
  assert.equal(cat.delegateTarget("n8n", "__proto__"), undefined);

  assert.deepEqual(cat.flow("notify-customer", 1), NOTIFY_CUSTOMER_SIGNATURE);
  assert.equal(cat.flow("notify-customer", 2), undefined);
  assert.equal(cat.flow("notify-customer@1", 1), undefined);
  assert.equal(cat.flow("ghost", 1), undefined);
  assert.equal(cat.flow("notify-customer", 1.5), undefined);
  assert.equal(cat.flow("notify-customer", -1), undefined);
  assert.equal(cat.flow("__proto__", 1), undefined);
});
