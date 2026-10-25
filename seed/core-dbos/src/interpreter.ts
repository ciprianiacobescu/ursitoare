// Format v0 interpreter: one DBOS workflow per run, one DBOS step per node execution.
// Everything between steps is deterministic (reference resolution over recorded outputs, pure control flow), so replay is safe.
import { DBOS } from '@dbos-inc/dbos-sdk';
import { Ajv } from 'ajv';
import { readFileSync } from 'node:fs';
import { RunFailure } from './errors.ts';
import { durationMs, referencedNodes, resolveValue, type Scope } from './refs.ts';
import { policy, type PolicyDecision } from './policy.ts';
import { callBlock, callDelegate, callLlm } from './clients.ts';
import { runSandboxed } from './sandbox.ts';

type Json = Record<string, any>;
export interface FlowDef { ursitoare: string; flow: string; version: string; start: string; nodes: Record<string, Json>; [k: string]: unknown }
export interface RunInput { def: FlowDef; hash: string; inputs: unknown; principal: string; origin?: string }
export interface RunResult { status: 'completed'; node: string; output: unknown; flow: string; flow_version: string; flow_hash: string }

const CATALOGUE_PATH = process.env.CATALOGUE_PATH ?? new URL('../../shared/catalogue/blocks.v0.json', import.meta.url).pathname;
const catalogue = JSON.parse(readFileSync(CATALOGUE_PATH, 'utf8')) as { blocks: Record<string, { effect: string; output: unknown; untrusted_fields?: string[] }> };

const ajv = new Ajv({ strict: false, allErrors: false });
const validators = new Map<string, ReturnType<Ajv['compile']>>();
function assertSchema(schema: unknown, value: unknown, what: string, nodeId: string) {
  const key = JSON.stringify(schema);
  let v = validators.get(key);
  if (!v) { v = ajv.compile(schema as object); validators.set(key, v); }
  if (!v(value)) throw new RunFailure('schema_violation', `${what} violates its schema: ${ajv.errorsText(v.errors)}`, nodeId);
}

const NON_RETRYABLE = new Set(['code_error', 'schema_violation']);
const RETRY = { retriesAllowed: true, maxAttempts: 3, intervalSeconds: 1, backoffRate: 2, shouldRetry: (e: unknown) => !(e instanceof RunFailure && NON_RETRYABLE.has(e.code)) };

interface StepOut { input?: unknown; output?: unknown; outcome?: string; policy?: PolicyDecision & { tool?: string }; denied?: PolicyDecision; meta?: Json }

/** Resolve the taint labels of the nodes an expression refers to (design 4.4: extract/code clear untrusted -> extracted). */
function taintOf(value: unknown, taints: Record<string, string[]>): string[] {
  const out = new Set<string>();
  for (const id of referencedNodes(value)) for (const t of taints[id] ?? []) out.add(t);
  return [...out];
}

export function loadFlow(text: string, parsed: unknown): FlowDef {
  const d = parsed as FlowDef;
  if (!d || d.ursitoare !== '0.1' || typeof d.flow !== 'string' || typeof d.version !== 'string' || !d.nodes || !d.nodes[d.start]) throw new RunFailure('invalid_flow', 'not a valid format v0 flow (ursitoare/flow/version/start/nodes)');
  for (const [id, n] of Object.entries(d.nodes)) if (!SUPPORTED.has(n.kind)) throw new RunFailure('unsupported_kind', `node ${id}: kind ${n.kind} is not implemented by this spike`, id);
  void text;
  return d;
}
const SUPPORTED = new Set(['block', 'code', 'llm.extract', 'llm.generate', 'llm.decide', 'human.approval', 'delegate', 'switch', 'wait', 'end']);

async function runFlowImpl(ri: RunInput): Promise<RunResult> {
  const runId = DBOS.workflowID!;
  const { def } = ri;
  const scope: Scope = { inputs: ri.inputs, nodes: {} };
  const taints: Record<string, string[]> = {};
  let nodeId = def.start;

  const fail = (code: string, msg: string, node?: string, detail?: unknown): never => {
    throw new Error(JSON.stringify({ code, message: msg, node, detail }));
  };
  const guard = (req: { node: string; kind: string; tool: string; args: unknown; taint: string[] }): PolicyDecision =>
    policy.check({ principal: ri.principal, flow: def.flow, flow_version: def.version, ...req });

  try {
    for (let hops = 0; hops < 10000; hops++) {
      const node = def.nodes[nodeId]!;
      switch (node.kind) {
        case 'block': {
          const args = resolveValue(node.with, scope);
          const tt = taintOf(node.with, taints);
          const cat = catalogue.blocks[node.uses];
          if (!cat) fail('unknown_block', `block ${node.uses} not in catalogue`, nodeId);
          const id = nodeId;
          const r = await DBOS.runStep<StepOut>(async () => {
            const d = guard({ node: id, kind: 'block', tool: node.uses, args, taint: tt });
            if (d.decision === 'deny') return { input: args, denied: d };
            const output = await callBlock(node.uses, args, { runId, nodeId: id, attempt: DBOS.stepStatus?.currentAttempt ?? 1, effect: cat!.effect, keyBase: ri.origin ?? runId });
            assertSchema(cat!.output, output, `block ${node.uses} output`, id);
            return { input: args, output, policy: d };
          }, { name: nodeId, ...RETRY });
          if (r.denied) fail('policy_denied', `policy denied ${node.uses}: ${r.denied.reason ?? ''}`, nodeId, r.denied);
          scope.nodes[nodeId] = { output: r.output };
          taints[nodeId] = (cat.untrusted_fields?.length ? [`untrusted:${nodeId}`] : []);
          nodeId = node.next;
          break;
        }
        case 'llm.extract':
        case 'llm.generate':
        case 'llm.decide': {
          const input = resolveValue(node.input, scope);
          const tt = taintOf(node.input, taints);
          const decide = node.kind === 'llm.decide';
          const schema = decide
            ? { type: 'object', properties: { outcome: { type: 'string', enum: node.outcomes }, rationale: { type: 'string' } }, required: ['outcome', 'rationale'], additionalProperties: false }
            : node.output_schema;
          const id = nodeId;
          const model = node.model_profile ?? 'default';
          const r = await DBOS.runStep<StepOut>(async () => {
            const d = guard({ node: id, kind: 'llm', tool: `llm:${model}`, args: input, taint: tt });
            if (d.decision === 'deny') return { denied: d };
            const output = await callLlm({ runId, nodeId: id, attempt: DBOS.stepStatus?.currentAttempt ?? 1, model, instructions: node.instructions, input, schema });
            assertSchema(schema, output, `${node.kind} output`, id);
            return { input, output, outcome: decide ? (output as { outcome: string }).outcome : undefined, policy: d };
          }, { name: nodeId, ...RETRY });
          if (r.denied) fail('policy_denied', `policy denied llm call at ${nodeId}: ${r.denied.reason ?? ''}`, nodeId, r.denied);
          scope.nodes[nodeId] = { output: r.output, outcome: r.outcome };
          taints[nodeId] = tt.map((t) => (t.startsWith('untrusted:') ? t.replace('untrusted:', 'extracted:') : t)).filter((t) => t.startsWith('extracted:'));
          if (decide) {
            const next = node.cases[r.outcome!];
            if (!next) fail('no_case', `decide outcome ${r.outcome} has no case`, nodeId);
            nodeId = next;
          } else nodeId = node.next;
          break;
        }
        case 'code': {
          const input = resolveValue(node.input, scope);
          const tt = taintOf(node.input, taints);
          const id = nodeId;
          const r = await DBOS.runStep<StepOut>(async () => {
            const output = await runSandboxed(node.source, input, `${runId}:${id}`);
            assertSchema(node.output_schema, output, 'code output', id);
            return { input, output };
          }, { name: nodeId, ...RETRY });
          scope.nodes[nodeId] = { output: r.output };
          taints[nodeId] = tt.map((t) => t.replace('untrusted:', 'extracted:')).filter((t) => t.startsWith('extracted:'));
          nodeId = node.next;
          break;
        }
        case 'switch': {
          const on = resolveValue(node.on, scope);
          const key = String(on);
          const r = await DBOS.runStep<StepOut>(async () => ({ output: null, outcome: key in node.cases ? key : '__default' }), { name: nodeId });
          nodeId = r.outcome === '__default' ? node.default : node.cases[r.outcome!];
          break;
        }
        case 'wait': {
          await DBOS.sleep(durationMs(node.duration));
          nodeId = node.next;
          break;
        }
        case 'human.approval': {
          const summary = resolveValue(node.summary, scope);
          const topic = nodeId;
          await DBOS.setEvent('state', { status: 'waiting', node: nodeId, assignee_role: node.assignee_role, summary });
          const msg = await DBOS.recv<Json>(topic, { timeoutSeconds: durationMs(node.timeout) / 1000 });
          await DBOS.setEvent('state', { status: 'running' });
          const out = msg === null
            ? { decision: 'timeout', approver: null, comment: null }
            : { decision: msg.decision, approver: msg.approver ?? null, comment: msg.comment ?? null };
          const next = node.cases[out.decision as string];
          if (!next) fail('bad_decision', `approval decision ${JSON.stringify(out.decision)} has no case`, nodeId);
          scope.nodes[nodeId] = { output: out };
          taints[nodeId] = [];
          nodeId = next;
          break;
        }
        case 'delegate': {
          const payload = resolveValue(node.with, scope);
          const tt = taintOf(node.with, taints);
          const id = nodeId;
          const correlationId = `${runId}:${id}`;
          const r = await DBOS.runStep<StepOut>(async () => {
            const d = guard({ node: id, kind: 'delegate', tool: `delegate:${node.target}/${node.workflow}`, args: payload, taint: tt });
            if (d.decision === 'deny') return { denied: d };
            await callDelegate({ workflow: node.workflow, correlationId, payload });
            return { input: payload, output: { correlation_id: correlationId }, policy: d };
          }, { name: nodeId, ...RETRY });
          if (r.denied) fail('policy_denied', `policy denied delegate at ${nodeId}: ${r.denied.reason ?? ''}`, nodeId, r.denied);
          await DBOS.setEvent('state', { status: 'running', node: nodeId, blocked_on: 'delegate_callback', correlation_id: correlationId }); // 'waiting' is reserved for human nodes (harness contract)
          const cb = await DBOS.recv<{ correlation_id: string; result: unknown }>(correlationId, { timeoutSeconds: durationMs(node.callback_timeout) / 1000 });
          await DBOS.setEvent('state', { status: 'running' });
          if (cb === null) { nodeId = node.on_timeout ?? fail('callback_timeout', 'delegate callback timed out', nodeId); break; }
          scope.nodes[nodeId] = { output: { correlation_id: correlationId, result: cb.result } };
          taints[nodeId] = ['untrusted:' + nodeId];
          nodeId = node.next;
          break;
        }
        case 'end': {
          if (node.status === 'failed') fail('flow_failed', `flow reached failing end node ${nodeId}`, nodeId);
          const output = node.output ? resolveValue(node.output, scope) : undefined;
          return { status: 'completed', node: nodeId, output, flow: def.flow, flow_version: def.version, flow_hash: ri.hash };
        }
        default:
          fail('unsupported_kind', `kind ${node.kind}`, nodeId);
      }
    }
    return fail('loop_limit', 'too many node executions', nodeId);
  } catch (e) {
    if (e instanceof RunFailure) throw new Error(JSON.stringify(e.toJSON()));
    throw e;
  }
}

export const runFlow = DBOS.registerWorkflow(runFlowImpl, { name: 'runFlow' });
