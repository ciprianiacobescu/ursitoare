import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { Link } from "react-router";

import { browserSession } from "../auth/browser-session.ts";
import { DataTable } from "../kit/data/DataTable.tsx";
import { createCursorList } from "../kit/data/cursor-list.ts";
import { captionDisplayFor } from "../kit/layout/layout.ts";
import { PageHeader } from "../kit/layout/PageHeader.tsx";
import { useDisplayNames } from "../people/use-names.ts";
import { Badge } from "../ui/badge.tsx";
import { RUNS_TITLE, runPath } from "./pages.ts";
import { runRowView } from "./run-view.ts";
import { runListFetcher } from "./runs-source.ts";
import type { RunView } from "./types.ts";

const RUN_COLUMNS = [
  { key: "run", header: "Run", rowHeader: true },
  { key: "flow", header: "Flow" },
  { key: "mode", header: "Mode" },
  { key: "state", header: "State" },
  { key: "started", header: "Started" },
  { key: "duration", header: "Duration" },
  { key: "startedBy", header: "Started by" },
] as const;

export function RunsPage(): ReactNode {
  const list = useMemo(() => createCursorList(runListFetcher(browserSession.api)), []);
  const state = useSyncExternalStore(list.subscribe, list.getState);

  useEffect(() => {
    const previous = document.title;
    document.title = RUNS_TITLE;
    return () => {
      document.title = previous;
    };
  }, []);

  const userIds = useMemo(() => {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const run of state.items) {
      const userId = run.principal.userId;
      if (seen.has(userId)) continue;
      seen.add(userId);
      ids.push(userId);
    }
    return ids;
  }, [state.items]);
  const names = useDisplayNames(userIds);
  const nowMs = Date.now();

  const columns = RUN_COLUMNS.map((column) => ({
    ...column,
    cell: (row: RunView): ReactNode => {
      const view = runRowView(row, names, nowMs);
      switch (column.key) {
        case "run":
          return <Link to={runPath(row.id)}>{view.linkName}</Link>;
        case "flow":
          return view.flowId;
        case "mode":
          return view.mode;
        case "state":
          return <Badge tone={view.tone}>{view.state}</Badge>;
        case "started": {
          const startedIso = row.startedAt ?? row.createdAt;
          return (
            <time dateTime={startedIso} title={startedIso}>
              {view.started}
            </time>
          );
        }
        case "duration":
          return view.duration;
        case "startedBy":
          return view.startedBy;
        default:
          return null;
      }
    },
  }));

  return (
    <div className="runs-list-page">
      <PageHeader title="Runs" />
      <DataTable
        caption="Runs"
        captionDisplay={captionDisplayFor("Runs", "Runs")}
        columns={columns}
        list={list}
        rowKey={(row) => row.id}
        emptyTitle="No runs yet"
      />
    </div>
  );
}
