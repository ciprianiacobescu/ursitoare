// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { appendAudit } from "../audit/index.ts";
import type { AuditEventInput } from "../audit/index.ts";
import type { BlockDef } from "../authoring/index.ts";
import type { Clock } from "../core/index.ts";
import { PdpError, createPolicyEngine, policyIdsOf } from "../pdp/index.ts";
import type { PolicySource, ToolArgType } from "../pdp/index.ts";
import { listBlockVersions } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { toolArgTypes } from "./args.ts";
import { compileGrant } from "./compile.ts";
import { readCurrentSet, runtimeInternals } from "./policy-runtime.ts";
import type { PolicyRuntime, RuntimeInternals, StoredPolicySet } from "./policy-runtime.ts";
import { listGrants } from "./store.ts";
import type { GrantRecord } from "./types.ts";

export interface PolicySetRecord {
  tenantId: string;
  version: string;
  source: string;
  grantIds: string[];
  deployedBy: string;
  deployedAt: string;
}

export interface PolicyValidation {
  ok: boolean;
  policySetVersion: string | null;
  problems: { stage: string; ids: string[]; message: string }[];
}

export class PolicyDeployError extends Error {
  readonly code: "POLICY_INVALID";
  readonly problems: PolicyValidation["problems"];

  constructor(message: string, problems: PolicyValidation["problems"]) {
    super(message);
    this.name = "PolicyDeployError";
    this.code = "POLICY_INVALID";
    this.problems = problems;
  }
}

const MAX_SOURCE_CHARS = 65536;
const MAX_ACTIVE_GRANTS = 500;
const MAX_MESSAGE_CHARS = 300;
const PAGE = 201;
const SOURCE_ID = "tenant/source";
const LONE_SURROGATE_TEXT = "the source holds U+0000 or a lone surrogate";

type Problem = PolicyValidation["problems"][number];

function reduceDiagnostic(diagnostic: string | undefined): string {
  let out = "";
  for (const character of diagnostic ?? "") {
    const code = character.codePointAt(0) ?? 0;
    out += code >= 0x20 && code <= 0x7e ? character : "?";
  }
  return out.slice(0, MAX_MESSAGE_CHARS);
}

function codeUnitOrder(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

async function readAllGrants(pool: TenantPool, ctx: TenantContext): Promise<GrantRecord[]> {
  const grants: GrantRecord[] = [];
  let after: string | null = null;
  for (;;) {
    const page = await listGrants(pool, ctx, { limit: PAGE, after });
    for (const entry of page) grants.push(entry.grant);
    const last = page[page.length - 1];
    if (page.length < PAGE || last === undefined) return grants;
    after = last.grant.id;
  }
}

async function readAllBlocks(pool: TenantPool, ctx: TenantContext): Promise<BlockDef[]> {
  return withTenantTx(pool, ctx, async (tx) => {
    const blocks: BlockDef[] = [];
    let after: string | undefined;
    for (;;) {
      const page = await listBlockVersions(tx, ctx, { limit: PAGE, after });
      for (const version of page) blocks.push(version.def);
      const last = page[page.length - 1];
      if (page.length < PAGE || last === undefined) return blocks;
      after = last.ref;
    }
  });
}

function invalid(problems: Problem[]): PolicyValidation {
  return { ok: false, policySetVersion: null, problems };
}

interface Candidate {
  validation: PolicyValidation;
  sources: PolicySource[];
  grantIds: string[];
  argTypes: Readonly<Record<string, ToolArgType>>;
}

function internalsOf(runtime: PolicyRuntime): RuntimeInternals {
  const internals = runtimeInternals.get(runtime);
  if (internals === undefined) {
    throw new TypeError("not a policy runtime made by createPolicyRuntime");
  }
  return internals;
}

export async function validatePolicySet(
  runtime: PolicyRuntime,
  pool: TenantPool,
  ctx: TenantContext,
  source: string,
): Promise<PolicyValidation> {
  return (await buildCandidate(internalsOf(runtime), pool, ctx, source)).validation;
}

async function buildCandidate(
  internals: RuntimeInternals,
  pool: TenantPool,
  ctx: TenantContext,
  source: string,
): Promise<Candidate> {
  const none = (problems: Problem[]): Candidate => ({
    validation: invalid(problems),
    sources: [],
    grantIds: [],
    argTypes: {},
  });

  const grants = await readAllGrants(pool, ctx);
  const active = grants.filter((grant) => grant.state === "active").sort((a, b) => codeUnitOrder(a.id, b.id));

  const limited: string[] = [];
  if ([...source].length > MAX_SOURCE_CHARS) limited.push(SOURCE_ID);
  if (active.length > MAX_ACTIVE_GRANTS) limited.push("grants");
  if (limited.length > 0) return none([{ stage: "limit", ids: limited, message: "" }]);

  if (!source.isWellFormed() || source.includes("\u0000")) {
    return none([{ stage: "parse", ids: [SOURCE_ID], message: LONE_SURROGATE_TEXT }]);
  }

  const argTypes = toolArgTypes(await readAllBlocks(pool, ctx));

  const sources: PolicySource[] = [];
  const grantIds: string[] = [];
  const refused: string[] = [];
  for (const grant of active) {
    try {
      const compiled = compileGrant(ctx.tenantId, grant, argTypes);
      if (compiled !== null) {
        sources.push(compiled);
        grantIds.push(grant.id);
      }
    } catch {
      refused.push(grant.id);
    }
  }
  if (refused.length > 0) return none([{ stage: "compile", ids: refused, message: "" }]);

  if (source !== "") sources.push({ id: SOURCE_ID, layer: "tenant", text: source });

  const problems: Problem[] = [];
  const reserved = (policyIdsOf(source) ?? [])
    .filter((id) => id.startsWith("grant_"))
    .filter((id, index, all) => all.indexOf(id) === index)
    .sort(codeUnitOrder);
  if (reserved.length > 0) problems.push({ stage: "reserved", ids: reserved, message: "" });

  let version: string | null = null;
  try {
    const engine = await createPolicyEngine({
      srcDir: internals.srcDir,
      tenantPolicies: sources,
      toolArgs: argTypes,
      clock: internals.clock,
      ids: internals.ids,
      logger: internals.logger,
      instanceId: `${internals.instance}/validate/${ctx.tenantId}`,
    });
    version = engine.policySetVersion;
  } catch (error) {
    if (!(error instanceof PdpError)) throw error;
    const stage = String(error.details["stage"] ?? "load");
    const rawIds = error.details["ids"];
    let ids = Array.isArray(rawIds) ? [...(rawIds as string[])] : [];
    if (stage === "policy") ids = ids.filter((id) => !id.startsWith("grant_"));
    const message = stage === "parse" || stage === "validate" ? reduceDiagnostic(error.diagnostic) : "";
    if (!(stage === "policy" && ids.length === 0 && reserved.length > 0)) {
      problems.push({ stage, ids, message });
    }
  }

  if (problems.length > 0) return { validation: invalid(problems), sources, grantIds, argTypes };
  return { validation: { ok: true, policySetVersion: version, problems: [] }, sources, grantIds, argTypes };
}

function toRecord(stored: StoredPolicySet): PolicySetRecord {
  return {
    tenantId: stored.tenantId,
    version: stored.version,
    source: stored.source,
    grantIds: stored.grantIds,
    deployedBy: stored.deployedBy,
    deployedAt: stored.deployedAt,
  };
}

export async function deployPolicySet(
  runtime: PolicyRuntime,
  pool: TenantPool,
  ctx: TenantContext,
  source: string,
  actor: AuditEventInput["actor"],
  opts?: { clock?: Clock },
): Promise<PolicySetRecord> {
  const internals = internalsOf(runtime);
  const candidate = await buildCandidate(internals, pool, ctx, source);
  const version = candidate.validation.policySetVersion;
  if (!candidate.validation.ok || version === null) {
    throw new PolicyDeployError("the policy set is invalid", candidate.validation.problems);
  }
  const clock = opts?.clock ?? internals.clock;
  const record = await withTenantTx(pool, ctx, async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      `ursitoare:policy_set:${ctx.tenantId}`,
    ]);
    const current = await readCurrentSet(tx, ctx.tenantId);
    if (current !== null && current.version === version) return toRecord(current);
    await tx.query("UPDATE ursitoare.policy_set SET current = false WHERE tenant_id = $1 AND current", [
      ctx.tenantId,
    ]);
    await tx.query(
      `INSERT INTO ursitoare.policy_set
         (tenant_id, deploy_seq, version, source, grant_ids, tenant_sources, tool_args, current,
          deployed_by, deployed_at)
       SELECT $1, COALESCE(MAX(deploy_seq), 0) + 1, $2, $3, $4::text[], $5::jsonb, $6::jsonb, true, $7,
              $8::timestamptz
         FROM ursitoare.policy_set WHERE tenant_id = $1`,
      [
        ctx.tenantId,
        version,
        source,
        candidate.grantIds,
        JSON.stringify(candidate.sources.map((s) => ({ id: s.id, text: s.text }))),
        JSON.stringify(candidate.argTypes),
        actor.id,
        clock.now().toISOString(),
      ],
    );
    await appendAudit(
      tx,
      ctx,
      {
        eventType: "policy.deployed",
        actor,
        target: { kind: "policy_set", id: version },
        payload: { version, grantIds: candidate.grantIds },
      },
      { clock },
    );
    const stored = await readCurrentSet(tx, ctx.tenantId);
    if (stored === null) throw new Error("policy set row missing after insert");
    return toRecord(stored);
  });
  await runtime.reload(ctx.tenantId);
  return record;
}

export async function currentPolicySet(pool: TenantPool, ctx: TenantContext): Promise<PolicySetRecord | null> {
  const stored = await withTenantTx(pool, ctx, (tx) => readCurrentSet(tx, ctx.tenantId));
  return stored === null ? null : toRecord(stored);
}

export async function pendingGrantCount(pool: TenantPool, ctx: TenantContext): Promise<number> {
  const grants = await readAllGrants(pool, ctx);
  const current = await withTenantTx(pool, ctx, (tx) => readCurrentSet(tx, ctx.tenantId));
  if (current === null) return grants.filter((grant) => grant.state === "active").length;
  const inSet = new Set(current.grantIds);
  const storedText = new Map(current.tenantSources.map((entry) => [entry.id, entry.text]));
  let pending = 0;
  for (const grant of grants) {
    if (grant.state === "revoked") {
      if (inSet.has(grant.id)) pending += 1;
    } else if (!inSet.has(grant.id)) {
      pending += 1;
    } else {
      try {
        const compiled = compileGrant(ctx.tenantId, grant, current.toolArgs);
        if (compiled === null || compiled.text !== storedText.get(`grants/${grant.id}`)) pending += 1;
      } catch {
        pending += 1;
      }
    }
  }
  return pending;
}
