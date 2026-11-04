import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

import { E2eStackError } from "../e2e-stack/part.ts";

type EffectEntry = { tool: string; idemKey: string | null; nodeId: string };
type EffectCount = { calls: number; effects: number; duplicates: number };

function optionsError(field: string): E2eStackError {
  return new E2eStackError("CRASH_OPTIONS_INVALID", `invalid effect entry: ${field}`, { field });
}

function invalidLog(line: number): E2eStackError {
  return new E2eStackError("CRASH_EFFECT_LOG_INVALID", `invalid effect log line ${line}`, { line });
}

function validateEntry(entry: EffectEntry): EffectEntry {
  if (typeof entry.tool !== "string" || entry.tool.length === 0) {
    throw optionsError("tool");
  }
  if (entry.idemKey !== null && (typeof entry.idemKey !== "string" || entry.idemKey.length === 0)) {
    throw optionsError("idemKey");
  }
  if (typeof entry.nodeId !== "string" || entry.nodeId.length === 0) {
    throw optionsError("nodeId");
  }
  return { tool: entry.tool, idemKey: entry.idemKey, nodeId: entry.nodeId };
}

function parseLine(raw: string, line: number): EffectEntry {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw invalidLog(line);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw invalidLog(line);
  }
  const candidate = parsed as Record<string, unknown>;
  if (typeof candidate.tool !== "string" || candidate.tool.length === 0) {
    throw invalidLog(line);
  }
  if (
    candidate.idemKey !== null &&
    (typeof candidate.idemKey !== "string" || candidate.idemKey.length === 0)
  ) {
    throw invalidLog(line);
  }
  if (typeof candidate.nodeId !== "string" || candidate.nodeId.length === 0) {
    throw invalidLog(line);
  }
  return {
    tool: candidate.tool,
    idemKey: candidate.idemKey as string | null,
    nodeId: candidate.nodeId,
  };
}

function linesOf(content: string): string[] {
  if (content.length === 0) return [];
  const body = content.endsWith("\n") ? content.slice(0, -1) : content;
  if (body.length === 0) return [""];
  return body.split("\n");
}

export function appendEffect(file: string, entry: EffectEntry): void {
  const valid = validateEntry(entry);
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify(valid)}\n`);
}

export function countEffects(file: string): {
  calls: number;
  effects: number;
  duplicates: number;
  byTool: Readonly<Record<string, EffectCount>>;
} {
  if (!existsSync(file)) {
    return { calls: 0, effects: 0, duplicates: 0, byTool: {} };
  }

  const stats = new Map<string, { calls: number; keys: Set<string>; nulls: number }>();
  for (const [index, raw] of linesOf(readFileSync(file, "utf8")).entries()) {
    const entry = parseLine(raw, index + 1);
    const stat = stats.get(entry.tool) ?? { calls: 0, keys: new Set<string>(), nulls: 0 };
    stat.calls += 1;
    if (entry.idemKey === null) {
      stat.nulls += 1;
    } else {
      stat.keys.add(entry.idemKey);
    }
    stats.set(entry.tool, stat);
  }

  let calls = 0;
  let effects = 0;
  const byTool = Object.fromEntries(
    [...stats.entries()].map(([tool, stat]) => {
      const toolEffects = stat.keys.size + stat.nulls;
      calls += stat.calls;
      effects += toolEffects;
      return [tool, { calls: stat.calls, effects: toolEffects, duplicates: stat.calls - toolEffects }];
    }),
  );

  return { calls, effects, duplicates: calls - effects, byTool };
}
