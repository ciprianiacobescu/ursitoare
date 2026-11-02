import { yamlLanguage } from "@codemirror/lang-yaml";

type SyntaxNode = ReturnType<typeof yamlLanguage.parser.parse>["topNode"];

const MAPPINGS = new Set(["BlockMapping", "FlowMapping"]);
const SEQUENCES = new Set(["BlockSequence", "FlowSequence"]);
const SKIPPED = new Set(["Anchor", "Tag", "Comment", "LineComment", "Directive", "DirectiveEnd", "DocEnd"]);

/** Offset of a 1-based line and column, clamped to the text. */
export function lineColumnOffset(text: string, line: number, column: number): number {
  const wantedLine = Math.max(1, Math.floor(line));
  const wantedColumn = Math.max(1, Math.floor(column));
  let start = 0;
  for (let current = 1; current < wantedLine; current += 1) {
    const newline = text.indexOf("\n", start);
    if (newline === -1) return text.length;
    start = newline + 1;
  }
  const newline = text.indexOf("\n", start);
  const end = newline === -1 ? text.length : newline;
  return Math.min(start + wantedColumn - 1, end);
}

function firstLine(text: string): { from: number; to: number } {
  const newline = text.indexOf("\n");
  return { from: 0, to: newline === -1 ? text.length : newline };
}

function children(node: SyntaxNode): SyntaxNode[] {
  const result: SyntaxNode[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) result.push(child);
  return result;
}

function findContainer(node: SyntaxNode): SyntaxNode | null {
  if (MAPPINGS.has(node.name) || SEQUENCES.has(node.name)) return node;
  for (const child of children(node)) {
    const found = findContainer(child);
    if (found) return found;
  }
  return null;
}

function isValue(node: SyntaxNode): boolean {
  return /^[A-Z]/.test(node.name) && node.name !== "Key" && !SKIPPED.has(node.name);
}

function unquote(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    if ((first === '"' || first === "'") && trimmed.endsWith(first as string)) return trimmed.slice(1, -1);
  }
  return trimmed;
}

function keyText(text: string, key: SyntaxNode): string {
  const inner = key.firstChild;
  const node = inner && inner.name !== "Comment" ? inner : key;
  return unquote(text.slice(node.from, node.to).replace(/:\s*$/, ""));
}

interface Step {
  /** The range to show when this step is the last one resolved. */
  range: { from: number; to: number };
  /** The node to descend into for the next segment. */
  value: SyntaxNode | null;
}

function lineEnd(text: string, from: number, to: number): number {
  const newline = text.indexOf("\n", from);
  return newline !== -1 && newline < to ? newline : to;
}

function valueRange(text: string, value: SyntaxNode, key: SyntaxNode | null): { from: number; to: number } {
  const container = MAPPINGS.has(value.name) || SEQUENCES.has(value.name) || value.name === "Alias";
  if (container) {
    if (!key) return { from: value.from, to: lineEnd(text, value.from, value.to) };
    const inner = key.firstChild ?? key;
    return { from: inner.from, to: lineEnd(text, inner.from, keyEnd(text, key)) };
  }
  let { from, to } = value;
  const raw = text.slice(from, to);
  if (/^["']/.test(raw) && raw.length >= 2 && raw.endsWith(raw[0] as string)) {
    from += 1;
    to -= 1;
  }
  return { from, to: lineEnd(text, from, to) };
}

function keyEnd(text: string, key: SyntaxNode): number {
  const inner = key.firstChild ?? key;
  const raw = text.slice(inner.from, inner.to).replace(/:\s*$/, "");
  return inner.from + raw.length;
}

function stepInto(text: string, container: SyntaxNode, segment: string): Step | null {
  if (MAPPINGS.has(container.name)) {
    for (const pair of children(container)) {
      if (pair.name !== "Pair") continue;
      const parts = children(pair);
      const key = parts.find((part) => part.name === "Key") ?? parts[0];
      if (!key || keyText(text, key) !== segment) continue;
      const value = parts.find((part) => part !== key && isValue(part)) ?? null;
      if (!value) {
        const inner = key.firstChild ?? key;
        return { range: { from: inner.from, to: lineEnd(text, inner.from, keyEnd(text, key)) }, value: null };
      }
      return { range: valueRange(text, value, key), value };
    }
    return null;
  }
  if (!/^(0|[1-9][0-9]*)$/.test(segment)) return null;
  const items = children(container).filter((child) => child.name === "Item");
  const item = items[Number(segment)];
  if (!item) return null;
  const value = children(item).find(isValue) ?? null;
  if (!value) return { range: { from: item.from, to: lineEnd(text, item.from, item.to) }, value: null };
  return { range: valueRange(text, value, null), value };
}

/** The range in the text that a JSON Pointer names, or the nearest place that resolves. */
export function pointerRange(text: string, pointer: string): { from: number; to: number } {
  const fallback = firstLine(text);
  if (text.length === 0 || !pointer.startsWith("/")) return fallback;
  const segments = pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
  let container = findContainer(yamlLanguage.parser.parse(text).topNode);
  let result = fallback;
  for (const segment of segments) {
    if (!container) break;
    const step = stepInto(text, container, segment);
    if (!step) break;
    result = step.range;
    container = step.value ? (MAPPINGS.has(step.value.name) || SEQUENCES.has(step.value.name) ? step.value : null) : null;
  }
  return result;
}
