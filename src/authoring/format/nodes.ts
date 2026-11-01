// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export interface ValueField {
  field: string;
  value: unknown;
}

export interface SuccessorField {
  path: string;
  id: unknown;
  producesOutput: boolean;
}

export function valueFields(_node: unknown): ValueField[] {
  throw new Error("not implemented");
}

export function hookValueFields(_hook: unknown): ValueField[] {
  throw new Error("not implemented");
}

export function successorFields(_node: unknown): SuccessorField[] {
  throw new Error("not implemented");
}

export function requiredSuccessorFields(_kind: string): string[] {
  throw new Error("not implemented");
}
