// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { AuditEventInput } from "../audit/index.ts";
import type { BlockDef } from "../authoring/index.ts";
import type { Clock } from "../core/index.ts";
import { PdpError, createPolicyEngine, policyIdsOf } from "../pdp/index.ts";
import type { PolicySource } from "../pdp/index.ts";
import { listBlockVersions } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { toolArgTypes } from "./args.ts";
import { compileGrant } from "./compile.ts";
import { runtimeInternals } from "./policy-runtime.ts";
import type { PolicyRuntime } from "./policy-runtime.ts";
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

  constructor(message: string, _problems: PolicyValidation["problems"]) {
    super(message);
    throw new Error("not implemented");
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

export async function validatePolicySet(
  runtime: PolicyRuntime,
  pool: TenantPool,
  ctx: TenantContext,
  source: string,
): Promise<PolicyValidation> {
  const internals = runtimeInternals.get(runtime);
  if (internals === undefined) {
    throw new TypeError("not a policy runtime made by createPolicyRuntime");
  }

  const grants = await readAllGrants(pool, ctx);
  const active = grants.filter((grant) => grant.state === "active").sort((a, b) => codeUnitOrder(a.id, b.id));

  const limited: string[] = [];
  if ([...source].length > MAX_SOURCE_CHARS) limited.push(SOURCE_ID);
  if (active.length > MAX_ACTIVE_GRANTS) limited.push("grants");
  if (limited.length > 0) return invalid([{ stage: "limit", ids: limited, message: "" }]);

  if (!source.isWellFormed() || source.includes("\u0000")) {
    return invalid([{ stage: "parse", ids: [SOURCE_ID], message: LONE_SURROGATE_TEXT }]);
  }

  const argTypes = toolArgTypes(await readAllBlocks(pool, ctx));

  const sources: PolicySource[] = [];
  const refused: string[] = [];
  for (const grant of active) {
    try {
      const compiled = compileGrant(ctx.tenantId, grant, argTypes);
      if (compiled !== null) sources.push(compiled);
    } catch {
      refused.push(grant.id);
    }
  }
  if (refused.length > 0) return invalid([{ stage: "compile", ids: refused, message: "" }]);

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

  if (problems.length > 0) return invalid(problems);
  return { ok: true, policySetVersion: version, problems: [] };
}

export async function deployPolicySet(
  _runtime: PolicyRuntime,
  _pool: TenantPool,
  _ctx: TenantContext,
  _source: string,
  _actor: AuditEventInput["actor"],
  _opts?: { clock?: Clock },
): Promise<PolicySetRecord> {
  throw new Error("not implemented");
}

export async function currentPolicySet(
  _pool: TenantPool,
  _ctx: TenantContext,
): Promise<PolicySetRecord | null> {
  throw new Error("not implemented");
}

export async function pendingGrantCount(_pool: TenantPool, _ctx: TenantContext): Promise<number> {
  throw new Error("not implemented");
}
