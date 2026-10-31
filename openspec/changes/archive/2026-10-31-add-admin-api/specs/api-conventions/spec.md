## MODIFIED Requirements

### Requirement: Every error code is registered
`ERROR_CODES` SHALL hold the status and default message of every error code the API can answer so far, and a test SHALL fail when a non-test `src/**/*.ts` file constructs `new ApiError(` with a literal code not in it or a defined route lists one in `errors`.

On the base this unit is built on, `new ApiError(` with a literal code appears in non-test `src` only for `NOT_FOUND` and `WEB_NOT_BUILT` (M0), `UNAUTHENTICATED`, `FORBIDDEN`, `CSRF_INVALID`, `AUTHZ_UNAVAILABLE` and `NOT_FOUND` for an absent resource (`add-api-pep`), and `VALIDATION_FAILED`, `CURSOR_INVALID`, `IDEMPOTENCY_KEY_REUSED` and `IDEMPOTENCY_IN_PROGRESS` (`add-api-conventions`). The other six are never such a literal: `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `BAD_REQUEST` and `INTERNAL` come from the M0 error handler, `OIDC_CSRF_INVALID` and `OIDC_NOT_CONFIGURED` are envelopes `add-oidc-login` writes itself. No other literal exists (`WEB_APP_DUPLICATE` is a `WebAppError`, not an `ApiError`); `add-api-conventions` registered no seventeenth code to pass the scan. `add-admin-api` adds the six codes of its routes (requirement "Admin errors are registered codes" of `admin-api`), and a later unit that adds a code adds it to `ERROR_CODES`. On the public server of that base every route declared `errors: []` except `GET /*` (`["NOT_FOUND", "WEB_NOT_BUILT"]`); `add-admin-api`'s 19 routes declare the codes in its design.md § Interfaces, all registered (no test pins the empty lists: `src/main.conventions.test.ts:83-87` checks only that every declared code is registered); `DefinedRoute.errors` also holds implied codes (`GET /api/v1/me`: `AUTHZ_UNAVAILABLE`, `FORBIDDEN`, `UNAUTHENTICATED`), all registered.

#### Scenario: The registry
- **WHEN** `ERROR_CODES` is read
- **THEN** it has exactly these 22 entries, `CODE status "message"`, and `isRegisteredCode` is true for each and false for `cursor_invalid`, `""` and `NOT_A_CODE`: `NOT_FOUND 404 "Route not found"`, `VALIDATION_FAILED 400 "Request validation failed"`, `PAYLOAD_TOO_LARGE 413 "Payload too large"`, `UNSUPPORTED_MEDIA_TYPE 415 "Unsupported media type"`, `BAD_REQUEST 400 "Bad request"`, `INTERNAL 500 "Internal server error"`, `WEB_NOT_BUILT 503 "Web app is not built"`, `UNAUTHENTICATED 401 "Authentication required"`, `FORBIDDEN 403 "Action not permitted"`, `CSRF_INVALID 403 "CSRF token missing or invalid"`, `OIDC_CSRF_INVALID 403 "CSRF token missing or invalid"`, `OIDC_NOT_CONFIGURED 503 "Sign-in is not configured"`, `AUTHZ_UNAVAILABLE 503 "Authorization is unavailable"`, `CURSOR_INVALID 400 "Cursor is invalid"`, `IDEMPOTENCY_KEY_REUSED 422 "Idempotency key was used with a different request"`, `IDEMPOTENCY_IN_PROGRESS 409 "A request with this idempotency key is in progress"`, `ALREADY_EXISTS 409 "Resource already exists"`, `IN_USE 409 "Resource is in use"`, `ELEVATION_REFUSED 403 "Role cannot be granted by this principal"`, `UNKNOWN_ISSUER 422 "Issuer is not routed to this tenant"`, `OPERATION_REFUSED 422 "Operation is refused"`, `ENGINE_KEY_REQUIRED 503 "Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)"`

#### Scenario: An unregistered literal code fails the scan
- **WHEN** `checkApiErrorCodes` runs on a snapshot whose `src/x/a.ts` has `throw new ApiError(409, "FLOW_EXISTS", "x")` on line 3, with the registered list `["NOT_FOUND"]`
- **THEN** it returns one violation with code `ARCH_API_ERROR_CODE`, file `src/x/a.ts`, line 3, and a message that names `FLOW_EXISTS` and `src/api/error-codes.ts`

#### Scenario: Registered, dynamic and test uses pass
- **WHEN** a snapshot holds `new ApiError(404, "NOT_FOUND", "m")`, `new ApiError(500, code, "m")` and a `src/x/a.test.ts` with the literal `"FLOW_EXISTS"`
- **THEN** `checkApiErrorCodes` returns `[]`, and also `[]` over `readSnapshot()` with the default registry

#### Scenario: Route errors
- **WHEN** `unregisteredRouteErrors` gets `GET /a` with errors `["NOT_FOUND", "NOPE"]` and `POST /b` with `[]`
- **THEN** it returns `["GET /a: NOPE"]`, and `[]` for no routes (the real engine's routes are checked in "The real engine" of the OpenAPI requirement)
