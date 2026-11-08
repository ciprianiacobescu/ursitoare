// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export interface EchoUpstream {
  readonly origin: string;
  close(): Promise<void>;
}

export async function startEchoUpstream(): Promise<EchoUpstream> {
  throw new Error("not implemented");
}
