import type { ComponentProps, ReactNode } from "react";

import { cn } from "./cn.ts";

export function Card({ className, ...props }: ComponentProps<"div">): ReactNode {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-(--ui-radius-lg) border border-border bg-surface p-4 shadow-(--ui-shadow-sm)",
        className,
      )}
      {...props}
    />
  );
}
