import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalEqual } from "../../format/src/canonical.ts";
import { parseFlowText } from "../../format/src/io.ts";
import { loadCatalogue, validate } from "../../format/src/validate.ts";
import { print } from "../src/print.ts";
import { roundtrip } from "../src/roundtrip.ts";
import { transpile } from "../src/transpile.ts";
import { dumpYaml } from "../src/yamlio.ts";
import { RF1, TRIAGE, loadDoc, rel, yamlFiles } from "./helpers.ts";

const sets: Array<[string, string[]]> = [
  ["RF-1", [RF1]],
  ["support-triage example", [TRIAGE]],
  ["M4a valid fixtures", yamlFiles("format/test/fixtures/valid")],
  ["M4a warning fixtures (valid with warnings)", yamlFiles("format/test/fixtures/warnings")],
  ["eval goldens", yamlFiles("eval/goldens")],
  ["eval request seeds", yamlFiles("eval/requests/seeds")],
];

for (const [name, files] of sets) {
  test(`round-trip canonical equality: ${name} (${files.length} files)`, async () => {
    const failures: string[] = [];
    for (const f of files) {
      const doc = loadDoc(f);
      const r = await roundtrip(doc);
      if (!r.ok) failures.push(`${rel(f)}: ${JSON.stringify(r.errors)} ${r.diff.slice(0, 8).join(" | ")}`);
    }
    assert.deepEqual(failures, [], failures.join("\n"));
  });
}

test("the corpus is non-trivial (guards against silently empty sets)", () => {
  assert.ok(yamlFiles("format/test/fixtures/valid").length >= 29);
  assert.ok(yamlFiles("eval/goldens").length >= 24);
  assert.ok(yamlFiles("eval/requests/seeds").length >= 8);
});

test("transpiled RF-1 passes M4a's validate with the same result as the YAML original", async () => {
  const cat = loadCatalogue();
  const ts = print(loadDoc(RF1));
  const r = await transpile(ts);
  assert.deepEqual(r.errors, []);
  const got = validate(r.doc, cat);
  const want = validate(loadDoc(RF1), cat);
  assert.equal(got.ok, true, JSON.stringify(got.errors));
  assert.deepEqual(got.layers_run, ["L1", "L2", "L3"]);
  assert.deepEqual(got.errors, []);
  assert.deepEqual(got, want);
});

test("every golden and seed gives the same validate() result after the TS round trip", async () => {
  const cat = loadCatalogue();
  for (const f of [...yamlFiles("eval/goldens"), ...yamlFiles("eval/requests/seeds")]) {
    const doc = loadDoc(f);
    const r = await transpile(print(doc));
    assert.deepEqual(r.errors, [], rel(f));
    assert.deepEqual(validate(r.doc, cat), validate(doc, cat), rel(f));
  }
});

test("YAML written by dumpYaml re-parses (M4a parser) to a canonical-equal document", async () => {
  for (const f of [RF1, TRIAGE, ...yamlFiles("eval/goldens")]) {
    const doc = loadDoc(f);
    const r = await transpile(print(doc));
    const back = parseFlowText(dumpYaml(r.doc), "yaml");
    assert.deepEqual(back.errors, [], rel(f));
    assert.ok(canonicalEqual(back.doc, doc), rel(f));
  }
});

test("printing is deterministic and idempotent: print(transpile(print(x))) === print(x)", async () => {
  for (const f of [RF1, TRIAGE, ...yamlFiles("eval/goldens"), ...yamlFiles("eval/requests/seeds")]) {
    const doc = loadDoc(f);
    const a = print(doc);
    const r = await transpile(a);
    // the transpiled doc has the builder's key order, but canonical content equals, and the printer walks by graph
    assert.equal(print(r.doc), a, rel(f));
  }
});

// Exploratory: invalid documents. Wherever the printer accepts one, the round trip must still be lossless (the
// builder passes unknown options and values through untouched). Documents the printer refuses are listed, not hidden.
test("invalid M4a fixtures: every one the printer accepts round-trips exactly; the rest are refused explicitly", async () => {
  const files = yamlFiles("format/test/fixtures/invalid");
  let printed = 0;
  const refused: string[] = [];
  const unparsable: string[] = [];
  const bad: string[] = [];
  for (const f of files) {
    const p = parseFlowText((await import("node:fs")).readFileSync(f, "utf8"), "yaml");
    if (p.errors.length) {
      unparsable.push(rel(f));
      continue;
    }
    const r = await roundtrip(p.doc);
    if (r.errors.some((e) => e.layer === "print")) refused.push(`${rel(f)}: ${r.errors[0].message}`);
    else if (!r.ok) bad.push(`${rel(f)}: ${JSON.stringify(r.errors)} ${r.diff.slice(0, 5).join(" | ")}`);
    else printed++;
  }
  console.log(`invalid fixtures: ${files.length} total, ${printed} round-trip exactly, ${refused.length} refused by the printer, ${unparsable.length} not parseable YAML`);
  for (const r of refused) console.log(`  refused: ${r}`);
  assert.deepEqual(bad, [], bad.join("\n"));
  assert.ok(printed + refused.length + unparsable.length === files.length);
});
