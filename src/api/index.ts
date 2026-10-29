// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export { ApiError } from "./errors.ts";
export { ERROR_CODES, isRegisteredCode, unregisteredRouteErrors } from "./error-codes.ts";
export type { CursorPosition, KeyMaterial, CursorKey, CursorScope } from "./cursor.ts";
export { deriveCursorKey, encodeCursor, decodeCursor } from "./cursor.ts";
export type { Page, CursorBinding } from "./pagination.ts";
export { PAGE_QUERY_SCHEMA, readPage, startAfter, paginate } from "./pagination.ts";
export {
  IDEMPOTENCY_HEADER_SCHEMA,
  idempotencyKeyOf,
  requestDigestOf,
  withIdempotency,
  respondIdempotent,
} from "./idempotency.ts";
export type { IdempotentResponse } from "./idempotency.ts";
export type { ErrorEnvelope } from "./errors.ts";
export type { HealthStatus, HealthCheck, HealthReport, HealthRegistry } from "./health.ts";
export { HealthCheckError, createHealthRegistry } from "./health.ts";
export type { ServerDeps } from "./server.ts";
export { buildServer } from "./server.ts";
export type { Signal, SignalSource } from "./shutdown.ts";
export { installGracefulShutdown } from "./shutdown.ts";
export { CONTENT_SECURITY_POLICY, SECURITY_HEADERS, registerSecurityHeaders } from "./security-headers.ts";
export type { WebTarget } from "./web-paths.ts";
export { RESERVED_ROOTS, classifyWebPath } from "./web-paths.ts";
export type { WebAppOptions, WebAppErrorCode } from "./web.ts";
export { WebAppError, DEFAULT_WEB_DIST, registerWebApp, isWebBuilt } from "./web.ts";
export type {
  PublicReason,
  AuthKind,
  ResourceRef,
  SqlPredicate,
  ListFilter,
  RouteDef,
  AuthVerifier,
  DefinedRoute,
} from "./route.ts";
export {
  defineRoute,
  listDefinedRoutes,
  registerAuthVerifier,
  RouteDefinitionError,
} from "./route.ts";
export type { PepDeps } from "./pep.ts";
export { installPep } from "./pep.ts";
export { registerMeRoute } from "./me.ts";
export { definePublicRoutes } from "./public-group.ts";
export { checkRouteCoverage } from "./coverage.ts";
export { listPredicate } from "./list-filter.ts";
export { buildInternalServer } from "./internal.ts";
