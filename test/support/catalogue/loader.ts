// The catalogue loader: the Catalogue interface answered from a document
// (design Decisions 4 and 5).

import type {
  BlockDef,
  Catalogue,
  DelegateTargetDef,
  FlowSignature,
  ModelProfileDef,
  RoleDef,
} from "../../../src/authoring/index.ts";
import type { CatalogueDocument } from "./document.ts";
import { readCatalogueDocument } from "./document.ts";

export interface TestCatalogue extends Catalogue {
  blockRefs(): string[];
  modelProfileRefs(): string[];
  roleNames(): string[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string";
}

export function catalogueFromDocument(doc: CatalogueDocument): TestCatalogue {
  return {
    block(ref: string): BlockDef | undefined {
      if (!isNonEmptyString(ref) || !Object.hasOwn(doc.blocks, ref)) {
        return undefined;
      }
      return structuredClone(doc.blocks[ref] as BlockDef);
    },
    modelProfile(ref: string): ModelProfileDef | undefined {
      if (!isNonEmptyString(ref) || !doc.model_profiles.includes(ref)) {
        return undefined;
      }
      return { ref };
    },
    role(name: string): RoleDef | undefined {
      if (!isNonEmptyString(name) || !doc.roles.includes(name)) {
        return undefined;
      }
      return { name };
    },
    delegateTarget(target: string, workflow: string): DelegateTargetDef | undefined {
      if (
        !isNonEmptyString(target) ||
        !isNonEmptyString(workflow) ||
        !Object.hasOwn(doc.delegate_targets, target)
      ) {
        return undefined;
      }
      const workflows = doc.delegate_targets[target];
      if (workflows === undefined || !workflows.includes(workflow)) {
        return undefined;
      }
      return { effect: "send", untrusted_result: true };
    },
    flow(ref: string, major: number): FlowSignature | undefined {
      if (!isNonEmptyString(ref) || !Number.isSafeInteger(major) || major < 0) {
        return undefined;
      }
      const key = `${ref}@${major}`;
      if (!Object.hasOwn(doc.flows_registry, key)) {
        return undefined;
      }
      const signature = doc.flows_registry[key];
      if (signature === undefined) {
        return undefined;
      }
      return structuredClone({ input: signature.inputs, output: signature.outputs });
    },
    blockRefs(): string[] {
      return Object.keys(doc.blocks);
    },
    modelProfileRefs(): string[] {
      return [...doc.model_profiles];
    },
    roleNames(): string[] {
      return [...doc.roles];
    },
  };
}

export function loadTestCatalogue(path?: string): TestCatalogue {
  return catalogueFromDocument(
    path === undefined ? readCatalogueDocument() : readCatalogueDocument(path),
  );
}
