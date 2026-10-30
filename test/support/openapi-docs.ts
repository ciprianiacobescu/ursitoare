import { EventEmitter } from "node:events";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderOpenApi } from "../../src/api/openapi.ts";
import type { AppConfig } from "../../src/config/index.ts";
import type { LogDestination } from "../../src/observability/index.ts";
import { main } from "../../src/main.ts";

const here = dirname(fileURLToPath(import.meta.url));

export const OPENAPI_FILE: string = resolve(here, "../../docs/api/openapi.json");

function appConfig(): AppConfig {
  return {
    role: "all",
    host: "127.0.0.1",
    port: 0,
    logLevel: "silent",
    publicBaseUrl: "http://127.0.0.1",
    webDist: null,
    shutdownDrainMs: 1000,
    engineKey: null,
    database: { app: null, owner: null },
  };
}

export async function servedOpenApiText(): Promise<string> {
  const destination: LogDestination = { write(): void {} };
  const running = await main({
    loadConfig: () => appConfig(),
    destination,
    signals: new EventEmitter(),
    exit: () => undefined,
  });
  if (running === null) {
    throw new Error("the engine did not start");
  }
  try {
    const response = await fetch(`${running.url}/api/v1/openapi.json`);
    if (!response.ok) {
      throw new Error(`the OpenAPI route answered ${response.status}`);
    }
    return renderOpenApi(JSON.parse(await response.text()));
  } finally {
    await running.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = await servedOpenApiText();
  await writeFile(OPENAPI_FILE, text, "utf8");
}
