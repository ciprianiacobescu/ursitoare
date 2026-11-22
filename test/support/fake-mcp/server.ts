import { createHash } from "node:crypto";
import http from "node:http";
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import type { Socket } from "node:net";

import type { FakeMcpEra, FakeMcpOptions, FakeMcpRequest, FakeMcpTool } from "./index.ts";
import { decodeMcpName } from "./wire.ts";

const MODERN_VERSION = "2026-07-28";
const LEGACY_VERSION = "2025-11-25";
const TTL_MS = 60000;
const CACHE_SCOPE = "private";
const LEGACY_VERSIONS = new Set(["2025-11-25", "2025-06-18", "2025-03-26"]);
const CURSOR = /^page-(0|[1-9][0-9]*)$/;
const DEFAULT_PAGE_SIZE = 50;
const FAKE_HOST = "mcp.fake.test";
const META_VERSION = "io.modelcontextprotocol/protocolVersion";
const KNOWN_METHODS = new Set(["server/discover", "tools/list", "tools/call"]);

export interface McpHttpServer {
  readonly origin: string;
  requests(): FakeMcpRequest[];
  failNext(method: string, status: number, times?: number): void;
  setTools(tools: readonly FakeMcpTool[]): void;
  reset(): void;
  close(): Promise<void>;
}

interface PendingFailure {
  status: number;
  times: number;
}

function checkTools(tools: readonly FakeMcpTool[]): void {
  const seen = new Set<string>();
  for (const tool of tools) {
    if (typeof tool.name !== "string" || tool.name === "") {
      throw new RangeError("tool name must be a non-empty string");
    }
    if (seen.has(tool.name)) {
      throw new RangeError(`duplicate tool name: ${tool.name}`);
    }
    seen.add(tool.name);
  }
}

function headerText(value: string | string[] | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  return Array.isArray(value) ? value.join(", ") : value;
}

function recordHeaders(raw: IncomingHttpHeaders, keyHeader: string | null): Record<string, string> {
  const credential = new Set(["authorization", "cookie", "proxy-authorization"]);
  if (keyHeader !== null) {
    credential.add(keyHeader);
  }
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(raw)) {
    if (value === undefined) {
      continue;
    }
    const text = Array.isArray(value) ? value.join(", ") : value;
    if (name === "mcp-session-id") {
      headers[name] = "[session]";
    } else if (credential.has(name)) {
      headers[name] = "[credential]";
    } else {
      headers[name] = text;
    }
  }
  return headers;
}

interface Pagination {
  tools: FakeMcpTool[];
  nextCursor?: string;
}

function respondJson(res: ServerResponse, status: number, body: unknown): void {
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

const PROGRESS = {
  jsonrpc: "2.0",
  method: "notifications/progress",
  params: { progressToken: "fake-progress", progress: 1, total: 1 },
};

function event(body: unknown): string {
  return `event: message\ndata: ${JSON.stringify(body)}\n\n`;
}

function respondStream(res: ServerResponse, body: unknown): void {
  if (res.destroyed || res.writableEnded) {
    return;
  }
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
  res.end(event(PROGRESS) + event(body));
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
  const startTools = opts.tools ?? [];
  let tools: readonly FakeMcpTool[] = startTools;
  const keyHeader = opts.keyHeader === undefined ? "authorization" : opts.keyHeader?.toLowerCase() ?? null;
  const sockets = new Set<Socket>();
  const sessions = new Set<string>();
  const records: FakeMcpRequest[] = [];
  const failures = new Map<string, PendingFailure>();
  let sessionCount = 0;
  let seq = 0;
  let port = 0;

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const respond = (target: ServerResponse, status: number, payload: unknown): void => {
      if (status === 200 && opts.sse === true) {
        respondStream(target, payload);
        return;
      }
      respondJson(target, status, payload);
    };
    const body = await readBody(req);
    if (body === null) {
      return;
    }

    let message: unknown;
    try {
      message = JSON.parse(body.toString("utf8"));
    } catch {
      message = undefined;
    }
    const msg =
      message !== undefined &&
      typeof message === "object" &&
      message !== null &&
      !Array.isArray(message) &&
      typeof (message as Record<string, unknown>)["method"] === "string"
        ? (message as { id?: unknown; method: string; params?: unknown })
        : undefined;
    const params =
      msg !== undefined &&
      typeof msg.params === "object" &&
      msg.params !== null &&
      !Array.isArray(msg.params)
        ? (msg.params as Record<string, unknown>)
        : {};
    const meta = params["_meta"];
    const requested =
      typeof meta === "object" && meta !== null ? (meta as Record<string, unknown>)[META_VERSION] : undefined;
    const requestEra: "modern" | "legacy" | null =
      msg === undefined ? null : typeof requested === "string" ? "modern" : "legacy";

    const host = (req.headers.host ?? "").toLowerCase();
    const path = (req.url ?? "").split("?")[0] ?? "";
    const headers = recordHeaders(req.headers, keyHeader);
    const bodySha256 = createHash("sha256").update(body).digest("hex");
    const callHeader = headerText(req.headers["x-ursitoare-call"]);
    const toolName =
      msg !== undefined && msg.method === "tools/call" && typeof params["name"] === "string"
        ? (params["name"] as string)
        : null;

    seq += 1;
    const currentSeq = seq;
    const record = (status: number): void => {
      records.push({
        seq: currentSeq,
        method: msg === undefined ? "" : msg.method,
        era: requestEra,
        host,
        path,
        headers,
        bodySha256,
        status,
        callHeader,
        toolName,
      });
    };
    const finish = (status: number, payload: unknown): void => {
      record(status);
      respond(res, status, payload);
    };
    const finishEmpty = (status: number, extra?: http.OutgoingHttpHeaders): void => {
      record(status);
      res.writeHead(status, extra ?? {});
      res.end();
    };

    if (host !== FAKE_HOST && host !== `127.0.0.1:${port}`) {
      finish(421, { error: "misdirected_request" });
      return;
    }
    if (path !== (opts.path ?? "/mcp")) {
      finish(404, { error: "not_found" });
      return;
    }
    if (req.method !== "POST") {
      res.setHeader("allow", "POST");
      finish(405, { error: "method_not_allowed" });
      return;
    }
    if (keyHeader !== null) {
      const key = req.headers[keyHeader];
      if (key === undefined || key === "") {
        finish(401, { error: "unauthorized" });
        return;
      }
    }
    const pending = msg === undefined ? undefined : failures.get(msg.method);
    if (msg !== undefined && pending !== undefined) {
      pending.times -= 1;
      if (pending.times <= 0) {
        failures.delete(msg.method);
      }
      finish(pending.status, { error: "injected_failure", status: pending.status });
      return;
    }

    if (message === undefined) {
      finish(400, failure(null, -32700, "Parse error"));
      return;
    }
    if (msg === undefined) {
      finish(400, failure(null, -32600, "Invalid Request"));
      return;
    }

    const id = msg.id ?? null;
    if (typeof requested === "string") {
      if (era === "legacy") {
        finishEmpty(400, { "content-length": "0" });
        return;
      }
      const mismatch = (text: string): void => {
        finish(400, failure(id, -32020, `Header mismatch: ${text}`));
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
        finish(400, {
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
        finishEmpty(202);
        return;
      }
      if (!KNOWN_METHODS.has(msg.method)) {
        finish(404, failure(id, -32601, `Method not found: ${msg.method}`));
        return;
      }
    }

    if (typeof requested !== "string") {
      if (era === "modern") {
        finish(
          400,
          failure(
            id,
            -32020,
            `This server speaks MCP ${MODERN_VERSION} only (no initialize handshake); supported versions: ${MODERN_VERSION}`,
          ),
        );
        return;
      }
      if (msg.method === "initialize") {
        const asked = params["protocolVersion"];
        const version =
          asked === "2025-06-18" || asked === "2025-03-26" ? asked : LEGACY_VERSION;
        if (opts.session === true) {
          sessionCount += 1;
          sessions.add(`fake-mcp-session-${sessionCount}`);
          res.setHeader("mcp-session-id", `fake-mcp-session-${sessionCount}`);
        }
        finish(
          200,
          result(id, {
            protocolVersion: version,
            capabilities: { tools: {} },
            serverInfo: { name: "fake-mcp", version: "1.0.0" },
          }),
        );
        return;
      }
      const header = req.headers["mcp-protocol-version"];
      if (typeof header !== "string" || !LEGACY_VERSIONS.has(header)) {
        finish(400, failure(id, -32600, "Missing or unsupported MCP-Protocol-Version header"));
        return;
      }
      if (opts.session === true) {
        const session = req.headers["mcp-session-id"];
        if (typeof session !== "string" || session === "") {
          finish(400, failure(id, -32600, "Missing Mcp-Session-Id header"));
          return;
        }
        if (!sessions.has(session)) {
          finish(404, failure(id, -32600, "Unknown session"));
          return;
        }
      }
      if (msg.id === undefined) {
        finishEmpty(202);
        return;
      }
      let value: unknown;
      if (msg.method === "tools/list") {
        value = list(tools, params, pageSize);
      } else if (msg.method === "tools/call") {
        value = call(tools, params);
      } else {
        finish(200, failure(id, -32601, `Method not found: ${msg.method}`));
        return;
      }
      if (isFailure(value)) {
        finish(200, failure(id, value.code, value.message));
        return;
      }
      const legacy = { ...(value as Record<string, unknown>) };
      delete legacy["resultType"];
      delete legacy["ttlMs"];
      delete legacy["cacheScope"];
      finish(200, result(id, legacy));
      return;
    }

    switch (msg.method) {
      case "server/discover": {
        finish(200, result(id, discover(era)));
        return;
      }
      case "tools/list": {
        const value = list(tools, params, pageSize);
        finish(200, isFailure(value) ? failure(id, value.code, value.message) : result(id, value));
        return;
      }
      case "tools/call": {
        const value = call(tools, params);
        finish(200, isFailure(value) ? failure(id, value.code, value.message) : result(id, value));
        return;
      }
      default: {
        finish(200, failure(id, -32600, "Invalid Request"));
      }
    }
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) {
        respondJson(res, 500, { error: "internal" });
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
    requests(): FakeMcpRequest[] {
      return structuredClone(records);
    },
    failNext(method: string, status: number, times = 1): void {
      if (typeof method !== "string" || method === "") {
        throw new RangeError("method must be a non-empty string");
      }
      if (!Number.isInteger(status) || status < 400 || status > 599) {
        throw new RangeError("status must be an integer from 400 to 599");
      }
      if (!Number.isInteger(times) || times < 1 || times > 1000) {
        throw new RangeError("times must be an integer from 1 to 1000");
      }
      failures.set(method, { status, times });
    },
    setTools(next: readonly FakeMcpTool[]): void {
      checkTools(next);
      tools = next;
    },
    reset(): void {
      records.length = 0;
      failures.clear();
      sessions.clear();
      sessionCount = 0;
      seq = 0;
      tools = startTools;
    },
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
