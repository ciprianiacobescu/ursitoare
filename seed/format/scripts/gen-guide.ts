/**
 * Builds eval/guides/yaml.md from scripts/guide-template.md + the catalogue + the two worked examples.
 * Run: npx tsx scripts/gen-guide.ts   (deterministic; the output is committed)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BlockDef, Catalogue } from "../src/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");
const cat: Catalogue = JSON.parse(readFileSync(join(repo, "shared/catalogue/blocks.v0.json"), "utf8"));

function typeStr(s: any): string {
  if (!s || typeof s !== "object") return "any";
  if (Array.isArray(s.enum)) return s.enum.map((v: unknown) => JSON.stringify(v)).join(" | ");
  if (s.type === "array") return `list of ${s.items ? typeStr(s.items) : "any"}`;
  if (s.type === "object") {
    const props = s.properties ? Object.keys(s.properties) : [];
    if (!props.length) return "object";
    const req: string[] = s.required ?? [];
    return `object {${props.map((p) => `${p}${req.includes(p) ? "" : "?"}: ${typeStr(s.properties[p])}`).join(", ")}}`;
  }
  return String(s.type ?? "any");
}
function fields(schema: any, untrusted: string[] = []): string {
  const props = schema?.properties ? Object.keys(schema.properties) : [];
  if (!props.length) return "none";
  const req: string[] = schema.required ?? [];
  return props
    .map((p) => `\`${p}\` (${typeStr(schema.properties[p])}${req.includes(p) ? ", required" : ""}${untrusted.includes(p) ? ", **untrusted**" : ""})`)
    .join("; ");
}
function block(name: string, b: BlockDef): string {
  const lines = [`**\`${name}\`** (effect: ${b.effect}). ${b.description ?? ""}`.trim(), `- inputs: ${fields(b.input)}`, `- outputs: ${fields(b.output, b.untrusted_fields ?? [])}`];
  if ((b.untrusted_fields ?? []).length) lines.push(`- untrusted output fields: ${b.untrusted_fields!.map((f) => `\`${f}\``).join(", ")}`);
  return lines.join("\n");
}

const out: string[] = [];
for (const eff of ["read", "write", "send", "pay"] as const) {
  const names = Object.keys(cat.blocks).filter((n) => cat.blocks[n].effect === eff);
  out.push(`### 8.${["read", "write", "send", "pay"].indexOf(eff) + 1} Blocks with effect \`${eff}\`\n`);
  out.push(names.map((n) => block(n, cat.blocks[n])).join("\n\n"));
  out.push("");
}
out.push("### 8.5 Roles\n");
out.push(cat.roles.map((r) => `\`${r}\``).join(", ") + ". Used in `assignee_role` of `human.approval` and `human.form`.\n");
out.push("### 8.6 Model profiles\n");
out.push(cat.model_profiles.map((r) => `\`${r}\``).join(", ") + ". Used in `model_profile` of LLM nodes and agents; omitted means `default`.\n");
out.push("### 8.7 Delegate targets\n");
for (const [t, wfs] of Object.entries(cat.delegate_targets)) out.push(`- \`${t}\`: workflows ${wfs.map((w) => `\`${w}\``).join(", ")}`);
out.push("");
out.push("### 8.8 Flows registry (sub-flows)\n");
for (const [f, def] of Object.entries(cat.flows_registry))
  out.push(`**\`${f}\`**\n- inputs: ${fields(def.inputs)}\n- outputs: ${fields(def.outputs)}\n`);

const rf1 = readFileSync(join(repo, "shared/flows/rf-1-invoice-intake.yaml"), "utf8").trimEnd();
const triage = readFileSync(join(repo, "eval/guides/examples/support-triage.yaml"), "utf8").trimEnd();
let md = readFileSync(join(here, "guide-template.md"), "utf8");
md = md.replace("<!--CATALOGUE-->", out.join("\n").trimEnd()).replace("<!--EXAMPLE_RF1-->", rf1).replace("<!--EXAMPLE_TRIAGE-->", triage);
writeFileSync(join(repo, "eval/guides/yaml.md"), md);
console.log(`wrote eval/guides/yaml.md (${md.length} chars, ${md.split("\n").length} lines)`);
