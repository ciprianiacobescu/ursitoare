// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type ButtonTone = "primary" | "secondary" | "danger" | "ghost";

export function buttonClasses(_opts?: {
  tone?: ButtonTone;
  size?: "sm" | "md";
  className?: string;
}): string {
  return "";
}
