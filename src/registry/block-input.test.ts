import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { canonicalize } from "../audit/index.ts";
import type { BlockDef } from "../authoring/index.ts";
import type {
  BlockBinding,
  NormalizedBlock,
  RegistryErrorCode,
} from "./index.ts";
import { RegistryError, blockContentHash, normalizeBlockImport } from "./index.ts";

const I = {
  effect: "read",
  description: "Fetch an invoice.",
  input: {
    type: "object",
    properties: { invoice_id: { type: "string" } },
    required: ["invoice_id"],
  },
  output: {
    type: "object",
    properties: {
      raw_text: { type: "string" },
      vendor_name: { type: "string" },
    },
  },
  untrusted_fields: ["vendor_name", "raw_text"],
  data_class: "private",
};

const D = {
  effect: "read",
  input: {
    type: "object",
    properties: { url: { type: "string" } },
    required: ["url"],
  },
  output: { type: "object", properties: { content: { type: "string" } } },
  untrusted_fields: ["content"],
  data_class: "public",
  untrusted_result: true,
};

const M = {
  effect: "send",
  description: "Send a mail.",
  input: { type: "object", properties: { to: { type: "string" } } },
  output: { type: "object" },
  unsafe_to_retry: true,
  binding: { server: "mail", tool: "send" },
};

const I2 = {
  ...I,
  description: "Other.",
};

const normalizedI: BlockDef = {
  effect: "read",
  description: "Fetch an invoice.",
  input: {
    type: "object",
    properties: { invoice_id: { type: "string" } },
    required: ["invoice_id"],
  },
  output: {
    type: "object",
    properties: {
      raw_text: { type: "string" },
      vendor_name: { type: "string" },
    },
  },
  untrusted_fields: ["raw_text", "vendor_name"],
  data_class: "private",
  untrusted_result: false,
  unsafe_to_retry: false,
};

const normalizedD: BlockDef = {
  effect: "read",
  input: {
    type: "object",
    properties: { url: { type: "string" } },
    required: ["url"],
  },
  output: { type: "object", properties: { content: { type: "string" } } },
  untrusted_fields: ["content"],
  data_class: "public",
  untrusted_result: true,
  unsafe_to_retry: false,
};

const normalizedM: BlockDef = {
  effect: "send",
  description: "Send a mail.",
  input: { type: "object", properties: { to: { type: "string" } } },
  output: { type: "object" },
  untrusted_fields: [],
  untrusted_result: false,
  unsafe_to_retry: true,
};

function deriveHash(def: BlockDef, binding: BlockBinding | null): string {
  const digest = createHash("sha256")
    .update(canonicalize({ binding, def }), "utf8")
    .digest("hex");
  return `sha256:${digest}`;
}

function normalize(ref: unknown, block: unknown): NormalizedBlock {
  let result: NormalizedBlock | undefined;
  assert.doesNotThrow(() => {
    result = normalizeBlockImport(ref, block);
  });
  assert.ok(result !== undefined, "normalizeBlockImport returns a value");
  return result;
}

function expectRegistryError(
  ref: unknown,
  block: unknown,
  code: RegistryErrorCode,
  details: Record<string, string | number>,
): void {
  assert.throws(
    () => normalizeBlockImport(ref, block),
    (error: unknown) => {
      assert.ok(error instanceof RegistryError, "the error is a RegistryError");
      assert.equal(error.code, code);
      assert.deepEqual(error.details, details);
      return true;
    },
  );
}

test("C-43294732 A block is normalised and hashed", () => {
  const invoice = normalize("invoices.get@1", I);
  const docs = normalize("docs.fetch@1", D);
  const mail = normalize("mail.send@1", M);

  assert.deepEqual(invoice.def, normalizedI);
  assert.equal(invoice.binding, null);
  assert.equal(invoice.contentHash, deriveHash(normalizedI, null));
  assert.equal(invoice.ref, "invoices.get@1");

  assert.deepEqual(docs.def, normalizedD);
  assert.equal(docs.binding, null);
  assert.equal(docs.contentHash, deriveHash(normalizedD, null));
  assert.equal(docs.ref, "docs.fetch@1");

  assert.deepEqual(mail.def, normalizedM);
  assert.deepEqual(mail.binding, { server: "mail", tool: "send" });
  assert.equal(mail.contentHash, deriveHash(normalizedM, { server: "mail", tool: "send" }));
  assert.equal(mail.ref, "mail.send@1");

  const explicitFalse = normalize("invoices.get@1", {
    ...I,
    unsafe_to_retry: false,
    untrusted_fields: ["raw_text", "vendor_name"],
  });
  assert.deepEqual(explicitFalse, invoice);

  const reversedKeys = normalize("invoices.get@1", {
    untrusted_fields: ["vendor_name", "raw_text"],
    data_class: "private",
    output: I.output,
    input: I.input,
    description: "Fetch an invoice.",
    effect: "read",
  });
  assert.deepEqual(reversedKeys, invoice);

  const otherContent = normalize("invoices.get@1", I2);
  assert.notEqual(otherContent.contentHash, invoice.contentHash);

  const otherBinding = normalize("mail.send@1", {
    ...M,
    binding: { server: "mail", tool: "other" },
  });
  assert.notEqual(otherBinding.contentHash, mail.contentHash);

  let hashed = "";
  assert.doesNotThrow(() => {
    hashed = blockContentHash(normalizedI, null);
  });
  assert.equal(hashed, invoice.contentHash);
});

test("C-180a7986 Bad refs and non-object blocks are refused", () => {
  const badRef = { field: "ref", reason: "bad_value" };
  for (const ref of ["Invoices.get@1", "a@01", "a", 42, "a".repeat(127) + "@1"]) {
    expectRegistryError(ref, I, "REGISTRY_INVALID", badRef);
  }

  const notObject = { ref: "invoices.get@1", field: "block", reason: "not_object" };
  expectRegistryError("invoices.get@1", null, "REGISTRY_INVALID", notObject);
  expectRegistryError("invoices.get@1", [], "REGISTRY_INVALID", notObject);
});

test("C-180a7986 Bad block fields are refused in order", () => {
  const at = (field: string, reason: string): Record<string, string | number> => ({
    ref: "invoices.get@1",
    field,
    reason,
  });
  const { output: _output, ...withoutOutput } = I;
  const cases: Array<[unknown, Record<string, string | number>]> = [
    [{ ...I, extra: true }, at("block", "unknown_property")],
    [{ ...I, effect: "delete" }, at("effect", "bad_value")],
    [withoutEffect(I), at("effect", "bad_value")],
    [{ ...I, description: "x".repeat(2001) }, at("description", "bad_value")],
    [{ ...I, input: [] }, at("input", "not_object")],
    [withoutOutput, at("output", "not_object")],
    [{ ...I, data_class: "secret" }, at("data_class", "bad_value")],
    [{ ...I, untrusted_result: "yes" }, at("untrusted_result", "bad_value")],
    [{ ...I, untrusted_fields: "raw_text" }, at("untrusted_fields", "bad_value")],
    [{ ...I, untrusted_fields: ["nope"] }, at("untrusted_fields", "unknown_field")],
    [
      { ...I, untrusted_fields: ["raw_text", "raw_text"] },
      at("untrusted_fields", "duplicate"),
    ],
    [
      { ...I, input: { type: "object", minimum: Number.NaN } },
      at("block", "not_json"),
    ],
    [
      { ...I, input: { type: "object", description: "x".repeat(300000) } },
      at("block", "too_large"),
    ],
    [{ ...I, binding: [] }, at("binding", "not_object")],
    [
      { ...I, binding: { note: "x".repeat(9000) } },
      at("binding", "too_large"),
    ],
  ];

  for (const [block, details] of cases) {
    expectRegistryError("invoices.get@1", block, "REGISTRY_INVALID", details);
  }
});

test("C-180a7986 Invalid input and output schemas are refused", () => {
  expectRegistryError(
    "invoices.get@1",
    { ...I, input: { type: "not-a-type" } },
    "REGISTRY_SCHEMA_INVALID",
    { ref: "invoices.get@1", field: "input" },
  );
  expectRegistryError(
    "invoices.get@1",
    { ...I, output: { type: "not-a-type" } },
    "REGISTRY_SCHEMA_INVALID",
    { ref: "invoices.get@1", field: "output" },
  );
});

function withoutEffect(block: Record<string, unknown>): Record<string, unknown> {
  const { effect: _effect, ...rest } = block;
  return rest;
}
