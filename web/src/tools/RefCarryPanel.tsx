import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { browserSession } from "../auth/browser-session.ts";
import { ErrorPanel } from "../kit/ErrorPanel.tsx";
import { REF_CARRY_NAMES, carryGrants, carryKeys, refNoticeText } from "./ref-carry.ts";
import type { CarryView, RefChange } from "./ref-carry.ts";

type Phase =
  | { phase: "idle" }
  | { phase: "busy" }
  | { phase: "done"; view: CarryView }
  | { phase: "failed"; error: unknown };

export function RefCarryPanel(props: { changes: readonly RefChange[] }): ReactNode {
  const [state, setState] = useState<Phase>({ phase: "idle" });
  const [keyOf] = useState(() => carryKeys(() => crypto.randomUUID()));
  const [controller] = useState(() => new AbortController());

  useEffect(
    () => () => {
      controller.abort();
    },
    [controller],
  );

  const notice = refNoticeText(props.changes);
  if (notice === null) return null;

  const busy = state.phase === "busy";
  const press = (): void => {
    if (busy) return;
    setState({ phase: "busy" });
    void carryGrants(browserSession.api, props.changes, keyOf, controller.signal).then(
      (view) => {
        if (!controller.signal.aborted) setState({ phase: "done", view });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ phase: "failed", error });
      },
    );
  };

  const view = state.phase === "done" ? state.view : null;
  return (
    <>
      <p className="tools-note">{notice}</p>
      <div className="tools-actions">
        <button
          type="button"
          className="ui-button"
          aria-disabled={busy ? true : undefined}
          onClick={press}
        >
          {REF_CARRY_NAMES["copyAction"]}
        </button>
      </div>
      {state.phase === "failed" ? <ErrorPanel error={state.error} /> : null}
      {view === null ? null : (
        <>
          {view.lines.length === 0 ? null : (
            <ul aria-label={REF_CARRY_NAMES["listName"]}>
              {view.lines.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          )}
          {view.empty === null ? null : <p className="tools-note">{view.empty}</p>}
          {view.incomplete === null ? null : <p className="tools-note">{view.incomplete}</p>}
          {view.deploy ? (
            <p className="tools-note">
              <Link to={REF_CARRY_NAMES["deployPath"] ?? "/admin/policies"}>
                {REF_CARRY_NAMES["deploy"]}
              </Link>
            </p>
          ) : null}
        </>
      )}
    </>
  );
}
