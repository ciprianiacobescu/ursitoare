const ALLOWED_METHODS: ReadonlySet<string> = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly requestId: string | null;

  constructor(
    status: number,
    code: string,
    message: string,
    opts?: { details?: unknown; requestId?: string | null; cause?: unknown },
  ) {
    super(message, { cause: opts?.cause });
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = opts?.details;
    this.requestId = opts?.requestId ?? null;
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

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

function isEnvelope(value: unknown): value is { error: { code: string; message: string; details?: unknown } } {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return false;
  }
  const error = (value as { error?: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

function parseJson(text: string): { readonly ok: true; readonly value: unknown } | { readonly ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

export function createApiClient(opts?: ApiClientOptions): ApiClient {
  const configuredBaseUrl = opts?.baseUrl ?? "/api/v1";
  const configuredFetch = opts?.fetch;

  function buildUrl(path: string, query: Readonly<Record<string, QueryValue>> | undefined): string {
    if (configuredBaseUrl !== "" && !configuredBaseUrl.startsWith("/")) {
      throw new RangeError("baseUrl must be empty or start with /");
    }
    if (
      !path.startsWith("/") ||
      path.startsWith("//") ||
      path.includes("?") ||
      path.includes("#") ||
      path.includes("\\") ||
      path.includes("://") ||
      hasControlCharacter(path)
    ) {
      throw new RangeError("path must be a single leading slash relative path");
    }
    const base = configuredBaseUrl.replace(/\/+$/, "");
    const params = new URLSearchParams();
    if (query !== undefined) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      }
    }
    const search = params.toString();
    return `${base}${path}${search === "" ? "" : `?${search}`}`;
  }

  async function request<T>(method: string, path: string, requestOpts?: RequestOptions): Promise<T> {
    if (!ALLOWED_METHODS.has(method)) {
      throw new RangeError(`unsupported method ${method}`);
    }
    const url = buildUrl(path, requestOpts?.query);
    const headers = new Headers({ accept: "application/json" });
    if (requestOpts?.headers !== undefined) {
      for (const [key, value] of Object.entries(requestOpts.headers)) {
        headers.set(key, value);
      }
    }
    const hasBody = requestOpts !== undefined && requestOpts.body !== undefined;
    if (hasBody && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const init: RequestInit = {
      method,
      headers,
      credentials: "same-origin",
    };
    if (hasBody) {
      init.body = JSON.stringify(requestOpts.body);
    }
    if (requestOpts?.signal !== undefined) {
      init.signal = requestOpts.signal;
    }

    const fetchImpl = configuredFetch ?? globalThis.fetch;
    let response: Response;
    try {
      response = await fetchImpl(url, init);
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      throw new ApiRequestError(0, "NETWORK_ERROR", "Network request failed", { cause: error });
    }

    const requestId = response.headers.get("x-request-id");
    const text = await response.text();

    if (!response.ok) {
      const parsed = parseJson(text);
      if (parsed.ok && isEnvelope(parsed.value)) {
        const envelope = parsed.value.error;
        throw new ApiRequestError(response.status, envelope.code, envelope.message, {
          details: envelope.details,
          requestId,
        });
      }
      throw new ApiRequestError(response.status, "HTTP_ERROR", `HTTP ${response.status}`, { requestId });
    }

    if (text.trim() === "") {
      return undefined as T;
    }
    const parsed = parseJson(text);
    if (!parsed.ok) {
      throw new ApiRequestError(response.status, "INVALID_RESPONSE", "Invalid response", { requestId });
    }
    return parsed.value as T;
  }

  return {
    request,
    get<T>(path: string, requestOpts?: Omit<RequestOptions, "body">): Promise<T> {
      return request<T>("GET", path, requestOpts);
    },
    post<T>(path: string, body?: unknown, requestOpts?: Omit<RequestOptions, "body">): Promise<T> {
      return request<T>("POST", path, { ...requestOpts, body });
    },
    put<T>(path: string, body?: unknown, requestOpts?: Omit<RequestOptions, "body">): Promise<T> {
      return request<T>("PUT", path, { ...requestOpts, body });
    },
    patch<T>(path: string, body?: unknown, requestOpts?: Omit<RequestOptions, "body">): Promise<T> {
      return request<T>("PATCH", path, { ...requestOpts, body });
    },
    delete<T>(path: string, requestOpts?: Omit<RequestOptions, "body">): Promise<T> {
      return request<T>("DELETE", path, requestOpts);
    },
  };
}
