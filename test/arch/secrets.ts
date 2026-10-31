import { execFileSync } from "node:child_process";
import {
  closeSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  type Stats,
} from "node:fs";
import path from "node:path";

import { REPO_ROOT, type Violation } from "./sources.ts";

export const SECRET_PATTERNS: readonly { kind: string; pattern: RegExp }[] = [
  { kind: "pem_private_key", pattern: /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY(?: BLOCK)? ?-----/ },
  { kind: "mintkey_agent_key", pattern: /mk_agent_[A-Za-z0-9]{20,}/ },
  { kind: "anthropic_key", pattern: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { kind: "sk_key", pattern: /(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{32,}/ },
  { kind: "github_token", pattern: /ghp_[A-Za-z0-9]{36,}/ },
  { kind: "github_pat", pattern: /github_pat_[A-Za-z0-9_]{22,}/ },
  { kind: "aws_access_key", pattern: /(?<![A-Za-z0-9])AKIA[A-Z0-9]{16}/ },
  { kind: "slack_token", pattern: /xox[abposr]-[A-Za-z0-9-]{10,}/ },
];

export function scanText(path: string, text: string): Violation[] {
  const violations: Violation[] = [];
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    for (const { kind, pattern } of SECRET_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          code: "ARCH_SECRET",
          file: path,
          line: index + 1,
          message: `${kind}-shaped text; build test values at run time`,
        });
        break;
      }
    }
  }
  return violations;
}

function gitUnavailable(message: string): Error {
  const error = new Error(message) as Error & { code: string };
  error.code = "ARCH_GIT_UNAVAILABLE";
  return error;
}

function isMissing(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return code === "ENOENT" || code === "ENOTDIR";
}

function isBinary(absolute: string): boolean {
  const descriptor = openSync(absolute, "r");
  try {
    const buffer = Buffer.alloc(8192);
    const read = readSync(descriptor, buffer, 0, buffer.length, 0);
    return buffer.subarray(0, read).includes(0);
  } finally {
    closeSync(descriptor);
  }
}

function isHarnessPath(relativePath: string): boolean {
  return relativePath.startsWith("openspec/changes/") && relativePath.includes("/.l4/");
}

function isScannable(absolute: string): boolean {
  let stats: Stats;
  try {
    stats = lstatSync(absolute);
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
  if (!stats.isFile()) return false;
  return !isBinary(absolute);
}

function absoluteOf(root: string, relativePath: string): string {
  return path.join(root, ...relativePath.split("/"));
}

export function listScannableFiles(
  root: string = REPO_ROOT,
  git: string = "git",
): string[] {
  let output: string;
  try {
    output = execFileSync(git, ["ls-files", "-z", "-co", "--exclude-standard"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw gitUnavailable(`cannot list repository files: ${detail}`);
  }

  const files: string[] = [];
  for (const entry of output.split("\0")) {
    if (entry === "") continue;
    const relativePath = entry.split(path.sep).join("/");
    if (relativePath === "seed" || relativePath.startsWith("seed/")) continue;
    if (isHarnessPath(relativePath)) continue;
    if (!isScannable(absoluteOf(root, relativePath))) continue;
    files.push(relativePath);
  }
  files.sort();
  return files;
}

export function scanRepository(
  root: string = REPO_ROOT,
  git: string = "git",
): Violation[] {
  const violations: Violation[] = [];
  for (const relativePath of listScannableFiles(root, git)) {
    const text = readFileSync(absoluteOf(root, relativePath), "utf8");
    violations.push(...scanText(relativePath, text));
  }
  return violations;
}
