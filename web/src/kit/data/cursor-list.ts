import { ApiRequestError } from "../../api/client.ts";
import { KitError } from "../errors.ts";

export const DEFAULT_PAGE_SIZE: number = 50;

const MIN_PAGE_SIZE: number = 1;

const MAX_PAGE_SIZE: number = 200;

const MAX_CURSOR_LENGTH: number = 1024;

export interface CursorPage<T> {
  items: readonly T[];
  next_cursor: string | null;
}

export interface PageRequest {
  cursor: string | null;
  limit: number;
  signal: AbortSignal;
}

export type FetchPage<T> = (request: PageRequest) => Promise<CursorPage<T>>;

export type CursorListStatus = "idle" | "loading" | "loaded" | "error";

export interface CursorListState<T> {
  status: CursorListStatus;
  items: readonly T[];
  nextCursor: string | null;
  error: unknown; // null unless status is "error"
}

export interface CursorListOptions {
  pageSize?: number;
}

export interface CursorList<T> {
  getState(): CursorListState<T>;
  subscribe(listener: () => void): () => void;
  load(): Promise<void>;
  loadMore(): Promise<void>;
  retry(): Promise<void>;
  reset(): void;
}

const IDLE_STATE = <T>(): CursorListState<T> => ({
  status: "idle",
  items: [],
  nextCursor: null,
  error: null,
});

export function createCursorList<T>(
  fetchPage: FetchPage<T>,
  opts?: CursorListOptions,
): CursorList<T> {
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(pageSize) || pageSize < MIN_PAGE_SIZE || pageSize > MAX_PAGE_SIZE) {
    throw new KitError("KIT_PROP_INVALID", "The pageSize must be an integer from 1 to 200.");
  }

  let snapshot: CursorListState<T> = IDLE_STATE<T>();
  const listeners = new Set<() => void>();
  let generation = 0;
  let controller: AbortController | null = null;
  let failedCursor: string | null = null;
  let resolvePending: (() => void) | null = null;

  function finishPending(): void {
    const resolve = resolvePending;
    resolvePending = null;
    if (resolve !== null) {
      resolve();
    }
  }

  function commit(next: CursorListState<T>): void {
    snapshot = next;
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // A throwing subscriber must not stop the others.
      }
    }
  }

  function invalidPage(): ApiRequestError {
    return new ApiRequestError(200, "INVALID_RESPONSE", "Invalid page");
  }

  function pageFault(page: unknown, cursor: string | null): ApiRequestError | null {
    if (typeof page !== "object" || page === null) {
      return invalidPage();
    }
    const given = page as { items?: unknown; next_cursor?: unknown };
    const nextCursor = given.next_cursor;
    if (nextCursor !== null) {
      if (
        typeof nextCursor !== "string" ||
        nextCursor.length < 1 ||
        nextCursor.length > MAX_CURSOR_LENGTH
      ) {
        return invalidPage();
      }
    }
    if (cursor !== null && nextCursor === cursor) {
      return invalidPage();
    }
    if (!Array.isArray(given.items)) {
      return invalidPage();
    }
    return null;
  }

  function start(cursor: string | null, restart: boolean): Promise<void> {
    const atStart = ++generation;
    // A restart (a load or a CURSOR_INVALID retry) begins from an empty list, every other
    // request keeps the rows and the cursor of the page before it.
    const kept = restart ? { items: [] as readonly T[], nextCursor: null as string | null } : snapshot;
    commit({
      status: "loading",
      items: kept.items,
      nextCursor: kept.nextCursor,
      error: null,
    });
    failedCursor = cursor;
    finishPending();
    if (controller !== null) {
      controller.abort();
    }
    const own = new AbortController();
    controller = own;
    const done = new Promise<void>((resolve) => {
      resolvePending = resolve;
    });
    const request: PageRequest = { cursor, limit: pageSize, signal: own.signal };
    const onSettled = (
      page: CursorPage<T>,
      fault: unknown,
    ): void => {
      if (atStart !== generation) {
        return;
      }
      if (fault !== null) {
        commit({ status: "error", items: snapshot.items, nextCursor: snapshot.nextCursor, error: fault });
        finishPending();
        return;
      }
      const checked = pageFault(page, cursor);
      if (checked !== null) {
        commit({ status: "error", items: snapshot.items, nextCursor: snapshot.nextCursor, error: checked });
        finishPending();
        return;
      }
      commit({
        status: "loaded",
        items: [...snapshot.items, ...page.items],
        nextCursor: page.next_cursor,
        error: null,
      });
      finishPending();
    };
    let pending: Promise<CursorPage<T>>;
    try {
      pending = Promise.resolve(fetchPage(request));
    } catch (error) {
      pending = Promise.reject(error);
    }
    pending.then(
      (page) => onSettled(page, null),
      (error: unknown) => onSettled({ items: [], next_cursor: null }, error),
    );
    return done;
  }

  return {
    getState(): CursorListState<T> {
      return snapshot;
    },

    subscribe(listener: () => void): () => void {
      try {
        listener();
      } catch {
        // A throwing listener at sign-up must not break its registration.
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    load(): Promise<void> {
      if (snapshot.status !== "idle") {
        return Promise.resolve();
      }
      return start(null, true);
    },

    loadMore(): Promise<void> {
      const cursor = snapshot.nextCursor;
      if (snapshot.status !== "loaded" || cursor === null) {
        return Promise.resolve();
      }
      return start(cursor, false);
    },

    retry(): Promise<void> {
      if (snapshot.status !== "error") {
        return Promise.resolve();
      }
      const error = snapshot.error;
      const rejectedCursor = error instanceof ApiRequestError && error.code === "CURSOR_INVALID";
      // A rejected cursor cannot come back, so the retry begins from the first page;
      // every other error repeats the failed request with the cursor it asked for.
      return start(rejectedCursor ? null : failedCursor, rejectedCursor);
    },

    reset(): void {
      generation += 1;
      if (controller !== null) {
        controller.abort();
        controller = null;
      }
      failedCursor = null;
      finishPending();
      const changed =
        snapshot.status !== "idle" ||
        snapshot.items.length > 0 ||
        snapshot.nextCursor !== null ||
        snapshot.error !== null;
      if (changed) {
        commit(IDLE_STATE<T>());
      }
    },
  };
}
