// The process the L4 e2e gate serves (`gates.e2e.serve.command`), offline: the gate runs with loopback only.
// It composes the real engine with embedded Postgres and the loopback control listener, and stops on SIGTERM/SIGINT.
// Test-support file: only a task that names it may change it.
import { E2eStackError } from "./part.ts";
import type { E2eStack } from "./stack.ts";
import { startE2eStack } from "./stack.ts";

const DEFAULT_ENGINE_PORT = 39080;
const DEFAULT_CONTROL_PORT = 39081;
const MIN_PORT = 1;
const MAX_PORT = 65535;

function portFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < MIN_PORT || value > MAX_PORT) {
    throw new E2eStackError(
      "STACK_OPTIONS_INVALID",
      `${name} must be an integer from ${MIN_PORT} to ${MAX_PORT}`,
      { variable: name },
    );
  }
  return value;
}

function failureLine(error: unknown): string {
  const candidate = error as { code?: unknown; message?: unknown; details?: unknown } | null;
  const code = typeof candidate?.code === "string" ? candidate.code : "STACK_FAILED";
  const message = typeof candidate?.message === "string" ? candidate.message : String(error);
  const details = candidate?.details ?? {};
  return `e2e stack failed: ${code} ${message} ${JSON.stringify(details)}\n`;
}

const writeReady = process.stdout.write.bind(process.stdout);
const writeError = process.stderr.write.bind(process.stderr);

process.stdout.write = ((
  chunk: string | Uint8Array,
  encoding?: BufferEncoding | ((error?: Error | null) => void),
  callback?: (error?: Error | null) => void,
): boolean => {
  if (typeof encoding === "function") {
    return writeError(chunk, encoding);
  }
  return writeError(chunk, encoding, callback);
}) as typeof process.stdout.write;

// embedded-postgres registers an async-exit-hook SIGTERM/SIGINT handler on import
// that calls process.exit(128 + signal); this process closes the stack itself.
process.removeAllListeners("SIGTERM");
process.removeAllListeners("SIGINT");

let signalReceived = false;
let resolveSignal: (() => void) | undefined;
const signalled = new Promise<void>((resolve) => {
  resolveSignal = resolve;
});

function onSignal(): void {
  if (signalReceived) {
    return;
  }
  signalReceived = true;
  resolveSignal?.();
}

process.once("SIGTERM", onSignal);
process.once("SIGINT", onSignal);

async function shutdown(stack: E2eStack): Promise<never> {
  try {
    await stack.close();
    process.exit(0);
  } catch {
    process.exit(1);
  }
}

async function run(): Promise<void> {
  let stack: E2eStack;
  try {
    const port = portFromEnv("E2E_PORT", DEFAULT_ENGINE_PORT);
    const controlPort = portFromEnv("E2E_CONTROL_PORT", DEFAULT_CONTROL_PORT);
    const dataDir = process.env.E2E_DATA_DIR;
    stack = await startE2eStack({
      port,
      controlPort,
      ...(dataDir === undefined ? {} : { dataDir }),
      log: process.env.E2E_STACK_LOG !== "0",
    });
  } catch (error) {
    if (signalReceived) {
      process.exit(0);
    }
    writeError(failureLine(error));
    process.exit(1);
  }

  if (signalReceived) {
    await shutdown(stack);
  }

  writeReady(`e2e stack ready on ${stack.url} control ${stack.controlUrl}\n`);

  if (!signalReceived) {
    await signalled;
  }
  await shutdown(stack);
}

await run();
