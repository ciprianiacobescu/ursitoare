import { useEffect, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";

import { browserSession } from "../auth/browser-session.ts";
import { useSession } from "../auth/use-session.ts";
import { ConfirmDialog } from "../kit/ConfirmDialog.tsx";
import { ErrorPanel } from "../kit/ErrorPanel.tsx";
import { LoadingState } from "../kit/LoadingState.tsx";
import { DataTable } from "../kit/data/DataTable.tsx";
import { createCursorList } from "../kit/data/cursor-list.ts";
import { cursorPageFetcher } from "../kit/data/page-fetcher.ts";
import "./tools.css";
import { TOOL_NAMES, TOOL_TABLES, TOOL_TITLES, actionState, regionState } from "./pages.ts";
import type { ActionPhase, RegionLoad } from "./pages.ts";
import {
  SURFACE_APPROVED,
  approveControl,
  approveDialog,
  approveFailure,
  approveRequest,
  approveToolSurface,
  loadToolServer,
  ownBoxShown,
  parseToolServer,
  serverIdFromSearch,
  serverLink,
  serverRowText,
  stateNote,
  toolRows,
} from "./servers.ts";
import type { ToolServerView } from "./servers.ts";

type ToolRow = ReturnType<typeof toolRows>[number];

const SERVERS_PATH = "/tool-servers";

function toolsList(rows: readonly ToolRow[]) {
  return createCursorList<ToolRow>(async () => ({ items: rows, next_cursor: null }));
}

export function ServersPage(): ReactNode {
  const location = useLocation();
  const session = useSession();
  const idPrefix = useId();
  const serverId = serverIdFromSearch(location.search);

  const [detail, setDetail] = useState<RegionLoad<ToolServerView>>({ phase: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [ticked, setTicked] = useState(false);
  const [ownSurface, setOwnSurface] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approveBody, setApproveBody] = useState<{
    digest: string;
    selfApproval: boolean;
  } | null>(null);
  const [action, setAction] = useState<ActionPhase>({ phase: "idle" });

  const servers = useMemo(
    () =>
      createCursorList(
        cursorPageFetcher(browserSession.api, SERVERS_PATH, { parseItem: parseToolServer }),
      ),
    [],
  );

  useEffect(() => {
    const previous = document.title;
    document.title = TOOL_TITLES.servers;
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => {
    setOwnSurface(false);
    setDialogOpen(false);
    setApproveBody(null);
    setAction({ phase: "idle" });
  }, [serverId]);

  useEffect(() => {
    if (serverId === null) return undefined;
    const controller = new AbortController();
    setDetail({ phase: "loading" });
    setTicked(false);
    void loadToolServer(browserSession.api, serverId, controller.signal).then(
      (view) => {
        if (!controller.signal.aborted) setDetail({ phase: "ready", value: view });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setDetail({ phase: "error", error });
      },
    );
    return () => {
      controller.abort();
    };
  }, [serverId, reloadKey]);

  const me =
    session !== null && session.status === "ready"
      ? {
          userId: session.me.user.id,
          reviewProfile: session.me.tenant.reviewProfile,
        }
      : null;
  const view = detail.phase === "ready" ? detail.value : null;
  const region = regionState(detail);
  const actionView = actionState(action);
  const busy = action.phase === "busy";
  const control = approveControl(view, me, busy);
  const disabled = region.actionsDisabled || control.disabled;
  const showBox = view !== null && ownBoxShown({ selfApproval: control.selfApproval }, ownSurface);
  const dialog = view === null ? null : approveDialog(view);
  const note = view === null ? null : stateNote(view);

  const toolList = useMemo(
    () => toolsList(view === null ? [] : toolRows(view)),
    [view],
  );

  const openApprove = (): void => {
    if (disabled || view === null || me === null) return;
    const request = approveRequest(view, me, { ticked, ownSurface });
    if (!request.ok) {
      setAction({ phase: "failed", text: request.message });
      return;
    }
    setApproveBody(request.body);
    setDialogOpen(true);
  };

  const confirmApprove = (): void => {
    const body = approveBody;
    const id = view === null ? null : view.id;
    setDialogOpen(false);
    setApproveBody(null);
    if (body === null || id === null) return;
    setAction({ phase: "busy" });
    void (async () => {
      try {
        await approveToolSurface(browserSession.api, id, body);
        setAction({ phase: "done", text: SURFACE_APPROVED });
        setReloadKey((current) => current + 1);
      } catch (error) {
        const failure = approveFailure(error);
        setOwnSurface(failure.ownSurface);
        setAction({ phase: "failed", text: failure.message });
        if (failure.reload) setReloadKey((current) => current + 1);
      }
    })();
  };

  const cancelApprove = (): void => {
    setDialogOpen(false);
    setApproveBody(null);
  };

  const serverColumns = TOOL_TABLES.servers.columns.map((column) => ({
    ...column,
    cell: (row: ToolServerView): ReactNode => {
      switch (column.key) {
        case "server":
          return <Link to={serverLink(row.id)}>{row.id}</Link>;
        case "summary":
          return serverRowText(row);
        default:
          return null;
      }
    },
  }));

  const toolColumns = TOOL_TABLES.tools.columns.map((column) => ({
    ...column,
    cell: (row: ToolRow): ReactNode => {
      switch (column.key) {
        case "name":
          return row.name;
        case "effect":
          return row.effect;
        case "block":
          return row.block;
        case "result":
          return row.result;
        case "call":
          return row.call;
        default:
          return null;
      }
    },
  }));

  return (
    <div className="tools-page">
      <h1>Tool servers</h1>
      <section aria-label="Tool servers">
        <DataTable
          caption={TOOL_TABLES.servers.caption}
          columns={serverColumns}
          list={servers}
          rowKey={(row) => row.id}
          {...(TOOL_TABLES.servers.emptyTitle === undefined
            ? {}
            : { emptyTitle: TOOL_TABLES.servers.emptyTitle })}
          {...(TOOL_TABLES.servers.emptyDescription === undefined
            ? {}
            : { emptyDescription: TOOL_TABLES.servers.emptyDescription })}
        />
      </section>
      {serverId === null ? null : (
        <section className="tools-section" aria-labelledby={`${idPrefix}-surface`}>
          <h2 id={`${idPrefix}-surface`}>{TOOL_NAMES["surfaceHeading"]}</h2>
          {region.view === "loading" ? <LoadingState /> : null}
          {detail.phase === "error" ? <ErrorPanel error={detail.error} /> : null}
          {view === null ? null : (
            <>
              <p>{serverRowText(view)}</p>
              {note === null ? null : <p className="tools-note">{note}</p>}
              <DataTable
                caption={TOOL_TABLES.tools.caption}
                columns={toolColumns}
                list={toolList}
                rowKey={(row) => row.name}
                {...(TOOL_TABLES.tools.emptyTitle === undefined
                  ? {}
                  : { emptyTitle: TOOL_TABLES.tools.emptyTitle })}
                {...(TOOL_TABLES.tools.emptyDescription === undefined
                  ? {}
                  : { emptyDescription: TOOL_TABLES.tools.emptyDescription })}
              />
            </>
          )}
          {control.message === null ? null : <p className="tools-note">{control.message}</p>}
          {showBox ? (
            <label className="tools-checkbox">
              <input
                type="checkbox"
                checked={ticked}
                onChange={(event) => setTicked(event.target.checked)}
              />
              {TOOL_NAMES["ownBox"]}
            </label>
          ) : null}
          <div className="tools-actions">
            <button
              type="button"
              className="ui-button"
              aria-disabled={disabled ? true : undefined}
              onClick={openApprove}
            >
              {TOOL_NAMES["approveButton"]}
            </button>
          </div>
          {actionView.status === null ? null : (
            <p role={actionView.status.role}>{actionView.status.text}</p>
          )}
          {dialog === null || !dialogOpen ? null : (
            <ConfirmDialog
              open
              title={dialog.title}
              description={dialog.description}
              action={dialog.action}
              onConfirm={confirmApprove}
              onCancel={cancelApprove}
            />
          )}
        </section>
      )}
    </div>
  );
}
