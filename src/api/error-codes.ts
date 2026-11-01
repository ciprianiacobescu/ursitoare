export const ERROR_CODES: Readonly<Record<string, { readonly status: number; readonly message: string }>> =
  {
    NOT_FOUND: { status: 404, message: "Route not found" },
    VALIDATION_FAILED: { status: 400, message: "Request validation failed" },
    PAYLOAD_TOO_LARGE: { status: 413, message: "Payload too large" },
    UNSUPPORTED_MEDIA_TYPE: { status: 415, message: "Unsupported media type" },
    BAD_REQUEST: { status: 400, message: "Bad request" },
    INTERNAL: { status: 500, message: "Internal server error" },
    WEB_NOT_BUILT: { status: 503, message: "Web app is not built" },
    UNAUTHENTICATED: { status: 401, message: "Authentication required" },
    FORBIDDEN: { status: 403, message: "Action not permitted" },
    CSRF_INVALID: { status: 403, message: "CSRF token missing or invalid" },
    OIDC_CSRF_INVALID: { status: 403, message: "CSRF token missing or invalid" },
    OIDC_NOT_CONFIGURED: { status: 503, message: "Sign-in is not configured" },
    AUTHZ_UNAVAILABLE: { status: 503, message: "Authorization is unavailable" },
    CURSOR_INVALID: { status: 400, message: "Cursor is invalid" },
    IDEMPOTENCY_KEY_REUSED: {
      status: 422,
      message: "Idempotency key was used with a different request",
    },
    IDEMPOTENCY_IN_PROGRESS: {
      status: 409,
      message: "A request with this idempotency key is in progress",
    },
    ALREADY_EXISTS: { status: 409, message: "Resource already exists" },
    IN_USE: { status: 409, message: "Resource is in use" },
    ELEVATION_REFUSED: { status: 403, message: "Role cannot be granted by this principal" },
    UNKNOWN_ISSUER: { status: 422, message: "Issuer is not routed to this tenant" },
    OPERATION_REFUSED: { status: 422, message: "Operation is refused" },
    ENGINE_KEY_REQUIRED: {
      status: 503,
      message: "Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)",
    },
    FLOW_TEXT_INVALID: { status: 422, message: "Flow text is not a readable flow document" },
  } as const;

export function isRegisteredCode(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(ERROR_CODES, code);
}

export function unregisteredRouteErrors(
  routes: readonly { method: string; url: string; errors: readonly string[] }[],
): string[] {
  const found: string[] = [];
  for (const route of routes) {
    for (const code of route.errors) {
      if (!isRegisteredCode(code)) {
        found.push(`${route.method} ${route.url}: ${code}`);
      }
    }
  }
  return found.sort();
}
