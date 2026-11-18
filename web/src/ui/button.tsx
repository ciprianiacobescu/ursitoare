import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps, ReactNode } from "react";

import { buttonClasses, type ButtonTone } from "./button-classes.ts";

export { buttonClasses } from "./button-classes.ts";
export type { ButtonTone } from "./button-classes.ts";

type ButtonProps = ComponentProps<"button"> & {
  tone?: ButtonTone;
  size?: "sm" | "md";
  asChild?: boolean;
};

export function Button({
  tone,
  size,
  asChild = false,
  className,
  type = "button",
  ...props
}: ButtonProps): ReactNode {
  const classes = buttonClasses({
    ...(tone === undefined ? {} : { tone }),
    ...(size === undefined ? {} : { size }),
    ...(className === undefined ? {} : { className }),
  });
  if (asChild) {
    return <Slot data-slot="button" className={classes} {...props} />;
  }
  return <button data-slot="button" type={type} className={classes} {...props} />;
}
