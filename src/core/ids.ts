import { randomBytes as nodeRandomBytes } from "node:crypto";

import { systemClock } from "./clock.ts";
import type { Clock } from "./clock.ts";

export interface IdSource {
  next(prefix: string): string;
}

const PREFIX_PATTERN = /^[a-z][a-z0-9]{0,15}$/;
const MAX_COUNTER = 0xfff;
const MAX_SEQUENTIAL = 0xffff_ffff_ffff;

function hex(value: number, width: number): string {
  return value.toString(16).padStart(width, "0");
}

function formatUuid(ms: number, counter: number, randomBytes: (size: number) => Uint8Array): string {
  const timestamp = hex(ms, 12);
  const bytes = randomBytes(8);
  const variant = (((bytes[0] ?? 0) & 0x3f) | 0x80).toString(16).padStart(2, "0");
  const variantLow = (bytes[1] ?? 0).toString(16).padStart(2, "0");
  const rest = Array.from(bytes.subarray(2, 8), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${timestamp.slice(0, 8)}-${timestamp.slice(8, 12)}-7${hex(counter, 3)}-${variant}${variantLow}-${rest}`;
}

function assertPrefix(prefix: string): void {
  if (!PREFIX_PATTERN.test(prefix)) {
    throw new RangeError("invalid id prefix");
  }
}

export function createIds(
  clock: Clock,
  randomBytes: (size: number) => Uint8Array = (size) => nodeRandomBytes(size),
): IdSource {
  let lastMs = -1;
  let counter = 0;

  return {
    next(prefix: string): string {
      assertPrefix(prefix);

      const ms = clock.now().getTime();
      if (ms > lastMs) {
        lastMs = ms;
        counter = 0;
      } else {
        counter += 1;
        if (counter > MAX_COUNTER) {
          lastMs += 1;
          counter = 0;
        }
      }

      return `${prefix}_${formatUuid(lastMs, counter, randomBytes)}`;
    },
  };
}

export const systemIds: IdSource = createIds(systemClock);

export function sequentialIds(seed = 0): IdSource {
  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEQUENTIAL) {
    throw new RangeError("sequentialIds seed must be an integer from 0 to 281474976710655");
  }

  let counter = seed;

  return {
    next(prefix: string): string {
      assertPrefix(prefix);
      if (counter > MAX_SEQUENTIAL) {
        throw new RangeError("sequentialIds counter overflow");
      }
      const id = `${prefix}_00000000-0000-7000-8000-${hex(counter, 12)}`;
      counter += 1;
      return id;
    },
  };
}
