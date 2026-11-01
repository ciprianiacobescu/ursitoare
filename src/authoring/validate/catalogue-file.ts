// The catalogue file: a JSON catalogue document answered as a `Catalogue`
// (design Decision 10).

import type {
  BlockDef,
  Catalogue,
  DelegateTargetDef,
  FlowSignature,
  JsonSchema,
  ModelProfileDef,
  RoleDef,
} from "../format/index.ts";

export class CatalogueFileError extends Error {
  readonly code: "CATALOGUE_FILE_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "CatalogueFileError";
    this.code = "CATALOGUE_FILE_INVALID";
  }
}

const EFFECTS: readonly string[] = ["read", "write", "send", "pay"];

type JsonObject = { [key: string]: unknown };

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(pointer: string, reason: string): never {
  throw new CatalogueFileError(`${pointer}: ${reason}`);
}

function checkStringArray(value: unknown, pointer: string): void {
  if (!Array.isArray(value)) {
    fail(pointer, "must be an array of strings");
  }
  for (let index = 0; index < value.length; index += 1) {
    if (typeof value[index] !== "string") {
      fail(`${pointer}/${index}`, "must be a string");
    }
  }
}

function checkBlocks(value: unknown): void {
  if (!isPlainObject(value)) {
    fail("/blocks", "must be an object of blocks");
  }
  for (const [ref, block] of Object.entries(value)) {
    if (!isPlainObject(block)) {
      fail(`/blocks/${ref}`, "must be a block definition object");
    }
    if (typeof block.effect !== "string" || !EFFECTS.includes(block.effect)) {
      fail(`/blocks/${ref}/effect`, "must be one of read, write, send, pay");
    }
    if (!isPlainObject(block.input)) {
      fail(`/blocks/${ref}/input`, "must be an object schema");
    }
    if (!isPlainObject(block.output)) {
      fail(`/blocks/${ref}/output`, "must be an object schema");
    }
  }
}

function checkDelegateTargets(value: unknown): void {
  if (!isPlainObject(value)) {
    fail("/delegate_targets", "must be an object of workflow lists");
  }
  for (const [target, workflows] of Object.entries(value)) {
    checkStringArray(workflows, `/delegate_targets/${target}`);
  }
}

function checkFlowsRegistry(value: unknown): void {
  if (!isPlainObject(value)) {
    fail("/flows_registry", "must be an object of flow signatures");
  }
  for (const [ref, signature] of Object.entries(value)) {
    if (!isPlainObject(signature)) {
      fail(`/flows_registry/${ref}`, "must be a flow signature object");
    }
    if (!isPlainObject(signature.inputs)) {
      fail(`/flows_registry/${ref}/inputs`, "must be an object schema");
    }
    if (!isPlainObject(signature.outputs)) {
      fail(`/flows_registry/${ref}/outputs`, "must be an object schema");
    }
  }
}

function own(value: JsonObject, key: string): unknown {
  return Object.hasOwn(value, key) ? value[key] : undefined;
}

function asObject(value: unknown): JsonObject {
  return isPlainObject(value) ? value : {};
}

export function catalogueFromJson(text: string): Catalogue {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new CatalogueFileError("invalid JSON");
  }
  if (!isPlainObject(doc)) {
    fail("/", "must be an object");
  }

  const blocksValue = own(doc, "blocks");
  const modelProfilesValue = own(doc, "model_profiles");
  const rolesValue = own(doc, "roles");
  const delegateTargetsValue = own(doc, "delegate_targets");
  const flowsRegistryValue = own(doc, "flows_registry");

  if (blocksValue !== undefined) {
    checkBlocks(blocksValue);
  }
  if (modelProfilesValue !== undefined) {
    checkStringArray(modelProfilesValue, "/model_profiles");
  }
  if (rolesValue !== undefined) {
    checkStringArray(rolesValue, "/roles");
  }
  if (delegateTargetsValue !== undefined) {
    checkDelegateTargets(delegateTargetsValue);
  }
  if (flowsRegistryValue !== undefined) {
    checkFlowsRegistry(flowsRegistryValue);
  }

  const blocks = asObject(blocksValue);
  const modelProfiles = Array.isArray(modelProfilesValue) ? (modelProfilesValue as string[]) : [];
  const roles = Array.isArray(rolesValue) ? (rolesValue as string[]) : [];
  const delegateTargets = asObject(delegateTargetsValue);
  const flowsRegistry = asObject(flowsRegistryValue);

  return {
    block(ref: string): BlockDef | undefined {
      if (typeof ref !== "string" || !Object.hasOwn(blocks, ref)) {
        return undefined;
      }
      const block = blocks[ref];
      if (!isPlainObject(block)) {
        return undefined;
      }
      return structuredClone(block) as unknown as BlockDef;
    },
    modelProfile(ref: string): ModelProfileDef | undefined {
      if (typeof ref !== "string" || !modelProfiles.includes(ref)) {
        return undefined;
      }
      return { ref };
    },
    role(name: string): RoleDef | undefined {
      if (typeof name !== "string" || !roles.includes(name)) {
        return undefined;
      }
      return { name };
    },
    delegateTarget(target: string, workflow: string): DelegateTargetDef | undefined {
      if (
        typeof target !== "string" ||
        typeof workflow !== "string" ||
        !Object.hasOwn(delegateTargets, target)
      ) {
        return undefined;
      }
      const workflows = delegateTargets[target];
      if (!Array.isArray(workflows) || !workflows.includes(workflow)) {
        return undefined;
      }
      return { effect: "send", untrusted_result: true };
    },
    flow(ref: string, major: number): FlowSignature | undefined {
      if (typeof ref !== "string" || !Number.isSafeInteger(major) || major < 0) {
        return undefined;
      }
      const key = `${ref}@${major}`;
      if (!Object.hasOwn(flowsRegistry, key)) {
        return undefined;
      }
      const signature = flowsRegistry[key];
      if (!isPlainObject(signature)) {
        return undefined;
      }
      return {
        input: structuredClone(signature.inputs) as JsonSchema,
        output: structuredClone(signature.outputs) as JsonSchema,
      };
    },
    delegateWorkflows(target: string): readonly string[] | undefined {
      if (typeof target !== "string" || !Object.hasOwn(delegateTargets, target)) {
        return undefined;
      }
      const workflows = delegateTargets[target];
      if (!Array.isArray(workflows)) {
        return undefined;
      }
      return [...(workflows as string[])];
    },
  };
}
