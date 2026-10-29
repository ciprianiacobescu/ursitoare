import { KitError } from "./errors.ts";

export interface ToastSpec {
  kind: "info" | "success" | "error";
  message: string;
  durationMs?: number | null;
}

export interface ToastItem {
  id: string;
  kind: ToastSpec["kind"];
  message: string;
  expiresAt: number | null;
}

export interface KitClock {
  now(): Date;
}

export interface ToastQueue {
  push(spec: ToastSpec): string;
  dismiss(id: string): boolean;
  expire(): string[];
  list(): readonly ToastItem[];
  nextExpiry(): number | null;
  subscribe(listener: () => void): () => void;
}

const DEFAULT_DURATION_MS = 6000;
const MIN_DURATION_MS = 1000;
const MAX_DURATION_MS = 60000;
const MIN_MESSAGE_LENGTH = 1;
const MAX_MESSAGE_LENGTH = 300;
const DEFAULT_MAX_VISIBLE = 5;
const MIN_MAX_VISIBLE = 1;
const MAX_MAX_VISIBLE = 10;

function invalid(message: string): never {
  throw new KitError("KIT_TOAST_INVALID", message);
}

function resolveDuration(spec: ToastSpec): number | null {
  if (spec.durationMs === null) return null;
  if (spec.durationMs === undefined) {
    return spec.kind === "error" ? null : DEFAULT_DURATION_MS;
  }
  if (
    typeof spec.durationMs !== "number" ||
    !Number.isFinite(spec.durationMs) ||
    spec.durationMs < MIN_DURATION_MS ||
    spec.durationMs > MAX_DURATION_MS
  ) {
    invalid("The duration must be null or between 1000 and 60000 milliseconds.");
  }
  return spec.durationMs;
}

export function createToastQueue(opts: { clock: KitClock; maxVisible?: number }): ToastQueue {
  const clock = opts.clock;
  const maxVisible = opts.maxVisible ?? DEFAULT_MAX_VISIBLE;
  if (
    !Number.isInteger(maxVisible) ||
    maxVisible < MIN_MAX_VISIBLE ||
    maxVisible > MAX_MAX_VISIBLE
  ) {
    invalid("maxVisible must be an integer from 1 to 10.");
  }

  let items: ToastItem[] = [];
  let snapshot: readonly ToastItem[] = items;
  let nextId = 1;
  const listeners = new Set<() => void>();

  function commit(next: ToastItem[]): void {
    items = next;
    snapshot = items.slice();
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // A failing listener must not stop the others.
      }
    }
  }

  return {
    push(spec: ToastSpec): string {
      const kind = spec.kind;
      if (kind !== "info" && kind !== "success" && kind !== "error") {
        invalid("The toast kind must be info, success or error.");
      }
      const message = typeof spec.message === "string" ? spec.message.trim() : "";
      if (message.length < MIN_MESSAGE_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
        invalid("The message must be 1 to 300 characters.");
      }

      const duration = resolveDuration(spec);
      const expiresAt = duration === null ? null : clock.now().getTime() + duration;

      const duplicateIndex = items.findIndex(
        (item) => item.kind === kind && item.message === message,
      );
      const existing = duplicateIndex >= 0 ? items[duplicateIndex] : undefined;
      if (existing !== undefined) {
        const next = items.slice();
        next[duplicateIndex] = { ...existing, expiresAt };
        commit(next);
        return existing.id;
      }

      const id = `t${nextId}`;
      nextId += 1;
      let next: ToastItem[] = [...items, { id, kind, message, expiresAt }];
      if (next.length > maxVisible) {
        next = next.slice(next.length - maxVisible);
      }
      commit(next);
      return id;
    },

    dismiss(id: string): boolean {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return false;
      const next = items.slice();
      next.splice(index, 1);
      commit(next);
      return true;
    },

    expire(): string[] {
      const now = clock.now().getTime();
      const expired: string[] = [];
      const next: ToastItem[] = [];
      for (const item of items) {
        if (item.expiresAt !== null && item.expiresAt <= now) {
          expired.push(item.id);
        } else {
          next.push(item);
        }
      }
      if (expired.length > 0) commit(next);
      return expired;
    },

    list(): readonly ToastItem[] {
      return snapshot;
    },

    nextExpiry(): number | null {
      let next: number | null = null;
      for (const item of items) {
        if (item.expiresAt === null) continue;
        if (next === null || item.expiresAt < next) next = item.expiresAt;
      }
      return next;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const systemClock: KitClock = { now: () => new Date() };

export const toastQueue: ToastQueue = createToastQueue({ clock: systemClock });

export function toast(spec: ToastSpec): string {
  return toastQueue.push(spec);
}

export function dismissToast(id: string): boolean {
  return toastQueue.dismiss(id);
}

export function focusAfterDismiss(
  remainingIds: readonly string[],
  dismissedIndex: number,
): { kind: "toast"; id: string } | { kind: "main" } {
  if (remainingIds.length === 0) return { kind: "main" };
  const index = Math.min(Math.max(dismissedIndex, 0), remainingIds.length - 1);
  const id = remainingIds[index];
  if (id === undefined) return { kind: "main" };
  return { kind: "toast", id };
}
