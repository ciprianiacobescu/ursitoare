// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../../web/src/api/client.ts";
import type { E2eStack } from "../support/e2e-stack/stack.ts";

export interface TestSession {
  cookie: string;
  csrfToken: string;
  userId: string;
}

export async function signInAs(
  _stack: Pick<E2eStack, "url" | "handles">,
  _username: string,
): Promise<TestSession> {
  throw new Error("not implemented");
}

export function sessionClient(_stack: Pick<E2eStack, "url">, _session: TestSession): ApiClient {
  throw new Error("not implemented");
}
