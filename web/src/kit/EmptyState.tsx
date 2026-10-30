import { createElement, type ReactNode } from "react";

import { emptyStateModel, type EmptyStateProps } from "./states.ts";

export function EmptyState(props: EmptyStateProps & { children?: ReactNode }): ReactNode {
  const model = emptyStateModel(props);
  return (
    <div className="ui-empty">
      {createElement(model.headingTag, null, model.title)}
      {model.description === null ? null : <p>{model.description}</p>}
      {props.children}
    </div>
  );
}
