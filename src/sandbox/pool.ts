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

function readPlainObject(opts: unknown): object {
  try {
    if (!isPlainObject(opts)) {
      throw invalidOption("opts", "opts must be a plain object");
    }
    return opts;
  } catch (error) {
    if (error instanceof SandboxError) throw error;
    throw invalidOption("opts", "opts could not be read");
  }
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
  const objectOpts = readPlainObject(opts);

  let keys: (string | symbol)[];
  try {
    keys = Reflect.ownKeys(objectOpts);
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
      copy[String(key)] = Reflect.get(objectOpts, key);
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

interface Slot {
  worker: Worker;
  job: PoolJob | undefined;
}

class PoolSandbox implements WorkerSandbox {
  readonly size: number;
  private respawnCount = 0;
  private closed = false;
  private slots: Slot[] = [];
  private queue: PoolJob[] = [];
  private nextId = 1;
  private respawnOnNextSpawn = false;
  private closePromise: Promise<void> | undefined;
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

  /** Spawn a worker for a new slot and register its handlers. */
  private spawnSlot(): Slot {
    const url = workerEntryUrl(import.meta.url);
    const options: WorkerOptions = { env: {}, resourceLimits: this.resourceLimits };
    const worker = this.factory === undefined ? new Worker(url, options) : this.factory(url, options);
    if (this.respawnOnNextSpawn) {
      this.respawnOnNextSpawn = false;
      this.respawnCount += 1;
    }
    const slot: Slot = { worker, job: undefined };
    worker.on("message", (message: unknown) => this.receive(slot, message));
    worker.on("error", () => {
      // The exit handler reports a dead worker.
    });
    worker.on("exit", () => this.onExit(slot));
    // Unref after the listeners: attaching a message listener refs the worker again, and an idle
    // worker must not keep the process alive.
    worker.unref();
    this.slots.push(slot);
    return slot;
  }

  private removeSlot(slot: Slot): void {
    const index = this.slots.indexOf(slot);
    if (index >= 0) this.slots.splice(index, 1);
  }

  /** Start the next queued job on an idle slot, spawning below `size`, first in, first out. */
  private pump(): void {
    if (this.closed) return;
    while (this.queue.length > 0) {
      const idle = this.slots.find((slot) => slot.job === undefined);
      if (idle !== undefined) {
        const job = this.queue.shift();
        if (job !== undefined) this.start(idle, job);
        continue;
      }
      if (this.slots.length < this.size) {
        const job = this.queue.shift();
        if (job === undefined) return;
        let slot: Slot;
        try {
          slot = this.spawnSlot();
        } catch {
          // The factory refused to produce a worker: this run fails, later runs try again.
          job.settled = true;
          job.resolve(faultOf(classifyFault({ stage: "spawn" }), performance.now() - job.t0));
          continue;
        }
        this.start(slot, job);
        continue;
      }
      return;
    }
  }

  private start(slot: Slot, job: PoolJob): void {
    slot.job = job;
    job.timer = setTimeout(() => this.watchdog(slot, job), job.timeoutMs + this.graceMs);
    slot.worker.postMessage(job.message);
  }

  private receive(slot: Slot, message: unknown): void {
    const reply = message as { id?: unknown; result?: SandboxResult };
    const job = slot.job;
    if (
      job === undefined ||
      this.closed ||
      job.settled ||
      reply?.id !== job.id ||
      reply.result === undefined
    ) {
      return;
    }
    this.settle(slot, job);
    job.resolve(reply.result);
    this.pump();
  }

  private watchdog(slot: Slot, job: PoolJob): void {
    if (this.closed || slot.job !== job || job.settled) return;
    this.settle(slot, job);
    this.respawnCount += 1;
    this.removeSlot(slot);
    void slot.worker.terminate();
    const ms = performance.now() - job.t0;
    job.resolve(faultOf(classifyFault({ stage: "watchdog", ms, timeoutMs: job.timeoutMs, graceMs: this.graceMs }), ms));
    try {
      this.spawnSlot();
    } catch {
      // The next run tries to spawn again.
    }
    this.pump();
  }

  private onExit(slot: Slot): void {
    if (this.closed || !this.slots.includes(slot)) return;
    this.removeSlot(slot);
    const job = slot.job;
    if (job !== undefined && !job.settled) {
      this.settle(slot, job);
      this.respawnCount += 1;
      const ms = performance.now() - job.t0;
      job.resolve(faultOf(classifyFault({ stage: "exit" }), ms));
      try {
        this.spawnSlot();
      } catch {
        // The next run tries to spawn again.
      }
      this.pump();
      return;
    }
    // Idle exit: the slot is gone and the next run respawns a worker.
    this.respawnOnNextSpawn = true;
    this.pump();
  }

  /** Detach the job from its slot: it is about to be settled, and no other path resolves it again. */
  private settle(slot: Slot, job: PoolJob): void {
    job.settled = true;
    if (job.timer !== undefined) {
      clearTimeout(job.timer);
      job.timer = undefined;
    }
    if (slot.job === job) {
      slot.job = undefined;
    }
  }

  close(): Promise<void> {
    if (this.closePromise === undefined) {
      this.closePromise = this.doClose();
    }
    return this.closePromise;
  }

  private async doClose(): Promise<void> {
    this.closed = true;
    const jobs = [...this.queue];
    this.queue = [];
    for (const slot of this.slots) {
      if (slot.job !== undefined) jobs.push(slot.job);
    }
    for (const job of jobs) {
      if (job.settled) continue;
      job.settled = true;
      if (job.timer !== undefined) {
        clearTimeout(job.timer);
        job.timer = undefined;
      }
      job.reject(new SandboxError("SANDBOX_CLOSED", "sandbox is closed"));
    }
    const workers = this.slots.map((slot) => slot.worker);
    this.slots = [];
    await Promise.all(workers.map((worker) => worker.terminate()));
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
