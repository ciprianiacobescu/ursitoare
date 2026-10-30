import { E2eStackError } from "./part.ts";
import type { PartHandle } from "./part.ts";

export const SEED_PATH: string = "/seed";

export interface SeedSource {
  seedData(): Readonly<Record<string, unknown>>;
}

function seedSourceOf(handle: PartHandle): SeedSource | undefined {
  const api = handle.api;
  if (typeof api !== "object" || api === null) return undefined;
  const candidate = api as { seedData?: unknown };
  if (typeof candidate.seedData !== "function") return undefined;
  return api as SeedSource;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

export function collectSeedData(handles: ReadonlyMap<string, PartHandle>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const keys = new Set<string>();

  for (const [name, handle] of handles) {
    const source = seedSourceOf(handle);
    if (source === undefined) continue;

    let data: unknown;
    try {
      data = source.seedData();
    } catch (cause) {
      throw new E2eStackError("STACK_PART_FAILED", "A part failed to seed", { part: name }, { cause });
    }

    if (!isPlainObject(data)) {
      throw new E2eStackError("STACK_PART_INVALID", "A part returned invalid seed data", { part: name });
    }

    for (const [key, value] of Object.entries(data)) {
      if (keys.has(key)) {
        throw new E2eStackError("STACK_PART_INVALID", "Two parts offered the same seed key", { key });
      }
      keys.add(key);
      result[key] = value;
    }
  }

  return result;
}
