import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { ConfigError } from "./errors.ts";

export interface FaultPoints {
  readonly armed: readonly string[];
  hit(point: string): void;
}

const POINT_PATTERN = /^(before|after):[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;

const EMPTY_ARMED: readonly string[] = Object.freeze([]);

export const NO_FAULT_POINTS: FaultPoints = Object.freeze({
  armed: EMPTY_ARMED,
  hit(_point: string): void {},
});

function configError(variable: string, reason: string): ConfigError {
  return new ConfigError("CONFIG_INVALID", variable, reason);
}

function validateArmed(armed: unknown): readonly string[] {
  if (!Array.isArray(armed)) {
    throw configError("armed", "must be an array of fault points");
  }
  for (const point of armed) {
    if (typeof point !== "string" || !POINT_PATTERN.test(point)) {
      throw configError("armed", "each entry must be before:<step> or after:<step>");
    }
  }
  return Object.freeze([...armed]);
}

function markerName(point: string): string {
  return createHash("sha256").update(point).digest("hex");
}

function isAlreadyExists(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "EEXIST";
}

export function createFaultPoints(spec: {
  armed: readonly string[];
  markerDir: string;
  kill: () => void;
}): FaultPoints {
  const armed = validateArmed(spec.armed);
  if (typeof spec.markerDir !== "string" || !isAbsolute(spec.markerDir)) {
    throw configError("markerDir", "must be an absolute path");
  }
  if (typeof spec.kill !== "function") {
    throw configError("kill", "must be a function");
  }

  const markerDir = spec.markerDir;
  const kill = spec.kill;
  const armedPoints = new Set(armed);

  return {
    armed,
    hit(point: string): void {
      if (!armedPoints.has(point)) return;
      mkdirSync(markerDir, { recursive: true });
      try {
        writeFileSync(join(markerDir, markerName(point)), point, { flag: "wx", mode: 0o600 });
      } catch (error) {
        if (isAlreadyExists(error)) return;
        throw error;
      }
      kill();
    },
  };
}
