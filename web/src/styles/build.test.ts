/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { build } from "vite";

const WEB_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CONFIG_FILE = join(WEB_ROOT, "vite.config.ts");
const VITE_IMPORT = /\b(?:from|import)\s*\(?\s*["']vite(?:\/[^"']*)?["']/;

const PRESENT = [
  "@layer components",
  ".ui-button{",
  ".bg-accent{",
  "--ui-color-sidebar:",
  ".bg-quiet-surface{",
  "dialog{margin:auto}",
];

const ABSENT = ["bg-white", "\\[\\#", "\\[rgb", "\\[hsl", "\\[oklch", "\\[color"];

function testFilesUnder(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...testFilesUnder(full));
    } else if (entry.name.endsWith(".test.ts")) {
      files.push(full);
    }
  }
  return files;
}

test("C-595839c2 build emits layers kit rules and token utilities", async () => {
  const outDir = mkdtempSync(join(tmpdir(), "web-build-"));
  try {
    await build({
      root: WEB_ROOT,
      configFile: CONFIG_FILE,
      logLevel: "silent",
      build: { outDir, emptyOutDir: true, sourcemap: false },
    });

    const htmlPath = join(outDir, "index.html");
    assert.ok(existsSync(htmlPath), "the build writes index.html into the temporary outDir");
    const assets = readdirSync(join(outDir, "assets"));
    const cssFiles = assets.filter((name) => name.endsWith(".css"));
    assert.equal(cssFiles.length, 1, "the build writes one css file");
    const cssName = cssFiles[0];
    assert.ok(cssName !== undefined);
    const cssPath = join(outDir, "assets", cssName);
    assert.ok(cssPath.startsWith(outDir), "the css file is read from the temporary outDir");
    const css = readFileSync(cssPath, "utf8");
    const html = readFileSync(htmlPath, "utf8");

    for (const needle of PRESENT) {
      assert.ok(css.includes(needle), `the css holds ${needle}`);
    }
    for (const needle of ABSENT) {
      assert.equal(css.includes(needle), false, `the css holds no ${needle}`);
    }
    assert.equal(html.includes("style="), false, "index.html holds no style attribute");

    const importers = testFilesUnder(join(WEB_ROOT, "src"))
      .filter((file) => VITE_IMPORT.test(readFileSync(file, "utf8")))
      .map((file) => relative(WEB_ROOT, file).split("\\").join("/"));
    assert.deepEqual(importers, ["src/styles/build.test.ts"]);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});
