import { envelopeStore } from "./envelope-store.ts";
import { assertTenantMatches, isSqlState } from "./tenant.ts";
import { assertIntInRange, assertRunId, assertStepWrite, formatTimestamp, invalid } from "./validate.ts";
import type { RunError, StepRecord, StepRepository, StepState, StepWrite } from "./types.ts";

const MAX_LIST_LIMIT = 1000;

const STEP_COLUMNS = `run_id, node_id, effect_seq, turn, attempt, generation, seq, kind, state,
  input_ref, output_ref, outcome, error, taint, policy_decision_id, idem_key, started_at, ended_at`;

interface StepRow {
  run_id: string;
  node_id: string;
  effect_seq: number;
  turn: number;
  attempt: number;
  generation: number;
  seq: number;
  kind: string;
  state: string;
  input_ref: string | null;
  output_ref: string | null;
  outcome: string | null;
  error: RunError | null;
  taint: string[];
  policy_decision_id: string | null;
  idem_key: string | null;
  started_at: Date;
  ended_at: Date | null;
}

function toStepRecord(row: StepRow): StepRecord {
  return {
    runId: row.run_id,
    nodeId: row.node_id,
    effectSeq: row.effect_seq,
    turn: row.turn,
    attempt: row.attempt,
    generation: row.generation,
    seq: row.seq,
    kind: row.kind,
    state: row.state as StepState,
    inputRef: row.input_ref,
    outputRef: row.output_ref,
    outcome: row.outcome,
    error: row.error,
    taint: [...row.taint],
    policyDecisionId: row.policy_decision_id,
    idemKey: row.idem_key,
    startedAt: formatTimestamp(row.started_at),
    endedAt: row.ended_at === null ? null : formatTimestamp(row.ended_at),
  };
}

function assertListQuery(query: { limit: number; afterSeq?: number }): void {
  assertIntInRange(query.limit, 1, MAX_LIST_LIMIT);
  if (query.afterSeq !== undefined) {
    assertIntInRange(query.afterSeq, 0, 2_147_483_647);
  }
}

export const stepRepository: StepRepository = {
  async upsert(tx, ctx, step: StepWrite) {
    await assertTenantMatches(tx, ctx);

    assertStepWrite(step);

    const input = step.input === null ? null : await envelopeStore.put(tx, ctx, step.input);
    const output = step.output === null ? null : await envelopeStore.put(tx, ctx, step.output);

    let rows: StepRow[];
    try {
      const result = await tx.query<StepRow>(
        `INSERT INTO ursitoare.step_execution
           (tenant_id, run_day, run_id, node_id, effect_seq, turn, attempt, generation, seq, kind, state,
            input_ref, output_ref, outcome, error, taint, policy_decision_id, idem_key, started_at, ended_at)
         SELECT r.tenant_id, r.run_day, r.run_id, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14::jsonb, $15::text[], $16, $17, $18, $19
           FROM ursitoare.run r
          WHERE r.tenant_id = $1 AND r.run_id = $2
         ON CONFLICT (tenant_id, run_day, run_id, node_id, effect_seq, turn, attempt, generation)
         DO UPDATE SET kind = EXCLUDED.kind,
                       state = EXCLUDED.state,
                       input_ref = COALESCE(EXCLUDED.input_ref, step_execution.input_ref),
                       output_ref = COALESCE(EXCLUDED.output_ref, step_execution.output_ref),
                       outcome = EXCLUDED.outcome,
                       error = EXCLUDED.error,
                       taint = EXCLUDED.taint,
                       policy_decision_id = EXCLUDED.policy_decision_id,
                       idem_key = EXCLUDED.idem_key,
                       ended_at = EXCLUDED.ended_at
         RETURNING ${STEP_COLUMNS}`,
        [
          ctx.tenantId,
          step.runId,
          step.nodeId,
          step.effectSeq,
          step.turn,
          step.attempt,
          step.generation,
          step.seq,
          step.kind,
          step.state,
          input === null ? null : input.sha256,
          output === null ? null : output.sha256,
          step.outcome,
          step.error === null ? null : JSON.stringify(step.error),
          [...step.taint],
          step.policyDecisionId,
          step.idemKey,
          step.startedAt,
          step.endedAt,
        ],
      );
      rows = result.rows;
    } catch (error) {
      if (isSqlState(error, "23505") || isSqlState(error, "23503")) {
        invalid();
      }
      throw error;
    }

    const row = rows[0];
    if (row === undefined) {
      invalid();
    }
    return toStepRecord(row);
  },

  async list(tx, ctx, runId: string, query: { limit: number; afterSeq?: number }) {
    await assertTenantMatches(tx, ctx);

    assertRunId(runId);
    assertListQuery(query);

    const afterSeq = query.afterSeq ?? null;
    const { rows } = await tx.query<StepRow>(
      `SELECT ${STEP_COLUMNS}
         FROM ursitoare.step_execution
        WHERE tenant_id = $1 AND run_id = $2 AND ($3::integer IS NULL OR seq > $3)
        ORDER BY seq
        LIMIT $4`,
      [ctx.tenantId, runId, afterSeq, query.limit + 1],
    );

    const pageRows = rows.slice(0, query.limit);
    const last = pageRows[pageRows.length - 1];
    const next = rows.length > query.limit && last !== undefined ? last.seq : null;
    return { steps: pageRows.map(toStepRecord), next };
  },
};
