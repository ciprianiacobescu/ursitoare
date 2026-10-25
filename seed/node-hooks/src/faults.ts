// Test support: the internal crash point (CRASH_BEFORE_STEP / CRASH_MARKER) and the hook execution trace (hook-exec.jsonl).
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const HOOK_EXEC = process.env.HOOK_EXEC_LOG ?? new URL('../.state/hook-exec.jsonl', import.meta.url).pathname;

/** Kill this process with SIGKILL once, right before the named unit runs (the marker file makes recovery not crash again). */
export function crashCheck(logicalName: string): void {
  const target = process.env.CRASH_BEFORE_STEP;
  const marker = process.env.CRASH_MARKER;
  if (!target || !marker || target !== logicalName) return;
  if (existsSync(marker)) return;
  mkdirSync(dirname(marker), { recursive: true });
  writeFileSync(marker, `${logicalName} ${new Date().toISOString()}\n`);
  process.kill(process.pid, 'SIGKILL');
}

/** Called inside the hook step, just before it returns. Counts real executions, as opposed to replays. */
export function hookExecLog(line: { run: string; node: string; phase: string; hook: string; attempt: number }): void {
  try {
    mkdirSync(dirname(HOOK_EXEC), { recursive: true });
    appendFileSync(HOOK_EXEC, JSON.stringify({ ...line, ts: Date.now() }) + '\n');
  } catch { /* tracing must not break the run */ }
}
