// Test support for the policy engine: schema-valid sample requests, per design
// decision 9 of this change. Test-support code under test/ is ordinary code.

import {
  ACTIONS,
  type ActionName,
  type Entity,
  type EntityUid,
  type PolicyRequest,
  type ResourceType,
  entityRef,
  userEntity,
} from "../../src/pdp/index.ts";

const ALICE = "alice";

function userUid(tenantId: string): EntityUid {
  return { type: "User", id: `${tenantId}/${ALICE}` };
}

function principalOf(tenantId: string) {
  return { tenantId, userId: ALICE, kind: "human", roles: [], teams: [] } as const;
}

function teamEntity(tenantId: string): Entity {
  return {
    uid: { type: "Team", id: `${tenantId}/team-1` },
    attrs: { tenant: tenantId },
    parents: [],
  };
}

function flowEntities(tenantId: string): Entity[] {
  return [
    {
      uid: { type: "Flow", id: `${tenantId}/flow-1` },
      attrs: {
        tenant: tenantId,
        owner_team: entityRef("Team", `${tenantId}/team-1`),
        reviewed: false,
      },
      parents: [],
    },
    teamEntity(tenantId),
  ];
}

function runEntity(tenantId: string, principalUid: EntityUid): Entity {
  return {
    uid: { type: "Run", id: `${tenantId}/run-1` },
    attrs: {
      tenant: tenantId,
      owner_team: entityRef("Team", `${tenantId}/team-1`),
      initiator: entityRef("User", principalUid.id),
    },
    parents: [],
  };
}

function blockEntity(tenantId: string, kind: string): Entity {
  return {
    uid: { type: "Block", id: `${tenantId}/block-1` },
    attrs: {
      tenant: tenantId,
      kind,
      flow: entityRef("Flow", `${tenantId}/flow-1`),
    },
    parents: [],
  };
}

function toolEntity(tenantId: string, effect: string): Entity {
  return {
    uid: { type: "Tool", id: `${tenantId}/tool-1` },
    attrs: { tenant: tenantId, effect },
    parents: [],
  };
}

function resourceEntities(
  type: ResourceType,
  tenantId: string,
  principalUid: EntityUid,
  blockKind: string,
): Entity[] {
  switch (type) {
    case "Tenant":
      return [{ uid: { type: "Tenant", id: tenantId }, attrs: { tenant: tenantId }, parents: [] }];
    case "Flow":
      return flowEntities(tenantId);
    case "Run":
      return [runEntity(tenantId, principalUid), teamEntity(tenantId)];
    case "Task":
      return [
        {
          uid: { type: "Task", id: `${tenantId}/task-1` },
          attrs: { tenant: tenantId, run: entityRef("Run", `${tenantId}/run-1`) },
          parents: [],
        },
        runEntity(tenantId, principalUid),
        teamEntity(tenantId),
      ];
    case "Block":
      return [
        blockEntity(tenantId, blockKind),
        ...flowEntities(tenantId),
      ];
  }
}

const emptyToolArgs = {};
const emptyApprovers = {};

function contextFor(
  action: ActionName,
  principalUid: EntityUid,
  taint: readonly string[],
  toolId: string,
): Record<string, unknown> {
  switch (action) {
    case "activate_flow":
      return {
        flow_capabilities: {
          reads_untrusted: false,
          reads_private: false,
          has_send_or_pay: false,
        },
        review_profile: "default",
      };
    case "approve_task":
      return {
        run_initiator: entityRef("User", principalUid.id),
        taint: [...taint],
      };
    case "invoke_llm":
      return {
        args: { ...emptyToolArgs },
        taint: [...taint],
        provider: "p1",
        region: "eu",
      };
    case "invoke_tool":
      return {
        tool: entityRef("Tool", toolId),
        args: { ...emptyToolArgs },
        taint: [...taint],
        run_initiator: entityRef("User", principalUid.id),
        sod_excluded: [],
        approvals: [],
        approvers_by_role: { ...emptyApprovers },
        node_fingerprint: "fp",
      };
    default:
      return {};
  }
}

export function sampleRequest(
  action: ActionName,
  opts?: { principalTenant?: string; resourceTenant?: string },
): PolicyRequest {
  const principalTenant = opts?.principalTenant ?? "tenant_a";
  const resourceTenant = opts?.resourceTenant ?? principalTenant;
  const principalUid = userUid(principalTenant);
  const [resourceType = "Tenant"] = ACTIONS[action].resources;
  const entities: Entity[] = [userEntity(principalOf(principalTenant))];
  entities.push(
    ...resourceEntities(resourceType, resourceTenant, principalUid, "code"),
  );
  if (action === "invoke_tool") {
    entities.push(toolEntity(resourceTenant, "read"));
  }
  return {
    principal: principalUid,
    action,
    resource: {
      type: resourceType,
      id: resourceType === "Tenant" ? resourceTenant : `${resourceTenant}/${resourceType.toLowerCase()}-1`,
    },
    context: contextFor(action, principalUid, [], `${resourceTenant}/tool-1`),
    entities,
  };
}

export function invokeToolRequest(opts: {
  effect: string;
  taint: readonly string[];
  blockKind: string;
}): PolicyRequest {
  const principalUid = userUid("tenant_a");
  return {
    principal: principalUid,
    action: "invoke_tool",
    resource: { type: "Block", id: "tenant_a/block-1" },
    context: {
      tool: entityRef("Tool", "tenant_a/tool-1"),
      args: { ...emptyToolArgs },
      taint: [...opts.taint],
      run_initiator: entityRef("User", principalUid.id),
      sod_excluded: [],
      approvals: [],
      approvers_by_role: { ...emptyApprovers },
      node_fingerprint: "fp",
    },
    entities: [
      userEntity(principalOf("tenant_a")),
      blockEntity("tenant_a", opts.blockKind),
      ...flowEntities("tenant_a"),
      toolEntity("tenant_a", opts.effect),
    ],
  };
}
