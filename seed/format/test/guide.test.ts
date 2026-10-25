import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import YAML from "yaml";
import { parseFlowText } from "../src/io.ts";
import { validate } from "../src/validate.ts";
import { REPO, RF1, catalogue, codes, loadDoc, validateFile } from "./helpers.ts";

const GUIDE = join(REPO, "eval", "guides", "yaml.md");
const TRIAGE = join(REPO, "eval", "guides", "examples", "support-triage.yaml");
const guide = readFileSync(GUIDE, "utf8");

describe("worked example 2: support-triage.yaml", () => {
  it("passes with zero errors", () => {
    const r = validateFile(TRIAGE);
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.layers_run, ["L1", "L2", "L3"]);
  });
  it("covers the requested features", () => {
    const doc = loadDoc(TRIAGE);
    const kinds = new Set(Object.values<any>(doc.nodes).map((n) => n.kind));
    for (const k of ["foreach", "llm.decide", "llm.extract", "subflow", "switch", "end"]) assert.ok(kinds.has(k), k);
    const uses = new Set(Object.values<any>(doc.nodes).map((n) => n.uses).filter(Boolean));
    for (const u of ["mail.read_inbox@1", "crm.create_ticket@1", "slack.post_message@1"]) assert.ok(uses.has(u), u);
  });
  it("breaks in the expected way when its safeguards are removed", () => {
    const mutate = (f: (d: any) => void) => {
      const d = loadDoc(TRIAGE);
      f(d);
      return codes(validate(d, catalogue).errors);
    };
    assert.deepEqual(mutate((d) => (d.nodes.create_ticket.with.body = "Inbox: ${{ nodes.read_inbox.output.messages }}")), ["L3_TAINT_TO_CONSEQUENTIAL"]);
    assert.deepEqual(mutate((d) => (d.nodes.alert_slack.with.text = "${{ nodes.lookup_senders.output.results }} ${{ nodes.read_inbox.output.messages }}")), ["L3_TAINT_TO_CONSEQUENTIAL"]);
    assert.deepEqual(mutate((d) => delete d.nodes.prioritize.cases.urgent), ["L2_DECIDE_CASE_MISSING"]);
    assert.deepEqual(mutate((d) => (d.nodes.create_ticket.with.priority = "critical")), ["L3_ENUM_VIOLATION"]);
    assert.deepEqual(mutate((d) => (d.nodes.route.cases.critical = "done")), ["L3_SWITCH_KEY_INCOMPATIBLE"]);
    assert.deepEqual(mutate((d) => (d.nodes.done.output.x = "${{ nodes.alert_slack.output.ts }}")), ["L3_REF_NOT_DOMINATING"]);
    assert.deepEqual(mutate((d) => (d.nodes.read_inbox.with.max = "${{ inputs.mailbox }}")), ["L3_TYPE_MISMATCH"]);
  });
});

describe("YAML authoring guide (eval/guides/yaml.md)", () => {
  it("embeds exactly the two worked examples, byte for byte", () => {
    const blocks = [...guide.matchAll(/```yaml\n([\s\S]*?)\n```/g)].map((m) => m[1]);
    const flows = blocks.filter((b) => b.startsWith('ursitoare: "0.1"') && b.includes("\nnodes:\n"));
    // the document-layout snippet starts with the same line but is a template, not a worked example
    const examples = flows.filter((b) => !b.includes("{ ... }"));
    assert.equal(examples.length, 2);
    assert.equal(examples[0], readFileSync(RF1, "utf8").trimEnd());
    assert.equal(examples[1], readFileSync(TRIAGE, "utf8").trimEnd());
    for (const e of examples) assert.deepEqual(validate(parseFlowText(e, "yaml").doc, catalogue).errors, []);
  });
  it("every YAML snippet in the guide parses", () => {
    for (const m of guide.matchAll(/```yaml\n([\s\S]*?)\n```/g)) {
      const d = YAML.parseDocument(m[1], { version: "1.2", schema: "core" });
      assert.deepEqual(d.errors.map((e) => e.message), [], m[1].slice(0, 80));
    }
  });
  it("documents every node kind, block, role, model profile, delegate workflow and sub-flow", () => {
    for (const k of ["block", "code", "llm.extract", "llm.generate", "llm.decide", "agent", "switch", "human.approval", "human.form", "foreach", "subflow", "delegate", "wait", "end"])
      assert.match(guide, new RegExp("^### 5\\.\\d+ `" + k.replace(".", "\\.") + "`", "m"), k);
    for (const b of Object.keys(catalogue.blocks)) assert.ok(guide.includes(`**\`${b}\`**`), b);
    for (const r of catalogue.roles) assert.ok(guide.includes(`\`${r}\``), r);
    for (const p of catalogue.model_profiles) assert.ok(guide.includes(`\`${p}\``), p);
    for (const [t, ws] of Object.entries(catalogue.delegate_targets)) {
      assert.ok(guide.includes(`\`${t}\``));
      for (const w of ws) assert.ok(guide.includes(`\`${w}\``), w);
    }
    for (const f of Object.keys(catalogue.flows_registry)) assert.ok(guide.includes(`**\`${f}\`**`), f);
    // effects and untrusted fields are listed
    for (const [name, b] of Object.entries(catalogue.blocks)) {
      assert.ok(guide.includes(`**\`${name}\`** (effect: ${b.effect})`), name);
      for (const u of b.untrusted_fields ?? []) assert.ok(guide.includes(`\`${u}\``), `${name}.${u}`);
    }
  });
  it("describes the authoring rules in neutral terms: no mention of validation internals, codes, rubrics or evaluation", () => {
    const banned = /validat|rubric|\bscor(e|es|ing)\b|evaluat|experiment|error code|\bL[123]\b|\b(L[123]|W)_[A-Z_]{3,}|taint|\bA\/B\b|checker|\blint|benchmark|grader|\bgolden/i;
    const hit = guide.split("\n").map((l, i) => ({ l, i: i + 1 })).filter(({ l }) => banned.test(l));
    assert.deepEqual(hit, []);
  });
  it("states the key authoring rules", () => {
    for (const phrase of [
      "Every outcome", "every outcome", "on every path", "llm.extract", "untrusted", "the block's input parameters",
      "array indexing", "single reference", "template", "timeout", "Quote every string",
    ]) assert.ok(guide.includes(phrase) || guide.toLowerCase().includes(phrase.toLowerCase()), phrase);
  });
});
