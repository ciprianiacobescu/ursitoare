import type { ReactNode } from "react";

import { copyNotice, copyText, errorPanelModel } from "./error-panel.ts";
import { toast } from "./toast.ts";

export function ErrorPanel(props: { error: unknown }): ReactNode {
  const model = errorPanelModel(props.error);

  const copyDecisionId = async (decisionId: string): Promise<void> => {
    const outcome = await copyText(decisionId, navigator.clipboard);
    if (outcome === "copied") {
      toast({ kind: "success", message: copyNotice(outcome), durationMs: 6000 });
    } else {
      toast({ kind: "error", message: copyNotice(outcome) });
    }
  };

  return (
    <section className="ui-error" role="alert">
      <h2>{model.title}</h2>
      <p>{model.message}</p>
      <p>
        Error code: <code>{model.code}</code>
      </p>
      {model.decisionId === null ? null : (
        <p>
          Decision id: <code>{model.decisionId}</code>{" "}
          <button
            type="button"
            className="ui-button"
            onClick={() => void copyDecisionId(model.decisionId ?? "")}
          >
            Copy decision id
          </button>
        </p>
      )}
    </section>
  );
}
