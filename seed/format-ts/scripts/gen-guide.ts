/**
 * Builds eval/guides/ts.md from eval/guides/yaml.md.
 *
 *   - Sections keep the numbers and titles of yaml.md.
 *   - Everything that does not depend on the syntax (the rules, ordering, types, untrusted content, style, the whole
 *     catalogue, the prose of every node kind) is carried over from yaml.md sentence by sentence; only references to
 *     YAML syntax are rewritten (reference spellings, camelCase option names).
 *   - What is syntax (how to write a flow, the signature of each builder call, how successors are wired) is written
 *     here, once, in SURFACE below.
 *   - The worked examples are NOT written by hand: the YAML examples are read from yaml.md and run through print().
 *
 * Run: npx tsx scripts/gen-guide.ts [--check]   (--check exits 1 if eval/guides/ts.md is out of date)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { snakeToCamel } from "../src/kinds.ts";
import { exprForRef, exprForValueString, print } from "../src/print.ts";
import { parseYaml } from "../src/yamlio.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");
const YAML_GUIDE = join(repo, "eval/guides/yaml.md");
const TS_GUIDE = join(repo, "eval/guides/ts.md");

// ---- reading yaml.md ----------------------------------------------------------------------------------------------
interface Section {
  num: string; // "1", "5", ...
  title: string; // "Quick rules"
  heading: string; // the full "## 1. Quick rules" line
  lines: string[]; // body lines up to the next "## "
}
function sections(md: string): { head: string[]; secs: Section[] } {
  const lines = md.split("\n");
  const head: string[] = [];
  const secs: Section[] = [];
  let cur: Section | undefined;
  for (const l of lines) {
    const m = /^## (\d+)\. (.*)$/.exec(l);
    if (m) {
      cur = { num: m[1], title: m[2], heading: l, lines: [] };
      secs.push(cur);
    } else (cur ? cur.lines : head).push(l);
  }
  return { head, secs };
}

type Tok = { t: "para"; text: string } | { t: "table"; rows: string[] } | { t: "fence"; lang: string; body: string } | { t: "h3"; text: string } | { t: "list"; items: string[] };
function tokens(lines: string[]): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) {
      i++;
      continue;
    }
    if (l.startsWith("```")) {
      const lang = l.slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
      i++;
      out.push({ t: "fence", lang, body: body.join("\n") });
    } else if (l.startsWith("### ")) {
      out.push({ t: "h3", text: l });
      i++;
    } else if (l.startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      out.push({ t: "table", rows });
    } else if (/^(\* |- |\d+\. )/.test(l)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim() && !lines[i].startsWith("```") && !lines[i].startsWith("|") && !lines[i].startsWith("### ")) {
        if (/^(\* |- |\d+\. )/.test(lines[i])) items.push(lines[i]);
        else items[items.length - 1] += "\n" + lines[i];
        i++;
      }
      out.push({ t: "list", items });
    } else {
      const p: string[] = [];
      while (i < lines.length && lines[i].trim() && !lines[i].startsWith("```") && !lines[i].startsWith("|") && !lines[i].startsWith("### ") && !/^(\* |- |\d+\. )/.test(lines[i])) p.push(lines[i++]);
      out.push({ t: "para", text: p.join("\n") });
    }
  }
  return out;
}

// ---- prose rewriting: only YAML-specific spellings change --------------------------------------------------------------
const FIELD_RENAMES = new Map(
  ["output_schema", "model_profile", "max_steps", "assignee_role", "form_schema", "callback_timeout", "on_timeout", "max_parallel"].map((f) => [f, snakeToCamel(f)] as [string, string]),
);

/** Rewrite one inline code span (without the backticks) from YAML spelling to the builder's. */
function span(s: string): string {
  if (s === '"${{ ... }}"') return "a handle expression";
  const ren = FIELD_RENAMES.get(s);
  if (ren) return ren;
  // a quoted value string holding references
  if (/^".*\$\{\{.*"$/.test(s)) {
    try {
      return exprForValueString(JSON.parse(s));
    } catch {
      /* fall through */
    }
  }
  // `name: "...${{ ref }}..."`
  const kv = /^([A-Za-z_][A-Za-z0-9_]*): ("[^"]*\$\{\{[^"]*")$/.exec(s);
  if (kv) {
    try {
      return `${kv[1]}: ${exprForValueString(JSON.parse(kv[2]))}`;
    } catch {
      /* fall through */
    }
  }
  if (s === "inputs") return "f.inputs";
  if (s === "item.*") return "f.item.*";
  if (s === "name: value") return "{ name: value }";
  // placeholders
  let t = s.replace(/nodes\.<id>\.outcome/g, "<handle>.outcome").replace(/nodes\.<id>\.output\.rationale/g, "<handle>.out.rationale").replace(/nodes\.<id>\.output\.outcome/g, "<handle>.out.outcome").replace(/nodes\.<id>\.output\.<path>/g, "<handle>.out.<path>").replace(/nodes\.<id>\.output/g, "<handle>.out");
  t = t.replace(/^inputs\.<path>$/, "f.inputs.<path>").replace(/^item\.<path>` or `item$/, "f.item.<path>");
  // concrete references
  const m = /^(inputs|item|nodes)(\.[A-Za-z0-9_.]+)?$/.exec(t);
  if (m) {
    const e = exprForRef(t);
    if (e) return e;
    if (t === "item") return "f.item";
  }
  // `item.<field>` in prose
  t = t.replace(/^item\.<field>$/, "f.item.<field>");
  return t;
}

/** Words and phrases of the YAML text that name YAML constructs; each is a pure syntax substitution. */
const PHRASES: Array<[RegExp, string]> = [
  [/\ba map\b/g, "an object"],
  [/\bmap `/g, "object `"],
  [/\bmap\b(?! of)/g, "object"],
  [/Both `next` and `onTimeout` are needed\. Output \(on `next` only\)/, "Both a successor (the next node-creating call, or `f.next`) and `onTimeout` are needed. Output (on the successor path only)"],
  [/\(on `next` only\)/g, "(on the successor path only)"],
  [/Fields marked \*required\* must be present; no other fields are allowed\./, "Options marked *required* must be present; no other options are allowed."],
  [/^`next`, `cases`, `default` and `onTimeout` hold node ids\./, "Successors (`f.next`, `f.cases`, `default`, `onTimeout`) are node ids."],
  [/An `end` node has no successor and no other fields\./, "An `end` node has no successor and no other options."],
  [/Same fields as `llm\.extract` \(`input`, `instructions`, `outputSchema`, optional `modelProfile`, `next`\)/, "Same options as `llm.extract` (`input`, `instructions`, `outputSchema`, optional `modelProfile`)"],
  [/Same fields as/, "Same options as"],
  [/\(`a handle expression`\)/g, "(a handle expression)"],
  [/object `literal -> node id`/, 'object `{ "<literal>": "<node id>" }`'],
  [/object `outcome label -> node id`/, 'object `{ "<outcome>": "<node id>" }`'],
];

function prose(text: string): string {
  let t = text.replace(/`([^`\n]+)`/g, (_, s: string) => {
    const r = span(s);
    return r.includes("`") ? "`` " + r + " ``" : "`" + r + "`";
  });
  for (const [re, to] of PHRASES) t = t.replace(re, to);
  return t;
}

// ---- hand-written, syntax-specific text ---------------------------------------------------------------------------------
const TITLE = "# Writing flows in TypeScript (format v0)";
const INTRO = [
  "A flow is a TypeScript program that describes a business process as a graph of **nodes**. Each node does one thing (call a block, ask an LLM, wait for a person, branch, loop over a list, end the flow) and names the node that runs next. You create nodes by calling builder functions, one call per node. This guide tells you everything you need to write a flow: the program layout, the reference syntax, every node kind, the full catalogue of blocks, and two complete examples.",
  "",
  "Write the flow as a single TypeScript file. Use only the blocks, roles, model profiles, delegate targets and sub-flows listed in the catalogue below; nothing else exists.",
];

const RULE_OVERRIDES: Record<number, string> = {
  1: '1. A file defines exactly one flow with `flow({ id, version, description, inputs }, f => { ... })`. `version` is a semantic version string with three numbers, e.g. `"1.0.0"` (`"1.0"` is not valid).',
  2: "2. Every node is created by one builder call, and the call says what kind it is. Every node except `end` says where control goes next (the sequencing rule, `f.next`, `f.cases`, `default`, `onTimeout`; section 2), and every id it names must exist.",
  3: "3. The first node you create is the start node (`f.start` changes that). Every node must be reachable from the start node. Flows have no loops: control never returns to a node it has already visited.",
  10: "10. Write references with handles (`f.inputs.invoice_id`, `extract.out.amount`) and text that contains references with `f.template`.",
};

const LAYOUT = `## 2. Program layout

\`\`\`ts
import { flow } from "@ursitoare/flow";        // optional; this is the only import allowed

flow({
  id: "invoice-intake",                        // required, kebab-case id: lowercase letters, digits, single hyphens
  version: "1.0.0",                            // required, semantic version MAJOR.MINOR.PATCH, as a string
  description: "One sentence.",                // optional
  inputs: {                                    // required: a JSON Schema describing the flow's inputs; type must be "object"
    type: "object",
    properties: { invoice_id: { type: "string" } },
    required: ["invoice_id"],
  },
}, f => {
  const fetchInvoice = f.block("fetch_invoice", "invoices.get@1", { invoice_id: f.inputs.invoice_id });
  // ... one builder call per node
});
\`\`\`

* A file contains exactly one \`flow(...)\` call. The program runs in a sandbox with no network, files, clock or randomness (no \`Date\`, no \`Math.random\`, no timers, no \`async\`); it only calls the builder.
* Node ids are snake_case: they start with a lowercase letter and contain only lowercase letters, digits and underscores (\`fetch_invoice\`, \`notify_rejection\`). The id is the first argument of every builder call. Wherever a node id is expected you can write the id as a string or pass the node's handle.
* No other keys are allowed in the first argument of \`flow\`, and a node accepts only the options listed for its kind.
* \`inputs\`, \`outputSchema\` and \`formSchema\` are standard JSON Schema (draft 2020-12). Describe each field with \`type\`; list mandatory fields in \`required\`. Fields that are not listed in \`required\` may be missing at run time, so only rely on them where a missing value is acceptable.

### 2.1 Sequencing and wiring

Every builder call that creates a node returns a **handle**. The calls \`f.cases\`, \`f.next\`, \`f.start\` and \`f.template\` do not create nodes. Control moves between nodes like this:

1. The first node you create is the start node. \`f.start(handle)\` (or \`f.start("node_id")\`) starts somewhere else.
2. A node of a kind with a single successor (\`block\`, \`code\`, \`llm.extract\`, \`llm.generate\`, \`agent\`, \`human.form\`, \`foreach\`, \`subflow\`, \`delegate\`, \`wait\`) continues at the node created by the **next node-creating call** in the program. To send it somewhere else, call \`f.next(handle, "node_id")\`; that call replaces the default.
3. \`llm.decide\`, \`switch\` and \`human.approval\` have no single successor and are never followed implicitly. Map every case to a node with \`f.cases(handle, { case: "node_id", ... })\`.
4. \`end\` has no successor, so the call after an \`end\` starts a new chain. The last node you create gets no default successor.
5. \`onTimeout\` (\`human.form\`, \`delegate\`) and \`default\` (\`switch\`) are options holding a node id.

A node may be named before it exists: \`f.cases\`, \`f.next\`, \`onTimeout\` and \`default\` take the id as a string, so a branch can point at a node created further down.
`;

const VALUES_INTRO = [
  "## 3. Values and references",
  "",
  "Wherever a node takes a *value* (the `with`, `input`, `items`, `on`, `summary` and `output` fields) you can write:",
  "",
  "* a **literal**: a string, number, boolean, `null`, array or object;",
  "* a **single reference**: a handle expression such as `f.inputs.invoice_id` or `extract.out.amount`. It keeps the type of what it points to (a number stays a number, a list stays a list);",
  '* a **template**: `f.template` followed by a template literal that mixes text and one or more references, such as ``f.template`Invoice ${f.inputs.invoice_id} rejected` ``. A template is always a string, whatever the references point to.',
  "",
  "References take exactly these forms:",
  "",
  "| Reference | Meaning |",
  "|---|---|",
  "| `f.inputs.<path>` | a field of the flow's inputs |",
  "| `<handle>.out.<path>` | a field of the output of the node that `<handle>` belongs to |",
  "| `<handle>.outcome` | the label chosen by an `llm.decide` node (`llm.decide` only) |",
  "| `f.item.<path>` or `f.item` | the current element inside a `foreach` node's `with` (and nowhere else) |",
  "",
  "`<path>` is one or more field names joined by dots (`extract.out.vendor_name`, `f.inputs.customer.email`). There are no other expressions: no arithmetic, no comparisons, no string functions, no array indexing (`list[0]` and `list.0` do not exist) and no defaults. If you need to compute something, use a `code` node and reference its output.",
  "",
  "Rules for references:",
  "",
  "* A handle is what a builder call returns: `const extract = f.llmExtract(\"extract\", { ... })`. Read its output with `extract.out.<field>`; a handle on its own is not a value.",
  "* References are only interpreted in value fields. Free-text fields (`instructions`, `goal`, `description`, a code `source`) are plain text; to give an LLM or a code node some data, put it in `input` and mention the input by name in the instructions.",
  "* A path can follow object fields only. To reach inside a list, hand the whole list to a `code` node, or iterate it with `foreach`.",
  "* `f.item` alone (without a path) is the whole element, for lists of strings or numbers.",
  "* `<handle>.out` must always be followed by a field name. `switch`, `wait` and `end` nodes produce no output, so there is nothing to read from them.",
  "* Names in `with`, `input` and `output` objects use letters, digits and underscores and do not start with a digit.",
  "* In a `code` node's `source`, write the function body in a template literal; use `String.raw` when the code contains backslashes.",
];

// per node kind: the signature block and the extra successor rows of the options table
const SIGNATURES: Record<string, string> = {
  block: 'const h = f.block(id, uses, with);',
  code: 'const h = f.code(id, { language, input, source, outputSchema });',
  "llm.extract": 'const h = f.llmExtract(id, { input, instructions, outputSchema, modelProfile? });',
  "llm.generate": 'const h = f.llmGenerate(id, { input, instructions, outputSchema, modelProfile? });',
  "llm.decide": 'const h = f.llmDecide(id, { input, instructions, outcomes, modelProfile? });\nf.cases(h, { "<outcome>": "<node id>", /* one entry per outcome */ });',
  agent: 'const h = f.agent(id, { input, goal, tools, maxSteps, outputSchema, modelProfile? });',
  switch: 'const h = f.switch(id, { on, default });\nf.cases(h, { "<literal>": "<node id>", /* ... */ });',
  "human.approval": 'const h = f.humanApproval(id, { assigneeRole, summary, timeout });\nf.cases(h, { approved: "<node id>", rejected: "<node id>", timeout: "<node id>" });',
  "human.form": 'const h = f.humanForm(id, { assigneeRole, formSchema, timeout, onTimeout });',
  foreach: 'const h = f.foreach(id, { items, uses, with, maxParallel? });       // a block per element\nconst h = f.foreach(id, { items, subflow, with, maxParallel? });   // or a sub-flow per element',
  subflow: 'const h = f.subflow(id, flow, with);',
  delegate: 'const h = f.delegate(id, { target, workflow, with, callbackTimeout, onTimeout });',
  wait: 'const h = f.wait(id, { duration });',
  end: 'f.end(id, { status, output? });',
};
const POSITIONAL = new Set(["block", "subflow"]);

/** kind of a 5.x subsection from its heading: ### 5.1 `block`: call a catalogue block */
function kindOf(h3: string): string {
  const m = /^### 5\.\d+ `([^`]+)`/.exec(h3);
  if (!m) throw new Error(`cannot find the kind in: ${h3}`);
  return m[1];
}

function tableToTs(kind: string, rows: string[]): string[] {
  const out: string[] = [POSITIONAL.has(kind) ? "| Argument | |" : "| Option | |", rows[1]];
  for (const r of rows.slice(2)) {
    const m = /^\| (.+?) \| (.*) \|$/.exec(r);
    if (!m) throw new Error(`bad table row: ${r}`);
    const [, label, desc] = m;
    if (label === "`next`") out.push(`| \`f.next(h, "node_id")\` | ${prose(desc)}. Without it, the node created by the next node-creating call (section 2.1) |`);
    else if (label === "`cases`") out.push(`| \`f.cases(h, { ... })\` | ${prose(desc)} |`);
    else out.push(`| ${prose(label)} | ${prose(desc)} |`);
  }
  return out;
}

function fragmentFor(yamlSnippet: string): string {
  const nodes = parseYaml(yamlSnippet) as Record<string, any>;
  const ids = Object.keys(nodes);
  return print({ nodes }, { fragment: { ids } })
    .split("\n")
    .map((l) => l.replace(/^ {2}/, ""))
    .join("\n");
}

function nodeKinds(sec: Section): string[] {
  const out: string[] = [sec.heading, ""];
  const toks = tokens(sec.lines);
  const intro: string[] = [];
  let cur: Tok[] = [];
  const groups: Array<{ h3: string; toks: Tok[] }> = [];
  for (const t of toks) {
    if (t.t === "h3") {
      cur = [];
      groups.push({ h3: t.text, toks: cur });
    } else if (groups.length === 0) intro.push(prose((t as any).text ?? ""));
    else cur.push(t);
  }
  out.push(prose(intro.join("\n\n")), "");
  out.push("Each builder call below returns a handle `h` (sections 2.1 and 3). In the examples, the sequencing that the next node-creating call provides is left out.", "");
  for (const g of groups) {
    const kind = kindOf(g.h3);
    out.push(g.h3, "", "```ts", SIGNATURES[kind] ?? (() => { throw new Error(`no signature for ${kind}`); })(), "```", "");
    for (const t of g.toks) {
      if (t.t === "table") out.push(...tableToTs(kind, t.rows), "");
      else if (t.t === "para") out.push(prose(t.text), "");
      else if (t.t === "list") out.push(...t.items.map(prose), "");
      else if (t.t === "fence") {
        if (t.lang !== "yaml") throw new Error(`unexpected fence ${t.lang}`);
        out.push("```ts", fragmentFor(t.body), "```", "");
      }
    }
  }
  return out;
}

function genericSection(sec: Section, headingOverride?: string): string[] {
  return [headingOverride ?? sec.heading, "", ...tokensToText(tokens(sec.lines))];
}
function tokensToText(toks: Tok[]): string[] {
  const out: string[] = [];
  for (const t of toks) {
    if (t.t === "para") out.push(prose(t.text), "");
    else if (t.t === "list") out.push(...t.items.map(prose), "");
    else if (t.t === "h3") out.push(t.text, "");
    else if (t.t === "table") out.push(...t.rows.map(prose), "");
    else if (t.t === "fence") out.push("```" + t.lang, t.body, "```", "");
  }
  return out;
}

function rules(sec: Section): string[] {
  const toks = tokens(sec.lines);
  const list = toks.find((t) => t.t === "list") as { t: "list"; items: string[] };
  const out = [sec.heading, ""];
  list.items.forEach((it, i) => out.push(RULE_OVERRIDES[i + 1] ?? prose(it)));
  out.push("");
  return out;
}

function catalogue(sec: Section): string[] {
  // Blocks, delegate targets and sub-flows are copied byte for byte. Only the two lines that name YAML option
  // spellings (roles and model profiles) are renamed.
  const lines = sec.lines.map((l) => l.replace(/`assignee_role`/g, "`assigneeRole`").replace(/`model_profile`/g, "`modelProfile`"));
  return [sec.heading, ...lines];
}

function examples(sec: Section): string[] {
  const out = [sec.heading, ""];
  const toks = tokens(sec.lines);
  for (const t of toks) {
    if (t.t === "h3") out.push(t.text, "");
    else if (t.t === "para") out.push(prose(t.text), "");
    else if (t.t === "fence") {
      if (t.lang !== "yaml") throw new Error("expected yaml fence");
      out.push("```ts", print(parseYaml(t.body)).trimEnd(), "```", "");
    }
  }
  return out;
}

function style(sec: Section): string[] {
  const toks = tokens(sec.lines);
  const list = toks.find((t) => t.t === "list") as { t: "list"; items: string[] };
  const out = [sec.heading, ""];
  // The one YAML-only bullet (YAML quoting pitfalls) has no counterpart: string literals are always quoted in TypeScript.
  for (const it of list.items) if (!/special YAML character/.test(it)) out.push(prose(it));
  out.push("");
  return out;
}

function checklist(sec: Section): string[] {
  const toks = tokens(sec.lines);
  const list = toks.find((t) => t.t === "list") as { t: "list"; items: string[] };
  const out = [sec.heading, ""];
  for (const it of list.items) {
    if (/^\* The document starts with/.test(it)) out.push("* The file has one `flow({ id, version, inputs }, f => { ... })` call with a kebab-case `id`, a three-number `version` and an `inputs` schema.");
    else if (/Every `uses`, `tools` entry/.test(it)) out.push("* Every `uses`, `tools` entry, `flow`, `subflow`, role, model profile and delegate target is in the catalogue, and every `with` object has exactly the block's inputs.");
    else if (/Every node except `end` has all its successors/.test(it)) out.push("* Every node except `end` has all its successors (by the next node-creating call, `f.next`, `f.cases`, `default` or `onTimeout`); every id named exists; nothing is unreachable; there are no loops.");
    else if (/Every `llm.decide` outcome is mapped/.test(it)) out.push("* Every `llm.decide` outcome is mapped by `f.cases`; every `human.approval` has `approved`, `rejected` and `timeout`; `human.form` and `delegate` have both a successor and `onTimeout`.");
    else if (/Output only the YAML/.test(it)) out.push("* Output only the TypeScript file.");
    else out.push(prose(it));
  }
  out.push("");
  return out;
}

export function buildGuide(yamlMd: string): string {
  const { secs } = sections(yamlMd);
  const want = ["Quick rules", "Document layout", "Values and references", "Order of execution and what you can read", "Node kinds", "Types", "Untrusted content", "Catalogue", "Style", "Worked examples", "Before you answer"];
  if (secs.map((s) => s.title).join("|") !== want.join("|")) throw new Error(`yaml.md sections changed: ${secs.map((s) => s.title).join(" | ")}`);
  const by = (n: string) => secs.find((s) => s.num === n)!;
  const out: string[] = [TITLE, "", ...INTRO, ""];
  out.push(...rules(by("1")));
  out.push(...LAYOUT.split("\n"));
  out.push(...VALUES_INTRO, "");
  out.push(...genericSection(by("4")));
  out.push(...nodeKinds(by("5")));
  out.push(...genericSection(by("6")));
  out.push(...genericSection(by("7")));
  out.push(...catalogue(by("8")));
  out.push(...style(by("9")));
  out.push(...examples(by("10")));
  out.push(...checklist(by("11")));
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const md = buildGuide(readFileSync(YAML_GUIDE, "utf8"));
  if (process.argv.includes("--check")) {
    const cur = readFileSync(TS_GUIDE, "utf8");
    if (cur !== md) {
      console.error("eval/guides/ts.md is out of date; run: npx tsx scripts/gen-guide.ts");
      process.exit(1);
    }
    console.log("eval/guides/ts.md is up to date");
  } else {
    writeFileSync(TS_GUIDE, md);
    console.log(`wrote eval/guides/ts.md (${md.length} chars, ${md.split("\n").length} lines)`);
  }
}
