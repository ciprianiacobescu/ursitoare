import { canonicalJson, payloadDigest } from "./canonical.ts";
import { RunDataError } from "./errors.ts";
import type { RunStore } from "./run-store.ts";
import type {
  PayloadValue,
  RunRecord,
  StepHooks,
  StepRecord,
  StepWrite,
  StoredPayload,
} from "./types.ts";
import {
  assertDate,
  assertIntInRange,
  assertNewRun,
  assertRunId,
  assertRunTransition,
  assertStepWrite,
  formatRunDay,
  formatTimestamp,
  invalid,
} from "./validate.ts";

const MAX_PAYLOAD_BYTES = 1_048_576;
const MAX_LIST_LIMIT = 1000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

interface TenantData {
  payloads: Map<string, StoredPayload>;
  runs: Map<string, RunRecord>;
  steps: Map<string, Map<string, StepRecord>>;
}

function copy<T>(value: T): T {
  return structuredClone(value);
}

// Throws before anything is stored, so a refused call leaves no payload.
function checkSize(value: PayloadValue): void {
  const text = canonicalJson(value);
  if (Buffer.byteLength(text, "utf8") > MAX_PAYLOAD_BYTES) {
    throw new RunDataError("RUN_DATA_TOO_LARGE", "payload too large");
  }
}

export function createMemoryRunStore(): RunStore {
  const tenants = new Map<string, TenantData>();

  function tenant(tenantId: string): TenantData {
    let data = tenants.get(tenantId);
    if (data === undefined) {
      data = { payloads: new Map(), runs: new Map(), steps: new Map() };
      tenants.set(tenantId, data);
    }
    return data;
  }

  function put(data: TenantData, value: PayloadValue): string {
    checkSize(value);
    const text = canonicalJson(value);
    const sha256 = payloadDigest(value);
    if (!data.payloads.has(sha256)) {
      data.payloads.set(sha256, {
        sha256,
        mediaType: "application/json",
        size: Buffer.byteLength(text, "utf8"),
        data: JSON.parse(text) as PayloadValue,
        pinned: false,
      });
    }
    return sha256;
  }

  // A refused trace throws before anything is stored (put checks the size first).
  function hooksOfWrite(data: TenantData, step: StepWrite): StepHooks | undefined {
    if (step.hooks === undefined || step.hooks === null) {
      return undefined;
    }
    const inputOriginalRef =
      step.hooks.inputOriginal === null ? null : put(data, step.hooks.inputOriginal);
    return { inputOriginalRef, entries: step.hooks.entries.map((entry) => copy(entry)) };
  }

  return {
    async createRun(ctx, run, at) {
      assertNewRun(run);
      assertDate(at);
      const data = tenant(ctx.tenantId);
      const existing = data.runs.get(run.runId);
      if (existing !== undefined) {
        return copy(existing);
      }
      checkSize(run.input);
      if (run.mocks !== null) {
        checkSize(run.mocks);
      }
      const inputRef = put(data, run.input);
      const mocksRef = run.mocks === null ? null : put(data, run.mocks);
      const record: RunRecord = {
        runId: run.runId,
        lineageId: run.lineageId,
        parentRunId: run.parentRunId,
        flowId: run.flowId,
        flowHash: run.flowHash,
        ownerTeam: run.ownerTeam,
        mode: run.mode,
        trigger: "test",
        state: "queued",
        principal: { userId: run.principal.userId, kind: run.principal.kind },
        actorChain: [...run.actorChain],
        inputRef,
        mocksRef,
        outputRef: null,
        error: null,
        terminalNode: null,
        runDay: formatRunDay(at),
        createdAt: formatTimestamp(at),
        startedAt: null,
        endedAt: null,
      };
      data.runs.set(run.runId, record);
      return copy(record);
    },

    async getRun(ctx, runId) {
      assertRunId(runId);
      const found = tenant(ctx.tenantId).runs.get(runId);
      return found === undefined ? null : copy(found);
    },

    async transition(ctx, runId, change) {
      assertRunId(runId);
      assertRunTransition(change);
      const data = tenant(ctx.tenantId);
      const current = data.runs.get(runId);
      if (current === undefined || !change.from.includes(current.state)) {
        return null;
      }
      if (change.output !== undefined) {
        checkSize(change.output);
      }
      const at = formatTimestamp(change.at);
      current.state = change.state;
      if (change.state === "running") {
        current.startedAt = current.startedAt ?? at;
      } else if (
        change.state === "completed" ||
        change.state === "failed" ||
        change.state === "cancelled"
      ) {
        current.endedAt = at;
      }
      if (change.output !== undefined) {
        current.outputRef = put(data, change.output);
      }
      if (change.error !== undefined) {
        current.error = copy(change.error);
      }
      if (change.terminalNode !== undefined) {
        current.terminalNode = change.terminalNode;
      }
      return copy(current);
    },

    async recordStep(ctx, step) {
      assertStepWrite(step);
      const data = tenant(ctx.tenantId);
      if (!data.runs.has(step.runId)) {
        invalid();
      }
      const steps = data.steps.get(step.runId) ?? new Map<string, StepRecord>();
      const key = [step.nodeId, step.effectSeq, step.turn, step.attempt, step.generation].join("\u0001");
      const previous = steps.get(key);
      if (previous === undefined) {
        for (const other of steps.values()) {
          if (other.seq === step.seq) {
            invalid();
          }
        }
      }
      const hooks = hooksOfWrite(data, step);
      if (step.input !== null) {
        checkSize(step.input);
      }
      if (step.output !== null) {
        checkSize(step.output);
      }
      const inputRef = step.input === null ? null : put(data, step.input);
      const outputRef = step.output === null ? null : put(data, step.output);
      const record: StepRecord = {
        runId: step.runId,
        nodeId: step.nodeId,
        effectSeq: step.effectSeq,
        turn: step.turn,
        attempt: step.attempt,
        generation: step.generation,
        seq: previous === undefined ? step.seq : previous.seq,
        kind: step.kind,
        state: step.state,
        inputRef: inputRef ?? previous?.inputRef ?? null,
        outputRef: outputRef ?? previous?.outputRef ?? null,
        outcome: step.outcome,
        error: step.error === null ? null : copy(step.error),
        taint: [...step.taint],
        policyDecisionId: step.policyDecisionId,
        idemKey: step.idemKey,
        startedAt: previous === undefined ? formatTimestamp(step.startedAt) : previous.startedAt,
        endedAt: step.endedAt === null ? null : formatTimestamp(step.endedAt),
      };
      if (hooks !== undefined) {
        record.hooks = hooks;
      }
      steps.set(key, record);
      data.steps.set(step.runId, steps);
      return copy(record);
    },

    async listSteps(ctx, runId, q) {
      assertRunId(runId);
      assertIntInRange(q.limit, 1, MAX_LIST_LIMIT);
      if (q.afterSeq !== undefined) {
        assertIntInRange(q.afterSeq, 0, 2_147_483_647);
      }
      const afterSeq = q.afterSeq;
      const all = [...(tenant(ctx.tenantId).steps.get(runId)?.values() ?? [])]
        .filter((step) => afterSeq === undefined || step.seq > afterSeq)
        .sort((x, y) => x.seq - y.seq);
      const page = all.slice(0, q.limit);
      const last = page[page.length - 1];
      const next = all.length > q.limit && last !== undefined ? last.seq : null;
      return { steps: page.map(copy), next };
    },

    async getPayload(ctx, sha256) {
      if (typeof sha256 !== "string" || !SHA256_PATTERN.test(sha256)) {
        invalid();
      }
      const found = tenant(ctx.tenantId).payloads.get(sha256);
      return found === undefined ? null : copy(found);
    },
  };
}
