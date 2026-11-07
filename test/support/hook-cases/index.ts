// The hook case files (change add-hook-checker): `invalid/`, `valid/` and `warnings/` hold YAML flows whose first
// lines say which codes the validator must report.

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { FlowFormat } from "../../../src/authoring/index.ts";

export type HookCaseGroup = "invalid" | "valid" | "warnings";

export interface HookCase {
  group: HookCaseGroup;
  name: string;
  path: string;
  text: string;
  format: FlowFormat;
  expect: string[];
  expectWarnings: string[];
}

const ROOT = fileURLToPath(new URL(".", import.meta.url));

function header(text: string, key: string): string[] {
  const match = new RegExp(`^# ${key}:[ \\t]*(.*)$`, "m").exec(text);
  const list = match?.[1];
  if (list === undefined) return [];
  return list
    .split(/[,\s]+/)
    .filter((code) => code !== "" && code !== "none")
    .sort();
}

export function hookCases(group: HookCaseGroup, namePrefix = ""): HookCase[] {
  const dir = `${ROOT}${group}/`;
  return readdirSync(dir)
    .filter((file) => file.endsWith(".yaml"))
    .sort()
    .map((file) => file.slice(0, -".yaml".length))
    .filter((name) => name.startsWith(namePrefix))
    .map((name): HookCase => {
      const path = `${dir}${name}.yaml`;
      const text = readFileSync(path, "utf8");
      return {
        group,
        name,
        path,
        text,
        format: "yaml",
        expect: header(text, "expect"),
        expectWarnings: header(text, "expect-warnings"),
      };
    });
}
