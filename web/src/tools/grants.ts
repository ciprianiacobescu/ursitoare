// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";
import { ApiRequestError } from "../api/client.ts";

export interface GrantView {
  id: string;
  subject: string;
  tool: string;
  scope: string;
  status: "active" | "needs_reconfirm" | "revoked";
}

const ID = /^grant_[A-Za-z0-9-]{1,64}$/;
const TOOL = /^[a-z][a-z0-9._-]*@(0|[1-9][0-9]{0,8})$/;
const ROLE = /^[a-z][a-z0-9_]{0,31}$/;
const USER = /^[A-Za-z0-9_-]{1,64}$/;
const FLOW = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const NODE = /^[a-z][a-z0-9_]*$/;
const STATUSES = ["active", "needs_reconfirm", "revoked"] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function matches(v: unknown, re: RegExp, max: number): v is string {
  return typeof v === "string" && v.length <= max && re.test(v);
}

export function parseGrant(raw: unknown): GrantView | null {
  if (!isRecord(raw)) return null;
  const status = STATUSES.find((s) => s === raw["status"]);
  const g = raw["grant"];
  if (status === undefined || !isRecord(g)) return null;
  const { id, tool, subject, scope } = g;
  if (!matches(id, ID, 69) || !matches(tool, TOOL, 128)) return null;
  if (!isRecord(subject) || !isRecord(scope)) return null;
  let who: string;
  if (subject["kind"] === "role" && matches(subject["role"], ROLE, 32)) {
    who = `role ${subject["role"]}`;
  } else if (subject["kind"] === "user" && matches(subject["userId"], USER, 64)) {
    who = `user ${subject["userId"]}`;
  } else {
    return null;
  }
  let where: string;
  if (scope["kind"] === "any_step") {
    where = "any step";
  } else if (
    scope["kind"] === "node" &&
    matches(scope["flowId"], FLOW, 64) &&
    matches(scope["nodeId"], NODE, 1024)
  ) {
    where = `${scope["flowId"]} / ${scope["nodeId"]}`;
  } else {
    return null;
  }
  return { id, subject: who, tool, scope: where, status };
}

export function grantRowText(g: GrantView): string {
  return `${g.subject} · ${g.tool} · ${g.scope} · ${g.status}`;
}

export interface GrantDraft {
  subjectKind: "role" | "user";
  subject: string;
  tool: string;
  scopeKind: "any_step" | "node";
  flowId: string;
  nodeId: string;
}

export function grantBody(
  d: GrantDraft,
): { ok: true; body: unknown } | { ok: false; field: string; message: string } {
  const refuse = (field: string, message: string) => ({ ok: false as const, field, message });
  const subject = d.subject.trim();
  const flowId = d.flowId.trim();
  const nodeId = d.nodeId.trim();
  const role = d.subjectKind === "role";
  if (subject === "") return refuse("subject", role ? "Enter a role." : "Enter a user id.");
  if (role ? !matches(subject, ROLE, 32) : !matches(subject, USER, 64)) {
    return refuse(
      "subject",
      role
        ? "A role is lowercase letters, digits and underscores, starting with a letter."
        : "A user id has 1 to 64 letters, digits, underscores and hyphens.",
    );
  }
  if (d.tool === "") return refuse("tool", "Choose a tool.");
  if (!matches(d.tool, TOOL, 128)) return refuse("tool", "Choose a tool from the list.");
  const node = d.scopeKind === "node";
  if (node) {
    if (flowId === "") return refuse("flowId", "Enter the flow.");
    if (!matches(flowId, FLOW, 64)) {
      return refuse(
        "flowId",
        "A flow name is lowercase words joined by hyphens, up to 64 characters.",
      );
    }
    if (nodeId === "") return refuse("nodeId", "Enter the step.");
    if (!matches(nodeId, NODE, 1024)) {
      return refuse(
        "nodeId",
        "A step id is lowercase letters, digits and underscores, starting with a letter.",
      );
    }
  }
  return {
    ok: true,
    body: {
      subject: role ? { kind: "role", role: subject } : { kind: "user", userId: subject },
      tool: d.tool,
      scope: node ? { kind: "node", flowId, nodeId } : { kind: "any_step" },
      args: [],
    },
  };
}

export const GRANT_DONE: { created: string; revoked: string; confirmed: string } = {
  created: "Grant created.",
  revoked: "Grant revoked.",
  confirmed: "Grant confirmed for the newest version.",
};

export function grantActions(g: GrantView): { revoke: boolean; confirm: boolean } {
  return { revoke: g.status !== "revoked", confirm: g.status === "needs_reconfirm" };
}

function invalidResponse(what: string): ApiRequestError {
  return new ApiRequestError(200, "INVALID_RESPONSE", `Invalid ${what}`);
}

function checkGrantId(id: string): void {
  if (!ID.test(id)) throw new RangeError("Invalid grant id");
}

function readGrantId(answer: unknown): string {
  const id = isRecord(answer) ? answer["id"] : undefined;
  if (!matches(id, ID, 69)) throw invalidResponse("grant");
  return id;
}

const REF_PAGES = 10;

export async function loadToolRefs(client: Api<"get">, signal?: AbortSignal): Promise<string[]> {
  const refs: string[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < REF_PAGES; page += 1) {
    const query: Record<string, string | number> = { limit: 100 };
    if (cursor !== undefined) query["cursor"] = cursor;
    const answer =
      signal === undefined
        ? await client.get<unknown>("/blocks", { query })
        : await client.get<unknown>("/blocks", { query, signal });
    const items = isRecord(answer) ? answer["items"] : undefined;
    const next = isRecord(answer) ? answer["next_cursor"] : undefined;
    if (!Array.isArray(items) || (next !== null && typeof next !== "string")) {
      throw invalidResponse("block list");
    }
    for (const item of items as unknown[]) {
      if (!isRecord(item) || typeof item["ref"] !== "string" || typeof item["bound"] !== "boolean") {
        throw invalidResponse("block list");
      }
      if (item["bound"]) refs.push(item["ref"]);
    }
    if (next === null) break;
    cursor = next;
  }
  return refs;
}

export async function postGrant(
  client: Api<"post">,
  draft: GrantDraft,
  key: string,
): Promise<string> {
  const checked = grantBody(draft);
  if (!checked.ok) throw new RangeError(checked.message);
  if (key.trim() === "") throw new RangeError("Idempotency key is blank");
  const answer = await client.post<unknown>("/grants", checked.body, {
    headers: { "Idempotency-Key": key },
  });
  return readGrantId(answer);
}

export async function revokeGrantById(client: Api<"delete">, id: string): Promise<void> {
  checkGrantId(id);
  readGrantId(await client.delete<unknown>(`/grants/${id}`));
}

export async function confirmGrantById(client: Api<"post">, id: string): Promise<void> {
  checkGrantId(id);
  readGrantId(await client.post<unknown>(`/grants/${id}/confirm`, {}));
}
