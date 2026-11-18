// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export function sectionHeadingId(_prefix: string, _title: string): string {
  return "";
}

export function captionDisplayFor(_caption: string, _heading: string): "visible" | "hidden" {
  return "visible";
}

export const PAGE_WIDTHS: Readonly<{ form: "max-w-3xl"; list: "max-w-6xl"; wide: "max-w-none" }> = {
  form: "",
  list: "",
  wide: "",
} as unknown as Readonly<{ form: "max-w-3xl"; list: "max-w-6xl"; wide: "max-w-none" }>;
