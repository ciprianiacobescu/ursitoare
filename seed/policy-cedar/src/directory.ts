// In-memory "directory": users, flows (+version metadata), nodes. In the real engine this is the
// control-plane store; the PEP slices it per request.
import { readFileSync } from "node:fs";
import YAML from "yaml";
import type { CedarValueJson } from "@cedar-policy/cedar-wasm/nodejs";
import { RF1_PATH, loadCatalogue, type Catalogue } from "./catalogue.ts";

export interface UserRec { id: string; roles: string[]; team: string }
export interface FlowRec { id: string; owner_team: string; version: string; reviewed: boolean }
export interface NodeRec { flow: string; id: string; kind: string }

export interface EntityJson {
  uid: { type: string; id: string };
  attrs: Record<string, CedarValueJson>;
  parents: { type: string; id: string }[];
}

export const ent = (type: string, id: string): CedarValueJson => ({ __entity: { type, id } });

export class Directory {
  users = new Map<string, UserRec>();
  flows = new Map<string, FlowRec>();
  nodes = new Map<string, NodeRec>(); // key "flow/node"
  tools = new Map<string, { id: string; effect: string }>();
  cat: Catalogue;

  constructor(cat = loadCatalogue()) {
    this.cat = cat;
    for (const [id, b] of Object.entries(cat.blocks)) this.tools.set(id, { id, effect: b.effect });
    // delegate targets: effect not in the catalogue -> assumed `send` (data leaves the system)
    for (const [t, wfs] of Object.entries(cat.delegate_targets)) for (const w of wfs) this.tools.set(`${t}:${w}`, { id: `${t}:${w}`, effect: "send" });
  }

  addUser(u: UserRec) { this.users.set(u.id, u); return this; }
  addFlow(f: FlowRec, nodes: { id: string; kind: string }[]) {
    this.flows.set(f.id, f);
    for (const n of nodes) this.nodes.set(`${f.id}/${n.id}`, { flow: f.id, id: n.id, kind: n.kind });
    return this;
  }

  user(id: string): UserRec { const u = this.users.get(id); if (!u) throw new Error(`unknown_user:${id}`); return u; }
  flow(id: string): FlowRec { const f = this.flows.get(id); if (!f) throw new Error(`unknown_flow:${id}`); return f; }
  node(flow: string, id: string): NodeRec { const n = this.nodes.get(`${flow}/${id}`); if (!n) throw new Error(`unknown_node:${flow}/${id}`); return n; }
  tool(id: string) { const t = this.tools.get(id); if (!t) throw new Error(`unknown_tool:${id}`); return t; }

  // ------- entity JSON builders (explicit __entity escapes: work with or without schema-based parsing)
  userEntity(u: UserRec): EntityJson {
    return {
      uid: { type: "User", id: u.id },
      attrs: { roles: u.roles.map((r) => ent("Role", r)), team: u.team },
      parents: u.roles.map((r) => ({ type: "Role", id: r })),
    };
  }
  roleEntity(id: string): EntityJson { return { uid: { type: "Role", id }, attrs: {}, parents: [] }; }
  flowEntity(f: FlowRec): EntityJson {
    return { uid: { type: "Flow", id: f.id }, attrs: { owner_team: f.owner_team, version: f.version, reviewed: f.reviewed }, parents: [] };
  }
  nodeEntity(n: NodeRec): EntityJson {
    return { uid: { type: "Node", id: `${n.flow}/${n.id}` }, attrs: { flow: ent("Flow", n.flow), kind: n.kind }, parents: [] };
  }
  toolEntity(t: { id: string; effect: string }): EntityJson {
    return { uid: { type: "Tool", id: t.id }, attrs: { effect: t.effect }, parents: [] };
  }

  /** Every entity the directory knows (the "naive full store" passed on every call in the benchmark). */
  allEntities(): EntityJson[] {
    return [
      ...this.cat.roles.map((r) => this.roleEntity(r)),
      ...[...this.users.values()].map((u) => this.userEntity(u)),
      ...[...this.flows.values()].map((f) => this.flowEntity(f)),
      ...[...this.nodes.values()].map((n) => this.nodeEntity(n)),
      ...[...this.tools.values()].map((t) => this.toolEntity(t)),
    ];
  }
}

/** The fixture directory used by tests and the benchmark. */
export function fixtureDirectory(opts: { rf1Reviewed?: boolean } = {}): Directory {
  const d = new Directory();
  d.addUser({ id: "alice", roles: ["finance-clerk"], team: "finance" })
    .addUser({ id: "bob", roles: ["finance-approver"], team: "finance" })
    .addUser({ id: "carol", roles: ["finance-approver"], team: "finance" })
    .addUser({ id: "henry", roles: ["finance-clerk", "finance-approver"], team: "finance" }) // dual-role: clerk who also approves
    .addUser({ id: "dave", roles: ["ops-admin"], team: "platform" })
    .addUser({ id: "erin", roles: ["support-agent"], team: "support" })
    .addUser({ id: "frank", roles: ["support-lead"], team: "support" })
    .addUser({ id: "gina", roles: ["sales-rep"], team: "sales" })
    .addUser({ id: "ivy", roles: [], team: "finance" }) // no role at all
    .addUser({ id: "kim", roles: ["finance-approver"], team: "support" }); // approver role, wrong team

  const rf1 = YAML.parse(readFileSync(RF1_PATH, "utf8")) as { nodes: Record<string, { kind: string }> };
  const rf1Nodes = Object.entries(rf1.nodes).map(([id, n]) => ({ id, kind: n.kind }));
  // one extra agent node in invoice-intake to exercise kind-based rules
  rf1Nodes.push({ id: "triage_agent", kind: "agent" });
  d.addFlow({ id: "invoice-intake", owner_team: "finance", version: "1.0.0", reviewed: opts.rf1Reviewed ?? false }, rf1Nodes);
  d.addFlow({ id: "support-triage", owner_team: "support", version: "2.1.0", reviewed: true }, [
    { id: "lookup_customer", kind: "block" }, { id: "search_kb", kind: "block" }, { id: "draft_reply", kind: "llm.generate" },
    { id: "resolve_agent", kind: "agent" }, { id: "send_reply", kind: "block" }, { id: "open_ticket", kind: "block" },
    { id: "close_ticket", kind: "block" }, { id: "refund", kind: "block" }, { id: "refund_ok", kind: "human.approval" },
  ]);
  d.addFlow({ id: "sales-followup", owner_team: "sales", version: "0.3.0", reviewed: false }, [
    { id: "find_customer", kind: "block" }, { id: "compose", kind: "llm.generate" }, { id: "notify_channel", kind: "block" },
    { id: "log_row", kind: "block" }, { id: "book_meeting", kind: "block" }, { id: "post_hook", kind: "block" },
  ]);
  d.addFlow({ id: "notify-customer", owner_team: "support", version: "1.0.0", reviewed: true }, [
    { id: "send", kind: "block" }, { id: "done", kind: "end" },
  ]);
  return d;
}
