export const CSRF_HEADER: string = "x-csrf-token";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function isRootRelative(input: RequestInfo | URL): input is string {
  return typeof input === "string" && input.startsWith("/") && !input.startsWith("//");
}

function errorCodeOf(body: unknown): unknown {
  if (typeof body !== "object" || body === null) return undefined;
  const error = (body as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return undefined;
  return (error as { code?: unknown }).code;
}

export function isStateChanging(method: string | undefined): boolean {
  if (method === undefined) return false;
  const normalised = method.toUpperCase();
  return normalised !== "GET" && normalised !== "HEAD" && normalised !== "OPTIONS";
}

export function withCsrfHeader(
  inner: typeof fetch,
  csrfToken: () => Promise<string | null>,
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isRootRelative(input) || !isStateChanging(init?.method)) {
      return inner(input, init);
    }

    let token: string | null;
    try {
      token = await csrfToken();
    } catch {
      token = null;
    }

    const headers = new Headers(init?.headers);
    if (token !== null && TOKEN_PATTERN.test(token) && !headers.has(CSRF_HEADER)) {
      headers.set(CSRF_HEADER, token);
    }

    return inner(input, { ...init, headers });
  };
}

export function withSessionEnd(inner: typeof fetch, onEnded: () => void): typeof fetch {
  let ended = false;

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await inner(input, init);
    if (response.status !== 401 || ended) return response;

    let code: unknown;
    try {
      code = errorCodeOf(await response.clone().json());
    } catch {
      return response;
    }

    if (code === "UNAUTHENTICATED") {
      ended = true;
      try {
        onEnded();
      } catch {
        // A failing handler must not break the caller's response.
      }
    }

    return response;
  };
}
