#!/usr/bin/env node
/**
 * ursitoare-format CLI
 *   validate <file.(yaml|json)> [--json] [--catalogue <file>]
 *   rubric   <flow> <rubric.json> [--seed <file>] [--json]
 *   canonical <file> [--pretty]
 * Exit codes: 0 ok / all checks pass, 1 validation or rubric failure, 2 usage or I/O error.
 */
import { readFileSync } from "node:fs";
import { canonicalJson } from "./canonical.ts";
import { parseFlowText, formatOf, readFlowFile } from "./io.ts";
import { checkRubric } from "./rubric.ts";
import { loadCatalogue, validate } from "./validate.ts";
import type { Issue } from "./types.ts";

function usage(): never {
  process.stderr.write(
    [
      "usage:",
      "  cli validate <file.(yaml|json)> [--json] [--catalogue <file>]",
      "  cli rubric <flow> <rubric.json> [--seed <file>] [--json]",
      "  cli canonical <file> [--pretty]",
      "",
    ].join("\n"),
  );
  process.exit(2);
}

function parseArgs(argv: string[], valueFlags: string[], boolFlags: string[]) {
  const pos: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const name = a.slice(2);
      if (valueFlags.includes(name)) {
        if (i + 1 >= argv.length) usage();
        flags[name] = argv[++i];
      } else if (boolFlags.includes(name)) flags[name] = true;
      else usage();
    } else pos.push(a);
  }
  return { pos, flags };
}

const fmtIssue = (i: Issue) => `  ${i.layer} ${i.code} ${i.path || "/"}${i.node ? ` [${i.node}]` : ""}: ${i.message}`;

function readOrDie<T>(f: () => T): T {
  try {
    return f();
  } catch (e: any) {
    process.stderr.write(`error: ${e.message}\n`);
    process.exit(2);
  }
}

const [cmd, ...rest] = process.argv.slice(2);

if (cmd === "validate") {
  const { pos, flags } = parseArgs(rest, ["catalogue"], ["json"]);
  if (pos.length !== 1) usage();
  const cat = readOrDie(() => loadCatalogue(flags.catalogue as string | undefined));
  const parsed = readOrDie(() => readFlowFile(pos[0]));
  const result = parsed.errors.length
    ? { ok: false, errors: parsed.errors, warnings: [] as Issue[], layers_run: ["L1"] }
    : validate(parsed.doc, cat);
  if (flags.json) {
    process.stdout.write(JSON.stringify({ file: pos[0], ...result }, null, 2) + "\n");
  } else {
    process.stdout.write(
      `${result.ok ? "OK" : "INVALID"} ${pos[0]} (layers run: ${result.layers_run.join(" ")}) ${result.errors.length} error(s), ${result.warnings.length} warning(s)\n`,
    );
    for (const e of result.errors) process.stdout.write(fmtIssue(e) + "\n");
    for (const w of result.warnings) process.stdout.write("  warning" + fmtIssue(w).slice(1) + "\n");
  }
  process.exit(result.ok ? 0 : 1);
} else if (cmd === "rubric") {
  const { pos, flags } = parseArgs(rest, ["seed"], ["json"]);
  if (pos.length !== 2) usage();
  const flow = readOrDie(() => readFlowFile(pos[0]));
  if (flow.errors.length) {
    process.stderr.write(`error: cannot parse ${pos[0]}: ${flow.errors[0].message}\n`);
    process.exit(2);
  }
  const rubric = readOrDie(() => JSON.parse(readFileSync(pos[1], "utf8")));
  const seed = flags.seed
    ? readOrDie(() => {
        const s = readFlowFile(flags.seed as string);
        if (s.errors.length) throw new Error(`cannot parse seed: ${s.errors[0].message}`);
        return s.doc;
      })
    : undefined;
  const result = readOrDie(() => checkRubric(flow.doc, rubric, { seed }));
  if (flags.json) process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  else {
    process.stdout.write(`${result.ok ? "PASS" : "FAIL"} ${result.passed}/${result.total} rubric checks\n`);
    for (const r of result.results) process.stdout.write(`  ${r.pass ? "pass" : "FAIL"} ${r.check}: ${r.detail}\n`);
  }
  process.exit(result.ok ? 0 : 1);
} else if (cmd === "canonical") {
  const { pos, flags } = parseArgs(rest, [], ["pretty"]);
  if (pos.length !== 1) usage();
  const text = readOrDie(() => readFileSync(pos[0], "utf8"));
  const parsed = parseFlowText(text, formatOf(pos[0]));
  if (parsed.errors.length) {
    process.stderr.write(`error: ${parsed.errors[0].message}\n`);
    process.exit(2);
  }
  process.stdout.write(canonicalJson(parsed.doc, { pretty: !!flags.pretty }) + "\n");
} else usage();
