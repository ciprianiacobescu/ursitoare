// Architecture rule: only inventoried files import the gateway.
import type { Snapshot, Violation } from "./sources.ts";
import { collectImports, isTestFile, resolveSpecifier, sortViolations } from "./sources.ts";

const GATEWAY_INDEX = "src/gateway/index.ts";
const GATEWAY_DIR = "src/gateway/";

function importedMessage(file: string): string {
  return `${file} imports the gateway; add it to the egress-site inventory in test/arch/egress-sites.test.ts with the policy check it follows`;
}

function missingMessage(file: string): string {
  return `${file} is in the egress-site inventory but imports no gateway; remove it`;
}

export function checkEgressSites(s: Snapshot, allowed: readonly string[]): Violation[] {
  const violations: Violation[] = [];
  const importers = new Set<string>();

  for (const file of s.files) {
    if (!file.path.startsWith("src/") || isTestFile(file.path)) continue;
    if (file.path.startsWith(GATEWAY_DIR)) continue;
    for (const ref of collectImports(file)) {
      if (ref.typeOnly || ref.specifier === null) continue;
      if (resolveSpecifier(file.path, ref.specifier) !== GATEWAY_INDEX) continue;
      importers.add(file.path);
      if (allowed.includes(file.path)) continue;
      violations.push({
        code: "ARCH_EGRESS_SITE",
        file: file.path,
        line: ref.line,
        message: importedMessage(file.path),
      });
    }
  }

  for (const path of allowed) {
    if (importers.has(path)) continue;
    violations.push({
      code: "ARCH_EGRESS_SITE",
      file: path,
      line: 1,
      message: missingMessage(path),
    });
  }

  return sortViolations(violations);
}
