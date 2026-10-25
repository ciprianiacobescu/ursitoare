// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly requestId: string | null;
  constructor(
    _status: number,
    _code: string,
    _message: string,
    _opts?: { details?: unknown; requestId?: string | null; cause?: unknown },
  ) {
    super();
    throw new Error("not implemented");
  }
}

export type QueryValue = string | number | boolean | undefined;

export interface RequestOptions {
  query?: Readonly<Record<string, QueryValue>>;
  headers?: Readonly<Record<string, string>>;
  signal?: AbortSignal;
  body?: unknown;
}

export interface ApiClient {
  request<T>(method: string, path: string, opts?: RequestOptions): Promise<T>;
  get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T>;
  post<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>;
  put<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>;
  patch<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>;
  delete<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T>;
}

export interface ApiClientOptions {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export function createApiClient(_opts?: ApiClientOptions): ApiClient {
  throw new Error("not implemented");
}
