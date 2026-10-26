export type HealthStatus = "ok" | "fail";

export type HealthCheck = () => Promise<HealthStatus>;

export type HealthFailureReason = "returned_fail" | "threw" | "timeout" | "invalid_result";

export interface HealthReport {
  status: HealthStatus;
  checks: Record<string, HealthStatus>;
  failures: { name: string; reason: HealthFailureReason }[];
}

export interface HealthRegistry {
  registerHealthCheck(name: string, check: HealthCheck): void;
  run(timeoutMs: number): Promise<HealthReport>;
}

type HealthCheckErrorCode = "HEALTH_CHECK_DUPLICATE" | "HEALTH_CHECK_NAME_INVALID";

const HEALTH_CHECK_NAME_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;

export class HealthCheckError extends Error {
  readonly code: HealthCheckErrorCode;

  constructor(code: HealthCheckErrorCode, message: string) {
    super(message);
    this.name = "HealthCheckError";
    this.code = code;
  }
}

type CheckOutcome =
  | { readonly status: HealthStatus }
  | { readonly reason: HealthFailureReason };

function isHealthStatus(value: unknown): value is HealthStatus {
  return value === "ok" || value === "fail";
}

function runOne(check: HealthCheck, timeoutMs: number): Promise<CheckOutcome> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (outcome: CheckOutcome): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(outcome);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ reason: "timeout" });
    }, timeoutMs);

    Promise.resolve()
      .then(check)
      .then(
        (value) => {
          finish(isHealthStatus(value) ? { status: value } : { reason: "invalid_result" });
        },
        () => {
          finish({ reason: "threw" });
        },
      );
  });
}

function toReport(
  entries: readonly (readonly [string, HealthCheck])[],
  outcomes: readonly CheckOutcome[],
): HealthReport {
  const checks: Record<string, HealthStatus> = {};
  const failures: { name: string; reason: HealthFailureReason }[] = [];

  entries.forEach(([name], index) => {
    const outcome = outcomes[index];
    if (outcome === undefined) {
      return;
    }
    if ("status" in outcome) {
      checks[name] = outcome.status;
      if (outcome.status === "fail") {
        failures.push({ name, reason: "returned_fail" });
      }
      return;
    }
    checks[name] = "fail";
    failures.push({ name, reason: outcome.reason });
  });

  return { status: failures.length === 0 ? "ok" : "fail", checks, failures };
}

export function createHealthRegistry(): HealthRegistry {
  const registered = new Map<string, HealthCheck>();
  let inFlight: Promise<HealthReport> | undefined;

  return {
    registerHealthCheck(name: string, check: HealthCheck): void {
      if (!HEALTH_CHECK_NAME_PATTERN.test(name)) {
        throw new HealthCheckError(
          "HEALTH_CHECK_NAME_INVALID",
          `invalid health check name: ${name}`,
        );
      }
      if (registered.has(name)) {
        throw new HealthCheckError(
          "HEALTH_CHECK_DUPLICATE",
          `health check already registered: ${name}`,
        );
      }
      registered.set(name, check);
    },

    run(timeoutMs: number): Promise<HealthReport> {
      if (inFlight !== undefined) {
        return inFlight;
      }

      const entries = Array.from(registered.entries());
      const report = Promise.all(entries.map(([, check]) => runOne(check, timeoutMs))).then(
        (outcomes) => toReport(entries, outcomes),
      );
      inFlight = report.finally(() => {
        inFlight = undefined;
      });
      return inFlight;
    },
  };
}
