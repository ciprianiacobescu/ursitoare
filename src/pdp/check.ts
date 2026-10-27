import type { Decision, PolicyRequest } from "./types.ts";

export async function runCheck(_req: PolicyRequest): Promise<Decision> {
  throw new Error("not implemented");
}
