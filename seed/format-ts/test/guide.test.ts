import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { transformSync } from "esbuild";
import { canonicalEqual } from "../../format/src/canonical.ts";
import { KIND_SPECS, snakeToCamel } from "../src/kinds.ts";
import { print } from "../src/print.ts";
import { transpile } from "../src/transpile.ts";
import { parseYaml } from "../src/yamlio.ts";
import { buildGuide } from "../scripts/gen-guide.ts";
import { REPO, RF1, TRIAGE, loadDoc } from "./helpers.ts";

const yamlMd = readFileSync(join(REPO, "eval/guides/yaml.md"), "utf8");
const tsMd = readFileSync(join(REPO, "eval/guides/ts.md"), "utf8");
const headings = (md: string) => md.split("\n").filter((l) => /^## \d+\./.test(l));
const fences = (md: string, lang: string) => [...md.matchAll(new RegExp("```" + lang + "\\n([\\s\\S]*?)```", "g"))].map((m) => m[1]);

test("eval/guides/ts.md is exactly what scripts/gen-guide.ts produces from eval/guides/yaml.md", () => {
  assert.equal(tsMd, buildGuide(yamlMd));
});

test("the TS guide has the same numbered sections as the YAML guide", () => {
  const strip = (h: string) => h.replace(/^## \d+\. /, "");
  assert.deepEqual(headings(tsMd).map((h) => h.replace(/Document layout/, "Program layout")), headings(yamlMd).map((h) => h.replace(/Document layout/, "Program layout")).map((h) => h));
  assert.deepEqual(headings(tsMd).map(strip), headings(yamlMd).map(strip).map((t) => (t === "Document layout" ? "Program layout" : t)));
});

test("the catalogue is carried over unchanged (only the two lines naming option spellings differ)", () => {
  const cat = (md: string) =>
    md
      .slice(md.indexOf("## 8. Catalogue"), md.indexOf("## 9."))
      .split("\n")
      .filter((l) => !/assignee_role|assigneeRole|model_profile|modelProfile/.test(l))
      .join("\n");
  assert.equal(cat(tsMd), cat(yamlMd));
  assert.ok(cat(tsMd).includes("**`erp.create_payment@1`** (effect: pay)"));
});

test("the TS guide leaks nothing about validation, scoring, error codes or YAML", () => {
  assert.doesNotMatch(tsMd, /\bvalidat|\brubric|\bscor(e|es|ing)\b|\bevaluat|\bgolden|\bbenchmark|\bL[0-3]\b|L[0-3]_|\byaml\b/i);
  assert.doesNotMatch(yamlMd, /\bvalidat|\brubric|\bscor(e|es|ing)\b|\bevaluat|\bgolden|\bbenchmark|\bL[0-3]\b|L[0-3]_/i);
});

test("the two worked examples are produced by the printer from the YAML examples, and mean the same documents", async () => {
  const sec10 = (md: string) => md.slice(md.indexOf("## 10."), md.indexOf("## 11."));
  const ts = fences(sec10(tsMd), "ts");
  const ys = fences(sec10(yamlMd), "yaml");
  assert.equal(ts.length, 2);
  assert.equal(ys.length, 2);
  assert.equal(ts[0].trimEnd(), print(loadDoc(RF1)).trimEnd());
  assert.equal(ts[1].trimEnd(), print(loadDoc(TRIAGE)).trimEnd());
  for (let i = 0; i < 2; i++) {
    const r = await transpile(ts[i]);
    assert.deepEqual(r.errors, []);
    assert.ok(canonicalEqual(r.doc, parseYaml(ys[i])));
  }
  assert.ok(canonicalEqual(parseYaml(ys[0]), loadDoc(RF1)));
  assert.ok(canonicalEqual(parseYaml(ys[1]), loadDoc(TRIAGE)));
});

test("every builder signature in the guide matches the builder (method names and option names)", () => {
  const sigs = fences(tsMd, "ts").filter((b) => b.startsWith("const h = f.") || b.startsWith("f.end("));
  const seen = new Set<string>();
  for (const block of sigs) {
    for (const line of block.split("\n")) {
      const m = /f\.(\w+)\(id, (?:\{ ([^}]*) \}|([a-z, ]+))\)/.exec(line);
      if (!m || m[1] === "cases") continue;
      const spec = KIND_SPECS.find((k) => k.method === m[1]);
      assert.ok(spec, `unknown method ${m[1]}`);
      const names = (m[2] ?? m[3]).split(",").map((x) => x.trim().replace(/\?$/, "")).filter(Boolean);
      const want = spec.positional ? spec.positional : spec.fields.map(snakeToCamel);
      if (spec.method === "foreach") {
        assert.ok(names.every((n) => want.includes(n)), `${line}`);
      } else if (spec.positional) {
        assert.deepEqual(names, spec.positional.map(snakeToCamel).map((n) => (n === "flow" ? "flow" : n)), line);
      } else {
        const opt = new Set(names);
        assert.deepEqual([...opt].sort(), [...want].sort(), line);
      }
      seen.add(m[1]);
    }
  }
  assert.deepEqual([...seen].sort(), KIND_SPECS.map((k) => k.method).sort(), "every node kind has a signature in the guide");
});

test("every ts snippet in the guide is syntactically valid TypeScript", () => {
  const blocks = fences(tsMd, "ts");
  assert.ok(blocks.length >= 20);
  for (const b of blocks) {
    if (b.startsWith("const h = f.") || b.startsWith("f.end(id")) continue; // signatures use notation such as `with`
    const src = b.startsWith("import {") ? b : `function _(f: any) {\n${b.replace(/\/\* [^*]* \*\//g, "")}\n}`;
    assert.doesNotThrow(() => transformSync(src, { loader: "ts", logLevel: "silent" }), b.slice(0, 80));
  }
});
