import { Worker } from 'node:worker_threads';
import type { RunCodeOptions, RunResult } from './types.ts';

export interface WorkerSandboxOptions {
  /** V8 stack size of each worker thread in MB (Node default is 4). */
  stackSizeMb?: number;
  /** Extra wall-clock beyond limits.timeoutMs before the worker is killed from outside. */
  graceMs?: number;
  /** Cap on the guest stack inside the worker. Default 256 KiB, which is safe at stackSizeMb=4 (measured, see REPORT.md). */
  stackCapBytes?: number;
  /** V8 heap cap of the worker thread itself (the guest heap is capped separately by limits.memoryBytes). */
  maxOldGenerationSizeMb?: number;
}

interface Job { id: number; resolve: (r: RunResult) => void; timer: NodeJS.Timeout; t0: number }
interface Slot { worker: Worker; job: Job | null; ready: Promise<void> }

/**
 * Optional hardening: run `runCode` on long-lived worker threads. Gains over the in-process path:
 * (1) a hard kill (`worker.terminate()`) when a native built-in ignores the interrupt handler,
 * (2) a larger native stack, so a larger maxStackBytes is safe,
 * (3) a wedged or aborted Wasm instance can't take the host's own work with it.
 * Cost: one message round trip per execution (measured in REPORT.md), and `fetchImpl` can't cross the thread boundary.
 */
export class WorkerSandbox {
  private readonly slots: Slot[] = [];
  private readonly waiters: Array<(s: Slot) => void> = [];
  private nextId = 1;
  private readonly o: Required<WorkerSandboxOptions>;
  private closed = false;
  respawns = 0;

  constructor(size = 1, o: WorkerSandboxOptions = {}) {
    this.o = { stackSizeMb: o.stackSizeMb ?? 4, graceMs: o.graceMs ?? 250, stackCapBytes: o.stackCapBytes ?? 256 * 1024, maxOldGenerationSizeMb: o.maxOldGenerationSizeMb ?? 512 };
    for (let i = 0; i < size; i++) this.slots.push(this.spawn());
  }

  private spawn(): Slot {
    const worker = new Worker(new URL('./worker-entry.ts', import.meta.url), {
      resourceLimits: { stackSizeMb: this.o.stackSizeMb, maxOldGenerationSizeMb: this.o.maxOldGenerationSizeMb },
    });
    const slot: Slot = { worker, job: null, ready: undefined as unknown as Promise<void> };
    slot.ready = new Promise<void>((resolve) => {
      worker.on('message', (m: { ready?: boolean; id?: number; result?: RunResult }) => {
        if (m.ready) return resolve();
        const job = slot.job;
        if (job && job.id === m.id) { clearTimeout(job.timer); slot.job = null; job.resolve(m.result!); this.release(slot); }
      });
    });
    worker.on('error', () => { /* the exit handler below reports it */ });
    worker.on('exit', () => {
      const job = slot.job;
      if (!job || this.closed) return;
      clearTimeout(job.timer);
      slot.job = null;
      this.replace(slot);
      job.resolve({ ok: false, error: { code: 'sandbox_crash', message: 'worker thread exited unexpectedly' }, stats: { ms: performance.now() - job.t0, memBytes: -1 }, fetchLog: [] });
    });
    return slot;
  }

  private replace(old: Slot) {
    const idx = this.slots.indexOf(old);
    if (idx < 0) return;
    const fresh = this.spawn();
    this.slots[idx] = fresh;
    this.respawns++;
    this.release(fresh);
  }

  private acquire(): Promise<Slot> {
    const free = this.slots.find((s) => !s.job);
    return free ? Promise.resolve(free) : new Promise((resolve) => this.waiters.push(resolve));
  }
  private release(slot: Slot) {
    const w = this.waiters.shift();
    if (w) w(slot);
  }

  async run(opts: Omit<RunCodeOptions, 'fetchImpl' | 'stackCapBytes'>): Promise<RunResult> {
    if (this.closed) throw new Error('WorkerSandbox closed');
    const slot = await this.acquire();
    slot.job = { id: -1 } as Job; // reserve before awaiting readiness
    await slot.ready;
    const id = this.nextId++;
    const t0 = performance.now();
    return new Promise<RunResult>((resolve) => {
      const timer = setTimeout(() => {
        // The in-worker deadline did not bring the run back in time (non-interruptible native call): hard kill.
        slot.job = null;
        void slot.worker.terminate();
        this.replace(slot);
        const ms = performance.now() - t0;
        resolve({ ok: false, error: { code: 'timeout', message: `worker watchdog killed the sandbox after ${ms.toFixed(0)} ms (limit ${opts.limits.timeoutMs} + grace ${this.o.graceMs})` }, stats: { ms, memBytes: -1 }, fetchLog: [] });
      }, opts.limits.timeoutMs + this.o.graceMs);
      slot.job = { id, resolve, timer, t0 };
      slot.worker.postMessage({ id, opts: { ...opts, stackCapBytes: this.o.stackCapBytes } });
    });
  }

  async close() {
    this.closed = true;
    await Promise.all(this.slots.map((s) => s.worker.terminate()));
  }
}
