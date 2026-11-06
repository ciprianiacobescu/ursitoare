import { Worker } from "node:worker_threads";
import type { WorkerOptions } from "node:worker_threads";

import { classifyFault } from "./classify.ts";
import { SANDBOX_POOL_DEFAULTS, workerEntryUrl } from "./limits.ts";
import type { SandboxJob } from "./run-code.ts";
import { SandboxError } from "./types.ts";
import type {
  SandboxFaultCode,
  SandboxResult,
  WorkerSandbox,
  WorkerSandboxOptions,
} from "./types.ts";
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
  /** One lazily spawned worker serves one job at a time in this step; `size` is ignored so far. */
  private worker: Worker | undefined;
  private activeJob: PoolJob | undefined;
  private queue: PoolJob[] = [];
  private nextId = 1;
  private respawnOnNextSpawn = false;
  private readonly graceMs: number;
  private readonly stackCapBytes: number;
  private readonly resourceLimits: { stackSizeMb: number; maxOldGenerationSizeMb: number };
  private readonly factory: ((url: URL, options: WorkerOptions) => Worker) | undefined;

  constructor(config: SandboxConfig) {
    this.size = config.size;
    this.graceMs = config.graceMs;
    this.stackCapBytes = config.stackCapBytes;
    this.resourceLimits = { stackSizeMb: config.stackSizeMb, maxOldGenerationSizeMb: config.maxOldGenerationSizeMb };
    this.factory = config.workerFactory;
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
    const value = validation.value;
    const t0 = performance.now();
    const timeoutMs = value.limits.timeoutMs;
    return new Promise<SandboxResult>((resolve, reject) => {
      const job: PoolJob = {
        id: this.nextId,
        message: {
          id: this.nextId,
          code: value.code,
          inputJson: value.inputJson,
          limits: value.limits,
          options: value.options,
          stackCapBytes: this.stackCapBytes,
        },
        timeoutMs,
        t0,
        timer: undefined,
        settled: false,
        resolve,
        reject,
      };
      this.nextId += 1;
      this.queue.push(job);
      this.pump();
    });
  }

  private spawn(): Worker {
    const url = workerEntryUrl(import.meta.url);
    const options: WorkerOptions = { env: {}, resourceLimits: this.resourceLimits };
    const created = this.factory === undefined ? new Worker(url, options) : this.factory(url, options);
    if (this.respawnOnNextSpawn) {
      this.respawnOnNextSpawn = false;
      this.respawnCount += 1;
    }
    created.unref();
    created.on("message", (message: unknown) => this.receive(created, message));
    created.on("error", () => {
      // The exit handler reports a dead worker.
    });
    created.on("exit", () => this.onExit(created));
    return created;
  }

  private pump(): void {
    if (this.closed || this.activeJob !== undefined) return;
    const job = this.queue.shift();
    if (job === undefined) return;
    if (this.worker === undefined) {
      try {
        this.worker = this.spawn();
      } catch {
        // The factory refused to produce a worker: the run fails on its own, and later runs try again.
        job.settled = true;
        job.resolve(faultOf(classifyFault({ stage: "spawn" }), performance.now() - job.t0));
        this.pump();
        return;
      }
    }
    this.activeJob = job;
    job.timer = setTimeout(() => this.watchdog(job), job.timeoutMs + this.graceMs);
    this.worker.postMessage(job.message);
  }

  private receive(worker: Worker, message: unknown): void {
    const reply = message as { id?: unknown; result?: SandboxResult };
    const job = this.activeJob;
    if (
      job === undefined ||
      this.worker !== worker ||
      this.closed ||
      job.settled ||
      reply?.id !== job.id ||
      reply.result === undefined
    ) {
      return;
    }
    this.settle(job);
    job.resolve(reply.result);
  }

  private watchdog(job: PoolJob): void {
    if (this.closed || this.activeJob !== job || job.settled) return;
    this.settle(job);
    const worker = this.worker;
    this.worker = undefined;
    this.respawnCount += 1;
    if (worker !== undefined) {
      void worker.terminate();
    }
    const ms = performance.now() - job.t0;
    job.resolve(faultOf(classifyFault({ stage: "watchdog", ms, timeoutMs: job.timeoutMs, graceMs: this.graceMs }), ms));
    try {
      this.worker = this.spawn();
    } catch {
      this.worker = undefined;
    }
    this.pump();
  }

  private onExit(worker: Worker): void {
    if (this.closed || this.worker !== worker) return;
    this.worker = undefined;
    const job = this.activeJob;
    if (job !== undefined && !job.settled) {
      this.settle(job);
      this.respawnCount += 1;
      const ms = performance.now() - job.t0;
      job.resolve(faultOf(classifyFault({ stage: "exit" }), ms));
      try {
        this.worker = this.spawn();
      } catch {
        this.worker = undefined;
      }
      this.pump();
      return;
    }
    // Idle exit: the slot stays empty and the next run respawns a worker.
    this.respawnOnNextSpawn = true;
  }

  /** Detach the job from the pool: it is about to be settled, and no other path resolves it again. */
  private settle(job: PoolJob): void {
    job.settled = true;
    if (job.timer !== undefined) {
      clearTimeout(job.timer);
      job.timer = undefined;
    }
    if (this.activeJob === job) {
      this.activeJob = undefined;
    }
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    const jobs = [...this.queue, this.activeJob];
    this.queue = [];
    this.activeJob = undefined;
    for (const job of jobs) {
      if (job === undefined || job.settled) continue;
      this.settle(job);
      job.reject(new SandboxError("SANDBOX_CLOSED", "sandbox is closed"));
    }
    const worker = this.worker;
    this.worker = undefined;
    if (worker !== undefined) {
      await worker.terminate();
    }
  }
}

interface PoolJob {
  id: number;
  message: SandboxJob;
  timeoutMs: number;
  t0: number;
  timer: NodeJS.Timeout | undefined;
  settled: boolean;
  resolve: (result: SandboxResult) => void;
  reject: (error: SandboxError) => void;
}

function faultOf(fault: { code: SandboxFaultCode; message: string }, ms: number): SandboxResult {
  return { ok: false, fault, stats: { ms, memBytes: -1 } };
}

export function createWorkerSandbox(opts?: WorkerSandboxOptions): WorkerSandbox {
  return new PoolSandbox(readPoolOptions(opts));
}
