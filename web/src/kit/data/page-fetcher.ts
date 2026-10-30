import { ApiRequestError } from "../../api/client.ts";
import type { ApiClient, QueryValue } from "../../api/client.ts";
import { KitError } from "../errors.ts";
import type { CursorPage, FetchPage } from "./cursor-list.ts";

const MIN_CURSOR_LENGTH: number = 1;
const MAX_CURSOR_LENGTH: number = 1024;

export function parseCursorPage(body: unknown): CursorPage<unknown> | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }
  const given = body as { items?: unknown; next_cursor?: unknown };
  if (!Array.isArray(given.items)) {
    return null;
  }
  const nextCursor = given.next_cursor;
  if (
    nextCursor !== null &&
    (typeof nextCursor !== "string" ||
      nextCursor.length < MIN_CURSOR_LENGTH ||
      nextCursor.length > MAX_CURSOR_LENGTH)
  ) {
    return null;
  }
  return { items: given.items, next_cursor: nextCursor as string | null };
}

export function cursorPageFetcher<T>(
  client: Pick<ApiClient, "get">,
  path: string,
  opts: { parseItem: (raw: unknown) => T | null; query?: Readonly<Record<string, QueryValue>> },
): FetchPage<T> {
  const query: Readonly<Record<string, QueryValue>> | undefined = opts.query;
  if (
    query !== undefined &&
    (Object.hasOwn(query, "limit") || Object.hasOwn(query, "cursor"))
  ) {
    throw new KitError(
      "KIT_PROP_INVALID",
      "The caller's query must not carry limit or cursor; the fetcher adds them.",
    );
  }
  return async (request: { cursor: string | null; limit: number; signal: AbortSignal }) => {
    const asked: Record<string, QueryValue> = { ...query, limit: request.limit };
    if (request.cursor !== null) {
      asked.cursor = request.cursor;
    }
    const body: unknown = await client.get<unknown>(path, { query: asked, signal: request.signal });
    const page = parseCursorPage(body);
    if (page === null) {
      throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid page");
    }
    const items: T[] = [];
    for (const raw of page.items) {
      const item = opts.parseItem(raw);
      if (item === null) {
        throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid page");
      }
      items.push(item);
    }
    return { items, next_cursor: page.next_cursor };
  };
}
