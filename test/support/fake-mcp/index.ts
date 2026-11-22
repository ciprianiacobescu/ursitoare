// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { startMcpServer } from "./server.ts";

export type FakeMcpEra = "modern" | "legacy" | "dual";

export interface FakeMcpTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  result(args: Record<string, unknown>): {
    structuredContent?: Record<string, unknown>;
    text: string;
    isError?: boolean;
  };
}

export interface FakeMcpOptions {
  era?: FakeMcpEra;
  session?: boolean;
  path?: string;
  keyHeader?: string | null;
  tools?: readonly FakeMcpTool[];
  sse?: boolean;
  pageSize?: number;
}

export interface FakeMcpRequest {
  seq: number;
  method: string;
  era: "modern" | "legacy" | null;
  host: string;
  path: string;
  headers: Readonly<Record<string, string>>;
  bodySha256: string;
  status: number;
  callHeader: string | null;
  toolName: string | null;
}

export interface FakeMcp {
  readonly origin: string;
  requests(filter?: { method?: string }): FakeMcpRequest[];
  failNext(method: string, status: number, times?: number): void;
  setTools(tools: readonly FakeMcpTool[]): void;
  reset(): void;
  close(): Promise<void>;
}

export const FAKE_MCP_HOST: string = "mcp.fake.test";

export const FAKE_MCP_ORIGIN: string = "https://mcp.fake.test";

const V_ACME: Record<string, unknown> = { vendor_id: "V-ACME", status: "active" };
const V_UNKNOWN: Record<string, unknown> = { vendor_id: "V-UNKNOWN", status: "unknown" };

export const FAKE_MCP_TOOLS: readonly FakeMcpTool[] = [
  {
    name: "find_vendor",
    inputSchema: {
      type: "object",
      properties: { vendor_name: { type: "string", minLength: 1 } },
      required: ["vendor_name"],
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: { vendor_id: { type: "string" }, status: { type: "string" } },
      required: ["vendor_id", "status"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    result(args: Record<string, unknown>): {
      structuredContent?: Record<string, unknown>;
      text: string;
    } {
      const vendor = args["vendor_name"] === "Acme GmbH" ? V_ACME : V_UNKNOWN;
      return { structuredContent: vendor, text: JSON.stringify(vendor) };
    },
  },
  {
    name: "log_note",
    inputSchema: {
      type: "object",
      properties: { note: { type: "string" } },
      required: ["note"],
    },
    annotations: { readOnlyHint: false, idempotentHint: true },
    result(args: Record<string, unknown>): { text: string } {
      return { text: `noted: ${String(args["note"])}` };
    },
  },
];

const ERAS: readonly string[] = ["modern", "legacy", "dual"];
const HTTP_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function checkToolNames(tools: readonly FakeMcpTool[]): void {
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

function checkOptions(opts: FakeMcpOptions): void {
  if (opts.era !== undefined && !ERAS.includes(opts.era)) {
    throw new RangeError("era must be modern, legacy or dual");
  }
  if (opts.path !== undefined && (!opts.path.startsWith("/") || opts.path.includes("?") || opts.path.includes("#"))) {
    throw new RangeError("path must start with / and hold no ? or #");
  }
  if (opts.keyHeader !== undefined && opts.keyHeader !== null && !HTTP_TOKEN.test(opts.keyHeader)) {
    throw new RangeError("keyHeader must be an HTTP token or null");
  }
  if (opts.pageSize !== undefined && (!Number.isInteger(opts.pageSize) || opts.pageSize <= 0)) {
    throw new RangeError("pageSize must be a positive integer");
  }
  if (opts.tools !== undefined) {
    checkToolNames(opts.tools);
  }
}

export async function startFakeMcp(opts: FakeMcpOptions = {}): Promise<FakeMcp> {
  checkOptions(opts);
  const server = await startMcpServer({ ...opts, tools: opts.tools ?? FAKE_MCP_TOOLS });
  return {
    origin: server.origin,
    requests(filter?: { method?: string }): FakeMcpRequest[] {
      const all = server.requests();
      if (filter?.method === undefined) {
        return all;
      }
      return all.filter((request) => request.method === filter.method);
    },
    failNext(method: string, status: number, times?: number): void {
      server.failNext(method, status, times);
    },
    setTools(tools: readonly FakeMcpTool[]): void {
      server.setTools(tools);
    },
    reset(): void {
      server.reset();
    },
    close(): Promise<void> {
      return server.close();
    },
  };
}
