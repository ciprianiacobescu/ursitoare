import { cn } from "./cn.ts";

export type ButtonTone = "primary" | "secondary" | "danger" | "ghost";

const TONE_CLASSES: Record<ButtonTone, string> = {
  primary: "bg-accent text-on-accent border-accent",
  secondary: "bg-surface text-text border-border",
  danger: "bg-danger text-on-danger border-danger",
  ghost: "bg-transparent text-accent border-transparent",
};

const SIZE_CLASSES: Record<"sm" | "md", string> = {
  sm: "min-h-8 px-2 text-sm",
  md: "px-3",
};

export function buttonClasses(opts?: {
  tone?: ButtonTone;
  size?: "sm" | "md";
  className?: string;
}): string {
  const tone = opts?.tone ?? "secondary";
  const size = opts?.size ?? "md";
  return cn(
    "ui-button inline-flex items-center justify-center gap-2 border rounded-(--ui-radius) font-medium",
    "aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
    TONE_CLASSES[tone],
    SIZE_CLASSES[size],
    opts?.className,
  );
}
