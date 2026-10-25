// Bootstrap placeholder: serves GET /health only, so the L4 e2e gate has something to serve on the empty tree.
// The engine skeleton unit (openspec change add-engine-skeleton) replaces it with the real composition root.
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";

import type { FastifyInstance } from "fastify";

import type { SignalSource } from "./api/index.ts";
import type { AppConfig } from "./config/index.ts";
import type { openDatabase } from "./db/index.ts";
import { healthPayload } from "./health.ts";
import type { LogDestination } from "./observability/index.ts";

export const VERSION = "0.0.0";

export interface RunningServer {
  url: string;
  close(): Promise<void>;
}

export function startServer(port: number, host = "127.0.0.1"): Promise<RunningServer> {
  const server = createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(healthPayload(VERSION)));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const { port: bound } = server.address() as AddressInfo;
      resolve({
        url: `http://${host}:${bound}`,
        close: () => new Promise<void>((done, fail) => server.close((err) => (err ? fail(err) : done()))),
      });
    });
  });
}

// Signature stub of the composition root (milestone scaffold, docs/decisions/0002): add-engine-skeleton implements it.
// The optional members belong to later units: openDatabase (add-db-foundation), configureServer (add-e2e-stack).
export interface MainDeps {
  loadConfig: () => AppConfig;
  destination: LogDestination;
  signals: SignalSource;
  exit: (code: number) => void;
  openDatabase?: typeof openDatabase;
  configureServer?: (server: FastifyInstance) => void | Promise<void>;
}

export function main(_deps?: Partial<MainDeps>): Promise<RunningServer | null> {
  throw new Error("not implemented");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? "8080");
  const running = await startServer(port, process.env.HOST ?? "127.0.0.1");
  process.stdout.write(`ursitoare listening on ${running.url}\n`);
  const stop = (): void => void running.close().then(() => process.exit(0));
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
}
