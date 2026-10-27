// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export const DEFAULT_PAGE_SIZE: number = 0;

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

export function createCursorList<T>(
  _fetchPage: FetchPage<T>,
  _opts?: CursorListOptions,
): CursorList<T> {
  throw new Error("not implemented");
}
