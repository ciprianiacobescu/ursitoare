import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { parseCatalogueFlow } from "../../../test/support/catalogue/flows.ts";
import type { Issue } from "../validate/types.ts";
import { FLOW_ERROR_CODES } from "../validate/codes.ts";
import { validateFlowText } from "../validate/validate.ts";
import type { NodeTaint, TaintEdge } from "./analyze.ts";
import { analyzeTaint } from "./analyze.ts";

assert.equal(typeof analyzeTaint, "function");
assert.equal(typeof validateFlowText, "function");

const CATALOGUE = loadTestCatalogue();

const WIDEN_YAML = `ursitoare: "0.1"
flow: widen
version: 1.0.0
inputs: { type: object, properties: { url: { type: string } }, required: [url] }
start: hooked
nodes:
  hooked: { kind: block, uses: docs.fetch@1, with: { url: "\${{ inputs.url }}" }, post: [{ id: tidy, kind: code, source: "return;" }], next: plain }
  plain: { kind: block, uses: docs.fetch@1, with: { url: "\${{ inputs.url }}" }, next: blockonly }
  blockonly:
    kind: block
    uses: docs.fetch@1
    with: { url: "\${{ inputs.url }}" }
    post: [{ id: ping, kind: block, uses: slack.post_message@1, with: { channel: "#ap", text: "\${{ hook.node.id }}" } }]
    next: use
  use:
    kind: code
    language: js
    input: { a: "\${{ nodes.hooked.output.content_type }}", b: "\${{ nodes.plain.output.content_type }}", c: "\${{ nodes.blockonly.output.content_type }}" }
    source: "return { ok: true };"
    output_schema: { type: object, properties: { ok: { type: boolean } }, required: [ok] }
    next: done
  done: { kind: end, status: completed }
`;

const WIDEN_MAIL_YAML = `ursitoare: "0.1"
flow: widen-mail
version: 1.0.0
inputs: { type: object, properties: { url: { type: string } }, required: [url] }
start: fetch
nodes:
  fetch: { kind: block, uses: docs.fetch@1, with: { url: "\${{ inputs.url }}" }, post: [{ id: tidy, kind: code, source: "return;" }], next: send }
  send: { kind: block, uses: mail.send@1, with: { to: ops@example.com, subject: "\${{ nodes.fetch.output.content_type }}", body: digest }, next: done }
  done: { kind: end, status: completed }
`;

const WIDEN_MAIL_NOHOOK_YAML = `ursitoare: "0.1"
flow: widen-mail-nohook
version: 1.0.0
inputs: { type: object, properties: { url: { type: string } }, required: [url] }
start: fetch
nodes:
  fetch: { kind: block, uses: docs.fetch@1, with: { url: "\${{ inputs.url }}" }, next: send }
  send: { kind: block, uses: mail.send@1, with: { to: ops@example.com, subject: "\${{ nodes.fetch.output.content_type }}", body: digest }, next: done }
  done: { kind: end, status: completed }
`;

function nodeAt(nodes: { [id: string]: NodeTaint }, id: string): NodeTaint {
  const found = nodes[id];
  assert.ok(found !== undefined, `node ${id} exists`);
  return found;
}

function edgeAt(edges: TaintEdge[], path: string): TaintEdge {
  const found = edges.find((edge) => edge.path === path);
  assert.ok(found !== undefined, `edge ${path} exists`);
  return found;
}

test("C-9c696999 A code hook widens a block node with every produced label", () => {
  const flow = parseCatalogueFlow(WIDEN_YAML, "widen");
  const result = analyzeTaint(flow, CATALOGUE);

  assert.deepEqual(nodeAt(result.nodes, "hooked"), {
    input: [],
    output: ["untrusted"],
    fields: { content: ["untrusted"] },
  });
  for (const id of ["plain", "blockonly"]) {
    assert.deepEqual(
      nodeAt(result.nodes, id),
      { input: [], output: [], fields: { content: ["untrusted"] } },
      id,
    );
  }
  assert.deepEqual(nodeAt(result.nodes, "use").input, ["untrusted"]);
  assert.deepEqual(nodeAt(result.nodes, "use").output, ["untrusted"]);

  assert.deepEqual(edgeAt(result.edges, "/nodes/use/input/a").taint, ["untrusted"]);
  assert.deepEqual(edgeAt(result.edges, "/nodes/use/input/b").taint, []);
  assert.deepEqual(edgeAt(result.edges, "/nodes/use/input/c").taint, []);
  assert.deepEqual(edgeAt(result.edges, "/nodes/blockonly/post/0/with/text").taint, []);
});

test("C-4ea2ebb2 The widening reaches the validator", () => {
  const mail = validateFlowText(WIDEN_MAIL_YAML, "yaml", CATALOGUE);
  assert.equal(mail.ok, false);
  const expected: Issue = {
    layer: "L3",
    code: "L3_TAINT_TO_CONSEQUENTIAL",
    node: "send",
    path: "/nodes/send/with/subject",
    message:
      "untrusted data from fetch reaches send through nodes.fetch.output.content_type, a block with side effects; pass it through an llm.extract node first",
  };
  assert.deepEqual(mail.errors, [expected]);
  assert.deepEqual(mail.layers_run, ["L1", "L2", "L3"]);

  const nohook = validateFlowText(WIDEN_MAIL_NOHOOK_YAML, "yaml", CATALOGUE);
  assert.equal(nohook.ok, true);
  assert.deepEqual(nohook.errors, []);

  for (const result of [mail, nohook]) {
    assert.equal(result.warnings.length, 1);
    assert.equal(result.warnings[0]?.code, "W_OPTIONAL_REFERENCE");
    assert.equal(result.warnings[0]?.path, "/nodes/send/with/subject");
  }

  assert.equal(
    FLOW_ERROR_CODES.filter((code) => code === "L3_TAINT_TO_CONSEQUENTIAL").length,
    1,
  );
  const diagnostics = readFileSync(
    new URL("../../../docs/authoring/diagnostics.md", import.meta.url),
    "utf8",
  );
  assert.equal(diagnostics.split("### L3_TAINT_TO_CONSEQUENTIAL").length - 1, 1);
});
