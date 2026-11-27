import type { ReactNode } from "react";

import { cn } from "../ui/cn.ts";
import { REF_MARKERS } from "./ref-carry.ts";
import type { RefState } from "./ref-carry.ts";

const STATE_CLASSES: Record<"superseded" | "waiting", string> = {
  superseded: "bg-warning-surface text-warning-text",
  waiting: "bg-info-surface text-info-text",
};

export function RefMarker(props: { state: RefState | null }): ReactNode {
  if (props.state === null || props.state === "current") return null;
  return (
    <span
      data-slot="ref-marker"
      data-state={props.state}
      className={cn(
        "inline-flex items-center rounded-(--ui-radius) px-2 py-0.5 text-sm font-medium",
        STATE_CLASSES[props.state],
      )}
    >
      {REF_MARKERS[props.state]}
    </span>
  );
}
