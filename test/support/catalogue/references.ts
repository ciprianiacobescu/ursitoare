// Flow references and reachability (design Decisions 8 and 9).

import type { Catalogue } from "../../../src/authoring/index.ts";
import { parseVersionedRef, successorFields } from "../../../src/authoring/index.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectHook(hook: unknown, blockRefs: Set<string>): void {
  if (!isRecord(hook) || hook.kind !== "block" || typeof hook.uses !== "string") {
    return;
  }
  blockRefs.add(hook.uses);
}

function collectHookSlot(value: unknown, blockRefs: Set<string>): void {
  if (Array.isArray(value)) {
    for (const hook of value) {
      collectHook(hook, blockRefs);
    }
    return;
  }
  collectHook(value, blockRefs);
}

interface DelegateRef {
  target: string;
  workflow: string;
}

export function unresolvedReferences(flow: unknown, catalogue: Catalogue): string[] {
  if (!isRecord(flow)) {
    return [];
  }

  const blockRefs = new Set<string>();
  const roles = new Set<string>();
  const modelProfiles = new Set<string>();
  const delegates = new Map<string, DelegateRef>();
  const flowRefs = new Set<string>();

  const nodes = flow.nodes;
  if (isRecord(nodes)) {
    for (const node of Object.values(nodes)) {
      if (!isRecord(node)) {
        continue;
      }
      if (
        (node.kind === "block" || node.kind === "foreach") &&
        typeof node.uses === "string"
      ) {
        blockRefs.add(node.uses);
      }
      if (node.kind === "agent" && Array.isArray(node.tools)) {
        for (const tool of node.tools) {
          if (typeof tool === "string") {
            blockRefs.add(tool);
          }
        }
      }
      if (typeof node.assignee_role === "string") {
        roles.add(node.assignee_role);
      }
      if (typeof node.model_profile === "string") {
        modelProfiles.add(node.model_profile);
      }
      if (node.kind === "delegate") {
        if (typeof node.target === "string" && typeof node.workflow === "string") {
          const target = node.target;
          const workflow = node.workflow;
          delegates.set(`${target}/${workflow}`, { target, workflow });
        }
      }
      if (node.kind === "subflow" && typeof node.flow === "string") {
        flowRefs.add(node.flow);
      }
      if (node.kind === "foreach" && typeof node.subflow === "string") {
        flowRefs.add(node.subflow);
      }
      collectHookSlot(node.pre, blockRefs);
      collectHookSlot(node.post, blockRefs);
    }
  }

  if (Array.isArray(flow.hooks)) {
    for (const rule of flow.hooks) {
      if (!isRecord(rule)) {
        continue;
      }
      collectHookSlot(rule.pre, blockRefs);
      collectHookSlot(rule.post, blockRefs);
    }
  }

  const out: string[] = [];
  for (const ref of blockRefs) {
    if (catalogue.block(ref) === undefined) {
      out.push(`block:${ref}`);
    }
  }
  for (const name of roles) {
    if (catalogue.role(name) === undefined) {
      out.push(`role:${name}`);
    }
  }
  for (const ref of modelProfiles) {
    if (catalogue.modelProfile(ref) === undefined) {
      out.push(`model_profile:${ref}`);
    }
  }
  for (const { target, workflow } of delegates.values()) {
    if (catalogue.delegateTarget(target, workflow) === undefined) {
      out.push(`delegate:${target}/${workflow}`);
    }
  }
  for (const ref of flowRefs) {
    const parsed = parseVersionedRef(ref);
    if (parsed === undefined || catalogue.flow(parsed.name, parsed.major) === undefined) {
      out.push(`flow:${ref}`);
    }
  }

  return out.sort();
}

export function canReach(flow: unknown, target: string, avoid?: string): boolean {
  if (!isRecord(flow) || !isRecord(flow.nodes)) {
    return false;
  }
  const nodes = flow.nodes;
  const start = flow.start;
  if (typeof start !== "string" || start === avoid || !Object.hasOwn(nodes, start)) {
    return false;
  }

  const visited = new Set<string>();
  const stack: string[] = [start];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (visited.has(id)) {
      continue;
    }
    visited.add(id);
    if (id === target) {
      return true;
    }
    for (const field of successorFields(nodes[id])) {
      const next = field.id;
      if (typeof next !== "string" || next === avoid || !Object.hasOwn(nodes, next)) {
        continue;
      }
      if (!visited.has(next)) {
        stack.push(next);
      }
    }
  }
  return false;
}
