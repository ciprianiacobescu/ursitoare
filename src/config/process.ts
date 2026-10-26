import type { AppConfig } from "./config.ts";
import { loadConfig } from "./config.ts";

export function loadConfigFromProcess(): AppConfig {
  return loadConfig(process.env);
}
