// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { ModuleRule, Snapshot, Violation } from "./sources.ts";

export function checkGraphIntegrity(_modules?: Record<string, ModuleRule>): Violation[] {
  throw new Error("not implemented");
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
