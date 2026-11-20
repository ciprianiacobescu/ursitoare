import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";

import { browserSession } from "../auth/browser-session.ts";
import { ErrorPanel } from "../kit/ErrorPanel.tsx";
import { LoadingState } from "../kit/LoadingState.tsx";
import { PageHeader } from "../kit/layout/PageHeader.tsx";
import { PAGE_WIDTHS } from "../kit/layout/layout.ts";
import { Card } from "../ui/card.tsx";
import { cn } from "../ui/cn.ts";
import { TOOL_NAMES, TOOL_TITLES, actionState, regionState } from "./pages.ts";
import type { ActionPhase, RegionLoad } from "./pages.ts";
import {
  checkPolicySource,
  currentText,
  deployPolicy,
  deployText,
  loadPolicy,
  pendingText,
  policyErrorText,
  validatePolicy,
  validationText,
} from "./policies.ts";
import type { PolicyView } from "./policies.ts";

function label(key: string): string {
  return TOOL_NAMES[key] ?? key;
}

export function PoliciesPage(): ReactNode {
  const idPrefix = useId();
  const [policy, setPolicy] = useState<RegionLoad<PolicyView>>({ phase: "loading" });
  const [source, setSource] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [action, setAction] = useState<ActionPhase>({ phase: "idle" });

  useEffect(() => {
    const previous = document.title;
    document.title = TOOL_TITLES.policies;
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setPolicy({ phase: "loading" });
    void loadPolicy(browserSession.api, controller.signal).then(
      (view) => {
        if (!controller.signal.aborted) {
          setPolicy({ phase: "ready", value: view });
          setSource(view.source);
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setPolicy({ phase: "error", error });
      },
    );
    return () => {
      controller.abort();
    };
  }, [reloadKey]);

  const region = regionState(policy);
  const actionView = actionState(action);
  const busy = action.phase === "busy";
  const disabled = region.actionsDisabled || busy;
  const view = policy.phase === "ready" ? policy.value : null;

  const validate = (): void => {
    if (disabled) return;
    setAction({ phase: "busy" });
    void (async () => {
      try {
        const result = await validatePolicy(browserSession.api, source);
        setAction({ phase: "done", text: validationText(result) });
      } catch (error) {
        setAction({ phase: "failed", text: policyErrorText(error) });
      }
    })();
  };

  const deploy = (): void => {
    if (disabled) return;
    const checked = checkPolicySource(source);
    if (!checked.ok) {
      setAction({ phase: "failed", text: checked.message });
      return;
    }
    setAction({ phase: "busy" });
    const key = crypto.randomUUID();
    void (async () => {
      try {
        const version = await deployPolicy(browserSession.api, source, key);
        setAction({ phase: "done", text: deployText(version) });
        setReloadKey((current) => current + 1);
      } catch (error) {
        setAction({ phase: "failed", text: policyErrorText(error) });
      }
    })();
  };

  return (
    <div className={cn("tools-page", PAGE_WIDTHS.form)}>
      <PageHeader
        title="Policies"
        description="The Cedar policy that decides who may do what. Validate a draft, then deploy it."
        meta={
          view === null ? undefined : (
            <>
              <p>{currentText(view)}</p>
              <p>{pendingText(view.pendingGrants)}</p>
            </>
          )
        }
      />
      {actionView.status === null ? null : (
        <p className="tools-feedback" role={actionView.status.role}>
          {actionView.status.text}
        </p>
      )}
      <Card className="flex flex-col gap-3 p-4">
        <label htmlFor={`${idPrefix}-source`}>{label("cedarField")}</label>
        <textarea
          id={`${idPrefix}-source`}
          className="tools-textarea"
          value={source}
          onChange={(event) => setSource(event.target.value)}
        />
        <div className="tools-actions">
          <button
            type="button"
            className="ui-button"
            aria-disabled={disabled ? true : undefined}
            onClick={validate}
          >
            {label("validate")}
          </button>
          <button
            type="button"
            className="ui-button"
            data-tone="primary"
            aria-disabled={disabled ? true : undefined}
            onClick={deploy}
          >
            {label("deploy")}
          </button>
        </div>
        {region.view === "loading" ? <LoadingState /> : null}
        {policy.phase === "error" ? <ErrorPanel error={policy.error} /> : null}
      </Card>
    </div>
  );
}
