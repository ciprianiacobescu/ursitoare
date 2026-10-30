// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../api/client.ts";

export interface ConfirmSpec {
  title: string;
  description: string;
  action: string;
}

export type Check<T> = { ok: true; value: T } | { ok: false; message: string };

export type Api<K extends keyof ApiClient> = Pick<ApiClient, K>;
