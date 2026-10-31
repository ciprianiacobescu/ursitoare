import { verifyChain, type KeyMaterial } from "../../audit/index.ts";
import { CliError } from "../errors.ts";
import { defineAdminCommand } from "./define.ts";
import type { AdminCall, AdminResult, AdminSpec } from "./define.ts";

const ENGINE_KEY_REQUIRED =
  "set URSITOARE_ENGINE_KEY_FILE, or pass --no-anchors to check hashes only";

async function countAnchors(call: AdminCall): Promise<number> {
  const result = await call.tx.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM ursitoare.audit_anchor WHERE tenant_id = $1 AND seq >= $2",
    [call.tenant.tenantId, "1"],
  );
  return result.rows[0]?.n ?? 0;
}

const spec: AdminSpec = {
  summary: "check the tenant's audit chain and count its anchors",
  options: {
    "no-anchors": { type: "boolean", summary: "check hashes only, without the engine key" },
  },
  async run(call: AdminCall): Promise<AdminResult> {
    const noAnchors = call.args["no-anchors"] === true;
    let engineKey: KeyMaterial | undefined;
    if (!noAnchors) {
      const secret = call.config.engineKey;
      if (secret === null) {
        throw new CliError("CLI_ENGINE_KEY_REQUIRED", ENGINE_KEY_REQUIRED);
      }
      engineKey = { reveal: () => secret.reveal() };
    }
    const report = engineKey === undefined ? await verifyChain(call.pool, call.tenant) : await verifyChain(call.pool, call.tenant, { engineKey });

    const firstBadSeq = report.firstBadSeq === undefined ? null : report.firstBadSeq.toString();
    const reason = report.reason ?? null;

    let anchorsVerified = 0;
    if (report.ok && engineKey !== undefined) {
      anchorsVerified = await countAnchors(call);
    }
    const anchorsChecked = anchorsVerified > 0;
    const data = { ok: report.ok, checked: report.checked, firstBadSeq, reason, anchorsChecked, anchorsVerified };

    if (!report.ok) {
      return {
        lines: [`chain broken at seq ${firstBadSeq}: ${reason}`, `checked: ${report.checked}`],
        data,
        audit: data,
        exitCode: 3,
      };
    }

    const anchors: string[] = [];
    anchors.push(
      noAnchors
        ? "anchors: not checked"
        : anchorsVerified > 0
          ? `anchors: ${anchorsVerified} checked`
          : "anchors: none recorded yet",
    );
    return {
      lines: [`chain ok: ${report.checked} events checked`, ...anchors],
      data,
      audit: data,
    };
  },
};

export const verifyAuditCommand = defineAdminCommand("admin verify-audit", spec);
