import { ApiRequestError } from "../api/client.ts";
import type { ApiClient } from "../api/client.ts";
import type { FetchPage } from "../kit/data/cursor-list.ts";
import { cursorPageFetcher } from "../kit/data/page-fetcher.ts";
import { parsePayloadView, parseRunView, parseStepView } from "./types.ts";
import type { PayloadView, RunView, StepView } from "./types.ts";

const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const STEPS_PAGE_SIZE = 200;
const MAX_STEP_PAGES = 5;

function isRunId(value: string): boolean {
  return RUN_ID_PATTERN.test(value);
}

export function runListFetcher(client: Pick<ApiClient, "get">): FetchPage<RunView> {
  return cursorPageFetcher(client, "/runs", { parseItem: parseRunView });
}

export async function loadRun(
  client: Pick<ApiClient, "get">,
  runId: string,
  signal?: AbortSignal,
): Promise<RunView> {
  if (!isRunId(runId)) {
    throw new RangeError("runId must match ^[A-Za-z0-9_-]{1,128}$");
  }
  const answer: unknown = await client.get<unknown>(
    `/runs/${runId}`,
    signal === undefined ? undefined : { signal },
  );
  const run = parseRunView(answer);
  if (run === null) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid run");
  }
  return run;
}

export async function loadSteps(
  client: Pick<ApiClient, "get">,
  runId: string,
  signal?: AbortSignal,
): Promise<{ steps: StepView[]; truncated: boolean }> {
  if (!isRunId(runId)) {
    throw new RangeError("runId must match ^[A-Za-z0-9_-]{1,128}$");
  }
  const fetchPage = cursorPageFetcher(client, `/runs/${runId}/steps`, {
    parseItem: parseStepView,
  });
  const pageSignal = signal ?? new AbortController().signal;
  const steps: StepView[] = [];
  let pending: string | null = null;
  for (let page = 0; page < MAX_STEP_PAGES; page += 1) {
    const answer = await fetchPage({ cursor: pending, limit: STEPS_PAGE_SIZE, signal: pageSignal });
    steps.push(...answer.items);
    if (answer.next_cursor === null) {
      return { steps, truncated: false };
    }
    pending = answer.next_cursor;
  }
  return { steps, truncated: true };
}

export async function loadPayload(
  client: Pick<ApiClient, "get">,
  runId: string,
  sha256: string,
  signal?: AbortSignal,
): Promise<PayloadView> {
  if (!isRunId(runId)) {
    throw new RangeError("runId must match ^[A-Za-z0-9_-]{1,128}$");
  }
  if (typeof sha256 !== "string" || !SHA256_PATTERN.test(sha256)) {
    throw new RangeError("sha256 must match ^[0-9a-f]{64}$");
  }
  const answer: unknown = await client.get<unknown>(
    `/runs/${runId}/payloads/${sha256}`,
    signal === undefined ? undefined : { signal },
  );
  const payload = parsePayloadView(answer);
  if (payload === null) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid payload");
  }
  return payload;
}
