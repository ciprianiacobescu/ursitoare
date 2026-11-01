import { readFileSync, statSync } from "node:fs";

import {
  CatalogueFileError,
  catalogueFromJson,
  emptyCatalogue,
  formatOf,
  validateFlowText,
} from "../../authoring/index.ts";
import type { Catalogue, Issue, ValidationResult } from "../../authoring/index.ts";
import { CliError } from "../errors.ts";
import { safeJson, safeText } from "../output.ts";
import type { CliCall, CliCommand, CliOption } from "../registry.ts";

const MAX_BYTES = 1_048_576;

const OPTIONS: Readonly<Record<string, CliOption>> = {
  file: { type: "string", summary: "flow file to validate", required: true },
  catalogue: { type: "string", summary: "catalogue JSON file" },
  json: { type: "boolean", summary: "print the verdict as JSON" },
};

function errno(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
  }
  return "UNKNOWN";
}

function readText(file: string, option: string): string {
  let stats;
  try {
    stats = statSync(file);
  } catch (error) {
    throw new CliError("CLI_USAGE", `cannot read ${option} (${errno(error)})`);
  }
  if (stats.isDirectory()) {
    throw new CliError("CLI_USAGE", `cannot read ${option} (EISDIR)`);
  }
  if (!stats.isFile()) {
    throw new CliError("CLI_USAGE", `cannot read ${option} (not a regular file)`);
  }
  if (stats.size > MAX_BYTES) {
    throw new CliError("CLI_USAGE", `cannot read ${option} (too large)`);
  }
  try {
    return readFileSync(file, "utf8");
  } catch (error) {
    throw new CliError("CLI_USAGE", `cannot read ${option} (${errno(error)})`);
  }
}

function loadCatalogue(path: string | undefined): Catalogue {
  if (path === undefined) {
    return emptyCatalogue;
  }
  const text = readText(path, "--catalogue");
  try {
    return catalogueFromJson(text);
  } catch (error) {
    if (error instanceof CatalogueFileError) {
      throw new CliError(
        "CLI_USAGE",
        `--catalogue is not a usable catalogue file: ${safeText(error.message)}`,
      );
    }
    throw error;
  }
}

function issueLine(issue: Issue, warning: boolean): string {
  const location = issue.path === "" ? "/" : issue.path;
  const node = issue.node === null ? "" : ` [${issue.node}]`;
  const prefix = warning ? "  warning " : "  ";
  return safeText(`${prefix}${issue.layer} ${issue.code} ${location}${node}: ${issue.message}`);
}

function verdictLines(file: string, result: ValidationResult): string[] {
  const layers = result.layers_run.join(" ");
  const verdict = `${result.ok ? "OK" : "INVALID"} ${file} (layers run: ${layers}) ${result.errors.length} error(s), ${result.warnings.length} warning(s)`;
  const lines = [safeText(verdict)];
  for (const issue of result.errors) {
    lines.push(issueLine(issue, false));
  }
  for (const issue of result.warnings) {
    lines.push(issueLine(issue, true));
  }
  return lines;
}

export const flowValidateCommand: CliCommand = {
  summary: "validate a flow file and report its diagnostics",
  options: OPTIONS,
  database: false,
  async run(call: CliCall): Promise<number> {
    const file = call.args.file;
    if (typeof file !== "string") {
      throw new CliError("CLI_USAGE", "missing required option --file");
    }
    const catalogueArg = call.args.catalogue;
    const cataloguePath = typeof catalogueArg === "string" ? catalogueArg : undefined;

    const text = readText(file, "--file");
    const catalogue = loadCatalogue(cataloguePath);
    const result = validateFlowText(text, formatOf(file), catalogue);

    if (call.args.json === true) {
      call.stdout.write(`${safeJson({ file, ...result })}\n`);
    } else {
      call.stdout.write(`${verdictLines(file, result).join("\n")}\n`);
    }

    return result.ok ? 0 : 1;
  },
};
