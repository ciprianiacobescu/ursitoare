import { useEffect, useId, useMemo, useState } from "react";
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
import { DataClassSelect, TrustNotes, TrustToggle } from "./TrustControls.tsx";
import {
  DEFAULT_TRUST,
  TRUST_NAMES,
  ackStatus,
  carriedAfterEffect,
  discoverSettings,
  storedTools,
  valueChangeLines,
  withValueLines,
} from "./trust.ts";
import type { Carried, ToolTrust } from "./trust.ts";

interface SettingsRow {
  serverName: string;
  hints: string;
}

type DraftEffect = "" | "read" | "write" | "send" | "pay" | "skip";

export function ReviewSections(props: {
  serverId: string;
  server: ToolServerView | null;
  approved: unknown;
  pending: unknown;
  onReload: () => void;
}): ReactNode {
  const { serverId, server, approved, pending, onReload } = props;
  const warningId = useId();

  const [draft, setDraft] = useState<DiscoverDraft>({ effects: {}, names: {} });
  const [baseline, setBaseline] = useState<Record<string, ToolTrust>>({});
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const [colliding, setColliding] = useState<string[]>([]);
  const [discoveryAction, setDiscoveryAction] = useState<ActionPhase>({ phase: "idle" });

  useEffect(() => {
    setDiscoveryAction({ phase: "idle" });
    setDraft({ effects: {}, names: {} });
    setBaseline({});
    setTicks({});
    setColliding([]);
  }, [serverId]);

  useEffect(() => {
    setColliding([]);
    const tools = pending !== null && pending !== undefined ? parseReviewTools(pending) : null;
    if (tools === null) {
      setDraft({ effects: {}, names: {} });
      setBaseline({});
      setTicks({});
      return;
    }
    const settings = discoverSettings(storedTools(pending));
    setDraft({
      ...initialDraft(tools),
      trust: settings.trust,
      carried: settings.carried,
    });
    setBaseline(settings.trust);
    setTicks({});
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

  const cv = withValueLines(
    changesView(approved ?? null, pending ?? null),
    valueChangeLines(approved ?? null, pending ?? null),
  );

  const draftTrust = draft.trust ?? {};
  const ack = ackStatus(draftTrust, baseline, ticks);

  const callsList = useMemo(
    () => createCursorList(async () => ({ items: callsRows, next_cursor: null })),
    [callsRows],
  );
  const settingsList = useMemo(
    () => createCursorList(async () => ({ items: settingsRows, next_cursor: null })),
    [settingsRows],
  );

  const disabled = server === null || discoveryAction.phase === "busy";

  const changeTrust = (serverName: string, next: ToolTrust): void => {
    setDraft((prev) => {
      const trust: Record<string, ToolTrust> = { ...(prev.trust ?? {}) };
      trust[serverName] = next;
      return { ...prev, trust };
    });
  };

  const changeEffect = (serverName: string, effect: DraftEffect): void => {
    setDraft((prev) => {
      const effects = { ...prev.effects, [serverName]: effect };
      const next = carriedAfterEffect(
        "mcp",
        storedTools(pending),
        serverName,
        effect,
        serverName,
      );
      const current = prev.carried ?? {};
      const carried: Record<string, Carried> = {};
      for (const key of Object.keys(current)) {
        if (key !== serverName) carried[key] = current[key] as Carried;
      }
      if (next.name !== undefined || next.unsafe_to_retry !== undefined) {
        carried[serverName] = next;
      }
      return { ...prev, effects, carried };
    });
  };

  const changeTick = (name: string, ticked: boolean): void => {
    setTicks((current) => ({ ...current, [name]: ticked }));
  };

  const runDiscovery = async (useDraft: boolean): Promise<void> => {
    if (server === null) return;
    if (useDraft) {
      const ackNow = ackStatus(draftTrust, baseline, ticks);
      if (ackNow.message !== null) {
        setDiscoveryAction({ phase: "failed", text: ackNow.message });
        return;
      }
    }
    let body: ReturnType<typeof discoverBody>;
    try {
      const tools = approvedTools ?? [];
      if (useDraft) {
        body = discoverBody(draft);
      } else {
        const settings = discoverSettings(storedTools(approved));
        body = discoverBody({
          ...initialDraft(tools),
          trust: settings.trust,
          carried: settings.carried,
        });
      }
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
        const effects: Record<string, DraftEffect> = {};
        for (const name of names) effects[name] = "";
        setDraft({ effects, names: {}, trust: {}, carried: {} });
        setBaseline({});
        setTicks({});
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
              return { ...prev, names };
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
            changeEffect(row.serverName, event.target.value as DraftEffect);
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
    {
      key: "trust",
      header: TRUST_NAMES["trustColumn"] ?? "Result trusted",
      cell: (row: SettingsRow) => {
        const trust = draftTrust[row.serverName] ?? DEFAULT_TRUST;
        return (
          <TrustToggle
            name={row.serverName}
            describedBy={warningId}
            checked={trust.trusted}
            onChange={(checked) =>
              changeTrust(row.serverName, { trusted: checked, dataClass: trust.dataClass })
            }
          />
        );
      },
    },
    {
      key: "dataClass",
      header: TRUST_NAMES["dataClassColumn"] ?? "Data class",
      cell: (row: SettingsRow) => {
        const trust = draftTrust[row.serverName] ?? DEFAULT_TRUST;
        return (
          <DataClassSelect
            name={row.serverName}
            value={trust.dataClass}
            onChange={(dataClass) =>
              changeTrust(row.serverName, { trusted: trust.trusted, dataClass })
            }
          />
        );
      },
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
              <TrustNotes
                warningId={warningId}
                shown={ack.shown}
                ticks={ticks}
                onTick={changeTick}
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
