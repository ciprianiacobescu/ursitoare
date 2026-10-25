// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export type HealthStatus = "ok" | "fail";

export type HealthCheck = () => Promise<HealthStatus>;

export interface HealthReport {
  status: HealthStatus;
  checks: Record<string, HealthStatus>;
  failures: { name: string; reason: "returned_fail" | "threw" | "timeout" | "invalid_result" }[];
}

export interface HealthRegistry {
  registerHealthCheck(name: string, check: HealthCheck): void;
  run(timeoutMs: number): Promise<HealthReport>;
}

export class HealthCheckError extends Error {
  readonly code: "HEALTH_CHECK_DUPLICATE" | "HEALTH_CHECK_NAME_INVALID";
  constructor(_code: "HEALTH_CHECK_DUPLICATE" | "HEALTH_CHECK_NAME_INVALID", _message: string) {
    super();
    throw new Error("not implemented");
  }
}

export function createHealthRegistry(): HealthRegistry {
  throw new Error("not implemented");
}
