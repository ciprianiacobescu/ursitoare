// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

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

export function emptyStateModel(_props: EmptyStateProps): EmptyStateModel {
  throw new Error("not implemented");
}

export function loadingStateModel(_props?: { label?: string }): LoadingStateModel {
  throw new Error("not implemented");
}
