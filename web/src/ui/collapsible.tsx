import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "./cn.ts";

export function Collapsible(props: ComponentProps<typeof CollapsiblePrimitive.Root>): ReactNode {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

export function CollapsibleTrigger(
  props: ComponentProps<typeof CollapsiblePrimitive.Trigger>,
): ReactNode {
  return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />;
}

export function CollapsibleContent({
  className,
  ...props
}: ComponentProps<typeof CollapsiblePrimitive.Content>): ReactNode {
  return (
    <CollapsiblePrimitive.Content
      data-slot="collapsible-content"
      className={cn("overflow-hidden", className)}
      {...props}
    />
  );
}
