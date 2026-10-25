// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export { ApiError } from "./errors.ts";
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
