import assert from "node:assert/strict";
import { test } from "node:test";

import { parseFlowText } from "../format/index.ts";
import { caseCatalogue } from "../../../test/support/flow-cases/index.ts";
import type { ValidationResult } from "./types.ts";
import { validateFlow } from "./validate.ts";

assert.equal(typeof validateFlow, "function");

const HB = `
ursitoare: "0.1"
flow: hook-taint
version: 1.0.0
inputs: { type: object, properties: { url: { type: string } }, required: [url] }
start: fetch
nodes:
  fetch: { kind: block, uses: docs.fetch@1, with: { url: "\${{ inputs.url }}" }, next: extract }
  extract:
    kind: llm.extract
    input: { text: "\${{ nodes.fetch.output.content }}" }
    instructions: Extract the summary.
    output_schema: { type: object, properties: { summary: { type: string } }, required: [summary] }
    next: send
  send: { kind: block, uses: mail.send@1, with: { to: ops@example.com, subject: Digest, body: "\${{ nodes.extract.output.summary }}" }, next: done }
  done: { kind: end, status: completed }
`;

type Doc = { nodes: Record<string, Record<string, unknown>> };

function validateWith(edit: (doc: Doc) => void): ValidationResult {
  const parsed = parseFlowText(HB, "yaml");
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error("HB does not parse");
  const doc = structuredClone(parsed.doc) as Doc;
  edit(doc);
  let r: ValidationResult | undefined;
  assert.doesNotThrow(() => {
    r = validateFlow(doc, caseCatalogue());
  });
  assert.ok(r);
  return r;
}

const msg = (h: string, n: string, ref: string, f: string): string =>
  `untrusted data from ${f} reaches hook ${h} on ${n} through ${ref}, a block with side effects; pass it through an llm.extract node first`;

const mail = (b: string): Record<string, string> => ({ to: "ops@example.com", subject: "s", body: b });

const p1 = (doc: Doc, id: string = "h"): void => {
  const extract = doc.nodes.extract;
  assert.ok(extract);
  extract.pre = [{ id, kind: "block", uses: "mail.send@1", with: mail("${{ nodes.fetch.output.content }}") }];
};

const l3 = (r: ValidationResult) => r.errors.filter((e) => e.layer === "L3");

test("C-aa58516e untrusted data in a pre block hook of mail is an error", () => {
  assert.deepEqual(l3(validateWith(() => {})), []);
  const r = validateWith((d) => p1(d));
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors, [
    {
      layer: "L3",
      code: "L3_TAINT_TO_CONSEQUENTIAL",
      node: "extract",
      path: "/nodes/extract/pre/0/with/body",
      message: msg("h", "extract", "nodes.fetch.output.content", "fetch"),
    },
  ]);
  assert.deepEqual(r.layers_run, ["L1", "L2", "L3"]);
});

test("C-aa58516e hook output of a post block hook is an error", () => {
  const r = validateWith((d) => {
    const fetch = d.nodes.fetch;
    assert.ok(fetch);
    fetch.post = [
      {
        id: "tell",
        kind: "block",
        uses: "slack.post_message@1",
        with: { channel: "#ap", text: "${{ hook.output.content }}" },
      },
    ];
  });
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors, [
    {
      layer: "L3",
      code: "L3_TAINT_TO_CONSEQUENTIAL",
      node: "fetch",
      path: "/nodes/fetch/post/0/with/text",
      message: msg("tell", "fetch", "hook.output.content", "fetch"),
    },
  ]);
});

test("C-aa58516e hook input reference names the hooked node as source", () => {
  const r = validateWith((d) => {
    const extract = d.nodes.extract;
    assert.ok(extract);
    extract.pre = [
      {
        id: "note",
        kind: "block",
        uses: "slack.post_message@1",
        with: { channel: "#ap", text: "${{ hook.input.text }}" },
      },
    ];
  });
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors, [
    {
      layer: "L3",
      code: "L3_TAINT_TO_CONSEQUENTIAL",
      node: "extract",
      path: "/nodes/extract/pre/0/with/text",
      message: msg("note", "extract", "hook.input.text", "extract"),
    },
  ]);
});

test("C-aa58516e an invalid hook id reads unnamed and no NUL reaches the result", () => {
  const r = validateWith((d) => p1(d, "a\u0000b"));
  assert.equal(r.ok, false);
  assert.deepEqual(l3(r), [
    {
      layer: "L3",
      code: "L3_TAINT_TO_CONSEQUENTIAL",
      node: "extract",
      path: "/nodes/extract/pre/0/with/body",
      message: msg("(unnamed)", "extract", "nodes.fetch.output.content", "fetch"),
    },
  ]);
  assert.equal(JSON.stringify(r).includes("\\u0000"), false);
});

test("C-f97887e5 an untrusted block hook ends layers at L3 with no warning", () => {
  const r = validateWith((d) => p1(d));
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors.map((e) => e.code), ["L3_TAINT_TO_CONSEQUENTIAL"]);
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(r.layers_run, ["L1", "L2", "L3"]);
});

test("C-4f58ed6e hook edges that stay allowed give no taint error", () => {
  const rows: [string, (d: Doc) => void][] = [
    [
      "N1",
      (d) => {
        const send = d.nodes.send;
        assert.ok(send);
        send.pre = [{ id: "peek", kind: "code", source: "return;", input: { raw: "${{ nodes.fetch.output.content }}" } }];
      },
    ],
    [
      "N2",
      (d) => {
        const extract = d.nodes.extract;
        assert.ok(extract);
        extract.pre = [{ id: "look", kind: "block", uses: "kb.search@1", with: { query: "${{ nodes.fetch.output.content }}" } }];
      },
    ],
    [
      "N3",
      (d) => {
        const send = d.nodes.send;
        assert.ok(send);
        send.pre = [{ id: "note", kind: "block", uses: "mail.send@1", with: mail("${{ nodes.extract.output.summary }}") }];
      },
    ],
    [
      "N4",
      (d) => {
        const extract = d.nodes.extract;
        assert.ok(extract);
        extract.pre = [{ id: "ghost", kind: "block", uses: "nope.tool@1", with: { x: "${{ nodes.fetch.output.content }}" } }];
      },
    ],
    [
      "N5",
      (d) => {
        const fetch = d.nodes.fetch;
        assert.ok(fetch);
        fetch.post = [{ id: "tell", kind: "block", uses: "slack.post_message@1", with: { channel: "#ap", text: "${{ hook.node.id }}" } }];
      },
    ],
  ];
  for (const [name, edit] of rows) {
    const r = validateWith(edit);
    assert.deepEqual(l3(r), [], name);
    assert.deepEqual(r.layers_run, ["L1", "L2", "L3", "H"], name);
    if (name === "N4") {
      assert.deepEqual(r.warnings.map((w) => w.code), ["W_LETHAL_TRIFECTA"], name);
      assert.deepEqual(r.errors.map((e) => [e.layer, e.code, e.node, e.path]), [["H", "H_BLOCK", "extract", "/nodes/extract/pre/0/uses"]], name);
    } else {
      assert.equal(r.ok, true, name);
      assert.deepEqual(r.warnings, [], name);
    }
  }
  // the same sample with an untrusted mail hook is the one error (the only row this task adds)
  const bad = validateWith((d) => p1(d));
  assert.deepEqual(bad.errors.map((e) => e.code), ["L3_TAINT_TO_CONSEQUENTIAL"]);
});
