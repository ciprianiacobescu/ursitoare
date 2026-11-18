// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ComponentProps, ReactNode } from "react";

import type { ButtonTone } from "./button-classes.ts";

export { buttonClasses } from "./button-classes.ts";
export type { ButtonTone } from "./button-classes.ts";

export function Button(
  _props: ComponentProps<"button"> & { tone?: ButtonTone; size?: "sm" | "md"; asChild?: boolean },
): ReactNode {
  throw new Error("not implemented");
}
