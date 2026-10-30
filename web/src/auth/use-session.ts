import { useEffect, useState } from "react";

import { capabilityLoader } from "../kit/capabilities.ts";
import type { CapabilityState } from "../kit/capabilities.ts";

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

export function useSession(): CapabilityState | null {
  const [state, setState] = useState<CapabilityState | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    capabilityLoader.load(controller.signal).then(
      (next) => {
        if (active) setState(next);
      },
      (error: unknown) => {
        if (!active || isAbortError(error)) return;
        setState({ status: "failed", code: "UNKNOWN_ERROR" });
      },
    );
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return state;
}
