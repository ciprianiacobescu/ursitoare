// Format v0.1 / v0.2-draft interpreter: one DBOS workflow per run, one DBOS step per node execution, one DBOS step per hook execution.
// Everything between steps is deterministic (reference resolution over recorded outputs, pure control flow), so replay is safe.
// Hooks (design sections 3-5) are sibling steps at workflow level; the engine applies each recorded hook result to the visit state.
import { DBOS } from '@dbos-inc/dbos-sdk';
import { Ajv } from 'ajv';
import { RunFailure } from './errors.ts';
import { durationMs, refStrings, referencedNodes, resolveValue, type Scope } from './refs.ts';
import { policy, type PolicyDecision } from './policy.ts';
import { callBlock, callDelegate, callLlm } from './clients.ts';
import { runSandboxed } from './sandbox.ts';
import { catalogue } from './catalogue.ts';
import { crashCheck, hookExecLog } from './faults.ts';
import { assertAllowed, metaOf, normalizeAction, placementsFor, routesOf, singleStaticNext, successorsOf, whenMatch, type Json, type Meta, type Placement } from './hooks.ts';

export interface FlowDef { ursitoare: string; flow: string; version: string; start: string; nodes: Record<string, Json>; hooks?: Json[]; [k: string]: unknown }
export interface RunInput { def: FlowDef; hash: string; inputs: unknown; principal: string; origin?: string }
export interface TraceEvent { node: string; event: 'skip' | 'redirect' | 'retry' | 'hook_error' | 'mutate_input' | 'mutate_output'; hook: string; to?: string; attempt?: number; error?: unknown }
export interface RunResult { status: 'completed'; node: string; output: unknown; flow: string; flow_version: string; flow_hash: string; trace: TraceEvent[] }

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

const SUPPORTED = new Set(['block', 'code', 'llm.extract', 'llm.generate', 'llm.decide', 'human.approval', 'delegate', 'switch', 'wait', 'end']);
export const FORMATS = new Set(['0.1', '0.2-draft']);

export function loadFlow(text: string, parsed: unknown): FlowDef {
  const d = parsed as FlowDef;
  if (!d || !FORMATS.has(d.ursitoare) || typeof d.flow !== 'string' || typeof d.version !== 'string' || !d.nodes || !d.nodes[d.start]) throw new RunFailure('invalid_flow', 'not a valid format v0 flow (ursitoare/flow/version/start/nodes)');
  for (const [id, n] of Object.entries(d.nodes)) if (!SUPPORTED.has(n.kind)) throw new RunFailure('unsupported_kind', `node ${id}: kind ${n.kind} is not implemented by this spike`, id);
  void text;
  return d;
}

// ---- per-visit state, mutated only by applying recorded results ------------------------------------------------------
interface St {
  inputOriginal: any; input: any; taintIn: string[];
  output?: any; outcome: string | null; outTaint: string[]; hasOutput: boolean;
  succ?: string; attempt: number; feedback: any;
  skip?: { by: string; output: any; outcome: string | null };
  retry?: { by: string; input?: any; feedback?: any };
  redirectedBy?: string; timedOut: boolean;
  events: TraceEvent[];
}
interface HookRes { kind: 'code' | 'block'; ret?: any; error?: { code: string; message: string }; output?: unknown; denied?: PolicyDecision; policy?: PolicyDecision }
interface CoreOut { output?: any; outcome?: string | null; policy?: PolicyDecision; denied?: PolicyDecision }
interface NodeRec { input_original: any; input: any; output?: any; outcome?: string | null; policy?: PolicyDecision; denied?: PolicyDecision; attempt: number; skipped_by?: string; fused?: { pre: FusedRec[]; post: FusedRec[] }; aborted?: boolean }
interface FusedRec { name: string; res: HookRes }

const uniq = (a: string[]) => [...new Set(a)];
const isObj = (x: unknown): x is Json => !!x && typeof x === 'object' && !Array.isArray(x);

async function runFlowImpl(ri: RunInput): Promise<RunResult> {
  const runId = DBOS.workflowID!;
  const { def } = ri;
  const keyBase = ri.origin ?? runId;
  const fusedMode = process.env.HOOK_MODE === 'fused';
  const scope: Scope = { inputs: ri.inputs, nodes: {} };
  const taints: Record<string, string[]> = {};
  const trace: TraceEvent[] = [];

  const fail = (code: string, msg: string, node?: string, detail?: unknown): never => {
    throw new Error(JSON.stringify({ code, message: msg, node, detail, trace }));
  };
  const guard = (req: { node: string; kind: string; tool: string; args: unknown; taint: string[] }): PolicyDecision =>
    policy.check({ principal: ri.principal, flow: def.flow, flow_version: def.version, ...req });

  /** Taint labels of the nodes an expression refers to. */
  function taintOf(value: unknown): string[] {
    const out = new Set<string>();
    for (const id of referencedNodes(value)) for (const t of taints[id] ?? []) out.add(t);
    return [...out];
  }
  /** Taint of a hook expression: nodes.* from the record, hook.input.* from the node input, hook.output.* from the node output (section 5). */
  function hookRefTaint(value: unknown, st: St): string[] {
    const out = new Set<string>();
    for (const r of refStrings(value)) {
      const p = r.split('.');
      if (p[0] === 'nodes' && p[1]) for (const t of taints[p[1]] ?? []) out.add(t);
      else if (p[0] === 'hook' && p[1] === 'input') for (const t of st.taintIn) out.add(t);
      else if (p[0] === 'hook' && p[1] === 'output') for (const t of st.outTaint) out.add(t);
    }
    return [...out];
  }
  const extracted = (tt: string[]) => tt.map((t) => t.replace('untrusted:', 'extracted:')).filter((t) => t.startsWith('extracted:'));

  /** D1's output taint label per node kind (hooks never clear it; they only add to it). */
  function outTaintFor(nodeId: string, node: Json, taintIn: string[]): string[] {
    switch (node.kind) {
      case 'block': return catalogue.blocks[node.uses]?.untrusted_fields?.length ? [`untrusted:${nodeId}`] : [];
      case 'llm.extract': case 'llm.generate': case 'llm.decide': case 'code': return extracted(taintIn);
      case 'delegate': return [`untrusted:${nodeId}`];
      default: return [];
    }
  }

  function outputSchemaOf(node: Json): unknown {
    switch (node.kind) {
      case 'block': return catalogue.blocks[node.uses]?.output;
      case 'llm.extract': case 'llm.generate': case 'code': return node.output_schema;
      case 'llm.decide': return { type: 'object', properties: { outcome: { type: 'string', enum: node.outcomes }, rationale: { type: 'string' } }, required: ['outcome', 'rationale'], additionalProperties: false };
      default: return undefined;
    }
  }

  function baseInput(nodeId: string, node: Json): { input: any; taint: string[] } {
    switch (node.kind) {
      case 'block': case 'delegate': return { input: resolveValue(node.with, scope), taint: taintOf(node.with) };
      case 'code': case 'llm.extract': case 'llm.generate': case 'llm.decide': return { input: resolveValue(node.input, scope), taint: taintOf(node.input) };
      case 'switch': return { input: { on: resolveValue(node.on, scope) }, taint: taintOf(node.on) };
      case 'wait': return { input: { duration: node.duration }, taint: [] };
      case 'human.approval': return { input: { summary: resolveValue(node.summary, scope) }, taint: taintOf(node.summary) };
      case 'end': return { input: node.output ? resolveValue(node.output, scope) : {}, taint: taintOf(node.output) };
      default: return fail('unsupported_kind', `kind ${node.kind}`, nodeId);
    }
  }

  /** The outcome as hooks and `when.outcome` see it (switch: the matched key or "default"). */
  const ctxOutcome = (st: St): string | null => (st.outcome === '__default' ? 'default' : st.outcome);

  function resolveSucc(nodeId: string, node: Json, st: St): string {
    switch (node.kind) {
      case 'llm.decide': return node.cases[st.outcome!] ?? fail('no_case', `decide outcome ${st.outcome} has no case`, nodeId);
      case 'switch': return st.outcome === '__default' ? node.default : node.cases[st.outcome!];
      case 'human.approval': return node.cases[st.outcome!] ?? fail('bad_decision', `approval decision ${JSON.stringify(st.outcome)} has no case`, nodeId);
      case 'delegate': return st.timedOut ? (node.on_timeout ?? fail('callback_timeout', 'delegate callback timed out', nodeId)) : node.next;
      default: return node.next;
    }
  }

  // ---- one node visit ---------------------------------------------------------------------------------------------
  async function visit(nodeId: string, fromId: string | null): Promise<string | RunResult> {
    const node = def.nodes[nodeId]!;
    const meta = metaOf(def, nodeId);
    const fromMeta = fromId ? metaOf(def, fromId) : null;
    const preAll = placementsFor(def, nodeId, 'pre');
    const postAll = placementsFor(def, nodeId, 'post');
    const candidates = uniq([...successorsOf(node), ...routesOf(def, nodeId)]).map((id) => metaOf(def, id));
    const preNextId = singleStaticNext(node);
    const preNext = preNextId ? metaOf(def, preNextId) : null;
    if (node.kind === 'block' && !catalogue.blocks[node.uses]) fail('unknown_block', `block ${node.uses} not in catalogue`, nodeId);
    const cat = node.kind === 'block' ? catalogue.blocks[node.uses]! : undefined;

    let b: { input: any; taint: string[] };
    try { b = baseInput(nodeId, node); } catch (e) { if (e instanceof RunFailure && !e.node) e.node = nodeId; throw e; }
    const st: St = { inputOriginal: b.input, input: b.input, taintIn: b.taint, outcome: null, outTaint: [], hasOutput: false, attempt: 1, feedback: null, timedOut: false, events: [] };
    const flush = () => { trace.push(...st.events); st.events = []; };

    // fused mode: trailing pure code hooks (pre) / leading pure code hooks (post) run inside the node step; park nodes and end have no such step
    const fusable = (p: Placement) => p.hook.kind === 'code' && !p.hook.routes && p.hook.max_retries === undefined;
    const hasStep = ['block', 'llm.extract', 'llm.generate', 'llm.decide', 'code', 'switch', 'delegate'].includes(node.kind);
    let kPre = preAll.length;
    let kPost = 0;
    if (fusedMode && hasStep) {
      while (kPre > 0 && fusable(preAll[kPre - 1]!)) kPre--;
      if (node.kind !== 'delegate') while (kPost < postAll.length && fusable(postAll[kPost]!)) kPost++;
    }
    const sepPre = preAll.slice(0, kPre);
    const fusedPre = preAll.slice(kPre);
    const fusedPost = postAll.slice(0, kPost);
    const sepPost = postAll.slice(kPost);

    const ctxBase = (phase: 'pre' | 'post', s: St): Json => {
      const base: Json = {
        phase, node: meta, from: fromMeta,
        next: phase === 'pre' ? preNext : (s.succ ? metaOf(def, s.succ) : null),
        next_candidates: candidates, input: s.input, attempt: s.attempt, feedback: s.feedback,
      };
      if (phase === 'post') { base.output = s.hasOutput ? s.output : null; base.outcome = ctxOutcome(s); }
      return base;
    };
    /** Resolved hook `input`. In a post phase the wrapped node itself counts as available (its output so far). */
    const argsOf = (p: Placement, s: St): any => {
      if (!p.hook.input) return {};
      const sc: Scope = p.phase === 'post' && s.hasOutput ? { ...scope, nodes: { ...scope.nodes, [nodeId]: { output: s.output, outcome: node.kind === 'llm.decide' ? (s.outcome ?? undefined) : undefined } } } : scope;
      return resolveValue(p.hook.input, sc);
    };
    const syncScope = () => {
      if (!st.hasOutput) return;
      scope.nodes[nodeId] = { output: st.output, outcome: node.kind === 'llm.decide' ? (st.outcome ?? undefined) : undefined };
      taints[nodeId] = st.outTaint;
    };

    // ---- applying a recorded hook result to the state ----
    const errCheck = (p: Placement, res: HookRes, s: St): boolean => {
      if (res.denied) fail('policy_denied', `policy denied hook ${p.stepName}: ${res.denied.reason ?? ''}`, nodeId, res.denied);
      if (res.error) {
        if (p.hook.on_error === 'continue') { s.events.push({ node: nodeId, event: 'hook_error', hook: p.stepName, error: res.error }); return true; }
        fail('hook_error', `hook ${p.stepName} failed: ${res.error.message}`, nodeId, { hook: p.stepName, error: res.error });
      }
      return false;
    };
    const applyPre = (p: Placement, res: HookRes, s: St): void => {
      if (errCheck(p, res, s) || res.kind === 'block') return;
      const act = normalizeAction(res.ret, p.stepName);
      assertAllowed(p, act, meta);
      if (act.action === 'fail') fail('hook_failed', `hook ${p.stepName} failed the run: ${act.reason ?? ''}`, nodeId, { hook: p.stepName, reason: act.reason });
      const hookT = hookRefTaint(p.hook.input, s);
      if (act.action === 'continue' && act.input !== undefined) {
        s.input = act.input; s.taintIn = uniq([...s.taintIn, ...hookT]);
        s.events.push({ node: nodeId, event: 'mutate_input', hook: p.stepName });
      } else if (act.action === 'skip') {
        if (!isObj(act.output)) throw new RunFailure('hook_action_invalid', `hook ${p.stepName}: skip needs an output object`, nodeId);
        let outcome: string | null = null;
        if (node.kind === 'llm.decide') {
          if (typeof act.outcome !== 'string' || !node.outcomes.includes(act.outcome)) throw new RunFailure('hook_action_invalid', `hook ${p.stepName}: skip on llm.decide needs one of the declared outcomes`, nodeId);
          outcome = act.outcome;
        }
        const schema = outputSchemaOf(node);
        if (schema) assertSchema(schema, act.output, `skip output of ${p.stepName}`, nodeId);
        s.skip = { by: p.stepName, output: act.output, outcome };
        s.taintIn = uniq([...s.taintIn, ...hookT]);
        s.events.push({ node: nodeId, event: 'skip', hook: p.stepName });
      }
    };
    const applyPost = (p: Placement, res: HookRes, s: St): void => {
      if (errCheck(p, res, s) || res.kind === 'block') return;
      const act = normalizeAction(res.ret, p.stepName);
      assertAllowed(p, act, meta);
      if (act.action === 'fail') fail('hook_failed', `hook ${p.stepName} failed the run: ${act.reason ?? ''}`, nodeId, { hook: p.stepName, reason: act.reason });
      const hookT = hookRefTaint(p.hook.input, s);
      if (act.action === 'continue' && act.output !== undefined) {
        const schema = outputSchemaOf(node);
        if (schema) assertSchema(schema, act.output, `mutated output of ${p.stepName}`, nodeId);
        s.output = act.output; s.hasOutput = true;
        s.outTaint = uniq([...s.outTaint, ...s.taintIn, ...hookT]);
        s.events.push({ node: nodeId, event: 'mutate_output', hook: p.stepName });
      } else if (act.action === 'redirect') {
        s.succ = act.to!; s.redirectedBy = p.stepName;
        s.events.push({ node: nodeId, event: 'redirect', hook: p.stepName, to: act.to });
      } else if (act.action === 'retry') {
        if (s.attempt - 1 >= p.hook.max_retries!) fail('hook_retry_exhausted', `hook ${p.stepName} asked for retry ${s.attempt} but max_retries is ${p.hook.max_retries}`, nodeId, { hook: p.stepName, attempts: s.attempt });
        s.retry = { by: p.stepName, input: act.input, feedback: act.feedback ?? null };
        s.events.push({ node: nodeId, event: 'retry', hook: p.stepName, attempt: s.attempt + 1 });
        if (act.input !== undefined) s.taintIn = uniq([...s.taintIn, ...hookT]);
      }
    };

    // ---- executing a hook as its own DBOS step ----
    const execCode = async (p: Placement, ctx: Json, s: St): Promise<HookRes> => {
      let res: HookRes;
      try { res = { kind: 'code', ret: await runSandboxed(p.hook.source!, ctx, `${runId}:${p.stepName}:${s.attempt}`, { param: 'ctx', undefinedAsNull: true }) }; }
      catch (e) { if (e instanceof RunFailure && e.code === 'code_error') res = { kind: 'code', error: { code: e.code, message: e.message } }; else throw e; }
      hookExecLog({ run: runId, node: nodeId, phase: p.phase, hook: p.label, attempt: s.attempt });
      return res;
    };
    const runHookStep = async (p: Placement, s: St): Promise<HookRes> => {
      const h = p.hook;
      const name = p.stepName;
      crashCheck(name);
      const nextMeta = p.phase === 'pre' ? preNext : (s.succ ? metaOf(def, s.succ) : null);
      const args = argsOf(p, s);
      if (h.kind === 'code') {
        const ctx = { ...ctxBase(p.phase, s), args };
        return DBOS.runStep<HookRes>(() => execCode(p, ctx, s), { name, ...RETRY });
      }
      const hscope: Scope = { ...scope, hook: { input: s.input, output: s.hasOutput ? s.output : undefined, node: meta, next: nextMeta, from: fromMeta } };
      const withArgs = resolveValue(h.with, hscope);
      const tt = hookRefTaint(h.with, s);
      const hid = p.label;
      const phase = p.phase;
      const attempt = s.attempt;
      const key = `${keyBase}:${nodeId}#${phase}:${hid}:a${attempt}`;
      return DBOS.runStep<HookRes>(async () => {
        const d = guard({ node: nodeId, kind: 'hook', tool: h.uses!, args: withArgs, taint: tt });
        if (d.decision === 'deny') return { kind: 'block', denied: d };
        let res: HookRes;
        try {
          const output = await callBlock(h.uses!, withArgs, { runId, nodeId: `${nodeId}#${phase}.${hid}`, attempt: DBOS.stepStatus?.currentAttempt ?? 1, effect: catalogue.blocks[h.uses!]!.effect, idemKey: key });
          res = { kind: 'block', output, policy: d };
        } catch (e) {
          if (e instanceof RunFailure && e.code === 'block_error') res = { kind: 'block', error: { code: e.code, message: e.message }, policy: d };
          else throw e;
        }
        hookExecLog({ run: runId, node: nodeId, phase, hook: hid, attempt });
        return res;
      }, { name, ...RETRY });
    };

    // ---- node execution (the node's own DBOS step, with pure code hooks fused in when HOOK_MODE=fused) ----
    const nodeStep = (core: (sh: St) => Promise<CoreOut>): Promise<NodeRec> => {
      crashCheck(nodeId);
      const fp = st.attempt === 1 ? fusedPre : []; const fq = fusedPost;
      return DBOS.runStep<NodeRec>(async () => {
        const sh: St = structuredClone({ ...st, events: [] });
        const fused: { pre: FusedRec[]; post: FusedRec[] } = { pre: [], post: [] };
        const rec = (extra: Partial<NodeRec>): NodeRec => ({ input_original: st.inputOriginal, input: sh.input, attempt: st.attempt, fused, ...extra });
        for (const p of fp) {
          if (!whenMatch(p.hook.when, fromMeta, null, null)) continue;
          const res = await execCode(p, { ...ctxBase('pre', sh), args: argsOf(p, sh) }, sh);
          fused.pre.push({ name: p.stepName, res });
          try { applyPre(p, res, sh); } catch { return rec({ aborted: true }); }
          if (sh.skip) break;
        }
        let out: CoreOut;
        if (sh.skip) out = { output: sh.skip.output, outcome: sh.skip.outcome };
        else {
          out = await core(sh);
          if (out.denied) return rec({ denied: out.denied });
        }
        const raw = rec({ output: out.output, outcome: out.outcome ?? null, policy: out.policy, skipped_by: sh.skip?.by });
        if (fq.length) {
          sh.output = out.output; sh.hasOutput = true; sh.outcome = out.outcome ?? null;
          sh.outTaint = outTaintFor(nodeId, node, sh.taintIn);
          try { sh.succ = resolveSucc(nodeId, node, sh); } catch { return raw; }
          for (const p of fq) {
            if (!whenMatch(p.hook.when, fromMeta, metaOf(def, sh.succ!), ctxOutcome(sh))) continue;
            const res = await execCode(p, { ...ctxBase('post', sh), args: argsOf(p, sh) }, sh);
            fused.post.push({ name: p.stepName, res });
            try { applyPost(p, res, sh); } catch { raw.aborted = true; break; }
          }
        }
        return raw;
      }, { name: nodeId, ...RETRY });
    };

    // ---- 1. pre-hooks (outer to inner) ----
    for (const p of sepPre) {
      if (!whenMatch(p.hook.when, fromMeta, null, null)) continue;
      applyPre(p, await runHookStep(p, st), st);
      flush();
      if (st.skip) break;
    }

    // ---- 2. node attempts; 3. successor; 4. post-hooks ----
    const replayPre = (rec: NodeRec) => { for (const f of rec.fused?.pre ?? []) applyPre(fusedPre.find((x) => x.stepName === f.name)!, f.res, st); flush(); };
    let result: RunResult | null = null;
    for (;;) {
      const attempt = st.attempt;
      const skippedHere = attempt === 1 && !!st.skip;
      st.retry = undefined;
      let rec: NodeRec | null = null;
      let timedOut = false;

      if (node.kind === 'end') {
        if (node.status === 'failed') fail('flow_failed', `flow reached failing end node ${nodeId}`, nodeId);
        crashCheck(nodeId);
        const output = (node.output || st.input !== st.inputOriginal) ? st.input : undefined;
        result = { status: 'completed', node: nodeId, output, flow: def.flow, flow_version: def.version, flow_hash: ri.hash, trace };
        break;
      }

      switch (node.kind) {
        case 'block': {
          rec = skippedHere ? null : await nodeStep(async (sh) => {
            const d = guard({ node: nodeId, kind: 'block', tool: node.uses, args: sh.input, taint: sh.taintIn });
            if (d.decision === 'deny') return { denied: d };
            const output = await callBlock(node.uses, sh.input, { runId, nodeId, attempt: DBOS.stepStatus?.currentAttempt ?? 1, effect: cat!.effect, idemKey: sh.attempt === 1 ? `${keyBase}:${nodeId}` : `${keyBase}:${nodeId}:r${sh.attempt}` });
            assertSchema(cat!.output, output, `block ${node.uses} output`, nodeId);
            return { output, policy: d };
          });
          break;
        }
        case 'llm.extract': case 'llm.generate': case 'llm.decide': {
          const decide = node.kind === 'llm.decide';
          const schema = outputSchemaOf(node);
          const model = node.model_profile ?? 'default';
          rec = skippedHere ? null : await nodeStep(async (sh) => {
            const d = guard({ node: nodeId, kind: 'llm', tool: `llm:${model}`, args: sh.input, taint: sh.taintIn });
            if (d.decision === 'deny') return { denied: d };
            const output = await callLlm({ runId, nodeId, attempt: DBOS.stepStatus?.currentAttempt ?? 1, model, instructions: node.instructions, input: sh.input, schema });
            assertSchema(schema, output, `${node.kind} output`, nodeId);
            return { output, outcome: decide ? (output as { outcome: string }).outcome : null, policy: d };
          });
          break;
        }
        case 'code': {
          rec = skippedHere ? null : await nodeStep(async (sh) => {
            const output = await runSandboxed(node.source, sh.input, `${runId}:${nodeId}${sh.attempt > 1 ? `:r${sh.attempt}` : ''}`);
            assertSchema(node.output_schema, output, 'code output', nodeId);
            return { output };
          });
          break;
        }
        case 'switch': {
          rec = await nodeStep(async (sh) => {
            const key = String((sh.input as { on: unknown }).on);
            return { output: null, outcome: key in node.cases ? key : '__default' };
          });
          break;
        }
        case 'wait': {
          crashCheck(nodeId);
          await DBOS.sleep(durationMs(st.input.duration));
          break;
        }
        case 'human.approval': {
          crashCheck(nodeId);
          await DBOS.setEvent('state', { status: 'waiting', node: nodeId, assignee_role: node.assignee_role, summary: st.input.summary });
          const msg = await DBOS.recv<Json>(nodeId, { timeoutSeconds: durationMs(node.timeout) / 1000 });
          await DBOS.setEvent('state', { status: 'running' });
          const out = msg === null
            ? { decision: 'timeout', approver: null, comment: null }
            : { decision: msg.decision, approver: msg.approver ?? null, comment: msg.comment ?? null };
          rec = { input_original: st.inputOriginal, input: st.input, output: out, outcome: out.decision as string, attempt };
          break;
        }
        case 'delegate': {
          const correlationId = `${runId}:${nodeId}`;
          const r = await nodeStep(async (sh) => {
            const d = guard({ node: nodeId, kind: 'delegate', tool: `delegate:${node.target}/${node.workflow}`, args: sh.input, taint: sh.taintIn });
            if (d.decision === 'deny') return { denied: d };
            await callDelegate({ workflow: node.workflow, correlationId, payload: sh.input });
            return { output: { correlation_id: correlationId }, policy: d };
          });
          replayPre(r);
          if (r.denied) fail('policy_denied', `policy denied delegate at ${nodeId}: ${r.denied.reason ?? ''}`, nodeId, r.denied);
          await DBOS.setEvent('state', { status: 'running', node: nodeId, blocked_on: 'delegate_callback', correlation_id: correlationId }); // 'waiting' is reserved for human nodes (harness contract)
          const cb = await DBOS.recv<{ correlation_id: string; result: unknown }>(correlationId, { timeoutSeconds: durationMs(node.callback_timeout) / 1000 });
          await DBOS.setEvent('state', { status: 'running' });
          if (cb === null) { timedOut = true; rec = { input_original: st.inputOriginal, input: st.input, outcome: 'timeout', attempt }; }
          else rec = { input_original: st.inputOriginal, input: st.input, output: { correlation_id: correlationId, result: cb.result }, outcome: null, attempt };
          break;
        }
        default:
          fail('unsupported_kind', `kind ${node.kind}`, nodeId);
      }

      // ---- apply the node's record to the state ----
      // a skipped node earned no relabel (no extraction or code ran), so its output keeps exactly the input taint, plus the block's own untrusted label
      const skipTaint = () => uniq([...st.taintIn, ...(cat?.untrusted_fields?.length ? [`untrusted:${nodeId}`] : [])]);
      if (skippedHere && !rec) {
        st.output = st.skip!.output; st.hasOutput = true; st.outcome = st.skip!.outcome;
        st.outTaint = skipTaint();
      } else if (rec) {
        if (node.kind !== 'delegate') replayPre(rec); // fused pre-hooks: re-apply their recorded results (throws what the step saw)
        if (rec.denied) fail('policy_denied', `policy denied ${node.kind === 'block' ? node.uses : `llm call at ${nodeId}`}: ${rec.denied.reason ?? ''}`, nodeId, rec.denied);
        st.inputOriginal = rec.input_original;
        st.output = rec.output; st.hasOutput = rec.output !== undefined && node.kind !== 'switch';
        st.outcome = rec.outcome ?? null; st.timedOut = timedOut;
        st.outTaint = node.kind === 'human.approval' || node.kind === 'switch' || timedOut ? [] : (rec.skipped_by ? skipTaint() : outTaintFor(nodeId, node, st.taintIn));
      }

      // ---- 3. successor ----
      st.succ = resolveSucc(nodeId, node, st);
      syncScope();

      // ---- 4. post-hooks (inner to outer): fused ones replay from the node step, the rest are steps of their own ----
      if (rec?.fused && node.kind !== 'delegate') {
        for (const f of rec.fused.post) { applyPost(fusedPost.find((x) => x.stepName === f.name)!, f.res, st); syncScope(); }
        flush();
      }
      for (const p of sepPost) {
        if (st.retry as St['retry']) break;
        if (!whenMatch(p.hook.when, fromMeta, metaOf(def, st.succ!), ctxOutcome(st))) continue;
        applyPost(p, await runHookStep(p, st), st);
        syncScope();
        flush();
      }
      const r = st.retry as St['retry'];
      if (r) {
        st.attempt = attempt + 1;
        if (r.input !== undefined) st.input = r.input;
        st.feedback = r.feedback ?? null;
        st.retry = undefined; st.skip = undefined;
        continue;
      }
      break;
    }

    if (result) return result;
    flush();
    return st.succ!;
  }

  try {
    let nodeId = def.start;
    let fromId: string | null = null;
    for (let hops = 0; hops < 10000; hops++) {
      const r = await visit(nodeId, fromId);
      if (typeof r !== 'string') return r;
      fromId = nodeId;
      nodeId = r;
    }
    return fail('loop_limit', 'too many node executions', nodeId);
  } catch (e) {
    if (e instanceof RunFailure) throw new Error(JSON.stringify({ ...e.toJSON(), trace }));
    throw e;
  }
}

export const runFlow = DBOS.registerWorkflow(runFlowImpl, { name: 'runFlow' });
