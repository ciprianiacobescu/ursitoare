// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export function fakeRoute(_host: string | undefined): "tools" | "mcp" | "echo" | null {
  throw new Error("not implemented");
}

export async function startStackFakes(_opts: {
  certFile: string;
  keyFile: string;
  port?: number;
  upstreams?: Partial<Record<"tools" | "mcp" | "echo", string>>;
}): Promise<{ port: number; close(): Promise<void> }> {
  throw new Error("not implemented");
}
