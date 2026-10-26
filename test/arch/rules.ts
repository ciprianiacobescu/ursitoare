// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import { MODULES } from "./modules.ts";
import type { Egress, ModuleRule, Snapshot, Violation } from "./sources.ts";

const GRAPH_FILE = "test/arch/modules.ts";

const EGRESS_VALUES: readonly Egress[] = ["tools", "oidc", "otlp"];

const PINNED_EGRESS: Record<string, Egress> = {
  observability: "otlp",
  identity: "oidc",
  gateway: "tools",
};

function graphViolation(message: string): Violation {
  return { code: "ARCH_GRAPH_INVALID", file: GRAPH_FILE, line: 1, message };
}

function cycleIn(modules: Record<string, ModuleRule>, names: string[]): string[] | null {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const visit = (name: string): string[] | null => {
    if (visiting.has(name)) {
      const start = stack.indexOf(name);
      return [...stack.slice(start), name];
    }
    if (visited.has(name)) return null;
    visiting.add(name);
    stack.push(name);
    for (const target of modules[name]?.allowed ?? []) {
      if (target === name || !Object.hasOwn(modules, target)) continue;
      const cycle = visit(target);
      if (cycle !== null) return cycle;
    }
    stack.pop();
    visiting.delete(name);
    visited.add(name);
    return null;
  };

  for (const name of names) {
    const cycle = visit(name);
    if (cycle !== null) return cycle;
  }
  return null;
}

export function checkGraphIntegrity(modules: Record<string, ModuleRule> = MODULES): Violation[] {
  const violations: Violation[] = [];
  const names = Object.keys(modules);

  for (const [name, rule] of Object.entries(modules)) {
    const seen = new Set<string>();
    for (const allowed of rule.allowed) {
      if (!Object.hasOwn(modules, allowed)) {
        violations.push(
          graphViolation(`${name} allows ${allowed}, which is not in test/arch/modules.ts`),
        );
      }
      if (allowed === name) {
        violations.push(graphViolation(`${name} allows itself`));
      }
      if (seen.has(allowed)) {
        violations.push(graphViolation(`${name} allows ${allowed} twice`));
      }
      seen.add(allowed);
    }

    const egress = rule.egress as Egress | undefined;
    const pinned = PINNED_EGRESS[name];
    if (egress !== undefined && !EGRESS_VALUES.includes(egress)) {
      violations.push(
        graphViolation(
          `${name} has egress ${String(egress)}; allowed values are ${EGRESS_VALUES.join(", ")}`,
        ),
      );
    }
    if (egress !== undefined && pinned === undefined) {
      violations.push(
        graphViolation(
          `${name} may not carry an egress value; only observability, identity and gateway do`,
        ),
      );
    }
    if (pinned !== undefined && egress === undefined) {
      violations.push(
        graphViolation(
          `${name} must carry an egress value; the pin is ${pinned}`,
        ),
      );
    }
    if (pinned !== undefined && egress !== undefined && egress !== pinned) {
      violations.push(
        graphViolation(`${name} has egress ${String(egress)}; the pin is ${pinned}`),
      );
    }
  }

  const cycle = cycleIn(modules, names);
  if (cycle !== null) {
    violations.push(graphViolation(`cycle: ${cycle.join(" -> ")}`));
  }

  return violations;
}

export function checkModuleGraph(_s: Snapshot, _modules?: Record<string, ModuleRule>): Violation[] {
  throw new Error("not implemented");
}

export function checkNetwork(_s: Snapshot, _modules?: Record<string, ModuleRule>): Violation[] {
  throw new Error("not implemented");
}

export function checkForbiddenImports(_s: Snapshot): Violation[] {
  throw new Error("not implemented");
}

export function checkConsole(_s: Snapshot): Violation[] {
  throw new Error("not implemented");
}

export function checkProcessEnv(_s: Snapshot): Violation[] {
  throw new Error("not implemented");
}

export function checkAll(_s: Snapshot, _modules?: Record<string, ModuleRule>): Violation[] {
  throw new Error("not implemented");
}
