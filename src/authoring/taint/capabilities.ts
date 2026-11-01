import type { BlockDef, Catalogue, DelegateTargetDef, Flow } from "../format/index.ts";
import { NODE_KINDS, escapePointer } from "../format/index.ts";
import { describeTool } from "./tools.ts";

export interface FlowCapabilities {
  reads_untrusted: boolean;
  reads_private: boolean;
  has_send_or_pay: boolean;
}

export interface CapabilitySite {
  at: string;
  tool: string;
}

export interface CapabilityEvidence {
  reads_untrusted: CapabilitySite[];
  reads_private: CapabilitySite[];
  has_send_or_pay: CapabilitySite[];
  unknown: CapabilitySite[];
}

const KNOWN_KINDS: ReadonlySet<string> = new Set<string>(NODE_KINDS);
const SELECTOR_FIELDS = ["kind", "effect", "nodes", "tags"] as const;
const HOOK_SLOTS = ["pre", "post"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

class SiteCollector {
  readonly reads_untrusted = new Map<string, CapabilitySite>();
  readonly reads_private = new Map<string, CapabilitySite>();
  readonly has_send_or_pay = new Map<string, CapabilitySite>();
  readonly unknown = new Map<string, CapabilitySite>();

  private add(map: Map<string, CapabilitySite>, at: string, tool: string): void {
    map.set(`${at}\u0000${tool}`, { at, tool });
  }

  untrusted(at: string, tool: string): void {
    this.add(this.reads_untrusted, at, tool);
  }

  privateSite(at: string, tool: string): void {
    this.add(this.reads_private, at, tool);
  }

  send(at: string, tool: string): void {
    this.add(this.has_send_or_pay, at, tool);
  }

  unknownSite(at: string, tool: string): void {
    this.add(this.unknown, at, tool);
    this.add(this.reads_untrusted, at, tool);
    this.add(this.reads_private, at, tool);
    this.add(this.has_send_or_pay, at, tool);
  }

  block(def: BlockDef | undefined, at: string, tool: string): void {
    if (def === undefined) {
      this.unknownSite(at, tool);
      return;
    }
    const untrusted =
      def.untrusted_result === true ||
      (def.untrusted_fields !== undefined && def.untrusted_fields.length > 0);
    if (untrusted) this.untrusted(at, tool);
    if (def.effect === "read" && def.data_class !== "public") this.privateSite(at, tool);
    if (def.effect !== "read" && def.effect !== "write") this.send(at, tool);
  }

  delegate(def: DelegateTargetDef | undefined, at: string, tool: string): void {
    if (def === undefined) {
      this.unknownSite(at, tool);
      return;
    }
    if (def.untrusted_result !== false) this.untrusted(at, tool);
    if (def.effect !== "read" && def.effect !== "write") this.send(at, tool);
  }
}

function sortSites(map: Map<string, CapabilitySite>): CapabilitySite[] {
  return [...map.values()].sort((a, b) => {
    if (a.at !== b.at) return a.at < b.at ? -1 : 1;
    if (a.tool !== b.tool) return a.tool < b.tool ? -1 : 1;
    return 0;
  });
}

function addContext(sites: SiteCollector, id: string, node: Record<string, unknown>): void {
  const context = node.context;
  if (!Array.isArray(context)) return;
  context.forEach((entry, index) => {
    const tier = isRecord(entry) ? entry.tier : undefined;
    if (tier === "approved") return;
    sites.untrusted(`/nodes/${escapePointer(id)}/context/${index}`, asString(isRecord(entry) ? entry.source : undefined));
  });
}

function addNodeHooks(
  sites: SiteCollector,
  catalogue: Catalogue,
  id: string,
  node: Record<string, unknown>,
): void {
  for (const slot of HOOK_SLOTS) {
    const list = node[slot];
    if (list === undefined) continue;
    const base = `/nodes/${escapePointer(id)}/${slot}`;
    if (!Array.isArray(list)) {
      sites.unknownSite(base, "");
      continue;
    }
    list.forEach((hook, index) => {
      const at = `${base}/${index}`;
      if (!isRecord(hook) || (hook.kind !== "code" && hook.kind !== "block")) {
        sites.unknownSite(at, "");
        return;
      }
      if (hook.kind !== "block") return;
      sites.block(describeTool(catalogue, hook.uses), `${at}/uses`, asString(hook.uses));
    });
  }
}

function addRuleHooks(sites: SiteCollector, catalogue: Catalogue, rules: unknown): void {
  if (rules === undefined) return;
  if (!Array.isArray(rules)) {
    sites.unknownSite("/hooks", "");
    return;
  }
  rules.forEach((rule, index) => {
    if (!isRecord(rule)) {
      sites.unknownSite(`/hooks/${index}`, "");
      return;
    }
    const match = rule.match;
    if (!isRecord(match)) {
      sites.unknownSite(`/hooks/${index}/match`, "");
    } else {
      for (const field of SELECTOR_FIELDS) {
        const value = match[field];
        if (value !== undefined && !Array.isArray(value)) {
          sites.unknownSite(`/hooks/${index}/match/${field}`, "");
        }
      }
    }
    for (const slot of HOOK_SLOTS) {
      const hook = rule[slot];
      if (hook === undefined) continue;
      const at = `/hooks/${index}/${slot}`;
      if (!isRecord(hook) || (hook.kind !== "code" && hook.kind !== "block")) {
        sites.unknownSite(at, "");
        continue;
      }
      if (hook.kind !== "block") continue;
      sites.block(describeTool(catalogue, hook.uses), `${at}/uses`, asString(hook.uses));
    }
  });
}

function addNodeSites(
  sites: SiteCollector,
  catalogue: Catalogue,
  id: string,
  node: Record<string, unknown>,
): void {
  const kind = node.kind;
  if (typeof kind !== "string" || !KNOWN_KINDS.has(kind)) {
    sites.unknownSite(`/nodes/${escapePointer(id)}/kind`, asString(kind));
    return;
  }
  switch (kind) {
    case "block": {
      const uses = node.uses;
      sites.block(describeTool(catalogue, uses), `/nodes/${escapePointer(id)}/uses`, asString(uses));
      break;
    }
    case "foreach": {
      const uses = node.uses;
      const subflow = node.subflow;
      if (typeof uses === "string") {
        sites.block(describeTool(catalogue, uses), `/nodes/${escapePointer(id)}/uses`, uses);
      } else if (typeof subflow === "string") {
        sites.untrusted(`/nodes/${escapePointer(id)}/subflow`, subflow);
      } else {
        sites.unknownSite(`/nodes/${escapePointer(id)}/uses`, "");
      }
      break;
    }
    case "agent": {
      const tools = node.tools;
      if (!Array.isArray(tools)) {
        sites.unknownSite(`/nodes/${escapePointer(id)}/tools`, "");
      } else {
        tools.forEach((tool, index) => {
          const at = `/nodes/${escapePointer(id)}/tools/${index}`;
          if (typeof tool !== "string") {
            sites.unknownSite(at, "");
          } else {
            sites.block(describeTool(catalogue, tool), at, tool);
          }
        });
      }
      addContext(sites, id, node);
      break;
    }
    case "delegate": {
      const target = node.target;
      const workflow = node.workflow;
      const tool = `${asString(target)}:${asString(workflow)}`;
      const def =
        typeof target === "string" && typeof workflow === "string"
          ? catalogue.delegateTarget(target, workflow)
          : undefined;
      sites.delegate(def, `/nodes/${escapePointer(id)}/target`, tool);
      break;
    }
    case "subflow": {
      const flowRef = node.flow;
      sites.untrusted(`/nodes/${escapePointer(id)}/flow`, asString(flowRef));
      break;
    }
    case "llm.extract":
    case "llm.generate":
    case "llm.decide":
      addContext(sites, id, node);
      break;
    default:
      break;
  }
}

export function capabilityEvidence(flow: Flow, catalogue: Catalogue): CapabilityEvidence {
  const sites = new SiteCollector();
  const rawNodes: unknown = flow.nodes;

  if (isRecord(rawNodes)) {
    for (const [id, node] of Object.entries(rawNodes)) {
      if (!isRecord(node)) {
        sites.unknownSite(`/nodes/${escapePointer(id)}/kind`, "");
        continue;
      }
      addNodeSites(sites, catalogue, id, node);
      addNodeHooks(sites, catalogue, id, node);
    }
  } else {
    sites.unknownSite("/nodes", "");
  }

  addRuleHooks(sites, catalogue, flow.hooks);

  return {
    reads_untrusted: sortSites(sites.reads_untrusted),
    reads_private: sortSites(sites.reads_private),
    has_send_or_pay: sortSites(sites.has_send_or_pay),
    unknown: sortSites(sites.unknown),
  };
}

export function flowCapabilities(flow: Flow, catalogue: Catalogue): FlowCapabilities {
  const evidence = capabilityEvidence(flow, catalogue);
  return {
    reads_untrusted: evidence.reads_untrusted.length > 0,
    reads_private: evidence.reads_private.length > 0,
    has_send_or_pay: evidence.has_send_or_pay.length > 0,
  };
}
