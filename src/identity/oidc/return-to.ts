const BASE = "http://x.invalid";
const MAX_LENGTH = 512;
function hasForbiddenCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (character === "\\" || code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

export function sanitizeReturnTo(raw: unknown): string {
  if (typeof raw !== "string" || raw.length > MAX_LENGTH) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (hasForbiddenCharacter(raw)) return "/";
  let parsed: URL;
  try {
    parsed = new URL(raw, BASE);
  } catch {
    return "/";
  }
  if (parsed.origin !== new URL(BASE).origin) return "/";
  if (parsed.pathname.startsWith("/auth/")) return "/";
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
