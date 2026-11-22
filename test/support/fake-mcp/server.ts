import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Socket } from "node:net";

import type { FakeMcpEra, FakeMcpOptions, FakeMcpTool } from "./index.ts";
import { decodeMcpName } from "./wire.ts";

const MODERN_VERSION = "2026-07-28";
const LEGACY_VERSION = "2025-11-25";
const TTL_MS = 60000;
const CACHE_SCOPE = "private";
const CURSOR = /^page-(0|[1-9][0-9]*)$/;
const DEFAULT_PAGE_SIZE = 50;
const FAKE_HOST = "mcp.fake.test";
const META_VERSION = "io.modelcontextprotocol/protocolVersion";
const KNOWN_METHODS = new Set(["server/discover", "tools/list", "tools/call"]);

export interface McpHttpServer {
  readonly origin: string;
  close(): Promise<void>;
}

interface Pagination {
  tools: FakeMcpTool[];
  nextCursor?: string;
}

function respond(res: ServerResponse, status: number, body: unknown): void {
  if (res.destroyed || res.writableEnded) {
    return;
  }
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(Buffer.byteLength(text)),
  });
  res.end(text);
}

function result(id: unknown, value: unknown): unknown {
  return { jsonrpc: "2.0", id, result: value };
}

function failure(id: unknown, code: number, message: string): unknown {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function readBody(req: IncomingMessage): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let settled = false;
    const finish = (body: Buffer | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(body);
    };
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => finish(Buffer.concat(chunks)));
    req.on("aborted", () => finish(null));
    req.on("error", () => finish(null));
    req.on("close", () => {
      if (!req.complete) {
        finish(null);
      }
    });
  });
}

function supportedVersions(era: FakeMcpEra): string[] {
  return era === "modern" ? [MODERN_VERSION] : [MODERN_VERSION, LEGACY_VERSION];
}

function listEntry(tool: FakeMcpTool): Record<string, unknown> {
  const entry: Record<string, unknown> = { name: tool.name };
  if (tool.description !== undefined) {
    entry["description"] = tool.description;
  }
  entry["inputSchema"] = tool.inputSchema;
  if (tool.outputSchema !== undefined) {
    entry["outputSchema"] = tool.outputSchema;
  }
  if (tool.annotations !== undefined) {
    entry["annotations"] = tool.annotations;
  }
  return entry;
}

function page(tools: readonly FakeMcpTool[], cursor: unknown, pageSize: number): Pagination | null {
  let offset = 0;
  if (cursor !== undefined) {
    if (typeof cursor !== "string") {
      return null;
    }
    const match = CURSOR.exec(cursor);
    if (match === null) {
      return null;
    }
    offset = Number(match[1]);
    if (offset >= tools.length) {
      return null;
    }
  }
  const slice = tools.slice(offset, offset + pageSize);
  const next = offset + pageSize;
  return next < tools.length ? { tools: slice, nextCursor: `page-${next}` } : { tools: slice };
}

function discover(era: FakeMcpEra): Record<string, unknown> {
  return {
    resultType: "complete",
    supportedVersions: supportedVersions(era),
    capabilities: { tools: {} },
    _meta: {
      "io.modelcontextprotocol/serverInfo": { name: "fake-mcp", version: "1.0.0" },
    },
    ttlMs: TTL_MS,
    cacheScope: CACHE_SCOPE,
  };
}

function list(tools: readonly FakeMcpTool[], params: Record<string, unknown>, pageSize: number): unknown {
  const pagination = page(tools, params["cursor"], pageSize);
  if (pagination === null) {
    return { code: -32602, message: "Invalid cursor" };
  }
  const value: Record<string, unknown> = {
    resultType: "complete",
    tools: pagination.tools.map(listEntry),
    ttlMs: TTL_MS,
    cacheScope: CACHE_SCOPE,
  };
  if (pagination.nextCursor !== undefined) {
    value["nextCursor"] = pagination.nextCursor;
  }
  return value;
}

function call(tools: readonly FakeMcpTool[], params: Record<string, unknown>): unknown {
  const name = params["name"];
  const tool = typeof name === "string" ? tools.find((candidate) => candidate.name === name) : undefined;
  if (tool === undefined) {
    return { code: -32602, message: `Unknown tool: ${String(name)}` };
  }
  const raw = params["arguments"];
  if (raw !== undefined && (typeof raw !== "object" || raw === null || Array.isArray(raw))) {
    return { code: -32602, message: "Invalid params: arguments must be an object" };
  }
  const outcome = tool.result((raw ?? {}) as Record<string, unknown>);
  const value: Record<string, unknown> = {
    resultType: "complete",
    content: [{ type: "text", text: outcome.text }],
  };
  if (outcome.structuredContent !== undefined) {
    value["structuredContent"] = outcome.structuredContent;
  }
  if (outcome.isError !== undefined) {
    value["isError"] = outcome.isError;
  }
  return value;
}

interface Failure {
  code: number;
  message: string;
}

function isFailure(value: unknown): value is Failure {
  return typeof value === "object" && value !== null && "code" in value && "message" in value;
}

export async function startMcpServer(opts: FakeMcpOptions): Promise<McpHttpServer> {
  const era = opts.era ?? "dual";
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const tools = opts.tools ?? [];
  const keyHeader = opts.keyHeader === undefined ? "authorization" : opts.keyHeader?.toLowerCase() ?? null;
  const sockets = new Set<Socket>();
  let port = 0;

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req);
    if (body === null) {
      return;
    }

    const host = (req.headers.host ?? "").toLowerCase();
    if (host !== FAKE_HOST && host !== `127.0.0.1:${port}`) {
      respond(res, 421, { error: "misdirected_request" });
      return;
    }
    const path = (req.url ?? "").split("?")[0];
    if (path !== (opts.path ?? "/mcp")) {
      respond(res, 404, { error: "not_found" });
      return;
    }
    if (req.method !== "POST") {
      res.setHeader("allow", "POST");
      respond(res, 405, { error: "method_not_allowed" });
      return;
    }
    if (keyHeader !== null) {
      const key = req.headers[keyHeader];
      if (key === undefined || key === "") {
        respond(res, 401, { error: "unauthorized" });
        return;
      }
    }

    let message: unknown;
    try {
      message = JSON.parse(body.toString("utf8"));
    } catch {
      respond(res, 400, failure(null, -32700, "Parse error"));
      return;
    }
    if (
      typeof message !== "object" ||
      message === null ||
      Array.isArray(message) ||
      typeof (message as Record<string, unknown>)["method"] !== "string"
    ) {
      respond(res, 400, failure(null, -32600, "Invalid Request"));
      return;
    }

    const msg = message as { id?: unknown; method: string; params?: unknown };
    const id = msg.id ?? null;
    const params =
      typeof msg.params === "object" && msg.params !== null && !Array.isArray(msg.params)
        ? (msg.params as Record<string, unknown>)
        : {};

    const meta = params["_meta"];
    const requested =
      typeof meta === "object" && meta !== null ? (meta as Record<string, unknown>)[META_VERSION] : undefined;
    if (typeof requested === "string") {
      const mismatch = (text: string): void => {
        respond(res, 400, failure(id, -32020, `Header mismatch: ${text}`));
      };
      const check = (header: string, label: string, expected: string, decode: boolean): boolean => {
        const raw = req.headers[header];
        if (typeof raw !== "string") {
          mismatch(`${label} header is missing`);
          return false;
        }
        const value = decode ? decodeMcpName(raw) : raw;
        if (value !== expected) {
          mismatch(`${label} header value '${raw}' does not match body value '${expected}'`);
          return false;
        }
        return true;
      };
      if (!check("mcp-protocol-version", "MCP-Protocol-Version", requested, false)) {
        return;
      }
      if (!check("mcp-method", "Mcp-Method", msg.method, false)) {
        return;
      }
      if (msg.method === "tools/call") {
        const name = params["name"];
        if (!check("mcp-name", "Mcp-Name", typeof name === "string" ? name : "", true)) {
          return;
        }
      }
      if (requested !== MODERN_VERSION) {
        respond(res, 400, {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32022,
            message: "Unsupported protocol version",
            data: { supported: supportedVersions(era), requested },
          },
        });
        return;
      }
      if (msg.id === undefined) {
        res.writeHead(202);
        res.end();
        return;
      }
      if (!KNOWN_METHODS.has(msg.method)) {
        respond(res, 404, failure(id, -32601, `Method not found: ${msg.method}`));
        return;
      }
    }

    switch (msg.method) {
      case "server/discover": {
        respond(res, 200, result(id, discover(era)));
        return;
      }
      case "tools/list": {
        const value = list(tools, params, pageSize);
        respond(res, 200, isFailure(value) ? failure(id, value.code, value.message) : result(id, value));
        return;
      }
      case "tools/call": {
        const value = call(tools, params);
        respond(res, 200, isFailure(value) ? failure(id, value.code, value.message) : result(id, value));
        return;
      }
      default: {
        respond(res, 200, failure(id, -32600, "Invalid Request"));
      }
    }
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) {
        respond(res, 500, { error: "internal" });
      } else {
        res.destroy();
      }
    });
  });
  server.on("connection", (socket: Socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("fake mcp listener has no port");
  }

  port = address.port;

  let closing: Promise<void> | undefined;
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close(): Promise<void> {
      closing ??= new Promise<void>((resolve) => {
        server.close(() => resolve());
        for (const socket of sockets) {
          socket.destroy();
        }
      });
      return closing;
    },
  };
}
