// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export const FAKE_TOOLS_HOST: string = "";

export const FAKE_TOOLS_ORIGIN: string = "";

export const FAKE_TOOLS_KEY_HEADER: string = "";

export function fakeToolPath(_ref: string): string {
  throw new Error("not implemented");
}

export interface FakeToolCall {
  seq: number;
  ref: string;
  effect: "read" | "write" | "send" | "pay";
  method: string;
  path: string;
  host: string;
  callHeader: string | null;
  idempotencyKey: string | null;
  keyHeaderSeen: boolean;
  input: unknown;
  bodySha256: string;
  status: number;
  duplicate: boolean;
}

export interface FakeToolsOptions {
  strict?: boolean;
  catalogue?: string;
}

export interface FakeTools {
  readonly origin: string;
  calls(filter?: { ref?: string; callHeader?: string }): FakeToolCall[];
  setDelay(ref: string, ms: number): void;
  failNext(ref: string, status: number, times?: number): void;
  reset(): void;
  close(): Promise<void>;
}

export async function startFakeTools(_opts?: FakeToolsOptions): Promise<FakeTools> {
  throw new Error("not implemented");
}
