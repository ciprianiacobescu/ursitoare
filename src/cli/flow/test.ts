import { readFileSync, statSync } from "node:fs";

import {
  CatalogueFileError,
  catalogueFromJson,
  contentHash,
  emptyCatalogue,
  formatOf,
  parseFlowText,
  validateFlowText,
} from "../../authoring/index.ts";
import type { Catalogue, Flow, JsonValue } from "../../authoring/index.ts";
import {
  NO_EFFECT_GATE,
  checkMocks,
  executeRun,
  InterpreterError,
  memoryWorkflowOps,
  startRun,
  testRunInvokers,
} from "../../interpreter/index.ts";
import type { InterpreterDeps } from "../../interpreter/index.ts";
import { createMemoryRunStore } from "../../runs/index.ts";
import type { RunRecord, RunStore, StepRecord, TenantContext } from "../../runs/index.ts";
import { CliError } from "../errors.ts";
import { safeJson, safeText } from "../output.ts";
import type { CliCall, CliCommand, CliOption } from "../registry.ts";

const MAX_BYTES = 1_048_576;
const PAGE_SIZE = 1000;

const OPTIONS: Readonly<Record<string, CliOption>> = {
  file: { type: "string", summary: "flow file to test", required: true },
  mocks: { type: "string", summary: "mocks JSON file", required: true },
  input: { type: "string", summary: "input JSON file, default {}" },
  catalogue: { type: "string", summary: "catalogue JSON file" },
  json: { type: "boolean", summary: "print the result as JSON" },
};

function errno(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
  }
  return "UNKNOWN";
}

function readText(file: string, option: string): string {
  let stats;
  try {
    stats = statSync(file);
  } catch (error) {
    throw new CliError("CLI_USAGE", `cannot read ${option} (${errno(error)})`);
  }
  if (!stats.isFile()) {
    throw new CliError("CLI_USAGE", `cannot read ${option} (not a regular file)`);
  }
  if (stats.size > MAX_BYTES) {
    throw new CliError("CLI_USAGE", `cannot read ${option} (too large)`);
  }
  try {
    return readFileSync(file, "utf8");
  } catch (error) {
    throw new CliError("CLI_USAGE", `cannot read ${option} (${errno(error)})`);
  }
}

function loadCatalogue(path: string | undefined): Catalogue {
  if (path === undefined) {
    return emptyCatalogue;
  }
  const text = readText(path, "--catalogue");
  try {
    return catalogueFromJson(text);
  } catch (error) {
    if (error instanceof CatalogueFileError) {
      throw new CliError("CLI_USAGE", `catalogue: ${safeText(error.message)}`);
    }
    throw error;
  }
}

function parseJson(text: string, option: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new CliError("CLI_USAGE", `${option} is not valid JSON`);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

function issueLine(issue: { layer: string; code: string; path: string; message: string }): string {
  const location = issue.path === "" ? "/" : issue.path;
  return safeText(`  ${issue.layer} ${issue.code} ${location}: ${issue.message}`);
}

async function allSteps(
  store: RunStore,
  tenant: TenantContext,
  runId: string,
): Promise<StepRecord[]> {
  const steps: StepRecord[] = [];
  let afterSeq: number | undefined = undefined;
  for (;;) {
    const page: { steps: StepRecord[]; next: number | null } =
      afterSeq === undefined
        ? await store.listSteps(tenant, runId, { limit: PAGE_SIZE })
        : await store.listSteps(tenant, runId, { limit: PAGE_SIZE, afterSeq });
    steps.push(...page.steps);
    if (page.next === null) {
      return steps;
    }
    afterSeq = page.next;
  }
}

function outputPayload(
  store: RunStore,
  tenant: TenantContext,
  run: RunRecord,
): Promise<JsonValue | null> {
  return run.outputRef === null
    ? Promise.resolve(null)
    : store.getPayload(tenant, run.outputRef).then((payload) => payload?.data ?? null);
}

async function runFlow(
  call: CliCall,
  flow: Flow,
  catalogue: Catalogue,
  mocks: unknown,
  input: JsonValue,
): Promise<number> {
  const store = createMemoryRunStore();
  const tenant: TenantContext = { tenantId: "local", reviewProfile: "solo" };
  const hash = contentHash(flow);
  const deps: InterpreterDeps = {
    store,
    durable: null,
    loadVersion: async () => ({
      flowId: flow.flow,
      hash,
      state: "validated",
      ownerTeam: "local",
      flow,
    }),
    catalogueFor: async () => catalogue,
    invokerFor: testRunInvokers(store),
    effects: NO_EFFECT_GATE,
    clock: call.clock,
    ids: call.ids,
  };
  const runId = call.ids.next("run");

  let record: RunRecord;
  try {
    record = await startRun(deps, tenant, {
      flowId: flow.flow,
      hash,
      mode: "mock",
      input,
      mocks: mocks as JsonValue,
      principal: { userId: "cli", kind: "human" },
      actorChain: ["cli"],
      runId,
    });
  } catch (error) {
    if (error instanceof InterpreterError) {
      const lines = [safeText(`FAILED ${error.code} -`)];
      for (const [key, value] of Object.entries(error.details)) {
        const text = Array.isArray(value) ? value.join(", ") : value;
        lines.push(safeText(`  ${key}: ${text}`));
      }
      call.stdout.write(`${lines.join("\n")}\n`);
      return 1;
    }
    throw error;
  }

  record = await executeRun(memoryWorkflowOps(runId), deps, tenant, runId);
  const steps = await allSteps(store, tenant, runId);

  if (call.args.json === true) {
    const output = await outputPayload(store, tenant, record);
    call.stdout.write(
      `${safeJson({
        state: record.state,
        terminalNode: record.terminalNode,
        error: record.error,
        output,
        steps: steps.map((step) => ({
          seq: step.seq,
          nodeId: step.nodeId,
          kind: step.kind,
          state: step.state,
          outcome: step.outcome,
          error: step.error,
        })),
      })}\n`,
    );
  } else {
    const lines = steps.map((step) => {
      const base = `${step.seq} ${step.nodeId} ${step.kind} ${step.state}`;
      return safeText(step.outcome === null ? base : `${base} ${step.outcome}`);
    });
    if (record.state === "completed") {
      lines.push(safeText(`COMPLETED ${record.terminalNode ?? "-"}`));
    } else {
      lines.push(
        safeText(`FAILED ${record.error?.code ?? "FLOW_FAILED"} ${record.error?.node ?? "-"}`),
      );
    }
    call.stdout.write(`${lines.join("\n")}\n`);
  }

  return record.state === "completed" ? 0 : 1;
}

export const flowTestCommand: CliCommand = {
  summary: "run a flow offline against mocks",
  options: OPTIONS,
  database: false,
  async run(call: CliCall): Promise<number> {
    const file = call.args.file;
    if (typeof file !== "string") {
      throw new CliError("CLI_USAGE", "missing required option --file");
    }
    const mocksPath = call.args.mocks;
    if (typeof mocksPath !== "string") {
      throw new CliError("CLI_USAGE", "missing required option --mocks");
    }
    const catalogueArg = call.args.catalogue;
    const cataloguePath = typeof catalogueArg === "string" ? catalogueArg : undefined;
    const inputArg = call.args.input;
    const inputPath = typeof inputArg === "string" ? inputArg : undefined;

    const text = readText(file, "--file");
    const catalogue = loadCatalogue(cataloguePath);
    const format = formatOf(file);
    const result = validateFlowText(text, format, catalogue);

    if (!result.ok) {
      const lines = [safeText(`INVALID ${file}: ${result.errors.length} error(s)`)];
      for (const issue of result.errors) {
        lines.push(issueLine(issue));
      }
      if (cataloguePath === undefined) {
        lines.push("  hint: no --catalogue given, so every block is unknown");
      }
      call.stdout.write(`${lines.join("\n")}\n`);
      return 1;
    }

    const parsed = parseFlowText(text, format);
    if (!parsed.ok) {
      call.stdout.write(`${safeText(`INVALID ${file}: 1 error(s)`)}\n`);
      return 1;
    }
    const flow = parsed.doc as Flow;

    const mocks = parseJson(readText(mocksPath, "--mocks"), "--mocks");
    const checked = checkMocks(flow, catalogue, mocks);
    if (checked.problems.length > 0) {
      const lines = [`MOCKS ${checked.problems.length} problem(s)`];
      for (const problem of checked.problems) {
        const index = problem.index === null ? "" : `[${problem.index}]`;
        lines.push(safeText(`  ${problem.nodeId}${index} ${problem.reason}: ${problem.detail}`));
      }
      call.stdout.write(`${lines.join("\n")}\n`);
      return 1;
    }

    let input: JsonValue = {};
    if (inputPath !== undefined) {
      const parsedInput = parseJson(readText(inputPath, "--input"), "--input");
      if (!isPlainObject(parsedInput)) {
        throw new CliError("CLI_USAGE", "--input must be a JSON object");
      }
      input = parsedInput as JsonValue;
    }

    return runFlow(call, flow, catalogue, checked.mocks, input);
  },
};
