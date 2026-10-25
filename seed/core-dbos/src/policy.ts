// Policy hook (design section 6). Stub: deny erp.create_payment@1 when amount > 10000. Every decision is logged.
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export interface PolicyRequest {
  principal: string;
  flow: string;
  flow_version: string;
  node: string;
  kind: string;                 // block | llm | delegate
  tool: string;                 // block name@major, llm:<profile>, delegate:<target>/<workflow>
  args: unknown;
  taint: string[];              // e.g. ["untrusted:fetch_invoice"], ["extracted:extract"]
}
export interface PolicyDecision { decision: 'allow' | 'deny'; reason?: string; rule?: string }

const LOG = process.env.POLICY_LOG ?? new URL('../.state/policy-decisions.jsonl', import.meta.url).pathname;

export const policy = {
  check(req: PolicyRequest): PolicyDecision {
    let d: PolicyDecision = { decision: 'allow' };
    const amount = (req.args as { amount?: unknown } | null)?.amount;
    if (req.tool === 'erp.create_payment@1' && typeof amount === 'number' && amount > 10000) {
      d = { decision: 'deny', reason: `payment amount ${amount} exceeds the 10000 limit`, rule: 'stub.max_payment' };
    }
    try {
      mkdirSync(dirname(LOG), { recursive: true });
      appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), ...req, args: undefined, args_keys: req.args && typeof req.args === 'object' ? Object.keys(req.args) : [], ...d }) + '\n');
    } catch { /* logging must not break the run */ }
    return d;
  },
};
