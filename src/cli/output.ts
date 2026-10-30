// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export interface CliOutput {
  write(text: string): void;
}

export const CLI_PROGRAM: string = "";

export function safeText(_text: string): string {
  throw new Error("not implemented");
}

export function safeJson(_value: unknown): string {
  throw new Error("not implemented");
}
