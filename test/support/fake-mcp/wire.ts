const SENTINEL = /^=\?base64\?(.*)\?=$/s;

export function decodeMcpName(raw: string): string | null {
  const match = SENTINEL.exec(raw);
  if (match === null) return raw;

  const encoded = match[1] ?? "";
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.toString("base64") !== encoded) return null;

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}
