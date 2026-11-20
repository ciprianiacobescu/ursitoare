import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router";

import { ApiRequestError } from "../api/client.ts";
import { browserSession } from "../auth/browser-session.ts";
import { DataTable } from "../kit/data/DataTable.tsx";
import { createCursorList } from "../kit/data/cursor-list.ts";
import { ErrorPanel } from "../kit/ErrorPanel.tsx";
import { captionDisplayFor } from "../kit/layout/layout.ts";
import { PageHeader } from "../kit/layout/PageHeader.tsx";
import { Section } from "../kit/layout/Section.tsx";
import { LoadingState } from "../kit/LoadingState.tsx";
import { toast } from "../kit/toast.ts";
import { personLabel } from "../people/people.ts";
import { useDisplayNames } from "../people/use-names.ts";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";
import { formatInstant } from "../ui/format.ts";
import { versionStateTone } from "../ui/tones.ts";
import { CodeEditor } from "./CodeEditor.tsx";
import { diagnosticRows, diagnosticsSummary, textProblemRow } from "./diagnostics.ts";
import type { DiagnosticRow, ValidationView } from "./diagnostics.ts";
import { lintItems } from "./editor-config.ts";
import { editorStatus, planValidate, saveMessage } from "./editor-model.ts";
import type { Baseline } from "./editor-model.ts";
import type { EditorHandle } from "./editor-mount.ts";
import { listEditorPanels } from "./editor-panels.ts";
import type { EditorPanel } from "./editor-panels.ts";
import { loadFlow } from "./flows.ts";
import { flowErrorMessage } from "./messages.ts";
import { FLOW_TABLES } from "./pages.ts";
import { lineColumnOffset, pointerRange } from "./positions.ts";
import { jumpLinks, splitPanels } from "./workspace.ts";
import {
  loadVersion,
  saveVersion,
  starterText,
  validateVersion,
  versionListFetcher,
} from "./versions.ts";
import type { SaveResult, VersionRow } from "./versions.ts";

const FLOW_ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

interface Loaded {
  initialText: string;
  baseline: Baseline | null;
  outcome: Outcome | null;
  ownerTeam: string;
}

interface Outcome {
  canonical: unknown;
  result: ValidationView | null;
  validatedAt: string | null;
}

export function FlowEditorPage(): ReactNode {
  const params = useParams();
  const flowId = params["flowId"] ?? "";
  const valid = FLOW_ID.test(flowId) && flowId.length <= 64;
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const handleRef = useRef<EditorHandle | null>(null);
  const busyRef = useRef(false);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [text, setText] = useState("");
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [textRow, setTextRow] = useState<DiagnosticRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [handle, setHandle] = useState<EditorHandle | null>(null);

  const list = useMemo(
    () => createCursorList(versionListFetcher(browserSession.api, valid ? flowId : "a")),
    [flowId, valid],
  );
  const versionRows = useSyncExternalStore(list.subscribe, list.getState).items;
  const names = useDisplayNames(versionRows.map((row) => row.author));

  useEffect(() => {
    const previous = document.title;
    document.title = `Flow ${flowId} · Ursitoare`;
    return () => {
      document.title = previous;
    };
  }, [flowId]);

  useEffect(() => {
    if (!valid) return undefined;
    const controller = new AbortController();
    setLoaded(null);
    setLoadError(null);
    void (async () => {
      try {
        const flow = await loadFlow(browserSession.api, flowId, controller.signal);
        let next: Loaded;
        if (flow.latest === null) {
          next = {
            initialText: starterText(flowId),
            baseline: null,
            outcome: null,
            ownerTeam: flow.ownerTeam,
          };
        } else {
          const detail = await loadVersion(
            browserSession.api,
            flowId,
            flow.latest.hash,
            controller.signal,
          );
          const { text: savedText, canonical, result, ...version } = detail;
          next = {
            initialText: savedText,
            baseline: { text: savedText, version },
            outcome: { canonical, result, validatedAt: version.validatedAt },
            ownerTeam: flow.ownerTeam,
          };
        }
        if (controller.signal.aborted) return;
        setText(next.initialText);
        setBaseline(next.baseline);
        setOutcome(next.outcome);
        setTextRow(null);
        setLoaded(next);
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [flowId, valid, attempt]);

  const rows = useMemo<DiagnosticRow[]>(() => {
    if (textRow !== null) return [textRow];
    const result = outcome?.result ?? null;
    return result === null ? [] : diagnosticRows(result);
  }, [textRow, outcome]);

  useEffect(() => {
    handle?.setDiagnostics(lintItems(handle.getText(), rows));
  }, [handle, rows]);

  const onReady = useCallback((next: EditorHandle | null) => {
    handleRef.current = next;
    setHandle(next);
  }, []);

  const report = (error: unknown): void => {
    setTextRow(textProblemRow(error, flowId));
    toast({ kind: "error", message: flowErrorMessage(error) });
  };

  const save = async (): Promise<SaveResult | null> => {
    const current = handleRef.current?.getText() ?? text;
    try {
      const saved = await saveVersion(
        browserSession.api,
        { flowId, text: current },
        crypto.randomUUID(),
      );
      setBaseline({ text: current, version: saved.version });
      if (saved.created) {
        setOutcome(null);
        setTextRow(null);
        list.reset();
      }
      return saved;
    } catch (error) {
      report(error);
      return null;
    }
  };

  const run = (action: () => Promise<void>): void => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    void action().finally(() => {
      busyRef.current = false;
      setBusy(false);
    });
  };

  const onSave = (): void => {
    run(async () => {
      const saved = await save();
      if (saved !== null) toast({ kind: "success", message: saveMessage(saved) });
    });
  };

  const onValidate = (): void => {
    run(async () => {
      const current = handleRef.current?.getText() ?? text;
      let version: VersionRow;
      if (planValidate(baseline, current) === "save-first") {
        const saved = await save();
        if (saved === null) return;
        version = saved.version;
      } else if (baseline !== null) {
        version = baseline.version;
      } else {
        return;
      }
      try {
        const done = await validateVersion(browserSession.api, flowId, version.hash);
        setBaseline({ text: current, version: done.version });
        setOutcome({ canonical: null, result: done.result, validatedAt: done.version.validatedAt });
        setTextRow(null);
        list.reset();
      } catch (error) {
        report(error);
      }
    });
  };

  const onOpen = (row: VersionRow): void => {
    run(async () => {
      try {
        const detail = await loadVersion(browserSession.api, flowId, row.hash);
        const { text: savedText, canonical, result, ...version } = detail;
        handleRef.current?.setText(savedText);
        setText(savedText);
        setBaseline({ text: savedText, version });
        setOutcome({ canonical, result, validatedAt: version.validatedAt });
        setTextRow(null);
      } catch (error) {
        toast({ kind: "error", message: flowErrorMessage(error) });
      }
    });
  };

  const show = (row: DiagnosticRow): void => {
    const editor = handleRef.current;
    if (editor === null) return;
    const current = editor.getText();
    let range: { from: number; to: number };
    if (row.position !== null) {
      const from = lineColumnOffset(current, row.position.line, row.position.column);
      range = { from, to: from };
    } else {
      range = pointerRange(current, row.path ?? "");
    }
    editor.focus();
    editor.select(range.from, range.to);
    document.getElementById("flow-editor")?.scrollIntoView({ block: "start" });
  };

  if (!valid) {
    return (
      <div className="flow-page flex flex-col gap-4 max-w-none">
        <PageHeader title={`Flow ${flowId}`} headingRef={headingRef} />
        <ErrorPanel error={new ApiRequestError(404, "NOT_FOUND", "Not found")} />
      </div>
    );
  }

  if (loadError !== null) {
    return (
      <div className="flow-page flex flex-col gap-4 max-w-none">
        <PageHeader title={`Flow ${flowId}`} headingRef={headingRef} />
        <ErrorPanel error={loadError} />
        <Button
          onClick={() => {
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (loaded === null) {
    return (
      <div className="flow-page flex flex-col gap-4 max-w-none">
        <PageHeader title={`Flow ${flowId}`} headingRef={headingRef} />
        <LoadingState label="Loading flow" />
      </div>
    );
  }

  const savedState = baseline === null ? null : baseline.version.state;
  const header = (
    <PageHeader
      title={`Flow ${flowId}`}
      headingRef={headingRef}
      meta={
        <>
          <span>{`Owner team: ${loaded.ownerTeam}`}</span>
          {savedState === null ? null : (
            <Badge tone={versionStateTone(savedState)}>{savedState}</Badge>
          )}
          <p role="status">{editorStatus(baseline, text)}</p>
        </>
      }
    />
  );

  const unchanged = baseline !== null && baseline.text === text;
  const shownResult = unchanged && textRow === null ? (outcome?.result ?? null) : null;
  const summaryResult = outcome?.result ?? null;
  const summary =
    summaryResult === null
      ? "No validation result yet. Choose Validate."
      : diagnosticsSummary(summaryResult, outcome?.validatedAt ?? null);
  const workspace = splitPanels(listEditorPanels());
  const links = jumpLinks(workspace);

  const columns = FLOW_TABLES.versions.columns.map((column) => ({
    ...column,
    cell: (row: VersionRow): ReactNode => {
      switch (column.key) {
        case "number":
          return String(row.number);
        case "state":
          return <Badge tone={versionStateTone(row.state)}>{row.state}</Badge>;
        case "saved":
          return <time dateTime={row.createdAt}>{formatInstant(row.createdAt)}</time>;
        case "author":
          return personLabel(names, row.author);
        case "actions":
          return (
            <Button
              size="sm"
              aria-disabled={busy}
              onClick={() => {
                onOpen(row);
              }}
            >
              {`Open version ${row.number}`}
            </Button>
          );
        default:
          return null;
      }
    },
  }));

  const renderPanel = (panel: EditorPanel): ReactNode => (
    <Section
      key={panel.id}
      title={panel.title}
      id={`flow-panel-${panel.id}`}
      className="scroll-mt-16"
    >
      {panel.render({
        flowId,
        text,
        version: unchanged ? (baseline?.version ?? null) : null,
        canonical: unchanged ? (outcome?.canonical ?? null) : null,
        result: shownResult,
      })}
    </Section>
  );

  return (
    <div className="flow-page flex flex-col gap-4 max-w-none">
      {header}
      <ul
        aria-label="On this page"
        className="sticky top-0 z-10 m-0 flex list-none flex-wrap gap-4 border-b border-divider bg-bg p-0"
      >
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} className="inline-flex min-h-8 items-center text-accent">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <Section title="Edit the flow" id="flow-editor" className="scroll-mt-16">
            <CodeEditor initialText={loaded.initialText} onChange={setText} onReady={onReady} />
            <div className="flex flex-wrap items-center gap-2">
              <Button tone="primary" aria-disabled={busy} onClick={onSave}>
                Save version
              </Button>
              <Button tone="secondary" aria-disabled={busy} onClick={onValidate}>
                Validate
              </Button>
              <span className="flow-hint">Press Tab to leave the editor.</span>
            </div>
          </Section>
          <Section title="Diagnostics" id="flow-diagnostics" className="scroll-mt-16">
            <p role="status">{summary}</p>
            <ul className="flow-issues" aria-label="Issues">
              {rows.map((row) => (
                <li key={row.key}>
                  <strong>{row.severity}</strong> <code>{row.code}</code> {row.where}:{" "}
                  {row.message}{" "}
                  {row.href === null ? null : (
                    <a href={row.href} target="_blank" rel="noopener noreferrer">
                      {row.linkText}
                    </a>
                  )}{" "}
                  <Button
                    size="sm"
                    onClick={() => {
                      show(row);
                    }}
                  >
                    {`Show ${row.code} in the editor`}
                  </Button>
                </li>
              ))}
            </ul>
          </Section>
        </div>
        <div className="flex min-w-0 flex-col gap-4">{workspace.side.map(renderPanel)}</div>
      </div>
      <Section title="Versions" id="flow-versions" className="scroll-mt-16">
        <DataTable
          caption={FLOW_TABLES.versions.caption}
          captionDisplay={captionDisplayFor("Versions", "Versions")}
          columns={columns}
          list={list}
          rowKey={(row) => row.hash}
          {...(FLOW_TABLES.versions.emptyTitle === undefined
            ? {}
            : { emptyTitle: FLOW_TABLES.versions.emptyTitle })}
          {...(FLOW_TABLES.versions.emptyDescription === undefined
            ? {}
            : { emptyDescription: FLOW_TABLES.versions.emptyDescription })}
        />
      </Section>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        {workspace.below.map(renderPanel)}
      </div>
    </div>
  );
}
