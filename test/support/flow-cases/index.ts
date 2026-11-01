// The flow case files (design D11): `invalid/`, `valid/` and `warnings/` hold YAML flows whose first lines
// say which codes the validator must report.

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { Catalogue, FlowFormat } from "../../../src/authoring/index.ts";
import { loadTestCatalogue } from "../catalogue/loader.ts";

export type CaseGroup = "invalid" | "valid" | "warnings";

export interface FlowCase {
  group: CaseGroup;
  name: string;
  path: string;
  text: string;
  format: FlowFormat;
  expect: string[];
  expectWarnings: string[];
}

const ROOT = fileURLToPath(new URL(".", import.meta.url));

const DELEGATE_WORKFLOWS: Readonly<Record<string, readonly string[]>> = {
  n8n: ["archive-invoice", "sync-crm", "generate-report"],
};

function header(text: string, key: string): string[] {
  const match = new RegExp(`^# ${key}:[ \\t]*(.*)$`, "m").exec(text);
  const list = match?.[1];
  if (list === undefined) return [];
  return list
    .split(/[,\s]+/)
    .filter((code) => code !== "" && code !== "none")
    .sort();
}

export function flowCases(group: CaseGroup, namePrefix = ""): FlowCase[] {
  const dir = `${ROOT}${group}/`;
  return readdirSync(dir)
    .filter((file) => file.endsWith(".yaml"))
    .sort()
    .map((file) => file.slice(0, -".yaml".length))
    .filter((name) => name.startsWith(namePrefix))
    .map((name): FlowCase => {
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

export function caseCatalogue(): Catalogue {
  const base = loadTestCatalogue();
  return {
    block: (ref) => base.block(ref),
    modelProfile: (ref) => base.modelProfile(ref),
    role: (name) => base.role(name),
    delegateTarget: (target, workflow) => base.delegateTarget(target, workflow),
    flow: (ref, major) => base.flow(ref, major),
    delegateWorkflows: (target) =>
      Object.hasOwn(DELEGATE_WORKFLOWS, target) ? DELEGATE_WORKFLOWS[target] : undefined,
  };
}
