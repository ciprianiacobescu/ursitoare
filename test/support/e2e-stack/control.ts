import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { FaultTable } from "./faults.ts";
import { FaultInvalidError, parseFault } from "./faults.ts";
import { E2eStackError } from "./part.ts";

export type ControlServer = Readonly<{ url: string; close(): Promise<void> }>;

const MAX_BODY_BYTES = 4096;
const LOOPBACK = "127.0.0.1";

function envelope(code: string, message: string, details?: Readonly<Record<string, unknown>>): string {
  const error: Record<string, unknown> = { code, message };
  if (details !== undefined) error.details = details;
  return JSON.stringify({ error });
}

function send(
  response: ServerResponse,
  status: number,
  body?: string,
  headers: Record<string, string> = {},
): void {
  const base: Record<string, string> = { "cache-control": "no-store", ...headers };
  if (body !== undefined) {
    base["content-type"] = "application/json; charset=utf-8";
    base["content-length"] = String(Buffer.byteLength(body));
  }
  response.writeHead(status, base);
  response.end(body);
}

function isStackError(error: unknown): error is E2eStackError {
  return error instanceof E2eStackError;
}

function hostAllowed(host: string | undefined, port: number): boolean {
  return host === `${LOOPBACK}:${port}` || host === `localhost:${port}`;
}

function mediaTypeOf(header: string | undefined): string | undefined {
  if (header === undefined) return undefined;
  return header.split(";")[0]?.trim().toLowerCase();
}

function pathOf(url: string | undefined): string {
  if (url === undefined) return "";
  const query = url.indexOf("?");
  return query === -1 ? url : url.slice(0, query);
}

export function startControlServer(deps: {
  port: number;
  faults: FaultTable;
  reset(): Promise<void>;
}): Promise<ControlServer> {
  const server = http.createServer((request, response) => {
    void handle(request, response);
  });

  let closing: Promise<void> | undefined;

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const address = server.address();
    const port = typeof address === "object" && address !== null ? address.port : deps.port;

    if (!hostAllowed(request.headers.host, port)) {
      send(response, 403, envelope("CONTROL_FORBIDDEN", "Forbidden"));
      return;
    }

    if (request.headers.origin !== undefined) {
      send(response, 403, envelope("CONTROL_FORBIDDEN", "Forbidden"));
      return;
    }

    const path = pathOf(request.url);
    const method = request.method ?? "";

    if (path === "/reset") {
      if (method !== "POST") {
        send(response, 405, envelope("CONTROL_METHOD_NOT_ALLOWED", "Method not allowed"), { allow: "POST" });
        return;
      }
      request.resume();
      try {
        await deps.reset();
      } catch (error) {
        if (isStackError(error)) {
          send(response, 500, envelope(error.code, error.message, error.details));
        } else {
          const message = error instanceof Error ? error.message : String(error);
          send(response, 500, envelope("STACK_RESET_FAILED", message));
        }
        return;
      }
      send(response, 204);
      return;
    }

    if (path === "/faults") {
      if (method === "DELETE") {
        request.resume();
        deps.faults.clear();
        send(response, 204);
        return;
      }
      if (method !== "POST") {
        send(response, 405, envelope("CONTROL_METHOD_NOT_ALLOWED", "Method not allowed"), {
          allow: "POST, DELETE",
        });
        return;
      }
      await handleFault(request, response);
      return;
    }

    send(response, 404, envelope("CONTROL_NOT_FOUND", "Not found"));
  }

  async function handleFault(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (mediaTypeOf(request.headers["content-type"]) !== "application/json") {
      request.resume();
      send(response, 415, envelope("CONTROL_UNSUPPORTED_MEDIA_TYPE", "Unsupported media type"));
      return;
    }

    const declared = request.headers["content-length"];
    if (declared !== undefined && Number(declared) > MAX_BODY_BYTES) {
      request.resume();
      send(response, 413, envelope("CONTROL_PAYLOAD_TOO_LARGE", "Payload too large"), {
        connection: "close",
      });
      return;
    }

    const chunks: Buffer[] = [];
    let total = 0;
    let tooLarge = false;

    await new Promise<void>((resolve, reject) => {
      request.on("data", (chunk: Buffer) => {
        if (tooLarge) return;
        total += chunk.length;
        if (total > MAX_BODY_BYTES) {
          tooLarge = true;
          chunks.length = 0;
          send(response, 413, envelope("CONTROL_PAYLOAD_TOO_LARGE", "Payload too large"), {
            connection: "close",
          });
          resolve();
          return;
        }
        chunks.push(chunk);
      });
      request.on("end", () => resolve());
      request.on("error", reject);
    });

    if (tooLarge) return;

    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      send(response, 400, envelope("FAULT_INVALID", "Invalid fault: bad_json", { reason: "bad_json" }));
      return;
    }

    try {
      const fault = parseFault(body);
      deps.faults.add(fault);
    } catch (error) {
      if (error instanceof FaultInvalidError) {
        send(response, 400, envelope(error.code, error.message, { reason: error.reason }));
        return;
      }
      throw error;
    }

    send(response, 204);
  }

  return new Promise<ControlServer>((resolve, reject) => {
    server.once("error", reject);
    server.listen(deps.port, LOOPBACK, () => {
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : deps.port;
      resolve({
        url: `http://${LOOPBACK}:${port}`,
        close(): Promise<void> {
          if (closing === undefined) {
            closing = new Promise<void>((done, fail) => {
              server.closeAllConnections();
              server.close((error) => {
                if (error) fail(error);
                else done();
              });
            });
          }
          return closing;
        },
      });
    });
  });
}
