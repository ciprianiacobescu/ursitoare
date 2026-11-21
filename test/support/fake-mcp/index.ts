// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

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

export const FAKE_MCP_HOST: string = "";

export const FAKE_MCP_ORIGIN: string = "";

export const FAKE_MCP_TOOLS: readonly FakeMcpTool[] = [];

export async function startFakeMcp(_opts?: FakeMcpOptions): Promise<FakeMcp> {
  throw new Error("not implemented");
}
