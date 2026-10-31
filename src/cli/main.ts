import { fileURLToPath } from "node:url";

import { readProcessEnv } from "../config/index.ts";
import { createDefaultRegistry } from "./builtin.ts";
import type { CliOutput } from "./output.ts";
import { runCli } from "./run.ts";
import type { CliDeps } from "./run.ts";

function streamOutput(stream: NodeJS.WriteStream): CliOutput {
  return {
    write(text: string): void {
      stream.write(text);
    },
  };
}

export async function cliMain(argv: readonly string[], deps: Partial<CliDeps> = {}): Promise<number> {
  const resolved: CliDeps = {
    env: deps.env ?? readProcessEnv(),
    stdout: deps.stdout ?? streamOutput(process.stdout),
    stderr: deps.stderr ?? streamOutput(process.stderr),
    registry: deps.registry ?? createDefaultRegistry(),
    ...(deps.clock === undefined ? {} : { clock: deps.clock }),
    ...(deps.ids === undefined ? {} : { ids: deps.ids }),
    ...(deps.readSecret === undefined ? {} : { readSecret: deps.readSecret }),
    ...(deps.connectOwner === undefined ? {} : { connectOwner: deps.connectOwner }),
  };
  return runCli(argv, resolved);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await cliMain(process.argv.slice(2));
}
