export interface CliOutput {
  write(text: string): void;
}

export const CLI_PROGRAM: string = "node src/cli/main.ts";

function isUnsafe(code: number): boolean {
  return (
    code <= 0x1f ||
    (code >= 0x7f && code <= 0x9f) ||
    code === 0x2028 ||
    code === 0x2029 ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2066 && code <= 0x2069)
  );
}

function escapeControl(character: string): string {
  const code = character.codePointAt(0) ?? 0;
  return `\\u${code.toString(16).padStart(4, "0")}`;
}

export function safeText(text: string): string {
  let result = "";
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    result += isUnsafe(code) ? "?" : character;
  }
  return result;
}

export function safeJson(value: unknown): string {
  const text = JSON.stringify(value);
  if (text === undefined) {
    return "null";
  }
  let result = "";
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    result += isUnsafe(code) ? escapeControl(character) : character;
  }
  return result;
}
