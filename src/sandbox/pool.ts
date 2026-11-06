import type { Worker, WorkerOptions } from "node:worker_threads";

import { SANDBOX_POOL_DEFAULTS } from "./limits.ts";
import { SandboxError } from "./types.ts";
import type { SandboxResult, WorkerSandbox, WorkerSandboxOptions } from "./types.ts";
import { validateRunArguments } from "./validate.ts";

interface SandboxConfig {
  size: number;
  graceMs: number;
  stackSizeMb: number;
  stackCapBytes: number;
  maxOldGenerationSizeMb: number;
  workerFactory?: ((url: URL, options: WorkerOptions) => Worker) | undefined;
}

const OPTION_KEYS: ReadonlySet<string> = new Set([
  "size",
  "graceMs",
  "stackSizeMb",
  "stackCapBytes",
  "maxOldGenerationSizeMb",
  "workerFactory",
]);

function invalidOption(option: string, message: string): SandboxError {
  return new SandboxError("SANDBOX_INVALID", message, { option });
}

function isPlainObject(value: unknown): value is object {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function readNumeric(
  copy: Record<string, unknown>,
  name: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const value = copy[name];
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw invalidOption(name, `${name} must be an integer from ${min} to ${max}`);
  }
  return value;
}

function readPoolOptions(opts: unknown): SandboxConfig {
  const defaults = SANDBOX_POOL_DEFAULTS;
  if (opts === undefined) {
    return { ...defaults };
  }
  if (!isPlainObject(opts)) {
    throw invalidOption("opts", "opts must be a plain object");
  }

  let keys: (string | symbol)[];
  try {
    keys = Reflect.ownKeys(opts);
  } catch {
    throw invalidOption("opts", "opts could not be read");
  }

  for (const key of keys) {
    if (typeof key !== "string" || !OPTION_KEYS.has(key)) {
      const name = typeof key === "string" ? key : String(key);
      throw invalidOption(name, `${name} is not an option`);
    }
  }

  const copy: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  try {
    for (const key of keys) {
      copy[String(key)] = Reflect.get(opts, key);
    }
  } catch {
    throw invalidOption("opts", "opts could not be read");
  }

  const config: SandboxConfig = {
    size: readNumeric(copy, "size", 1, 16, defaults.size),
    graceMs: readNumeric(copy, "graceMs", 0, 10000, defaults.graceMs),
    stackSizeMb: readNumeric(copy, "stackSizeMb", 1, 64, defaults.stackSizeMb),
    stackCapBytes: readNumeric(copy, "stackCapBytes", 32768, 1048576, defaults.stackCapBytes),
    maxOldGenerationSizeMb: readNumeric(
      copy,
      "maxOldGenerationSizeMb",
      16,
      4096,
      defaults.maxOldGenerationSizeMb,
    ),
  };

  const factory = copy["workerFactory"];
  if (factory !== undefined) {
    if (typeof factory !== "function") {
      throw invalidOption("workerFactory", "workerFactory must be a function");
    }
    config.workerFactory = factory as (url: URL, options: WorkerOptions) => Worker;
  }

  return config;
}

class PoolSandbox implements WorkerSandbox {
  readonly size: number;
  private respawnCount = 0;
  private closed = false;

  constructor(config: SandboxConfig) {
    this.size = config.size;
    this.run = this.run.bind(this);
    this.close = this.close.bind(this);
  }

  get respawns(): number {
    return this.respawnCount;
  }

  async run(
    code: string,
    input: unknown,
    limits: unknown,
    options: unknown,
  ): Promise<SandboxResult> {
    if (this.closed) {
      throw new SandboxError("SANDBOX_CLOSED", "sandbox is closed");
    }
    const validation = validateRunArguments(code, input, limits, options);
    if (!validation.ok) {
      return {
        ok: false,
        fault: { code: "input_invalid", message: validation.message },
        stats: { ms: 0, memBytes: -1 },
      };
    }
    throw new Error("not implemented");
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

export function createWorkerSandbox(opts?: WorkerSandboxOptions): WorkerSandbox {
  return new PoolSandbox(readPoolOptions(opts));
}
