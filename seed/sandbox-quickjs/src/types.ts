export interface Limits {
  /** Wall-clock budget for the whole run (guest CPU + time spent awaiting host fetches). */
  timeoutMs: number;
  /**
   * Guest memory budget. Enforced as a hard ceiling on the Wasm linear memory of a per-bucket module instance
   * (16 MiB base + memoryBytes rounded up to 16 MiB), plus JS_SetMemoryLimit for single huge allocations.
   * JS_SetMemoryLimit alone does NOT count bytes in this Emscripten build, see index.ts and REPORT.md.
   */
  memoryBytes: number;
  /** Guest native-stack cap. Clamped to [MIN_STACK_BYTES, MAX_STACK_BYTES] (32-64 KiB in-process; up to 256 KiB in WorkerSandbox). */
  maxStackBytes: number;
  /** Cap on the UTF-8 size of the serialized output JSON. */
  maxOutputBytes: number;
}

export interface FetchRecord {
  seq: number;
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody: string | null;
  /** Present when the request reached the (real or replayed) upstream and a response came back. */
  response?: { status: number; statusText: string; headers: Record<string, string>; body: string };
  /** Present when the request was denied by policy or failed at the network layer. */
  error?: { name: 'FetchDeniedError' | 'FetchError'; message: string };
}

export interface RunCodeOptions {
  /** Format-v0 `code` body: a function body that receives `input` and returns an object. */
  source: string;
  /** Plain JSON data. It is deep-copied (as a JSON string) into the guest. */
  input: unknown;
  limits: Limits;
  /** Seed for the guest Math.random PRNG (mulberry32). A string seed is hashed (FNV-1a). */
  seed: number | string;
  /** The frozen value of Date.now()/new Date() inside the guest. */
  nowIso: string;
  /** Enables the guest `fetch` global when defined. Entries are exact origins, e.g. "http://localhost:18930". */
  fetchAllowlist?: string[];
  /** If set, fetch never touches the network: allowed requests consume these records in order. */
  fetchReplay?: FetchRecord[];
  /** Test hook: replaces the real network fetch (still behind the allowlist, redirect=manual semantics are the caller's job). */
  fetchImpl?: typeof fetch;
  /**
   * Raise the hard cap on `limits.maxStackBytes`. Only safe on a thread whose native stack is much larger than the
   * default (a Worker with resourceLimits.stackSizeMb >= 4); the default cap protects the main thread's ~984 KB V8 stack.
   */
  stackCapBytes?: number;
  fetchMaxRequests?: number;
  fetchMaxResponseBytes?: number;
}

export type ErrorCode =
  | 'timeout'
  | 'memory_limit'
  | 'stack_overflow'
  | 'output_too_large'
  | 'output_invalid'
  | 'input_invalid'
  | 'syntax_error'
  | 'runtime_error'
  | 'never_settled'
  | 'fetch_denied'
  | 'fetch_failed'
  | 'replay_mismatch'
  | 'sandbox_crash';

export interface RunStats {
  ms: number;
  /** QuickJS `memory_used_size` sampled at the end of the run (live bytes, not peak). */
  memBytes: number;
  setupMs?: number;
  execMs?: number;
}

export type RunResult =
  | { ok: true; output: Record<string, unknown>; stats: RunStats; fetchLog: FetchRecord[] }
  | { ok: false; error: { code: ErrorCode; message: string }; stats: RunStats; fetchLog: FetchRecord[] };
