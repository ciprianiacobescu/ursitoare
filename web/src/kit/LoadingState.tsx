import type { ReactNode } from "react";

import { loadingStateModel } from "./states.ts";

export function LoadingState(props: { label?: string }): ReactNode {
  const model = loadingStateModel(props);
  return (
    <div className="ui-loading" role="status" aria-busy="true">
      <span className="ui-spinner" aria-hidden="true" />
      <span>{model.label}</span>
    </div>
  );
}
