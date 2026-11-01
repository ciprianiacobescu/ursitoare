import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import type { Catalogue } from "../format/index.ts";
import { CatalogueFileError, catalogueFromJson } from "./catalogue-file.ts";

const CATALOGUE_FILE = new URL("../../../test/support/catalogue/blocks.v0.json", import.meta.url);

function load(text: string): Catalogue {
  let catalogue: Catalogue | undefined;
  assert.doesNotThrow(() => {
    catalogue = catalogueFromJson(text);
  });
  assert.ok(catalogue, "catalogueFromJson returns a catalogue");
  return catalogue;
}

function fileError(text: string): CatalogueFileError {
  let caught: unknown;
  try {
    catalogueFromJson(text);
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof CatalogueFileError, `throws CatalogueFileError for ${text}`);
  assert.equal(caught.code, "CATALOGUE_FILE_INVALID");
  return caught;
}

test("C-a47d7ddd a catalogue file answers every lookup", () => {
  assert.ok(existsSync(CATALOGUE_FILE), "test/support/catalogue/blocks.v0.json exists");
  const catalogue = load(readFileSync(CATALOGUE_FILE, "utf8"));

  const block = catalogue.block("invoices.get@1");
  assert.ok(block, "invoices.get@1 is known");
  assert.equal(block.effect, "read");

  assert.deepEqual(catalogue.role("approver"), { name: "approver" });

  assert.deepEqual(catalogue.delegateTarget("n8n", "sync-crm"), {
    effect: "send",
    untrusted_result: true,
  });

  assert.deepEqual(catalogue.delegateWorkflows?.("n8n"), [
    "archive-invoice",
    "sync-crm",
    "generate-report",
  ]);

  const flow = catalogue.flow("notify-customer", 1);
  assert.ok(flow, "notify-customer@1 is known");
  assert.equal(flow.input.type, "object");
  assert.equal(flow.output.type, "object");

  assert.equal(catalogue.block("__proto__"), undefined);
  assert.equal(catalogue.role("constructor"), undefined);
  assert.equal(catalogue.delegateWorkflows?.("toString"), undefined);
});

test("C-a47d7ddd an empty catalogue document answers undefined to every lookup", () => {
  const catalogue = load("{}");

  assert.equal(catalogue.block("invoices.get@1"), undefined);
  assert.equal(catalogue.modelProfile("default"), undefined);
  assert.equal(catalogue.role("approver"), undefined);
  assert.equal(catalogue.delegateTarget("n8n", "sync-crm"), undefined);
  assert.equal(catalogue.flow("notify-customer", 1), undefined);
  assert.equal(catalogue.delegateWorkflows?.("n8n"), undefined);
});

test("C-a47d7ddd a malformed catalogue file is refused", () => {
  assert.equal(fileError("nope").message, "invalid JSON");
  assert.equal(fileError("[]").message, "/: must be an object");
  assert.equal(fileError('{"roles":[1]}').message, "/roles/0: must be a string");
});
