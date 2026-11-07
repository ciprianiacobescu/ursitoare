// The worker side of the sandbox: one message per job, answered one result (design § 2).
import { parentPort } from "node:worker_threads";

import { runCode } from "./run-code.ts";
import type { SandboxJob } from "./run-code.ts";
import type { SandboxResult } from "./types.ts";

const port = parentPort;

if (port === null) {
  throw new Error("sandbox worker-entry must run on a worker thread");
} else {
  port.on("message", (message: unknown): void => {
    const job = message as SandboxJob;
    void runCode(job)
      .then((result: SandboxResult) => {
        port.postMessage({ id: job.id, result });
      })
      .catch((e: unknown) => {
        const error = e as { constructor?: { name?: string }; message?: unknown };
        const name = String(error?.constructor?.name ?? "Error");
        const detail = String(error?.message ?? "").slice(0, 300);
        port.postMessage({
          id: job.id,
          result: {
            ok: false,
            fault: { code: "sandbox_crash", message: `${name}: ${detail}` },
            stats: { ms: 0, memBytes: -1 },
          },
        });
      });
  });
}
