import { useEffect, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { browserSession } from "../auth/browser-session.ts";
import { ApiRequestError } from "../api/client.ts";
import { ErrorPanel } from "../kit/ErrorPanel.tsx";
import { LoadingState } from "../kit/LoadingState.tsx";
import { DataTable } from "../kit/data/DataTable.tsx";
import { Field } from "../kit/data/Field.tsx";
import { Form } from "../kit/data/Form.tsx";
import { FORM_ERROR_KEY } from "../kit/data/form-errors.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { createCursorList } from "../kit/data/cursor-list.ts";
import { cursorPageFetcher } from "../kit/data/page-fetcher.ts";
import "./tools.css";
import { TOOL_NAMES, TOOL_TABLES, TOOL_TITLES, actionState, regionState } from "./pages.ts";
import type { ActionPhase, RegionLoad } from "./pages.ts";
import {
  GRANT_DONE,
  confirmGrantById,
  grantActions,
  grantBody,
  grantRowText,
  loadToolRefs,
  parseGrant,
  postGrant,
  revokeGrantById,
} from "./grants.ts";
import type { GrantView } from "./grants.ts";
import { toolsErrorMessage } from "./messages.ts";

const GRANTS_PATH = "/grants";

const CREATE_FIELDS: Readonly<Record<string, string>> = {
  role_unknown: "subject",
  user_unknown: "subject",
  tool_unknown: "tool",
  flow_unknown: "flowId",
  version_not_validated: "flowId",
  node_unknown: "nodeId",
};

function label(key: string): string {
  return TOOL_NAMES[key] ?? key;
}

function refusalReason(error: unknown): string | null {
  if (!(error instanceof ApiRequestError)) return null;
  if (error.status !== 422 || error.code !== "OPERATION_REFUSED") return null;
  const details = error.details;
  if (typeof details !== "object" || details === null || !("reason" in details)) return null;
  const reason: unknown = (details as { reason?: unknown }).reason;
  return typeof reason === "string" ? reason : null;
}

export function GrantsPage(): ReactNode {
  const idPrefix = useId();
  const [subjectKind, setSubjectKind] = useState<"role" | "user">("role");
  const [subject, setSubject] = useState("");
  const [tool, setTool] = useState("");
  const [scopeKind, setScopeKind] = useState<"any_step" | "node">("any_step");
  const [flowId, setFlowId] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [tools, setTools] = useState<RegionLoad<readonly string[]>>({ phase: "loading" });
  const [action, setAction] = useState<ActionPhase>({ phase: "idle" });
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  const list = useMemo(
    () =>
      createCursorList(
        cursorPageFetcher(browserSession.api, GRANTS_PATH, { parseItem: parseGrant }),
      ),
    [],
  );

  useEffect(() => {
    const previous = document.title;
    document.title = TOOL_TITLES.grants;
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setTools({ phase: "loading" });
    void loadToolRefs(browserSession.api, controller.signal).then(
      (refs) => {
        if (!controller.signal.aborted) setTools({ phase: "ready", value: refs });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setTools({ phase: "error", error });
      },
    );
    return () => {
      controller.abort();
    };
  }, []);

  const toolRegion = regionState(tools);
  const actionView = actionState(action);
  const busy = action.phase === "busy";
  const toolBusy = toolRegion.view !== "ready";
  const refs = tools.phase === "ready" ? tools.value : [];

  const resetDraft = (): void => {
    setSubjectKind("role");
    setSubject("");
    setTool("");
    setScopeKind("any_step");
    setFlowId("");
    setNodeId("");
    setErrors({});
  };

  const submit = (): void => {
    if (toolBusy || busy) return;
    const checked = grantBody({ subjectKind, subject, tool, scopeKind, flowId, nodeId });
    if (!checked.ok) {
      setErrors({ [checked.field]: checked.message });
      return;
    }
    const key = idempotencyKey ?? crypto.randomUUID();
    setIdempotencyKey(key);
    setErrors({});
    setAction({ phase: "busy" });
    void (async () => {
      try {
        await postGrant(
          browserSession.api,
          { subjectKind, subject, tool, scopeKind, flowId, nodeId },
          key,
        );
        setAction({ phase: "done", text: GRANT_DONE.created });
        resetDraft();
        setIdempotencyKey(null);
        list.reset();
      } catch (error) {
        const message = toolsErrorMessage(error);
        const reason = refusalReason(error);
        const field = reason === null ? undefined : CREATE_FIELDS[reason];
        if (field === undefined) {
          setErrors({ [FORM_ERROR_KEY]: message });
        } else {
          setErrors({ [field]: message });
        }
        setAction({ phase: "idle" });
      }
    })();
  };

  const runAction = (grant: GrantView, kind: "revoke" | "confirm"): void => {
    if (busy) return;
    setAction({ phase: "busy" });
    void (async () => {
      try {
        if (kind === "revoke") {
          await revokeGrantById(browserSession.api, grant.id);
          setAction({ phase: "done", text: GRANT_DONE.revoked });
        } else {
          await confirmGrantById(browserSession.api, grant.id);
          setAction({ phase: "done", text: GRANT_DONE.confirmed });
        }
        list.reset();
      } catch (error) {
        setAction({ phase: "failed", text: toolsErrorMessage(error) });
      }
    })();
  };

  const grantTextId = (id: string): string => `${idPrefix}-grant-${id}`;

  const columns = TOOL_TABLES.grants.columns.map((column) => ({
    ...column,
    cell: (grant: GrantView): ReactNode => {
      switch (column.key) {
        case "grant":
          return <span id={grantTextId(grant.id)}>{grantRowText(grant)}</span>;
        case "actions": {
          const actions = grantActions(grant);
          return (
            <div className="tools-actions">
              {actions.revoke ? (
                <button
                  type="button"
                  className="ui-button"
                  aria-disabled={busy ? true : undefined}
                  aria-describedby={grantTextId(grant.id)}
                  onClick={() => runAction(grant, "revoke")}
                >
                  {label("revoke")}
                </button>
              ) : null}
              {actions.confirm ? (
                <button
                  type="button"
                  className="ui-button"
                  aria-disabled={busy ? true : undefined}
                  aria-describedby={grantTextId(grant.id)}
                  onClick={() => runAction(grant, "confirm")}
                >
                  {label("confirm")}
                </button>
              ) : null}
            </div>
          );
        }
        default:
          return null;
      }
    },
  }));

  return (
    <div className="tools-page">
      <h1>Grants</h1>
      <p>{label("deployHint")}</p>
      <section aria-label="Grants">
        <DataTable
          caption={TOOL_TABLES.grants.caption}
          columns={columns}
          list={list}
          rowKey={(grant) => grant.id}
          {...(TOOL_TABLES.grants.emptyTitle === undefined
            ? {}
            : { emptyTitle: TOOL_TABLES.grants.emptyTitle })}
          {...(TOOL_TABLES.grants.emptyDescription === undefined
            ? {}
            : { emptyDescription: TOOL_TABLES.grants.emptyDescription })}
        />
      </section>
      <section className="tools-section" aria-label={label("grantForm")}>
        <h2>{label("grantForm")}</h2>
        <Form
          label={label("grantForm")}
          submitLabel={label("createGrant")}
          fields={["subject", "tool", "flowId", "nodeId"]}
          errors={errors}
          busy={toolBusy || busy}
          onSubmit={submit}
        >
          <fieldset className="tools-fieldset">
            <legend>{label("subjectGroup")}</legend>
            <label className="tools-checkbox">
              <input
                type="radio"
                name="subjectKind"
                checked={subjectKind === "role"}
                onChange={() => {
                  setSubjectKind("role");
                  setIdempotencyKey(null);
                }}
              />
              {label("subjectRole")}
            </label>
            <label className="tools-checkbox">
              <input
                type="radio"
                name="subjectKind"
                checked={subjectKind === "user"}
                onChange={() => {
                  setSubjectKind("user");
                  setIdempotencyKey(null);
                }}
              />
              {label("subjectUser")}
            </label>
          </fieldset>
          <Field
            idPrefix={idPrefix}
            name="subject"
            label={label("subjectField")}
            error={errors["subject"] ?? null}
          >
            {(control) => (
              <input
                {...control}
                className="ui-input"
                type="text"
                value={subject}
                onChange={(event) => {
                  setSubject(event.target.value);
                  setIdempotencyKey(null);
                }}
              />
            )}
          </Field>
          <Field
            idPrefix={idPrefix}
            name="tool"
            label={label("toolField")}
            error={errors["tool"] ?? null}
          >
            {(control) => (
              <select
                {...control}
                className="ui-input"
                value={tool}
                onChange={(event) => {
                  setTool(event.target.value);
                  setIdempotencyKey(null);
                }}
              >
                <option value="">Choose a tool</option>
                {refs.map((ref) => (
                  <option key={ref} value={ref}>
                    {ref}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {toolRegion.view === "loading" ? <LoadingState label="Loading tools" /> : null}
          {tools.phase === "error" ? <ErrorPanel error={tools.error} /> : null}
          <fieldset className="tools-fieldset">
            <legend>{label("scopeGroup")}</legend>
            <label className="tools-checkbox">
              <input
                type="radio"
                name="scopeKind"
                checked={scopeKind === "any_step"}
                onChange={() => {
                  setScopeKind("any_step");
                  setIdempotencyKey(null);
                }}
              />
              {label("scopeAny")}
            </label>
            <label className="tools-checkbox">
              <input
                type="radio"
                name="scopeKind"
                checked={scopeKind === "node"}
                onChange={() => {
                  setScopeKind("node");
                  setIdempotencyKey(null);
                }}
              />
              {label("scopeNode")}
            </label>
          </fieldset>
          {scopeKind === "node" ? (
            <>
              <Field
                idPrefix={idPrefix}
                name="flowId"
                label={label("flowField")}
                error={errors["flowId"] ?? null}
              >
                {(control) => (
                  <input
                    {...control}
                    className="ui-input"
                    type="text"
                    value={flowId}
                    onChange={(event) => {
                      setFlowId(event.target.value);
                      setIdempotencyKey(null);
                    }}
                  />
                )}
              </Field>
              <Field
                idPrefix={idPrefix}
                name="nodeId"
                label={label("stepField")}
                error={errors["nodeId"] ?? null}
              >
                {(control) => (
                  <input
                    {...control}
                    className="ui-input"
                    type="text"
                    value={nodeId}
                    onChange={(event) => {
                      setNodeId(event.target.value);
                      setIdempotencyKey(null);
                    }}
                  />
                )}
              </Field>
            </>
          ) : null}
        </Form>
      </section>
      {actionView.status === null ? null : (
        <p role={actionView.status.role}>{actionView.status.text}</p>
      )}
    </div>
  );
}
