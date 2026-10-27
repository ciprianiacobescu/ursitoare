// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient, QueryValue } from "../../api/client.ts";
import type { CursorPage, FetchPage } from "./cursor-list.ts";

export function parseCursorPage(_body: unknown): CursorPage<unknown> | null {
  throw new Error("not implemented");
}

export function cursorPageFetcher<T>(
  _client: Pick<ApiClient, "get">,
  _path: string,
  _opts: { parseItem: (raw: unknown) => T | null; query?: Readonly<Record<string, QueryValue>> },
): FetchPage<T> {
  throw new Error("not implemented");
}
