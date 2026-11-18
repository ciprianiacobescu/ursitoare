import type { ReactNode } from "react";

import { cn } from "./cn.ts";
import type { Tone } from "./tones.ts";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-quiet-surface text-quiet-text",
  info: "bg-info-surface text-info-text",
  success: "bg-success-surface text-success-text",
  warning: "bg-warning-surface text-warning-text",
  danger: "bg-danger-surface text-danger-text",
};

export function Badge(props: {
  tone: Tone;
  children: ReactNode;
  className?: string;
}): ReactNode {
  return (
    <span
      data-slot="badge"
      data-tone={props.tone}
      className={cn(
        "inline-flex items-center rounded-(--ui-radius) px-2 py-0.5 text-sm font-medium",
        TONE_CLASSES[props.tone],
        props.className,
      )}
    >
      {props.children}
    </span>
  );
}
