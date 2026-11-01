import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import type { CatalogueDocument } from "./document.ts";
import { parseCatalogueDocument, readCatalogueDocument } from "./document.ts";
import { CatalogueDataError } from "./errors.ts";

const CATALOGUE_FILE = fileURLToPath(new URL("./blocks.v0.json", import.meta.url));

const BLOCK_ORDER = [
  "invoices.get@1",
  "docs.fetch@1",
  "mail.read_inbox@1",
  "http.get@1",
  "erp.lookup_vendor@1",
  "crm.find_customer@1",
  "orders.get@1",
  "kb.search@1",
  "calendar.find_slots@1",
  "erp.create_payment@1",
  "orders.refund@1",
  "mail.send@1",
  "slack.post_message@1",
  "http.post@1",
  "crm.create_ticket@1",
  "crm.update_ticket@1",
  "sheets.append_row@1",
  "calendar.create_event@1",
  "docs.create@1",
  "erp.flag_vendor@1",
];

const READ_BLOCKS = BLOCK_ORDER.slice(0, 9);
const PAY_BLOCKS = BLOCK_ORDER.slice(9, 11);
const SEND_BLOCKS = BLOCK_ORDER.slice(11, 14);
const WRITE_BLOCKS = BLOCK_ORDER.slice(14);

const DATA_CLASSES = new Map<string, "public" | "private">([
  ["docs.fetch@1", "public"],
  ["http.get@1", "public"],
  ["kb.search@1", "public"],
  ["invoices.get@1", "private"],
  ["mail.read_inbox@1", "private"],
  ["erp.lookup_vendor@1", "private"],
  ["crm.find_customer@1", "private"],
  ["orders.get@1", "private"],
  ["calendar.find_slots@1", "private"],
]);

const UNTRUSTED_FIELDS = new Map<string, string[]>([
  ["invoices.get@1", ["raw_text", "vendor_name"]],
  ["docs.fetch@1", ["content"]],
  ["mail.read_inbox@1", ["messages"]],
  ["http.get@1", ["body"]],
  ["http.post@1", ["body"]],
]);

function readCatalogue(path?: string): CatalogueDocument {
  let result: CatalogueDocument | undefined;
  assert.doesNotThrow(() => {
    result = path === undefined ? readCatalogueDocument() : readCatalogueDocument(path);
  });
  assert.ok(result !== undefined);
  return result;
}

test("C-086d4027 Twenty blocks keep their effects and taint sources", () => {
  const defaultDoc = readCatalogue();
  const explicitDoc = readCatalogue(CATALOGUE_FILE);
  assert.deepEqual(defaultDoc, explicitDoc);

  assert.deepEqual(Object.keys(defaultDoc.blocks), [...BLOCK_ORDER]);

  for (const ref of READ_BLOCKS) {
    assert.equal(defaultDoc.blocks[ref]?.effect, "read", ref);
  }
  for (const ref of PAY_BLOCKS) {
    assert.equal(defaultDoc.blocks[ref]?.effect, "pay", ref);
  }
  for (const ref of SEND_BLOCKS) {
    assert.equal(defaultDoc.blocks[ref]?.effect, "send", ref);
  }
  for (const ref of WRITE_BLOCKS) {
    assert.equal(defaultDoc.blocks[ref]?.effect, "write", ref);
  }

  for (const ref of BLOCK_ORDER) {
    const block = defaultDoc.blocks[ref];
    assert.ok(block, ref);
    const expected = DATA_CLASSES.get(ref);
    if (expected === undefined) {
      assert.equal(Object.hasOwn(block, "data_class"), false, `${ref} has no data_class`);
    } else {
      assert.equal(block.data_class, expected, ref);
    }
  }

  for (const ref of BLOCK_ORDER) {
    const block = defaultDoc.blocks[ref];
    assert.ok(block, ref);
    const expected = UNTRUSTED_FIELDS.get(ref);
    if (expected === undefined) {
      assert.equal(Object.hasOwn(block, "untrusted_fields"), false, `${ref} has no untrusted_fields`);
    } else {
      assert.deepEqual(block.untrusted_fields, expected, ref);
    }
  }

  const mailSend = defaultDoc.blocks["mail.send@1"];
  assert.ok(mailSend);
  assert.deepEqual(mailSend, {
    effect: "send",
    description: "Send an email.",
    input: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["to", "subject", "body"],
    },
    output: {
      type: "object",
      properties: { message_id: { type: "string" } },
      required: ["message_id"],
    },
  });

  assert.equal(defaultDoc.catalogue, "ursitoare-blocks");
  assert.equal(defaultDoc.version, "0.1.0");
  assert.deepEqual(defaultDoc.model_profiles, ["default", "fast", "careful"]);
  assert.deepEqual(defaultDoc.roles, ["tenant_admin", "author", "approver", "auditor"]);
  assert.deepEqual(defaultDoc.delegate_targets, {
    n8n: ["archive-invoice", "sync-crm", "generate-report"],
  });
  assert.deepEqual(Object.keys(defaultDoc.flows_registry), ["notify-customer@1"]);
});

interface SmallBlock {
  effect: string;
  input: unknown;
  output: unknown;
}

interface SmallDocument {
  catalogue: string;
  version: string;
  blocks?: Record<string, SmallBlock>;
  model_profiles: unknown[];
  roles: unknown[];
  delegate_targets: Record<string, unknown>;
  flows_registry: Record<string, { inputs: unknown; outputs: unknown }>;
}

function smallDocument(): SmallDocument {
  return {
    catalogue: "t",
    version: "0.0.1",
    blocks: {
      "mail.send@1": {
        effect: "send",
        input: { type: "object" },
        output: { type: "object" },
      },
    },
    model_profiles: ["default"],
    roles: ["approver"],
    delegate_targets: { n8n: ["w"] },
    flows_registry: {
      "notify-customer@1": { inputs: { type: "object" }, outputs: { type: "object" } },
    },
  };
}

function blockOf(doc: SmallDocument): SmallBlock {
  const blocks = doc.blocks;
  assert.ok(blocks);
  const block = blocks["mail.send@1"];
  assert.ok(block);
  return block;
}

function expectInvalid(text: string, prefix: string): void {
  assert.throws(
    () => parseCatalogueDocument(text),
    (error: unknown) => {
      assert.ok(error instanceof CatalogueDataError, `expected CatalogueDataError, got ${String(error)}`);
      assert.equal(error.code, "CATALOGUE_INVALID");
      assert.ok(
        error.message.startsWith(prefix),
        `message ${JSON.stringify(error.message)} starts with ${JSON.stringify(prefix)}`,
      );
      return true;
    },
  );
}

function expectInvalidAfter(mutate: (doc: SmallDocument) => void, prefix: string): void {
  const doc = smallDocument();
  mutate(doc);
  expectInvalid(JSON.stringify(doc), prefix);
}

test("C-6aa2b40c A malformed document is refused with a code", () => {
  const validText = JSON.stringify(smallDocument());
  let parsed: CatalogueDocument | undefined;
  assert.doesNotThrow(() => {
    parsed = parseCatalogueDocument(validText);
  });
  assert.deepEqual(parsed, JSON.parse(validText));

  expectInvalid("", "invalid JSON: ");
  expectInvalid("{", "invalid JSON: ");
  expectInvalid("[]", "/: ");
  expectInvalidAfter((doc) => {
    blockOf(doc).effect = "delete";
  }, "/blocks/mail.send@1/effect: ");
  expectInvalidAfter((doc) => {
    const blocks = doc.blocks;
    assert.ok(blocks);
    const original = blockOf(doc);
    delete blocks["mail.send@1"];
    blocks["mail.send"] = original;
  }, "/blocks/mail.send: ");
  expectInvalidAfter((doc) => {
    blockOf(doc).input = [];
  }, "/blocks/mail.send@1/input: ");
  expectInvalidAfter((doc) => {
    doc.roles = [1];
  }, "/roles/0: ");
  expectInvalidAfter((doc) => {
    doc.delegate_targets["n8n"] = "x";
  }, "/delegate_targets/n8n: ");
  expectInvalidAfter((doc) => {
    const original = doc.flows_registry["notify-customer@1"];
    assert.ok(original);
    delete doc.flows_registry["notify-customer@1"];
    doc.flows_registry["notify-customer"] = original;
  }, "/flows_registry/notify-customer: ");
  expectInvalidAfter((doc) => {
    delete doc.blocks;
  }, "/blocks: ");

  assert.throws(
    () => readCatalogueDocument(join(tmpdir(), "no-such-dir", "x.json")),
    (error: unknown) => {
      assert.ok(error instanceof CatalogueDataError, `expected CatalogueDataError, got ${String(error)}`);
      assert.equal(error.code, "CATALOGUE_READ");
      return true;
    },
  );
});
