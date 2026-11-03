import { envelopeStore } from "./envelope-store.ts";
import { RunDataError } from "./errors.ts";
import { assertTenantTx, isSqlState } from "./tenant.ts";
import {
  assertDate,
  assertNewRun,
  assertRunId,
  assertRunTransition,
  formatRunDay,
  formatTimestamp,
} from "./validate.ts";
import type { NewRun, RunError, RunMode, RunRecord, RunRepository, RunState } from "./types.ts";

export const RUN_LIST_FILTER_FIRST = 7;

interface RunRow {
  run_id: string;
  lineage_id: string;
  parent_run_id: string | null;
  flow_id: string;
  flow_hash: string;
  owner_team: string;
  mode: string;
  trigger: string;
  state: string;
  principal_user_id: string;
  principal_kind: string;
  actor_chain: string[];
  input_ref: string | null;
  mocks_ref: string | null;
  output_ref: string | null;
  error: RunError | null;
  terminal_node: string | null;
  run_day: string;
  created_at: Date;
  started_at: Date | null;
  ended_at: Date | null;
}

const RUN_COLUMNS = `run_id, lineage_id, parent_run_id, flow_id, flow_hash, owner_team, mode, trigger,
  state, principal_user_id, principal_kind, actor_chain, input_ref, mocks_ref, output_ref, error,
  terminal_node, run_day::text AS run_day, created_at, started_at, ended_at`;

const SELECT_RUN = `SELECT ${RUN_COLUMNS} FROM ursitoare.run WHERE tenant_id = $1 AND run_id = $2`;

const SELECT_RUN_FOR_UPDATE = `${SELECT_RUN} FOR UPDATE`;

const INSERT_RUN = `INSERT INTO ursitoare.run
  (tenant_id, run_id, lineage_id, parent_run_id, flow_id, flow_hash, owner_team, mode, trigger, state,
   principal_user_id, principal_kind, actor_chain, input_ref, mocks_ref, output_ref, error, terminal_node,
   run_day, created_at, started_at, ended_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'test', 'queued', $9, $10, $11::text[], $12, $13, NULL, NULL,
          NULL, $14::date, $15, NULL, NULL)
  ON CONFLICT (tenant_id, run_id) DO NOTHING
  RETURNING ${RUN_COLUMNS}`;

function toRunRecord(row: RunRow): RunRecord {
  return {
    runId: row.run_id,
    lineageId: row.lineage_id,
    parentRunId: row.parent_run_id,
    flowId: row.flow_id,
    flowHash: row.flow_hash,
    ownerTeam: row.owner_team,
    mode: row.mode as RunMode,
    trigger: "test",
    state: row.state as RunState,
    principal: {
      userId: row.principal_user_id,
      kind: row.principal_kind as RunRecord["principal"]["kind"],
    },
    actorChain: [...row.actor_chain],
    inputRef: row.input_ref,
    mocksRef: row.mocks_ref,
    outputRef: row.output_ref,
    error: row.error,
    terminalNode: row.terminal_node,
    runDay: row.run_day,
    createdAt: formatTimestamp(row.created_at),
    startedAt: row.started_at === null ? null : formatTimestamp(row.started_at),
    endedAt: row.ended_at === null ? null : formatTimestamp(row.ended_at),
  };
}

async function selectRun(
  tx: Parameters<RunRepository["get"]>[0],
  tenantId: string,
  runId: string,
): Promise<RunRecord | null> {
  const { rows } = await tx.query<RunRow>(SELECT_RUN, [tenantId, runId]);
  const row = rows[0];
  return row === undefined ? null : toRunRecord(row);
}

function unknownTenant(error: unknown): never {
  if (isSqlState(error, "23503")) {
    throw new RunDataError("RUN_DATA_INVALID", "unknown_tenant");
  }
  throw error;
}

export const runRepository: RunRepository = {
  async create(tx, ctx, run: NewRun, at: Date) {
    assertNewRun(run);
    assertDate(at);
    await assertTenantTx(tx, ctx);

    const existing = await selectRun(tx, ctx.tenantId, run.runId);
    if (existing !== null) {
      return existing;
    }

    const input = await envelopeStore.put(tx, ctx, run.input);
    const mocks = run.mocks === null ? null : await envelopeStore.put(tx, ctx, run.mocks);

    let inserted: RunRow | undefined;
    try {
      const { rows } = await tx.query<RunRow>(INSERT_RUN, [
        ctx.tenantId,
        run.runId,
        run.lineageId,
        run.parentRunId,
        run.flowId,
        run.flowHash,
        run.ownerTeam,
        run.mode,
        run.principal.userId,
        run.principal.kind,
        [...run.actorChain],
        input.sha256,
        mocks === null ? null : mocks.sha256,
        formatRunDay(at),
        at,
      ]);
      inserted = rows[0];
    } catch (error) {
      unknownTenant(error);
    }

    if (inserted !== undefined) {
      return toRunRecord(inserted);
    }

    const raced = await selectRun(tx, ctx.tenantId, run.runId);
    if (raced === null) {
      throw new RunDataError("RUN_DATA_INVALID", "run not found");
    }
    return raced;
  },

  async get(tx, ctx, runId: string) {
    assertRunId(runId);
    await assertTenantTx(tx, ctx);
    return selectRun(tx, ctx.tenantId, runId);
  },

  async list() {
    throw new Error("not implemented");
  },

  async transition(tx, ctx, runId: string, change) {
    assertRunId(runId);
    assertRunTransition(change);
    await assertTenantTx(tx, ctx);

    const { rows } = await tx.query<RunRow>(SELECT_RUN_FOR_UPDATE, [ctx.tenantId, runId]);
    const current = rows[0];
    if (current === undefined) {
      return null;
    }
    if (!change.from.includes(current.state as RunState)) {
      return null;
    }

    const assignments: string[] = ["state = $3"];
    const values: unknown[] = [ctx.tenantId, runId, change.state];
    let index = 4;

    if (change.state === "running") {
      assignments.push(`started_at = COALESCE(started_at, $${index})`);
      values.push(change.at);
      index += 1;
    } else if (
      change.state === "completed" ||
      change.state === "failed" ||
      change.state === "cancelled"
    ) {
      assignments.push(`ended_at = $${index}`);
      values.push(change.at);
      index += 1;
    }

    if (change.output !== undefined) {
      const output = await envelopeStore.put(tx, ctx, change.output);
      assignments.push(`output_ref = $${index}`);
      values.push(output.sha256);
      index += 1;
    }

    if (change.error !== undefined) {
      assignments.push(`error = $${index}::jsonb`);
      values.push(JSON.stringify(change.error));
      index += 1;
    }

    if (change.terminalNode !== undefined) {
      assignments.push(`terminal_node = $${index}`);
      values.push(change.terminalNode);
    }

    const updated = await tx.query<RunRow>(
      `UPDATE ursitoare.run SET ${assignments.join(", ")} WHERE tenant_id = $1 AND run_id = $2 RETURNING ${RUN_COLUMNS}`,
      values,
    );
    const row = updated.rows[0];
    return row === undefined ? null : toRunRecord(row);
  },
};
