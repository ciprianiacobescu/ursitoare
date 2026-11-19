export function sectionHeadingId(prefix: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}-${slug}`;
}

export function captionDisplayFor(caption: string, heading: string): "visible" | "hidden" {
  return caption.trim() === heading.trim() ? "hidden" : "visible";
}

export const PAGE_WIDTHS: Readonly<{ form: "max-w-3xl"; list: "max-w-6xl"; wide: "max-w-none" }> = {
  form: "max-w-3xl",
  list: "max-w-6xl",
  wide: "max-w-none",
};
