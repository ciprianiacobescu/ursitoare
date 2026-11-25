import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { browserSession } from "../auth/browser-session.ts";
import { DataTable } from "../kit/data/DataTable.tsx";
import { createCursorList } from "../kit/data/cursor-list.ts";
import { Section } from "../kit/layout/Section.tsx";
import { Button } from "../ui/button.tsx";
import { actionState } from "./pages.ts";
import type { ActionPhase } from "./pages.ts";
import {
  callRows,
  changesView,
  collidingNames,
  discoverBody,
  discoverTools,
  discoveryErrorText,
  discoveryText,
  initialDraft,
  parseReviewTools,
  readNote,
} from "./review.ts";
import type { DiscoverDraft, ReviewTool } from "./review.ts";
import type { ToolServerView } from "./servers.ts";

interface SettingsRow {
  serverName: string;
  hints: string;
}

export function ReviewSections(props: {
  serverId: string;
  server: ToolServerView | null;
  approved: unknown;
  pending: unknown;
  onReload: () => void;
}): ReactNode {
  const { serverId, server, approved, pending, onReload } = props;

  const [draft, setDraft] = useState<DiscoverDraft>({ effects: {}, names: {} });
  const [colliding, setColliding] = useState<string[]>([]);
  const [discoveryAction, setDiscoveryAction] = useState<ActionPhase>({ phase: "idle" });

  useEffect(() => {
    setDiscoveryAction({ phase: "idle" });
    setDraft({ effects: {}, names: {} });
    setColliding([]);
  }, [serverId]);

  useEffect(() => {
    setColliding([]);
    const tools = pending !== null && pending !== undefined ? parseReviewTools(pending) : null;
    setDraft(initialDraft(tools ?? []));
  }, [pending]);

  const approvedTools: ReviewTool[] | null =
    approved !== null && approved !== undefined ? parseReviewTools(approved) : null;
  const pendingTools: ReviewTool[] | null =
    pending !== null && pending !== undefined ? parseReviewTools(pending) : null;

  const settingsRows: SettingsRow[] =
    colliding.length > 0
      ? colliding.map((name) => ({ serverName: name, hints: "—" }))
      : pendingTools === null
        ? []
        : pendingTools
            .filter((tool) => tool.serverName !== null && tool.serverName !== "__proto__")
            .map((tool) => ({ serverName: tool.serverName as string, hints: tool.hints }));

  const pendingPresent = pending !== null && pending !== undefined;
  const selectedSurface = pendingPresent
    ? pending
    : approved !== null && approved !== undefined
      ? approved
      : null;
  const selectedTools: ReviewTool[] | null =
    selectedSurface === null ? [] : parseReviewTools(selectedSurface);
  const unreadableCalls = selectedSurface !== null && selectedTools === null;
  const callsRows = selectedTools === null ? [] : callRows(selectedTools);
  const noteText = selectedTools === null ? null : readNote(selectedTools);

  const cv = changesView(approved ?? null, pending ?? null);

  const callsList = useMemo(
    () => createCursorList(async () => ({ items: callsRows, next_cursor: null })),
    [callsRows],
  );
  const settingsList = useMemo(
    () => createCursorList(async () => ({ items: settingsRows, next_cursor: null })),
    [settingsRows],
  );

  const disabled = server === null || discoveryAction.phase === "busy";

  const runDiscovery = async (useDraft: boolean): Promise<void> => {
    if (server === null) return;
    let body: ReturnType<typeof discoverBody>;
    try {
      const tools = approvedTools ?? [];
      body = useDraft ? discoverBody(draft) : discoverBody(initialDraft(tools));
    } catch {
      setDiscoveryAction({ phase: "failed", text: "Invalid discovery settings." });
      return;
    }
    const key = crypto.randomUUID();
    setDiscoveryAction({ phase: "busy" });
    try {
      const result = await discoverTools(browserSession.api, serverId, body, key);
      setDiscoveryAction({ phase: "done", text: discoveryText(result) });
      onReload();
    } catch (error) {
      setDiscoveryAction({ phase: "failed", text: discoveryErrorText(error) });
      const names = collidingNames(error);
      if (names.length >= 2) {
        setColliding(names);
        const effects: Record<string, "" | "read" | "write" | "send" | "pay" | "skip"> = {};
        for (const name of names) effects[name] = "";
        setDraft({ effects, names: {} });
      }
    }
  };

  const actionView = actionState(discoveryAction);

  const settingsColumns = [
    { key: "serverTool", header: "Server tool", cell: (row: SettingsRow) => row.serverName },
    { key: "hints", header: "Server hints", cell: (row: SettingsRow) => row.hints },
    {
      key: "name",
      header: "Tool name",
      cell: (row: SettingsRow) => (
        <input
          className="ui-input"
          type="text"
          aria-label={`Tool name of ${row.serverName}`}
          value={draft.names?.[row.serverName] ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            setDraft((prev) => {
              const base = { ...(prev.names ?? {}) };
              const names: Record<string, string> = {};
              for (const key of Object.keys(base)) {
                if (key !== row.serverName) names[key] = base[key] as string;
              }
              if (value !== "") names[row.serverName] = value;
              return { effects: prev.effects, names } as DiscoverDraft;
            });
          }}
        />
      ),
    },
    {
      key: "effect",
      header: "Effect",
      cell: (row: SettingsRow) => (
        <select
          className="ui-input"
          aria-label={`Effect of ${row.serverName}`}
          value={draft.effects[row.serverName] ?? ""}
          onChange={(event) => {
            const value = event.target.value as "" | "read" | "write" | "send" | "pay" | "skip";
            setDraft((prev) => ({
              effects: { ...prev.effects, [row.serverName]: value },
              names: prev.names,
            }) as DiscoverDraft);
          }}
        >
          <option value="">Proposed</option>
          <option value="read">read</option>
          <option value="write">write</option>
          <option value="send">send</option>
          <option value="pay">pay</option>
          <option value="skip">Skip</option>
        </select>
      ),
    },
  ];

  const callsColumns = [
    { key: "name", header: "Tool", rowHeader: true, cell: (row: (typeof callsRows)[number]) => row.name },
    { key: "call", header: "Call", cell: (row: (typeof callsRows)[number]) => row.call },
    { key: "effect", header: "Effect", cell: (row: (typeof callsRows)[number]) => row.effect },
    { key: "retry", header: "Retry", cell: (row: (typeof callsRows)[number]) => row.retry },
    { key: "result", header: "Result", cell: (row: (typeof callsRows)[number]) => row.result },
    { key: "hints", header: "Server hints", cell: (row: (typeof callsRows)[number]) => row.hints },
  ];

  return (
    <>
      {server?.adapter === "mcp" ? (
        <Section title="Discovery">
          <Button
            tone="secondary"
            disabled={disabled}
            aria-disabled={disabled ? true : undefined}
            onClick={() => void runDiscovery(false)}
          >
            Discover tools
          </Button>
          {actionView.status === null ? null : (
            <p className="tools-feedback" role={actionView.status.role}>
              {actionView.status.text}
            </p>
          )}
          {settingsRows.length > 0 ? (
            <>
              <DataTable
                caption="Tool settings"
                columns={settingsColumns}
                list={settingsList}
                rowKey={(row: SettingsRow) => row.serverName}
                emptyTitle="No tools"
              />
              <Button
                tone="secondary"
                disabled={disabled}
                aria-disabled={disabled ? true : undefined}
                onClick={() => void runDiscovery(true)}
              >
                Discover again with these settings
              </Button>
            </>
          ) : null}
        </Section>
      ) : null}
      <Section title="Changes">
        {cv.text !== null ? (
          <p>{cv.text}</p>
        ) : (
          <ul className="tools-changes" aria-label="Changes">
            {cv.items.map((item, index) => (
              <li key={index}>
                {item.text}
                {item.lines.map((line, lineIndex) => (
                  <p key={lineIndex}>{line}</p>
                ))}
              </li>
            ))}
          </ul>
        )}
      </Section>
      {unreadableCalls ? (
        <p>The surface could not be read.</p>
      ) : (
        <DataTable
          caption="Calls"
          columns={callsColumns}
          list={callsList}
          rowKey={(row) => row.name}
          emptyTitle="No calls"
        />
      )}
      {noteText === null ? null : <p>{noteText}</p>}
    </>
  );
}
