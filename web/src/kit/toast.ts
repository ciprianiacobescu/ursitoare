// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

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

export function createToastQueue(_opts: { clock: KitClock; maxVisible?: number }): ToastQueue {
  throw new Error("not implemented");
}

export const toastQueue: ToastQueue = {
  push(_spec: ToastSpec): string {
    throw new Error("not implemented");
  },
  dismiss(_id: string): boolean {
    throw new Error("not implemented");
  },
  expire(): string[] {
    throw new Error("not implemented");
  },
  list(): readonly ToastItem[] {
    throw new Error("not implemented");
  },
  nextExpiry(): number | null {
    throw new Error("not implemented");
  },
  subscribe(_listener: () => void): () => void {
    throw new Error("not implemented");
  },
};

export function toast(_spec: ToastSpec): string {
  throw new Error("not implemented");
}

export function dismissToast(_id: string): boolean {
  throw new Error("not implemented");
}

export function focusAfterDismiss(
  _remainingIds: readonly string[],
  _dismissedIndex: number,
): { kind: "toast"; id: string } | { kind: "main" } {
  throw new Error("not implemented");
}
