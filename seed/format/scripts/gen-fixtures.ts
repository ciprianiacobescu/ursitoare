/**
 * Generates test/fixtures/{invalid,valid,warnings}/*.yaml from the small builders below.
 * The generated files are committed; run `npx tsx scripts/gen-fixtures.ts` to regenerate (deterministic).
 *
 * File header protocol:
 *   # expect: CODE[, CODE...]     exact set of distinct error codes (invalid/)
 *   # expect-warnings: CODE[, ..] exact set of distinct warning codes (valid/ and warnings/); absent = none
 *   # note: free text
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "test", "fixtures");
type Doc = any;
const clone = <T>(x: T): T => structuredClone(x);

/* ----------------------------------------------------------------- bases */

const INPUTS = {
  type: "object",
  properties: {
    url: { type: "string" },
    email: { type: "string" },
    amount: { type: "number" },
    count: { type: "integer" },
    flag: { type: "boolean" },
    ids: { type: "array", items: { type: "string" } },
  },
  required: ["url", "email", "amount", "count", "flag", "ids"],
};
const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    amount: { type: "number" },
    count: { type: "integer" },
    urgent: { type: "boolean" },
    tags: { type: "array", items: { type: "string" } },
    note: { type: "string" },
  },
  required: ["summary", "amount", "count", "urgent", "tags"],
};

/** fetch -> extract -> done */
function base(): Doc {
  return {
    ursitoare: "0.1",
    flow: "fixture",
    version: "1.0.0",
    inputs: clone(INPUTS),
    start: "fetch",
    nodes: {
      fetch: { kind: "block", uses: "docs.fetch@1", with: { url: "${{ inputs.url }}" }, next: "extract" },
      extract: {
        kind: "llm.extract",
        input: { text: "${{ nodes.fetch.output.content }}" },
        instructions: "Extract the summary, amount, count, urgency and tags.",
        output_schema: clone(EXTRACT_SCHEMA),
        next: "done",
      },
      done: { kind: "end", status: "completed" },
    },
  };
}

/** fetch -> extract -> classify(decide urgent|routine) -> alert | log -> done */
function decideBase(): Doc {
  const b = base();
  b.nodes.extract.next = "classify";
  b.nodes.classify = {
    kind: "llm.decide",
    input: { summary: "${{ nodes.extract.output.summary }}" },
    instructions: "Is this urgent?",
    outcomes: ["urgent", "routine"],
    cases: { urgent: "alert", routine: "log" },
  };
  b.nodes.alert = {
    kind: "block",
    uses: "slack.post_message@1",
    with: { channel: "#ops", text: "Urgent: ${{ nodes.extract.output.summary }}" },
    next: "done",
  };
  b.nodes.log = {
    kind: "block",
    uses: "sheets.append_row@1",
    with: { sheet_id: "S1", values: ["${{ nodes.extract.output.summary }}"] },
    next: "done",
  };
  return b;
}

/** fetch -> extract -> approval -> pay_ok | declined | timed_out -> done */
function approvalBase(): Doc {
  const b = base();
  b.nodes.extract.next = "approval";
  b.nodes.approval = {
    kind: "human.approval",
    assignee_role: "finance-approver",
    summary: "Approve ${{ nodes.extract.output.amount }}?",
    timeout: "PT24H",
    cases: { approved: "grant", rejected: "decline", timeout: "expire" },
  };
  const mail = (subject: string) => ({
    kind: "block",
    uses: "mail.send@1",
    with: { to: "ap@example.com", subject, body: "See the ticket." },
    next: "done",
  });
  b.nodes.grant = mail("Granted");
  b.nodes.decline = mail("Declined");
  b.nodes.expire = mail("Expired");
  return b;
}

/** inbox -> each -> done (foreach over untrusted messages) */
function foreachBase(): Doc {
  return {
    ursitoare: "0.1",
    flow: "fixture",
    version: "1.0.0",
    inputs: clone(INPUTS),
    start: "inbox",
    nodes: {
      inbox: { kind: "block", uses: "mail.read_inbox@1", with: { mailbox: "support@example.com", max: 10 }, next: "each" },
      each: {
        kind: "foreach",
        items: "${{ nodes.inbox.output.messages }}",
        uses: "crm.find_customer@1",
        with: { email: "${{ item.from }}" },
        next: "done",
      },
      done: { kind: "end", status: "completed" },
    },
  };
}

const codeNode = (src: string, next = "extract") => ({
  kind: "code",
  language: "js",
  input: { n: "${{ inputs.count }}" },
  source: src,
  output_schema: { type: "object", properties: { v: { type: "number" } }, required: ["v"] },
  next,
});
function withCalc(src: string): Doc {
  const b = base();
  b.nodes.fetch.next = "calc";
  b.nodes.calc = codeNode(src);
  return b;
}

/* --------------------------------------------------------------- fixtures */

interface Fx {
  dir: "invalid" | "valid" | "warnings";
  name: string;
  expect: string[];
  expectWarnings?: string[];
  note: string;
  doc?: Doc;
  raw?: string;
}
const fixtures: Fx[] = [];
const bad = (name: string, expect: string[] | string, note: string, build: () => Doc | { raw: string }) => {
  const r: any = build();
  fixtures.push({ dir: "invalid", name, expect: ([] as string[]).concat(expect), note, ...(r.raw !== undefined && Object.keys(r).length === 1 ? { raw: r.raw } : { doc: r }) });
};
const good = (name: string, note: string, build: () => Doc, expectWarnings: string[] = []) =>
  fixtures.push({ dir: "valid", name, expect: [], expectWarnings, note, doc: build() });
const goodRaw = (name: string, note: string, raw: string) => fixtures.push({ dir: "valid", name, expect: [], expectWarnings: [], note, raw });
const warn = (name: string, expectWarnings: string[], note: string, build: () => Doc) =>
  fixtures.push({ dir: "warnings", name, expect: [], expectWarnings, note, doc: build() });

/* ---- L1 ---- */
bad("l1-parse-duplicate-key", "L1_PARSE", "duplicate mapping key", () => ({ raw: 'ursitoare: "0.1"\nflow: a\nflow: b\n' }));
bad("l1-parse-custom-tag", "L1_PARSE", "custom YAML tags are not allowed", () => ({ raw: 'ursitoare: "0.1"\nflow: !!python/object:os.system foo\n' }));
bad("l1-parse-invalid-yaml", "L1_PARSE", "unterminated flow sequence", () => ({ raw: "ursitoare: \"0.1\"\nnodes: [unclosed\n" }));
bad("l1-required-start", "L1_REQUIRED", "missing start", () => { const b = base(); delete b.start; return b; });
bad("l1-required-kind", "L1_REQUIRED", "node without kind", () => { const b = base(); delete b.nodes.done.kind; return b; });
bad("l1-required-block-uses", "L1_REQUIRED", "block without uses", () => { const b = base(); delete b.nodes.fetch.uses; return b; });
bad("l1-required-approval-timeout-case", "L1_REQUIRED", "human.approval cases must map approved, rejected and timeout", () => { const b = approvalBase(); delete b.nodes.approval.cases.timeout; return b; });
bad("l1-additional-property-top", "L1_ADDITIONAL_PROPERTY", "unknown top-level field", () => { const b = base(); b.owner = "me"; return b; });
bad("l1-additional-property-node", "L1_ADDITIONAL_PROPERTY", "unknown node field", () => { const b = base(); b.nodes.fetch.retries = 3; return b; });
bad("l1-additional-property-end-next", "L1_ADDITIONAL_PROPERTY", "end nodes have no successor", () => { const b = base(); b.nodes.done.next = "fetch"; return b; });
bad("l1-type-with-not-object", "L1_TYPE", "with must be an object", () => { const b = base(); b.nodes.fetch.with = "x"; return b; });
bad("l1-type-max-steps-string", "L1_TYPE", "max_steps must be an integer", () => { const b = base(); b.nodes.agent = { kind: "agent", input: {}, goal: "g", tools: ["docs.fetch@1"], max_steps: "5", output_schema: { type: "object" }, next: "done" }; b.nodes.extract.next = "agent"; return b; });
bad("l1-const-ursitoare-number", "L1_CONST", "ursitoare must be the string \"0.1\"", () => { const b = base(); b.ursitoare = 0.1; return b; });
bad("l1-const-language", "L1_CONST", "code language must be js", () => { const b = withCalc("return {v: 1};"); b.nodes.calc.language = "python"; return b; });
bad("l1-enum-end-status", "L1_ENUM", "end status must be completed or failed", () => { const b = base(); b.nodes.done.status = "finished"; return b; });
bad("l1-unknown-kind", "L1_UNKNOWN_KIND", "unknown node kind", () => { const b = base(); b.nodes.done.kind = "http"; return b; });
bad("l1-pattern-node-id", "L1_PATTERN", "node ids are snake_case", () => { const b = base(); b.nodes["Fetch-Doc"] = b.nodes.fetch; delete b.nodes.fetch; b.start = "extract"; return b; });
bad("l1-pattern-duration", "L1_PATTERN", "ISO-8601 duration required", () => { const b = approvalBase(); b.nodes.approval.timeout = "48h"; return b; });
bad("l1-pattern-block-ref", "L1_PATTERN", "uses needs @major", () => { const b = base(); b.nodes.fetch.uses = "docs.fetch"; return b; });
bad("l1-pattern-flow-id", "L1_PATTERN", "flow id must be kebab-case", () => { const b = base(); b.flow = "Invoice_Intake"; return b; });
bad("l1-pattern-version", "L1_PATTERN", "version must be semver", () => { const b = base(); b.version = "1.0"; return b; });
bad("l1-pattern-switch-on-bare", "L1_PATTERN", "switch.on must be a ${{ }} reference", () => { const b = base(); b.nodes.extract.next = "sw"; b.nodes.sw = { kind: "switch", on: "inputs.flag", cases: { "true": "done" }, default: "done" }; return b; });
bad("l1-min-items-tools", "L1_MIN_ITEMS", "agent needs at least one tool", () => { const b = base(); b.nodes.agent = { kind: "agent", input: {}, goal: "g", tools: [], max_steps: 5, output_schema: { type: "object" }, next: "done" }; b.nodes.extract.next = "agent"; return b; });
bad("l1-min-items-outcomes", "L1_MIN_ITEMS", "decide needs at least two outcomes", () => { const b = decideBase(); b.nodes.classify.outcomes = ["urgent"]; return b; });
bad("l1-unique-items-outcomes", "L1_UNIQUE_ITEMS", "outcomes must be unique", () => { const b = decideBase(); b.nodes.classify.outcomes = ["urgent", "urgent"]; return b; });
bad("l1-range-max-steps", "L1_RANGE", "max_steps <= 50", () => { const b = base(); b.nodes.agent = { kind: "agent", input: {}, goal: "g", tools: ["docs.fetch@1"], max_steps: 51, output_schema: { type: "object" }, next: "done" }; b.nodes.extract.next = "agent"; return b; });
bad("l1-range-max-parallel", "L1_RANGE", "max_parallel >= 1", () => { const b = foreachBase(); b.nodes.each.max_parallel = 0; return b; });
bad("l1-min-length-instructions", "L1_MIN_LENGTH", "instructions must not be empty", () => { const b = base(); b.nodes.extract.instructions = ""; return b; });
bad("l1-min-properties-nodes", "L1_MIN_PROPERTIES", "nodes must not be empty", () => { const b = base(); b.nodes = {}; return b; });
bad("l1-foreach-body-both", "L1_FOREACH_BODY", "foreach has both uses and subflow", () => { const b = foreachBase(); b.nodes.each.subflow = "notify-customer@1"; return b; });
bad("l1-foreach-body-neither", "L1_FOREACH_BODY", "foreach has neither uses nor subflow", () => { const b = foreachBase(); delete b.nodes.each.uses; return b; });
bad("l1-invalid-json-schema-output", "L1_INVALID_JSON_SCHEMA", "output_schema has an unknown type name", () => { const b = base(); b.nodes.extract.output_schema = { type: "object", properties: { a: { type: "strin" } } }; return b; });
bad("l1-invalid-json-schema-inputs", "L1_INVALID_JSON_SCHEMA", "inputs.required must be an array", () => { const b = base(); b.inputs = { type: "object", properties: { url: { type: "string" } }, required: "url" }; return b; });
bad("l1-ref-syntax-expression", "L1_REF_SYNTAX", "expressions are not allowed in references", () => { const b = base(); b.nodes.fetch.with.url = "${{ inputs.url + 1 }}"; return b; });
bad("l1-ref-syntax-index", "L1_REF_SYNTAX", "indexing is not allowed", () => { const b = foreachBase(); b.nodes.each.items = "${{ nodes.inbox.output.messages[0] }}"; return b; });
bad("l1-ref-syntax-unterminated", "L1_REF_SYNTAX", "unterminated reference", () => { const b = base(); b.nodes.fetch.with.url = "${{ inputs.url"; return b; });
bad("l1-ref-syntax-unknown-root", "L1_REF_SYNTAX", "reference must start with inputs, nodes or item", () => { const b = base(); b.nodes.fetch.with.url = "${{ env.url }}"; return b; });
bad("l1-ref-syntax-output-no-path", "L1_REF_SYNTAX", "nodes.<id>.output needs a path", () => { const b = base(); b.nodes.done.output = { x: "${{ nodes.extract.output }}" }; return b; });
bad("l1-ref-syntax-nodes-no-output-segment", "L1_REF_SYNTAX", "nodes.<id>.<field> must go through output", () => { const b = base(); b.nodes.done.output = { x: "${{ nodes.extract.summary }}" }; return b; });
bad("l1-ref-not-allowed-instructions", "L1_REF_NOT_ALLOWED", "instructions are plain text", () => { const b = base(); b.nodes.extract.instructions = "Extract from ${{ nodes.fetch.output.content }}"; return b; });
bad("l1-ref-not-allowed-source", "L1_REF_NOT_ALLOWED", "code source is plain JavaScript", () => withCalc('return {v: Number("${{ inputs.count }}")};'));
bad("l1-code-syntax", "L1_CODE_SYNTAX", "source does not parse", () => withCalc("return {v: ;"));
bad("l1-code-syntax-import", "L1_CODE_SYNTAX", "import declarations are not allowed", () => withCalc("import x from 'y'; return {v: 1};"));
bad("l1-code-no-return", "L1_CODE_NO_RETURN", "source never returns", () => withCalc("const v = input.n + 1;"));
bad("l1-code-return-only-nested", "L1_CODE_NO_RETURN", "return inside a nested function does not count", () => withCalc("const f = () => { return 1; }; f();"));

/* ---- L2 ---- */
bad("l2-unknown-block", "L2_UNKNOWN_BLOCK", "block not in the catalogue", () => { const b = base(); b.nodes.fetch.uses = "docs.read@1"; return b; });
bad("l2-unknown-block-major", "L2_UNKNOWN_BLOCK", "block exists only at major 1", () => { const b = base(); b.nodes.fetch.uses = "docs.fetch@2"; return b; });
bad("l2-unknown-block-agent-tool", "L2_UNKNOWN_BLOCK", "agent tool not in the catalogue", () => { const b = base(); b.nodes.agent = { kind: "agent", input: {}, goal: "g", tools: ["docs.fetch@1", "nope.tool@1"], max_steps: 5, output_schema: { type: "object" }, next: "done" }; b.nodes.extract.next = "agent"; return b; });
bad("l2-unknown-block-foreach", "L2_UNKNOWN_BLOCK", "foreach.uses not in the catalogue", () => { const b = foreachBase(); b.nodes.each.uses = "crm.find_everyone@1"; return b; });
bad("l2-with-missing-required", "L2_WITH_MISSING_REQUIRED", "docs.fetch needs url", () => { const b = base(); b.nodes.fetch.with = {}; return b; });
bad("l2-with-unknown-param", "L2_WITH_UNKNOWN_PARAM", "docs.fetch has no param 'path'", () => { const b = base(); b.nodes.fetch.with.path = "/x"; return b; });
bad("l2-with-missing-required-foreach", "L2_WITH_MISSING_REQUIRED", "foreach block with missing required", () => { const b = foreachBase(); b.nodes.each.with = {}; return b; });
bad("l2-with-unknown-param-subflow", "L2_WITH_UNKNOWN_PARAM", "notify-customer@1 has no param 'channel'", () => { const b = base(); b.nodes.extract.next = "sub"; b.nodes.sub = { kind: "subflow", flow: "notify-customer@1", with: { customer_id: "c1", message: "hi", channel: "x" }, next: "done" }; return b; });
bad("l2-unknown-role", "L2_UNKNOWN_ROLE", "role not in the catalogue", () => { const b = approvalBase(); b.nodes.approval.assignee_role = "cfo"; return b; });
bad("l2-unknown-delegate-target", "L2_UNKNOWN_DELEGATE_TARGET", "delegate target does not exist", () => { const b = base(); b.nodes.extract.next = "dl"; b.nodes.dl = { kind: "delegate", target: "zapier", workflow: "archive-invoice", with: {}, callback_timeout: "PT1H", next: "done", on_timeout: "done" }; return b; });
bad("l2-unknown-delegate-workflow", "L2_UNKNOWN_DELEGATE_WORKFLOW", "workflow not offered by n8n", () => { const b = base(); b.nodes.extract.next = "dl"; b.nodes.dl = { kind: "delegate", target: "n8n", workflow: "do-everything", with: {}, callback_timeout: "PT1H", next: "done", on_timeout: "done" }; return b; });
bad("l2-unknown-flow-subflow", "L2_UNKNOWN_FLOW", "flow not in the registry", () => { const b = base(); b.nodes.extract.next = "sub"; b.nodes.sub = { kind: "subflow", flow: "notify-customer@2", with: { customer_id: "c1", message: "hi" }, next: "done" }; return b; });
bad("l2-unknown-flow-foreach", "L2_UNKNOWN_FLOW", "foreach subflow not in the registry", () => { const b = foreachBase(); delete b.nodes.each.uses; b.nodes.each.subflow = "ghost@1"; return b; });
bad("l2-unknown-model-profile", "L2_UNKNOWN_MODEL_PROFILE", "profile not in the catalogue", () => { const b = base(); b.nodes.extract.model_profile = "turbo"; return b; });
bad("l2-start-unknown", "L2_START_UNKNOWN", "start names no node", () => { const b = base(); b.start = "nowhere"; return b; });
bad("l2-unknown-successor", ["L2_UNKNOWN_SUCCESSOR", "L2_UNREACHABLE_NODE"], "next names no node (rest becomes unreachable)", () => { const b = base(); b.nodes.fetch.next = "nowhere"; return b; });
bad("l2-unknown-successor-decide-case", ["L2_UNKNOWN_SUCCESSOR", "L2_UNREACHABLE_NODE"], "decide case points nowhere (log becomes unreachable)", () => { const b = decideBase(); b.nodes.classify.cases.routine = "nowhere"; return b; });
bad("l2-missing-successor", ["L2_MISSING_SUCCESSOR", "L2_UNREACHABLE_NODE"], "block without next (end becomes unreachable)", () => { const b = base(); delete b.nodes.extract.next; return b; });
bad("l2-missing-successor-delegate-on-timeout", "L2_MISSING_SUCCESSOR", "delegate needs on_timeout", () => { const b = base(); b.nodes.extract.next = "dl"; b.nodes.dl = { kind: "delegate", target: "n8n", workflow: "archive-invoice", with: {}, callback_timeout: "PT1H", next: "done" }; return b; });
bad("l2-unreachable-node", "L2_UNREACHABLE_NODE", "orphan node", () => { const b = base(); b.nodes.orphan = { kind: "end", status: "failed" }; return b; });
bad("l2-cycle", ["L2_CYCLE", "L2_UNREACHABLE_NODE"], "extract loops back to fetch", () => { const b = base(); b.nodes.extract.next = "fetch"; return b; });
bad("l2-cycle-self-loop", ["L2_CYCLE", "L2_UNREACHABLE_NODE"], "wait loops to itself (done becomes unreachable)", () => { const b = base(); b.nodes.extract.next = "w"; b.nodes.w = { kind: "wait", duration: "PT1S", next: "w" }; return b; });
bad("l2-no-end", ["L2_MISSING_SUCCESSOR", "L2_NO_END"], "no end node anywhere", () => { const b = base(); delete b.nodes.done; delete b.nodes.extract.next; return b; });
bad("l2-decide-case-missing", "L2_DECIDE_CASE_MISSING", "outcome 'unsure' is not mapped", () => { const b = decideBase(); b.nodes.classify.outcomes = ["urgent", "routine", "unsure"]; return b; });
bad("l2-decide-case-extra", "L2_DECIDE_CASE_EXTRA", "case 'spam' is not an outcome", () => { const b = decideBase(); b.nodes.classify.cases.spam = "log"; return b; });

/* ---- L3: references ---- */
bad("l3-ref-unknown-node", "L3_REF_UNKNOWN_NODE", "reference to a node that does not exist", () => { const b = base(); b.nodes.done.output = { x: "${{ nodes.ghost.output.a }}" }; return b; });
bad("l3-ref-unknown-path-node", "L3_REF_UNKNOWN_PATH", "field not in the producer's output schema", () => { const b = base(); b.nodes.done.output = { x: "${{ nodes.extract.output.nope }}" }; return b; });
bad("l3-ref-unknown-path-inputs", "L3_REF_UNKNOWN_PATH", "field not in flow inputs", () => { const b = base(); b.nodes.fetch.with.url = "${{ inputs.link }}"; return b; });
bad("l3-ref-unknown-path-block-output", "L3_REF_UNKNOWN_PATH", "field not in catalogue output", () => { const b = base(); b.nodes.extract.input.text = "${{ nodes.fetch.output.body }}"; return b; });
bad("l3-ref-unknown-path-through-array", "L3_REF_UNKNOWN_PATH", "cannot index into arrays", () => { const b = base(); b.nodes.done.output = { x: "${{ nodes.extract.output.tags.first }}" }; return b; });
bad("l3-ref-unknown-path-open-object", "L3_REF_UNKNOWN_PATH", "delegate result has no declared fields", () => { const b = base(); b.nodes.extract.next = "dl"; b.nodes.dl = { kind: "delegate", target: "n8n", workflow: "archive-invoice", with: {}, callback_timeout: "PT1H", next: "done", on_timeout: "late" }; b.nodes.late = { kind: "end", status: "failed" }; b.nodes.done.output = { x: "${{ nodes.dl.output.result.id }}" }; return b; });
bad("l3-ref-no-output", "L3_REF_NO_OUTPUT", "wait nodes produce no output", () => { const b = base(); b.nodes.extract.next = "w"; b.nodes.w = { kind: "wait", duration: "PT1S", next: "done" }; b.nodes.done.output = { x: "${{ nodes.w.output.a }}" }; return b; });
bad("l3-ref-outcome-not-decide", "L3_REF_OUTCOME_NOT_DECIDE", ".outcome only exists on llm.decide", () => { const b = base(); b.nodes.done.output = { x: "${{ nodes.extract.outcome }}" }; return b; });
bad("l3-item-outside-foreach", "L3_ITEM_OUTSIDE_FOREACH", "item.* outside foreach.with", () => { const b = base(); b.nodes.fetch.with.url = "${{ item.url }}"; return b; });
bad("l3-item-in-foreach-items", "L3_ITEM_OUTSIDE_FOREACH", "item.* is not available in foreach.items", () => { const b = foreachBase(); b.nodes.each.items = "${{ item.messages }}"; return b; });
bad("l3-item-unknown-path", "L3_REF_UNKNOWN_PATH", "item has no such field", () => { const b = foreachBase(); b.nodes.each.with.email = "${{ item.sender }}"; return b; });
bad("l3-not-dominating-one-branch", "L3_REF_NOT_DOMINATING", "alert runs on one branch of the decide only", () => { const b = decideBase(); b.nodes.done.output = { posted: "${{ nodes.alert.output.ts }}" }; return b; });
bad("l3-not-dominating-self", "L3_REF_NOT_DOMINATING", "node reads its own output", () => { const b = decideBase(); b.nodes.alert.with.text = "${{ nodes.alert.output.ts }}"; return b; });
bad("l3-not-dominating-downstream", "L3_REF_NOT_DOMINATING", "reference to a node that runs later", () => { const b = base(); b.nodes.fetch.with.url = "${{ nodes.extract.output.summary }}"; return b; });
bad("l3-not-dominating-sibling-branch", "L3_REF_NOT_DOMINATING", "log reads alert, which is on the other branch", () => { const b = decideBase(); b.nodes.log.with.values = ["${{ nodes.alert.output.ts }}"]; return b; });
bad("l3-not-dominating-timeout-edge", "L3_REF_NOT_DOMINATING", "the timeout branch carries no approval output", () => { const b = approvalBase(); b.nodes.expire.with.body = "${{ nodes.approval.output.comment }}"; return b; });
bad("l3-not-dominating-after-join", "L3_REF_NOT_DOMINATING", "end after a decide reads one branch's output", () => { const b = decideBase(); b.nodes.done.output = { posted: "${{ nodes.log.output.row }}" }; return b; });

bad("l3-not-dominating-delegate-timeout-edge", "L3_REF_NOT_DOMINATING", "delegate result is not available when both branches join", () => { const b = base(); b.nodes.extract.next = "dl"; b.nodes.dl = { kind: "delegate", target: "n8n", workflow: "archive-invoice", with: {}, callback_timeout: "PT1H", next: "done", on_timeout: "done" }; b.nodes.done.output = { x: "${{ nodes.dl.output.correlation_id }}" }; return b; });

/* ---- L3: types ---- */
bad("l3-type-mismatch-string-into-number", "L3_TYPE_MISMATCH", "string where number expected", () => { const b = base(); b.nodes.extract.next = "pay"; b.nodes.pay = { kind: "block", uses: "erp.create_payment@1", with: { vendor_id: "v1", amount: "${{ nodes.extract.output.summary }}", currency: "EUR", reference: "r" }, next: "done" }; return b; });
bad("l3-type-mismatch-number-into-integer", "L3_TYPE_MISMATCH", "number is not accepted where integer is declared", () => { const b = foreachBase(); b.nodes.inbox.with.max = "${{ inputs.amount }}"; return b; });
bad("l3-type-mismatch-template-into-integer", "L3_TYPE_MISMATCH", "template strings are text", () => { const b = foreachBase(); b.nodes.inbox.with.max = "${{ inputs.count }} items"; return b; });
bad("l3-type-mismatch-literal-string-into-integer", "L3_TYPE_MISMATCH", "literal '5' is a string", () => { const b = foreachBase(); b.nodes.inbox.with.max = "5"; return b; });
bad("l3-type-mismatch-literal-null", "L3_TYPE_MISMATCH", "null into string", () => { const b = base(); b.nodes.fetch.with.url = null; return b; });
bad("l3-type-mismatch-array-into-string", "L3_TYPE_MISMATCH", "array into string param", () => { const b = base(); b.nodes.fetch.with.url = "${{ inputs.ids }}"; return b; });
bad("l3-type-mismatch-array-items", "L3_TYPE_MISMATCH", "array of numbers into array of strings", () => { const b = decideBase(); b.nodes.log.with.values = [1, 2]; return b; });
bad("l3-type-mismatch-foreach-items-not-array", "L3_TYPE_MISMATCH", "foreach over a string", () => { const b = foreachBase(); b.nodes.each.items = "${{ inputs.url }}"; return b; });
bad("l3-enum-violation-literal", "L3_ENUM_VIOLATION", "priority 'critical' is not in the enum", () => { const b = base(); b.nodes.extract.next = "tk"; b.nodes.tk = { kind: "block", uses: "crm.create_ticket@1", with: { customer_id: "c1", subject: "s", priority: "critical", body: "b" }, next: "done" }; return b; });
bad("l3-enum-violation-ref", "L3_ENUM_VIOLATION", "order status values are not ticket statuses", () => {
  const b = base();
  b.nodes.fetch = { kind: "block", uses: "orders.get@1", with: { order_id: "o1" }, next: "tk" };
  b.nodes.tk = { kind: "block", uses: "crm.update_ticket@1", with: { ticket_id: "t1", status: "${{ nodes.fetch.output.status }}" }, next: "done" };
  delete b.nodes.extract;
  return b;
});
bad("l3-enum-violation-decide-outcome", "L3_ENUM_VIOLATION", "decide outcomes are not valid ticket priorities", () => {
  const b = decideBase();
  b.nodes.alert = { kind: "block", uses: "crm.create_ticket@1", with: { customer_id: "c1", subject: "s", priority: "${{ nodes.classify.outcome }}", body: "b" }, next: "done" };
  return b;
});

/* ---- L3: switch ---- */
const switchBase = (onRef: string, cases: Record<string, string>): Doc => {
  const b = base();
  b.nodes.extract.next = "sw";
  b.nodes.sw = { kind: "switch", on: onRef, cases, default: "done" };
  b.nodes.other = { kind: "end", status: "failed" };
  return b;
};
bad("l3-switch-on-type-object", "L3_SWITCH_ON_TYPE", "cannot switch on an array", () => switchBase("${{ nodes.extract.output.tags }}", { x: "other" }));
bad("l3-switch-key-boolean", "L3_SWITCH_KEY_INCOMPATIBLE", "boolean cases are 'true' / 'false'", () => switchBase("${{ nodes.extract.output.urgent }}", { yes: "other" }));
bad("l3-switch-key-integer", "L3_SWITCH_KEY_INCOMPATIBLE", "integer switch with a non-numeric key", () => switchBase("${{ nodes.extract.output.count }}", { many: "other" }));
bad("l3-switch-key-enum", "L3_SWITCH_KEY_INCOMPATIBLE", "key not among the decide outcomes", () => {
  const b = decideBase();
  b.nodes.alert = { kind: "switch", on: "${{ nodes.classify.outcome }}", cases: { critical: "log" }, default: "done" };
  return b;
});

/* ---- L3: taint ---- */
const sendBody = (body: string): Doc => {
  const b = base();
  delete b.nodes.extract;
  b.nodes.fetch.next = "send";
  b.nodes.send = { kind: "block", uses: "mail.send@1", with: { to: "ops@example.com", subject: "Digest", body }, next: "done" };
  return b;
};
bad("l3-taint-raw-fetch-into-mail-body", "L3_TAINT_TO_CONSEQUENTIAL", "docs.fetch content straight into mail.send body", () => sendBody("${{ nodes.fetch.output.content }}"));
bad("l3-taint-in-template", "L3_TAINT_TO_CONSEQUENTIAL", "untrusted content inside a template", () => sendBody("Fetched: ${{ nodes.fetch.output.content }}"));
bad("l3-taint-via-generate", "L3_TAINT_TO_CONSEQUENTIAL", "llm.generate does not clean untrusted input", () => {
  const b = sendBody("${{ nodes.gen.output.text }}");
  b.nodes.fetch.next = "gen";
  b.nodes.gen = { kind: "llm.generate", input: { doc: "${{ nodes.fetch.output.content }}" }, instructions: "Summarise.", output_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }, next: "send" };
  return b;
});
bad("l3-taint-via-decide-rationale", "L3_TAINT_TO_CONSEQUENTIAL", "decide rationale is free text derived from untrusted input", () => {
  const b = decideBase();
  b.nodes.extract.input.text = "ok";
  b.nodes.fetch.next = "classify";
  delete b.nodes.extract;
  b.nodes.classify.input = { doc: "${{ nodes.fetch.output.content }}" };
  b.nodes.alert.with.text = "${{ nodes.classify.output.rationale }}";
  b.nodes.log.with.values = ["x"];
  return b;
});
bad("l3-taint-write-effect", "L3_TAINT_TO_CONSEQUENTIAL", "write effects count as consequential", () => {
  const b = decideBase();
  b.nodes.fetch.next = "classify";
  delete b.nodes.extract;
  b.nodes.classify.input = { x: "${{ inputs.url }}" };
  b.nodes.alert.with.text = "x";
  b.nodes.log.with.values = ["${{ nodes.fetch.output.content }}"];
  return b;
});
bad("l3-taint-nested-in-object-param", "L3_TAINT_TO_CONSEQUENTIAL", "untrusted content nested in an object parameter", () => {
  const b = base();
  delete b.nodes.extract;
  b.nodes.fetch.next = "post";
  b.nodes.post = { kind: "block", uses: "http.post@1", with: { url: "https://example.com/hook", json: { text: "${{ nodes.fetch.output.content }}" } }, next: "done" };
  return b;
});
bad("l3-taint-foreach-item", "L3_TAINT_TO_CONSEQUENTIAL", "item.* from untrusted messages into an effectful block", () => {
  const b = foreachBase();
  b.nodes.each = { kind: "foreach", items: "${{ nodes.inbox.output.messages }}", uses: "slack.post_message@1", with: { channel: "#ops", text: "${{ item.body }}" }, next: "done" };
  return b;
});
bad("l3-taint-to-agent-with-effects", "L3_TAINT_TO_AGENT_WITH_EFFECTS", "untrusted input to an agent that can send mail", () => {
  const b = base();
  delete b.nodes.extract;
  b.nodes.fetch.next = "agent";
  b.nodes.agent = { kind: "agent", input: { doc: "${{ nodes.fetch.output.content }}" }, goal: "Handle the document.", tools: ["kb.search@1", "mail.send@1"], max_steps: 5, output_schema: { type: "object", properties: { done: { type: "boolean" } } }, next: "done" };
  return b;
});

/* ---- valid (both directions) ---- */
good("rf-1-like-minimal", "smallest sensible flow", () => base(), []);
good("taint-via-extract-passes", "same data as l3-taint-raw-fetch-into-mail-body, routed through llm.extract", () => {
  const b = base();
  b.nodes.extract.next = "send";
  b.nodes.send = { kind: "block", uses: "mail.send@1", with: { to: "ops@example.com", subject: "Digest", body: "${{ nodes.extract.output.summary }}" }, next: "done" };
  return b;
});
good("taint-via-code-passes", "code clears the label", () => {
  const b = sendBody("${{ nodes.calc.output.v }}");
  b.nodes.fetch.next = "calc";
  b.nodes.calc = { kind: "code", language: "js", input: { text: "${{ nodes.fetch.output.content }}" }, source: "return { v: input.text.slice(0, 10) };", output_schema: { type: "object", properties: { v: { type: "string" } }, required: ["v"] }, next: "send" };
  return b;
});
good("taint-generate-from-extracted-passes", "generate over extracted data stays clean", () => {
  const b = base();
  b.nodes.extract.next = "gen";
  b.nodes.gen = { kind: "llm.generate", input: { s: "${{ nodes.extract.output.summary }}" }, instructions: "Write a short note.", output_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }, next: "send" };
  b.nodes.send = { kind: "block", uses: "mail.send@1", with: { to: "ops@example.com", subject: "Note", body: "${{ nodes.gen.output.text }}" }, next: "done" };
  return b;
});
good("taint-untrusted-into-read-block-passes", "read blocks may take untrusted arguments", () => {
  const b = base();
  delete b.nodes.extract;
  b.nodes.fetch.next = "kb";
  b.nodes.kb = { kind: "block", uses: "kb.search@1", with: { query: "${{ nodes.fetch.output.content }}" }, next: "done" };
  return b;
});
good("taint-untrusted-into-llm-and-human-passes", "untrusted into llm.decide input, switch, approval summary is fine", () => {
  const b = approvalBase();
  b.nodes.approval.summary = "Review: ${{ nodes.fetch.output.content }}";
  b.nodes.extract.next = "approval";
  return b;
});
good("taint-decide-outcome-is-clean", "outcome is one of fixed labels; usable in a send", () => {
  const b = decideBase();
  delete b.nodes.extract;
  b.nodes.fetch.next = "classify";
  b.nodes.classify.input = { doc: "${{ nodes.fetch.output.content }}" };
  b.nodes.alert.with.text = "Classified as ${{ nodes.classify.outcome }}";
  b.nodes.log.with.values = ["x"];
  return b;
}, []);
good("taint-agent-readonly-with-untrusted-input", "read-only agent may take untrusted input", () => {
  const b = base();
  delete b.nodes.extract;
  b.nodes.fetch.next = "agent";
  b.nodes.agent = { kind: "agent", input: { doc: "${{ nodes.fetch.output.content }}" }, goal: "Look things up.", tools: ["kb.search@1", "crm.find_customer@1"], max_steps: 5, output_schema: { type: "object", properties: { answer: { type: "string" } }, required: ["answer"] }, next: "done" };
  return b;
});
good("dominance-before-branch-ok", "producer before the decide dominates both branches and the end", () => {
  const b = decideBase();
  b.nodes.done.output = { summary: "${{ nodes.extract.output.summary }}", verdict: "${{ nodes.classify.outcome }}", rationale: "${{ nodes.classify.output.rationale }}" };
  return b;
});
good("dominance-approval-rejected-branch-has-output", "approved and rejected branches carry the approval output", () => {
  const b = approvalBase();
  b.nodes.decline.with.body = "Rejected by ${{ nodes.approval.output.approver }}: ${{ nodes.approval.output.comment }}";
  b.nodes.grant.with.body = "Decision ${{ nodes.approval.output.decision }}";
  return b;
});
good("dominance-join-after-both-branches-same-producer", "both branches pass through the same upstream producer", () => {
  const b = decideBase();
  b.nodes.log.with.values = ["${{ nodes.extract.output.summary }}", "${{ nodes.classify.outcome }}"];
  return b;
});
good("types-integer-into-number", "integer ref into number param", () => {
  const b = base();
  b.nodes.extract.next = "pay";
  b.nodes.pay = { kind: "block", uses: "erp.create_payment@1", with: { vendor_id: "v1", amount: "${{ nodes.extract.output.count }}", currency: "EUR", reference: "ref ${{ inputs.url }}" }, next: "done" };
  return b;
});
good("types-literals-and-enum", "literals of the right type; enum literal; array literal with refs", () => {
  const b = base();
  b.nodes.extract.next = "tk";
  b.nodes.tk = { kind: "block", uses: "crm.create_ticket@1", with: { customer_id: "c1", subject: "Hello ${{ nodes.extract.output.summary }}", priority: "urgent", body: "b" }, next: "cal" };
  b.nodes.cal = { kind: "block", uses: "calendar.create_event@1", with: { title: "t", start: "2026-01-01T10:00:00Z", end: "2026-01-01T11:00:00Z", attendees: ["a@example.com", "${{ inputs.email }}"] }, next: "done" };
  return b;
});
good("types-decide-outcome-into-enum-subset", "decide outcomes that are a subset of the param enum", () => {
  const b = decideBase();
  b.nodes.classify.outcomes = ["urgent", "low"];
  b.nodes.classify.cases = { urgent: "alert", low: "log" };
  b.nodes.alert = { kind: "block", uses: "crm.create_ticket@1", with: { customer_id: "c1", subject: "s", priority: "${{ nodes.classify.outcome }}", body: "b" }, next: "done" };
  return b;
});
good("switch-boolean", "switch on a boolean with true/false keys", () => switchBase("${{ nodes.extract.output.urgent }}", { "true": "other", "false": "done" }));
good("switch-integer-and-string", "integer keys, then string switch", () => {
  const b = switchBase("${{ nodes.extract.output.count }}", { "0": "other", "-1": "other", "42": "done" });
  return b;
});
good("switch-on-decide-outcome", "keys within the decide outcomes", () => {
  const b = decideBase();
  b.nodes.alert = { kind: "switch", on: "${{ nodes.classify.outcome }}", cases: { urgent: "log" }, default: "done" };
  return b;
});
good("foreach-block-items-and-results", "foreach with item.* and a downstream use of results", () => {
  const b = foreachBase();
  b.nodes.each.next = "sum";
  b.nodes.sum = { kind: "code", language: "js", input: { customers: "${{ nodes.each.output.results }}" }, source: "return { n: input.customers.length };", output_schema: { type: "object", properties: { n: { type: "integer" } }, required: ["n"] }, next: "done" };
  b.nodes.done.output = { n: "${{ nodes.sum.output.n }}" };
  return b;
}, []);
good("foreach-bare-item-primitive-array", "bare ${{ item }} over an array of strings", () => {
  const b = base();
  b.start = "each";
  delete b.nodes.fetch;
  delete b.nodes.extract;
  b.nodes.each = { kind: "foreach", items: "${{ inputs.ids }}", uses: "orders.get@1", with: { order_id: "${{ item }}" }, max_parallel: 4, next: "done" };
  return b;
});
good("foreach-subflow", "foreach calling a registry subflow", () => {
  const b = foreachBase();
  b.nodes.inbox = { kind: "block", uses: "calendar.find_slots@1", with: { attendees: ["a@example.com"], duration_minutes: 30 }, next: "each" };
  b.nodes.each = { kind: "foreach", items: "${{ nodes.inbox.output.slots }}", subflow: "notify-customer@1", with: { customer_id: "c1", message: "Slot ${{ item.start }}" }, next: "done" };
  return b;
});
good("subflow-and-output", "subflow node, then its output", () => {
  const b = base();
  b.nodes.extract.next = "sub";
  b.nodes.sub = { kind: "subflow", flow: "notify-customer@1", with: { customer_id: "c1", message: "${{ nodes.extract.output.summary }}" }, next: "done" };
  b.nodes.done.output = { delivered: "${{ nodes.sub.output.delivered }}" };
  return b;
});
good("delegate-with-outputs-and-timeout-branch", "delegate: next gets result, on_timeout does not", () => {
  const b = base();
  b.nodes.extract.next = "dl";
  b.nodes.dl = { kind: "delegate", target: "n8n", workflow: "sync-crm", with: { n: "${{ nodes.extract.output.count }}" }, callback_timeout: "PT30M", next: "ok", on_timeout: "late" };
  b.nodes.ok = { kind: "end", status: "completed", output: { corr: "${{ nodes.dl.output.correlation_id }}", r: "${{ nodes.dl.output.result }}" } };
  b.nodes.late = { kind: "end", status: "failed" };
  delete b.nodes.done;
  return b;
});
good("human-form", "human.form output follows form_schema", () => {
  const b = base();
  b.nodes.extract.next = "frm";
  b.nodes.frm = { kind: "human.form", assignee_role: "support-agent", form_schema: { type: "object", properties: { reason: { type: "string" }, qty: { type: "integer" } }, required: ["reason"] }, timeout: "P1D", next: "mail", on_timeout: "late" };
  b.nodes.mail = { kind: "block", uses: "mail.send@1", with: { to: "a@example.com", subject: "s", body: "${{ nodes.frm.output.reason }}" }, next: "done" };
  b.nodes.late = { kind: "end", status: "failed" };
  return b;
});
good("agent-readonly-and-wait", "agent with read tools; wait; failed end with output", () => {
  const b = base();
  b.nodes.extract.next = "agent";
  b.nodes.agent = { kind: "agent", input: { q: "${{ nodes.extract.output.summary }}" }, goal: "Answer the question using the knowledge base.", tools: ["kb.search@1"], max_steps: 10, output_schema: { type: "object", properties: { answer: { type: "string" } }, required: ["answer"] }, model_profile: "careful", next: "w" };
  b.nodes.w = { kind: "wait", duration: "PT1H30M", next: "done" };
  b.nodes.done = { kind: "end", status: "failed", output: { a: "${{ nodes.agent.output.answer }}" } };
  return b;
});
good("agent-with-effects-and-trusted-input", "agent may have effectful tools if its input is clean", () => {
  const b = base();
  b.nodes.extract.next = "agent";
  b.nodes.agent = { kind: "agent", input: { q: "${{ nodes.extract.output.summary }}" }, goal: "Notify the team.", tools: ["slack.post_message@1"], max_steps: 3, output_schema: { type: "object" }, next: "done" };
  return b;
});
good("json-literals-in-values", "numbers, booleans, nested object in http.post json", () => {
  const b = base();
  b.nodes.extract.next = "post";
  b.nodes.post = { kind: "block", uses: "http.post@1", with: { url: "https://example.com/hook", json: { n: 1, ok: true, nested: { s: "${{ nodes.extract.output.summary }}", list: [1, 2, "${{ nodes.extract.output.count }}"] } } }, next: "done" };
  return b;
});
good("ref-whitespace-variants", "any whitespace inside ${{ }} is accepted", () => {
  const b = base();
  b.nodes.fetch.with.url = "${{inputs.url}}";
  b.nodes.extract.input.text = "${{   nodes.fetch.output.content   }}";
  return b;
});
good("model-profiles", "all catalogue model profiles accepted", () => {
  const b = base();
  b.nodes.extract.model_profile = "fast";
  b.nodes.extract.next = "gen";
  b.nodes.gen = { kind: "llm.generate", input: { s: "${{ nodes.extract.output.summary }}" }, instructions: "Rewrite.", output_schema: { type: "object", properties: { t: { type: "string" } }, required: ["t"] }, model_profile: "careful", next: "done" };
  return b;
});

goodRaw("yaml-unquoted-keys", "unquoted true/false/integer case keys and an `on:` key are plain strings (YAML 1.2)", `ursitoare: "0.1"
flow: yaml-keys
version: 1.0.0
inputs:
  type: object
  properties:
    flag: { type: boolean }
    count: { type: integer }
  required: [flag, count]
start: pick
nodes:
  pick:
    kind: switch
    on: "\${{ inputs.flag }}"
    cases:
      true: by_count
      false: stop
    default: stop
  by_count:
    kind: switch
    on: "\${{ inputs.count }}"
    cases:
      0: stop
      -1: stop
      42: done
    default: stop
  done:
    kind: end
    status: completed
  stop:
    kind: end
    status: failed
`);
bad("l2-unknown-delegate-target-prototype-name", "L2_UNKNOWN_DELEGATE_TARGET", "inherited property names are not targets", () => { const b = base(); b.nodes.extract.next = "dl"; b.nodes.dl = { kind: "delegate", target: "constructor", workflow: "archive-invoice", with: {}, callback_timeout: "PT1H", next: "done", on_timeout: "done" }; return b; });
bad("l3-ref-unknown-node-prototype-name", "L3_REF_UNKNOWN_NODE", "'constructor' is not a node", () => { const b = base(); b.nodes.done.output = { x: "${{ nodes.constructor.output.a }}" }; return b; });
bad("l3-ref-unknown-path-prototype-key", "L3_REF_UNKNOWN_PATH", "'constructor' is not an input", () => { const b = base(); b.nodes.fetch.with.url = "${{ inputs.constructor }}"; return b; });

/* ---- warnings ---- */
const trifecta = (): Doc => {
  const b = base();
  delete b.nodes.extract;
  b.nodes.fetch.next = "cust";
  b.nodes.cust = { kind: "block", uses: "crm.find_customer@1", with: { email: "a@example.com" }, next: "msg" };
  b.nodes.msg = { kind: "block", uses: "slack.post_message@1", with: { channel: "#ops", text: "hello" }, next: "done" };
  return b;
};
warn("trifecta-all-three", ["W_LETHAL_TRIFECTA"], "untrusted read + private read + send", trifecta);
warn("trifecta-via-pay", ["W_LETHAL_TRIFECTA"], "pay counts as exfiltration", () => { const b = trifecta(); b.nodes.msg = { kind: "block", uses: "orders.refund@1", with: { order_id: "o", amount: 1, reason: "r" }, next: "done" }; return b; });
warn("trifecta-via-agent-tools", ["W_LETHAL_TRIFECTA"], "agent tool allowlists count", () => {
  const b = base();
  delete b.nodes.extract;
  b.nodes.fetch.next = "agent";
  b.nodes.agent = { kind: "agent", input: { q: "${{ inputs.email }}" }, goal: "Help.", tools: ["docs.fetch@1", "kb.search@1", "mail.send@1"], max_steps: 3, output_schema: { type: "object" }, next: "done" };
  return b;
});
warn("trifecta-absent-no-send", [], "write only: no send/pay", () => { const b = trifecta(); b.nodes.msg = { kind: "block", uses: "docs.create@1", with: { title: "t", content: "c" }, next: "done" }; return b; });
warn("trifecta-absent-no-private", [], "public web fetch only is not private data", () => { const b = trifecta(); delete b.nodes.cust; b.nodes.fetch.next = "msg"; return b; });
warn("trifecta-absent-no-untrusted", [], "no untrusted source", () => { const b = trifecta(); b.nodes.fetch = { kind: "block", uses: "kb.search@1", with: { query: "q" }, next: "cust" }; return b; });
warn("optional-reference", ["W_OPTIONAL_REFERENCE"], "extract.note is not required", () => { const b = base(); b.nodes.extract.next = "sl"; b.nodes.sl = { kind: "block", uses: "slack.post_message@1", with: { channel: "#ops", text: "${{ nodes.extract.output.note }}" }, next: "done" }; return b; });
warn("optional-reference-input", ["W_OPTIONAL_REFERENCE"], "inputs.email is not in required", () => { const b = base(); b.inputs.required = ["url"]; b.nodes.extract.next = "sl"; b.nodes.sl = { kind: "block", uses: "slack.post_message@1", with: { channel: "#ops", text: "${{ inputs.email }}" }, next: "done" }; return b; });
warn("suspicious-interpolation-bare", ["W_SUSPICIOUS_INTERPOLATION"], "bare reference without ${{ }}", () => { const b = base(); b.nodes.fetch.with.url = "inputs.url"; return b; });
warn("suspicious-interpolation-mustache", ["W_SUSPICIOUS_INTERPOLATION"], "{{ }} is not reference syntax", () => { const b = base(); b.nodes.extract.next = "sl"; b.nodes.sl = { kind: "block", uses: "slack.post_message@1", with: { channel: "#ops", text: "Hi {{ nodes.extract.output.summary }}" }, next: "done" }; return b; });
warn("code-forbidden-api", ["W_CODE_FORBIDDEN_API"], "Math.random and Date in code", () => withCalc("return { v: Math.random() + Date.now() };"));
warn("taint-to-opaque-subflow", ["W_TAINT_TO_OPAQUE_CALL"], "untrusted into a subflow input", () => {
  const b = base();
  delete b.nodes.extract;
  b.nodes.fetch.next = "sub";
  b.nodes.sub = { kind: "subflow", flow: "notify-customer@1", with: { customer_id: "c1", message: "${{ nodes.fetch.output.content }}" }, next: "done" };
  return b;
});
warn("taint-to-opaque-delegate", ["W_TAINT_TO_OPAQUE_CALL"], "untrusted into a delegate", () => {
  const b = base();
  delete b.nodes.extract;
  b.nodes.fetch.next = "dl";
  b.nodes.dl = { kind: "delegate", target: "n8n", workflow: "generate-report", with: { text: "${{ nodes.fetch.output.content }}" }, callback_timeout: "PT1H", next: "done", on_timeout: "done" };
  return b;
});

/* ----------------------------------------------------------------- write */
for (const d of ["invalid", "valid", "warnings"]) {
  mkdirSync(join(root, d), { recursive: true });
  for (const f of readdirSync(join(root, d))) if (f.endsWith(".yaml")) rmSync(join(root, d, f));
}
const seen = new Set<string>();
for (const f of fixtures) {
  const key = `${f.dir}/${f.name}`;
  if (seen.has(key)) throw new Error(`duplicate fixture ${key}`);
  seen.add(key);
  const header: string[] = [];
  if (f.dir === "invalid") header.push(`# expect: ${f.expect.join(", ")}`);
  if (f.expectWarnings && f.expectWarnings.length) header.push(`# expect-warnings: ${f.expectWarnings.join(", ")}`);
  header.push(`# note: ${f.note}`);
  const body = f.raw !== undefined ? f.raw : YAML.stringify(f.doc, { lineWidth: 0 });
  writeFileSync(join(root, f.dir, `${f.name}.yaml`), header.join("\n") + "\n" + body);
}
console.log(`wrote ${fixtures.length} fixtures (${fixtures.filter((f) => f.dir === "invalid").length} invalid, ${fixtures.filter((f) => f.dir === "valid").length} valid, ${fixtures.filter((f) => f.dir === "warnings").length} warnings)`);
