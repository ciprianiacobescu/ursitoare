import type {
  BlockDef,
  Catalogue,
  DelegateTargetDef,
  FlowSignature,
  ModelProfileDef,
  ProducedTaint,
  RoleDef,
  TaintOf,
} from "../authoring/index.ts";

export function blocksCatalogue(blocks: Readonly<Record<string, BlockDef>>): Catalogue {
  return Object.freeze({
    block(ref: string): BlockDef | undefined {
      if (typeof ref !== "string" || !Object.hasOwn(blocks, ref)) return undefined;
      return blocks[ref];
    },
    modelProfile(_ref: string): ModelProfileDef | undefined {
      return undefined;
    },
    role(_name: string): RoleDef | undefined {
      return undefined;
    },
    delegateTarget(_target: string, _workflow: string): DelegateTargetDef | undefined {
      return undefined;
    },
    flow(_ref: string, _major: number): FlowSignature | undefined {
      return undefined;
    },
  });
}

export interface RunTaints {
  readonly taintOf: TaintOf;
  record(nodeId: string, produced: ProducedTaint): void;
}

export function createRunTaints(): RunTaints {
  const taints = new Map<string, ProducedTaint>();
  return {
    taintOf(nodeId: string): ProducedTaint | undefined {
      return taints.get(nodeId);
    },
    record(nodeId: string, produced: ProducedTaint): void {
      taints.set(nodeId, produced);
    },
  };
}
