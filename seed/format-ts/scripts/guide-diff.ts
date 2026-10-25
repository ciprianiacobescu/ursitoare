/**
 * Compares eval/guides/yaml.md and eval/guides/ts.md for information asymmetry.
 *   1. The catalogue blocks, delegate targets and sub-flows must be byte-identical.
 *   2. Every other section is cut into sentences, syntax is normalised away (reference spellings, camelCase option
 *      names, YAML/TS wording), and the sentences present on one side only are listed per section.
 *   3. The worked examples must denote the same documents.
 * Run: npx tsx scripts/guide-diff.ts [--json]
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalEqual } from "../../format/src/canonical.ts";
import { camelToSnake } from "../src/kinds.ts";
import { transpile } from "../src/transpile.ts";
import { parseYaml } from "../src/yamlio.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");
const yamlMd = readFileSync(join(repo, "eval/guides/yaml.md"), "utf8");
const tsMd = readFileSync(join(repo, "eval/guides/ts.md"), "utf8");

function split(md: string): Map<string, string> {
  const out = new Map<string, string>();
  let key = "0";
  let buf: string[] = [];
  for (const l of md.split("\n")) {
    const m = /^## (\d+)\./.exec(l);
    if (m) {
      out.set(key, buf.join("\n"));
      key = m[1];
      buf = [];
    } else buf.push(l);
  }
  out.set(key, buf.join("\n"));
  return out;
}

const REFLIKE = /\$\{\{|^nodes\.|^inputs(\.|$)|^item(\.|$)|^f\.inputs|^f\.item|\.out(\.|$)|\.outcome$|<handle>|^f\.template|^[a-z][A-Za-z0-9]*\.out\./;
function normSpan(sp: string): string {
  const t = sp.trim();
  if (REFLIKE.test(t) || /^(amount|max): /.test(t) || /Amount: /.test(t) || t === "a handle expression") return "REF";
  if (/^f\.(next|cases|start)\b/.test(t) || t === "next" || t === "cases") return "WIRE";
  if (/^\{? ?name: value ?\}?$/.test(t) || /^\{ ?"<(outcome|literal)>": "<node id>" ?\}$/.test(t) || /^(outcome label|literal) -> node id$/.test(t)) return "OBJ";
  const snake = /^[a-z][A-Za-z]*$/.test(t) ? camelToSnake(t) : t;
  return `[${snake}]`;
}

const DROP = [/\bwithout it, the node created by the next node-creating call \(section 2\.1\)/g, /^(field|option|argument)$/, /^-+$/];
function sentences(text: string): string[] {
  const noFences = text.replace(/```[\s\S]*?```/g, " ");
  const out: string[] = [];
  for (const line of noFences.split("\n")) {
    const n = line
      .replace(/``[^`]*``|`[^`\n]*`/g, (m) => normSpan(m.replace(/`/g, "")))
      .replace(/\bmaps?\b/gi, (m) => (m.toLowerCase() === "maps" ? "objects" : "object"))
      .replace(/\ban object\b/gi, "object")
      .replace(/\byaml\b|\btypescript\b/gi, "")
      .replace(/[*#]/g, " ");
    for (const cell of n.split("|")) {
      for (let piece of cell.replace(/\s+/g, " ").split(/(?<=[.;?!])\s+/)) {
        piece = piece.trim().toLowerCase().replace(/[.:;,]+$/, "");
        for (const d of DROP) piece = piece.replace(d, "").trim();
        if (piece.length > 3) out.push(piece);
      }
    }
  }
  return out;
}

const Y = split(yamlMd);
const T = split(tsMd);
const report: Record<string, { yamlOnly: string[]; tsOnly: string[] }> = {};
for (const k of [...new Set([...Y.keys(), ...T.keys()])].sort((a, b) => Number(a) - Number(b))) {
  if (k === "8" || k === "10") continue;
  const ys = sentences(Y.get(k) ?? "");
  const ts = sentences(T.get(k) ?? "");
  const yset = new Set(ys);
  const tset = new Set(ts);
  report[k] = { yamlOnly: ys.filter((s) => !tset.has(s)), tsOnly: ts.filter((s) => !yset.has(s)) };
}

// catalogue
const cat = (md: string) => (split(md).get("8") ?? "").split("\n").filter((l) => !/assignee_role|assigneeRole|model_profile|modelProfile/.test(l)).join("\n");
const catalogueIdentical = cat(yamlMd) === cat(tsMd);

// examples
async function examples(): Promise<Array<{ name: string; same: boolean; detail?: string }>> {
  const fence = (md: string, lang: string) => [...(split(md).get("10") ?? "").matchAll(new RegExp("```" + lang + "\\n([\\s\\S]*?)```", "g"))].map((m) => m[1]);
  const ys = fence(yamlMd, "yaml");
  const ts = fence(tsMd, "ts");
  const out = [];
  for (let i = 0; i < Math.max(ys.length, ts.length); i++) {
    if (!ys[i] || !ts[i]) {
      out.push({ name: `example ${i + 1}`, same: false, detail: "missing on one side" });
      continue;
    }
    const r = await transpile(ts[i]);
    out.push({ name: `example ${i + 1}`, same: !!r.doc && canonicalEqual(r.doc, parseYaml(ys[i])), detail: r.errors[0]?.message });
  }
  return out;
}

const ex = await examples();
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ catalogueIdentical, examples: ex, report }, null, 2));
} else {
  console.log(`catalogue (blocks, targets, sub-flows) byte-identical: ${catalogueIdentical}`);
  for (const e of ex) console.log(`${e.name}: TS example transpiles to the YAML example's document: ${e.same}${e.detail ? " (" + e.detail + ")" : ""}`);
  for (const [k, v] of Object.entries(report)) {
    console.log(`\n## section ${k}: ${v.yamlOnly.length} sentences only in the YAML guide, ${v.tsOnly.length} only in the TS guide`);
    for (const s of v.yamlOnly) console.log(`  YAML-only: ${s}`);
    for (const s of v.tsOnly) console.log(`  TS-only:   ${s}`);
  }
}
