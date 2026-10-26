import type { Violation } from "./sources.ts";

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

export function listScannableFiles(_root?: string, _git?: string): string[] {
  throw new Error("not implemented");
}

export function scanRepository(_root?: string, _git?: string): Violation[] {
  throw new Error("not implemented");
}
