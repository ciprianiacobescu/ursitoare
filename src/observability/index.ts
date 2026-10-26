export type { LogLevel } from "../core/index.ts";
export type { Logger, LogDestination } from "./logger.ts";
export { REDACT_PATHS, createLogger } from "./logger.ts";
export type { SpanValue, Span, Tracer } from "./tracer.ts";
export { noopTracer } from "./tracer.ts";
