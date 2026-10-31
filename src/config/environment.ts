import type { Env } from "./config.ts";

export function readProcessEnv(): Env {
  return { ...process.env };
}
