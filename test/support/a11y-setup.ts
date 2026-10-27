// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type A11yProblemCode =
  | "AXE_NOT_DECLARED"
  | "AXE_NOT_EXACT"
  | "AXE_NOT_INSTALLED"
  | "ASSERT_ACCESSIBLE_MISSING"
  | "ASSERT_ACCESSIBLE_UNSAFE";

export interface A11yProblem {
  code: A11yProblemCode;
  detail: string;
}

export function checkAccessibilitySetup(_repoRoot: string): A11yProblem[] {
  throw new Error("not implemented");
}
