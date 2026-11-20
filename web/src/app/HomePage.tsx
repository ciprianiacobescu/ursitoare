import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { Link } from "react-router";

import { ApiRequestError, createApiClient } from "../api/client.ts";
import { useSession } from "../auth/use-session.ts";
import type { FlowRow } from "../flows/flows.ts";
import { EmptyState } from "../kit/EmptyState.tsx";
import { PageHeader } from "../kit/layout/PageHeader.tsx";
import { Section } from "../kit/layout/Section.tsx";
import { useDisplayNames } from "../people/use-names.ts";
import type { RunView } from "../runs/types.ts";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import { Tooltip } from "../ui/tooltip.tsx";
import {
  flowRows,
  homeView,
  loadFlowSet,
  loadPendingServers,
  loadPolicyFact,
  loadRecentRuns,
  loadUnassigned,
  nextSteps,
  recentRunLinkName,
  runRows,
} from "./home.ts";
import type { FlowRowView, HomeFacts, HomeView, NextStep, RunRowView } from "./home.ts";
import { healthView, loadEngineHealth, type EngineHealth } from "./health.ts";

type HealthState = EngineHealth | "loading";

type AsyncState<T> =
  | { kind: "loading" }
  | { kind: "ready"; value: T }
  | { kind: "failed"; error: unknown };

type DashboardView = Extract<HomeView, { kind: "dashboard" }>;

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

function useLoader<T>(
  enabled: boolean,
  loader: (signal: AbortSignal) => Promise<T>,
): { state: AsyncState<T>; retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    if (!enabled) {
      setState({ kind: "loading" });
      return undefined;
    }
    const controller = new AbortController();
    let active = true;
    setState({ kind: "loading" });
    loaderRef.current(controller.signal).then(
      (value) => {
        if (active) setState({ kind: "ready", value });
      },
      (error: unknown) => {
        if (!active || isAbortError(error)) return;
        setState({ kind: "failed", error });
      },
    );
    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled, attempt]);

  return {
    state,
    retry: () => {
      setAttempt((value) => value + 1);
    },
  };
}

function knownOrUnknown<T>(state: AsyncState<T>): { kind: "unknown" } | { kind: "known"; value: T } {
  return state.kind === "ready" ? { kind: "known", value: state.value } : { kind: "unknown" };
}

function SkeletonList(): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

function ListFailure(props: { what: string; error: unknown; onRetry: () => void }): ReactNode {
  if (
    props.error instanceof ApiRequestError &&
    props.error.status === 401 &&
    props.error.code === "UNAUTHENTICATED"
  ) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="m-0">Your session has ended.</p>
        <Button asChild tone="primary">
          <Link to="/sign-in?error=SESSION_ENDED&return_to=%2F">Sign in again</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="m-0">{props.what} could not be loaded.</p>
      <Button onClick={props.onRetry}>Try again</Button>
    </div>
  );
}

function RunList(props: {
  state: AsyncState<readonly RunView[]>;
  nowMs: number;
  meId: string;
  names: ReadonlyMap<string, string>;
  author: boolean;
  onRetry: () => void;
}): ReactNode {
  if (props.state.kind === "loading") return <SkeletonList />;
  if (props.state.kind === "failed") {
    return <ListFailure what="Recent runs" error={props.state.error} onRetry={props.onRetry} />;
  }
  const rows = runRows(props.state.value, {
    nowMs: props.nowMs,
    meId: props.meId,
    names: props.names,
  });
  if (rows.length === 0) {
    return (
      <EmptyState
        headingLevel={3}
        title="No runs yet"
        description="Test-run a saved flow and it shows up here."
      >
        <Button asChild tone="primary">
          <Link to="/flows">{props.author ? "Choose a flow to test" : "Browse flows"}</Link>
        </Button>
      </EmptyState>
    );
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {rows.map((row: RunRowView) => (
        <li key={row.id} className="flex flex-wrap items-baseline gap-2">
          <Badge tone={row.tone}>{row.state}</Badge>
          <Link className="font-semibold text-accent" to={row.href}>
            {recentRunLinkName(row)}
          </Link>
          <span className="text-sm text-text-muted">
            <Tooltip content={row.exact}>
              <time dateTime={row.startedIso} tabIndex={0}>
                {row.started}
              </time>
            </Tooltip>
            {` · ${row.duration}`}
            {row.by === null ? null : ` · ${row.by}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

function FlowList(props: {
  state: AsyncState<{ items: readonly FlowRow[]; complete: boolean }>;
  nowMs: number;
  author: boolean;
  onRetry: () => void;
}): ReactNode {
  if (props.state.kind === "loading") return <SkeletonList />;
  if (props.state.kind === "failed") {
    return <ListFailure what="Recent flows" error={props.state.error} onRetry={props.onRetry} />;
  }
  const rows = flowRows(props.state.value.items, props.nowMs);
  if (rows.length === 0) {
    return (
      <EmptyState
        headingLevel={3}
        title="No flows yet"
        description="Name a flow, write it in YAML and validate it."
      >
        <Button asChild tone="primary">
          <Link to="/flows">{props.author ? "Create a flow" : "Go to flows"}</Link>
        </Button>
      </EmptyState>
    );
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {rows.map((row: FlowRowView) => (
        <li key={row.flowId} className="flex flex-wrap items-baseline gap-2">
          <Link className="font-semibold text-accent" to={row.href}>
            {row.flowId}
          </Link>
          <Badge tone={row.tone}>{row.version}</Badge>
          <span className="text-sm text-text-muted">
            {row.ownerTeam} · Updated {row.changed}
          </span>
        </li>
      ))}
    </ul>
  );
}

function NextSteps(props: { steps: NextStep[]; settled: boolean }): ReactNode {
  if (props.steps.length === 0 && !props.settled) return null;
  return (
    <Section title="Next steps" className="content-start xl:col-span-2">
      {props.steps.length === 0 ? (
        <p className="m-0">Nothing needs your attention right now.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {props.steps.map((step) => (
            <li
              key={step.id}
              className="relative flex flex-col gap-1 rounded-(--ui-radius) border border-divider p-3"
            >
              <div className="flex items-center gap-2">
                <Link
                  className="font-semibold text-accent after:absolute after:inset-0"
                  to={step.href}
                >
                  {step.label}
                  <ArrowRight aria-hidden="true" className="ml-1 inline size-4" />
                </Link>
                {step.badge === null ? null : <Badge tone="warning">{step.badge}</Badge>}
              </div>
              <p className="m-0 text-sm text-text-muted">{step.description}</p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Dashboard(props: { view: DashboardView; health: HealthState }): ReactNode {
  const client = useMemo(() => createApiClient(), []);
  const capabilities = props.view.capabilities;
  const userId = props.view.userId;
  const canReadRuns = capabilities.has("read_run");
  const canReadFlows = capabilities.has("read_flow");
  const needsFlows = canReadFlows || capabilities.has("test_flow");
  const needsServers = capabilities.has("register_tool_server");
  const needsPolicy = capabilities.has("deploy_policy");
  const needsUnassigned = capabilities.has("manage_users_roles");

  const runs = useLoader(canReadRuns, (signal) => loadRecentRuns(client, signal));
  const flows = useLoader(needsFlows, (signal) => loadFlowSet(client, signal));
  const servers = useLoader(needsServers, (signal) => loadPendingServers(client, signal));
  const policy = useLoader(needsPolicy, (signal) => loadPolicyFact(client, signal));
  const unassigned = useLoader(needsUnassigned, (signal) => loadUnassigned(client, signal));

  const runUserIds = useMemo(() => {
    if (runs.state.kind !== "ready") return [];
    const ids = new Set<string>();
    for (const run of runs.state.value) {
      if (run.principal.userId !== userId) ids.add(run.principal.userId);
    }
    return [...ids];
  }, [runs.state, userId]);

  const names = useDisplayNames(runUserIds);
  const nowMs = Date.now();

  const facts: HomeFacts = {
    runs: knownOrUnknown(runs.state),
    flows: knownOrUnknown(flows.state),
    servers: knownOrUnknown(servers.state),
    policy: knownOrUnknown(policy.state),
    unassigned: knownOrUnknown(unassigned.state),
  };
  const steps = nextSteps(capabilities, facts);
  const author = capabilities.has("test_flow");
  const healthText = healthView(props.health, false).text;

  return (
    <>
      <PageHeader
        title="Ursitoare"
        description={`Welcome, ${props.view.displayName}.`}
        meta={
          <span
            role="status"
            className="inline-flex items-center rounded-(--ui-radius) bg-quiet-surface px-2 py-0.5 text-sm font-medium text-quiet-text"
          >
            {healthText}
          </span>
        }
      />
      {canReadRuns || canReadFlows ? null : (
        <p>Your account has no access to flows or runs yet. Ask an administrator for a role.</p>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        {canReadRuns ? (
          <Section
            title="Recent runs"
            className="content-start"
            actions={<Link to="/runs">All runs</Link>}
          >
            <RunList
              state={runs.state}
              nowMs={nowMs}
              meId={userId}
              names={names}
              author={author}
              onRetry={runs.retry}
            />
          </Section>
        ) : null}
        {canReadFlows ? (
          <Section
            title="Recent flows"
            className="content-start"
            actions={<Link to="/flows">All flows</Link>}
          >
            <FlowList
              state={flows.state}
              nowMs={nowMs}
              author={author}
              onRetry={flows.retry}
            />
            {flows.state.kind === "ready" && !flows.state.value.complete ? (
              <p className="text-sm text-text-muted">
                Shown from the first 200 flows, in name order.
              </p>
            ) : null}
          </Section>
        ) : null}
        <NextSteps steps={steps.steps} settled={steps.settled} />
      </div>
    </>
  );
}

function PublicHome(props: {
  state: HealthState;
  rechecking: boolean;
  statusRef: RefObject<HTMLParagraphElement | null>;
  onCheckAgain: () => void;
}): ReactNode {
  const view = healthView(props.state, props.rechecking);
  return (
    <>
      <h1>Ursitoare</h1>
      <p className="engine-health" role="status" tabIndex={-1} ref={props.statusRef}>
        {view.text}
      </p>
      {view.button === "hidden" ? null : (
        <button
          type="button"
          aria-disabled={view.button === "busy" ? true : undefined}
          onClick={props.onCheckAgain}
        >
          Check again
        </button>
      )}
    </>
  );
}

export function HomePage(): ReactNode {
  const session = useSession();
  const view = homeView(session);
  const client = useMemo(() => createApiClient(), []);
  const [health, setHealth] = useState<HealthState>("loading");
  const [rechecking, setRechecking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const statusRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadEngineHealth(client, controller.signal).then(
      (next) => {
        setHealth(next);
      },
      (error: unknown) => {
        if (isAbortError(error)) return;
        setHealth("unavailable");
      },
    );
    return () => {
      controller.abort();
    };
  }, [client, attempt]);

  const display = healthView(health, rechecking);

  useEffect(() => {
    if (display.focusStatus) {
      statusRef.current?.focus();
    }
  }, [display.focusStatus]);

  function checkAgain(): void {
    if (display.button === "busy") return;
    setHealth("loading");
    setRechecking(true);
    setAttempt((value) => value + 1);
  }

  if (view.kind === "public") {
    return (
      <PublicHome
        state={health}
        rechecking={rechecking}
        statusRef={statusRef}
        onCheckAgain={checkAgain}
      />
    );
  }
  return <Dashboard view={view} health={health} />;
}
