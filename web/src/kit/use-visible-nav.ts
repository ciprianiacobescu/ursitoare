import { useEffect, useState } from "react";

import type { NavItem } from "../app/features.ts";
import { capabilityLoader, capabilityNotice, visibleNav } from "./capabilities.ts";
import type { CapabilityState } from "./capabilities.ts";
import { toast } from "./toast.ts";

export function useVisibleNav(): NavItem[] {
  const [state, setState] = useState<CapabilityState | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    capabilityLoader
      .load(controller.signal)
      .then((next) => {
        if (active) setState(next);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const name =
          typeof error === "object" && error !== null
            ? (error as { name?: unknown }).name
            : undefined;
        if (name === "AbortError") return;
        setState({ status: "failed", code: "UNKNOWN_ERROR" });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const notice = capabilityNotice(state);
    if (notice === null) return;
    toast({ kind: "error", message: notice });
  }, [state]);

  return visibleNav(state);
}
