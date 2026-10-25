#!/usr/bin/env node
/**
 * format-ts CLI
 *   transpile <file.ts> [--out file.yaml] [--json]
 *   print     <file.yaml> [--out file.ts]
 *   roundtrip <file.yaml>
 * Exit codes: 0 ok, 1 L0 errors / print failure / round-trip mismatch, 2 usage or I/O error.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { print, PrintError } from "./print.ts";
import { roundtrip } from "./roundtrip.ts";
import { transpile } from "./transpile.ts";
import { dumpYaml, parseYaml } from "./yamlio.ts";

const USAGE = `usage:
  cli.ts transpile <file.ts> [--out file.yaml] [--json]
  cli.ts print     <file.yaml> [--out file.ts]
  cli.ts roundtrip <file.yaml>`;

function usage(msg?: string): never {
  if (msg) console.error(msg);
  console.error(USAGE);
  process.exit(2);
}

function parseArgs(argv: string[]): { pos: string[]; out?: string; json: boolean } {
  const pos: string[] = [];
  let out: string | undefined;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") {
      out = argv[++i];
      if (!out) usage("--out needs a file");
    } else if (a === "--json") json = true;
    else if (a.startsWith("--")) usage(`unknown option ${a}`);
    else pos.push(a);
  }
  return { pos, out, json };
}

function read(file: string): string {
  try {
    return readFileSync(file, "utf8");
  } catch (e: any) {
    console.error(`cannot read ${file}: ${e.message}`);
    process.exit(2);
  }
}

const [cmd, ...rest] = process.argv.slice(2);
const { pos, out, json } = parseArgs(rest);
if (!cmd || pos.length !== 1) usage();
const file = pos[0];

if (cmd === "transpile") {
  const r = await transpile(read(file));
  if (json) {
    const text = JSON.stringify({ file, ok: r.errors.length === 0, doc: r.doc, errors: r.errors }, null, 2);
    if (out) writeFileSync(out, text + "\n");
    else console.log(text);
  } else if (r.doc) {
    const y = dumpYaml(r.doc);
    if (out) writeFileSync(out, y);
    else process.stdout.write(y);
  } else {
    for (const e of r.errors) console.error(`${file}${e.line ? `:${e.line}` : ""}: ${e.code}: ${e.message}`);
  }
  process.exit(r.errors.length ? 1 : 0);
} else if (cmd === "print") {
  let doc: unknown;
  try {
    doc = parseYaml(read(file));
  } catch (e: any) {
    console.error(`${file}: ${e.message}`);
    process.exit(1);
  }
  try {
    const ts = print(doc);
    if (out) writeFileSync(out, ts);
    else process.stdout.write(ts);
  } catch (e: any) {
    if (e instanceof PrintError) {
      console.error(`${file}: cannot print: ${e.message}`);
      process.exit(1);
    }
    throw e;
  }
} else if (cmd === "roundtrip") {
  let doc: unknown;
  try {
    doc = parseYaml(read(file));
  } catch (e: any) {
    console.error(`${file}: ${e.message}`);
    process.exit(1);
  }
  const r = await roundtrip(doc);
  if (r.ok) console.log(`${file}: round-trip OK (canonical-equal)`);
  else {
    console.log(`${file}: round-trip FAILED`);
    for (const e of r.errors) console.log(`  ${e.layer}${"code" in e ? " " + e.code : ""}: ${e.message}${"line" in e && e.line ? ` (line ${e.line})` : ""}`);
    for (const d of r.diff) console.log(`  ${d}`);
  }
  process.exit(r.ok ? 0 : 1);
} else usage(`unknown command ${cmd}`);
