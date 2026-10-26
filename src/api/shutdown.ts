import type { Logger } from "../observability/index.ts";

export type Signal = "SIGTERM" | "SIGINT";

export interface SignalSource {
  on(signal: Signal, handler: () => void): unknown;
  off(signal: Signal, handler: () => void): unknown;
}

const SIGNALS: readonly Signal[] = ["SIGTERM", "SIGINT"];

export function installGracefulShutdown(opts: {
  close: () => Promise<unknown>;
  forceClose?: () => void;
  drainTimeoutMs: number;
  exit: (code: number) => void;
  logger: Logger;
  signals?: SignalSource;
}): { shutdown(reason: string): Promise<void>; dispose(): void } {
  const signals = opts.signals ?? process;
  const handlers = new Map<Signal, () => void>();
  let shutdownPromise: Promise<void> | undefined;
  let disposed = false;

  const shutdown = (reason: string): Promise<void> => {
    if (shutdownPromise !== undefined) {
      return shutdownPromise;
    }

    opts.logger.info({ reason }, "shutting down");

    shutdownPromise = new Promise<void>((resolve) => {
      let settled = false;
      const finish = (code: number, force: boolean): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (force) opts.forceClose?.();
        opts.exit(code);
        resolve();
      };

      const timer = setTimeout(() => {
        opts.logger.warn("drain deadline exceeded");
        finish(1, true);
      }, opts.drainTimeoutMs);

      Promise.resolve()
        .then(() => opts.close())
        .then(
          () => {
            finish(0, false);
          },
          (error: unknown) => {
            opts.logger.error({ err: error }, "shutdown failed");
            finish(1, true);
          },
        );
    });

    return shutdownPromise;
  };

  for (const signal of SIGNALS) {
    const handler = (): void => {
      void shutdown(signal);
    };
    handlers.set(signal, handler);
    signals.on(signal, handler);
  }

  return {
    shutdown,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const [signal, handler] of handlers) {
        signals.off(signal, handler);
      }
    },
  };
}
