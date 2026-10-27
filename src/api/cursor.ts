// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type CursorPosition = readonly (string | number)[];

export interface KeyMaterial {
  reveal(): string;
}

export interface CursorKey {
  readonly bytes: Uint8Array;
}

export interface CursorScope {
  tenantId: string;
  scope: string;
}

export function deriveCursorKey(_engineKey: KeyMaterial | null): CursorKey {
  throw new Error("not implemented");
}

export function encodeCursor(
  _key: CursorKey,
  _claims: CursorScope & { position: CursorPosition },
): string {
  throw new Error("not implemented");
}

export function decodeCursor(
  _key: CursorKey,
  _cursor: string,
  _expect: CursorScope,
): CursorPosition {
  throw new Error("not implemented");
}
