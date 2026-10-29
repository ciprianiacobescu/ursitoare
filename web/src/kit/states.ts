import { KitError } from "./errors.ts";

export interface EmptyStateProps {
  title: string;
  description?: string;
  headingLevel?: 1 | 2 | 3 | 4;
}

export interface EmptyStateModel {
  title: string;
  description: string | null;
  headingTag: "h1" | "h2" | "h3" | "h4";
}

export interface LoadingStateModel {
  label: string;
  role: "status";
  ariaBusy: true;
}

const HEADING_TAGS = ["h1", "h2", "h3", "h4"] as const;

export function emptyStateModel(props: EmptyStateProps): EmptyStateModel {
  const title = typeof props.title === "string" ? props.title.trim() : "";
  if (title.length < 1 || title.length > 120) {
    throw new KitError("KIT_PROP_INVALID", "The title must be 1 to 120 characters.");
  }

  let description: string | null = null;
  if (props.description !== undefined) {
    const trimmed = typeof props.description === "string" ? props.description.trim() : "";
    if (trimmed.length > 300) {
      throw new KitError("KIT_PROP_INVALID", "The description must be at most 300 characters.");
    }
    description = trimmed.length > 0 ? trimmed : null;
  }

  const level = props.headingLevel ?? 2;
  if (level !== 1 && level !== 2 && level !== 3 && level !== 4) {
    throw new KitError("KIT_PROP_INVALID", "The heading level must be 1 to 4.");
  }

  return { title, description, headingTag: HEADING_TAGS[level - 1] ?? "h2" };
}

export function loadingStateModel(props?: { label?: string }): LoadingStateModel {
  const label = typeof props?.label === "string" ? props.label.trim() : "Loading";
  if (label.length < 1 || label.length > 80) {
    throw new KitError("KIT_PROP_INVALID", "The loading label must be 1 to 80 characters.");
  }
  return { label, role: "status", ariaBusy: true };
}
