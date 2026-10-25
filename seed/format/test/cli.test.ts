import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { FORMAT_DIR, FIXTURES, RF1 } from "./helpers.ts";

const run = (...args: string[]) => {
  const r = spawnSync(process.execPath, ["--import", "tsx", join(FORMAT_DIR, "src", "cli.ts"), ...args], { encoding: "utf8", cwd: FORMAT_DIR });
  return { code: r.status, out: r.stdout, err: r.stderr };
};

describe("CLI", () => {
  it("validate RF-1: exit 0, human output", () => {
    const r = run("validate", RF1);
    assert.equal(r.code, 0, r.err);
    assert.match(r.out, /^OK /);
    assert.match(r.out, /0 error\(s\)/);
  });
  it("validate --json: structured result", () => {
    const r = run("validate", RF1, "--json");
    const j = JSON.parse(r.out);
    assert.equal(j.ok, true);
    assert.deepEqual(j.errors, []);
    assert.deepEqual(j.layers_run, ["L1", "L2", "L3"]);
    assert.equal(j.warnings[0].code, "W_LETHAL_TRIFECTA");
  });
  it("validate invalid: exit 1 with coded errors", () => {
    const r = run("validate", join(FIXTURES, "invalid", "l3-taint-raw-fetch-into-mail-body.yaml"), "--json");
    assert.equal(r.code, 1);
    const j = JSON.parse(r.out);
    assert.equal(j.ok, false);
    assert.deepEqual(j.errors.map((e: any) => e.code), ["L3_TAINT_TO_CONSEQUENTIAL"]);
    assert.deepEqual(Object.keys(j.errors[0]).sort(), ["code", "layer", "message", "node", "path"]);
  });
  it("validate a YAML parse error: exit 1 with L1_PARSE", () => {
    const r = run("validate", join(FIXTURES, "invalid", "l1-parse-duplicate-key.yaml"), "--json");
    assert.equal(r.code, 1);
    assert.equal(JSON.parse(r.out).errors[0].code, "L1_PARSE");
  });
  it("validate .json files and --catalogue", () => {
    const d = mkdtempSync(join(tmpdir(), "fmt-"));
    const yaml = run("canonical", RF1);
    writeFileSync(join(d, "rf1.json"), yaml.out);
    assert.equal(run("validate", join(d, "rf1.json")).code, 0);
    writeFileSync(join(d, "cat.json"), JSON.stringify({ blocks: {}, model_profiles: [], roles: [], delegate_targets: {}, flows_registry: {} }));
    const r = run("validate", RF1, "--catalogue", join(d, "cat.json"), "--json");
    assert.equal(r.code, 1);
    assert.ok(JSON.parse(r.out).errors.some((e: any) => e.code === "L2_UNKNOWN_BLOCK"));
  });
  it("usage and I/O errors: exit 2", () => {
    assert.equal(run().code, 2);
    assert.equal(run("validate").code, 2);
    assert.equal(run("validate", "/nonexistent/file.yaml").code, 2);
    assert.equal(run("validate", RF1, "--bogus").code, 2);
  });
  it("rubric: exit 0 when all pass, 1 otherwise; --seed", () => {
    const d = mkdtempSync(join(tmpdir(), "fmt-"));
    const good = join(d, "good.json");
    const bad = join(d, "bad.json");
    writeFileSync(good, JSON.stringify([{ has_kind: "llm.decide" }, { uses: "erp.create_payment@1", max: 1 }]));
    writeFileSync(bad, JSON.stringify({ checks: [{ has_kind: "llm.decide" }, { has_kind: "foreach" }] }));
    const a = run("rubric", RF1, good, "--json");
    assert.equal(a.code, 0);
    assert.deepEqual([JSON.parse(a.out).passed, JSON.parse(a.out).total], [2, 2]);
    const b = run("rubric", RF1, bad);
    assert.equal(b.code, 1);
    assert.match(b.out, /FAIL 1\/2/);
    writeFileSync(join(d, "edit.json"), JSON.stringify([{ preserves: ["pay"] }, { absent: ["ghost"] }]));
    assert.equal(run("rubric", RF1, join(d, "edit.json"), "--seed", RF1).code, 0);
    assert.equal(run("rubric", RF1, join(d, "edit.json")).code, 1);
  });
  it("canonical: prints sorted-key JSON, identical for YAML and JSON input", () => {
    const a = run("canonical", RF1);
    assert.equal(a.code, 0);
    const d = mkdtempSync(join(tmpdir(), "fmt-"));
    writeFileSync(join(d, "x.json"), JSON.stringify(JSON.parse(a.out), null, 4));
    assert.equal(run("canonical", join(d, "x.json")).out, a.out);
    assert.ok(a.out.startsWith('{"description"'));
    assert.match(run("canonical", RF1, "--pretty").out, /^\{\n  "description"/);
  });
});
