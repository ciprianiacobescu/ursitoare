import type { ReactNode } from "react";

import { cn } from "./cn.ts";

export function Skeleton({ className }: { className?: string }): ReactNode {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-(--ui-radius) bg-quiet-surface", className)}
    />
  );
}
