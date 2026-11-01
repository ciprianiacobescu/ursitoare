import type {
  BlockDef,
  Catalogue,
  DelegateTargetDef,
  FlowSignature,
  ModelProfileDef,
  RoleDef,
} from "../authoring/index.ts";
import { listRoles } from "../identity/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { listAllBlockVersions } from "./block-store.ts";
import type { BlockVersion } from "./block-store.ts";

export interface RegistryCatalogue extends Catalogue {
  blockRefs(): string[];
  roleNames(): string[];
}

export function registryCatalogue(
  blocks: readonly BlockVersion[],
  roles: readonly string[],
): RegistryCatalogue {
  const defs = new Map<string, BlockDef>(
    blocks.map((version) => [version.ref, structuredClone(version.def)]),
  );
  const roleSet = new Set<string>(roles);
  return {
    block(ref: string): BlockDef | undefined {
      if (typeof ref !== "string") return undefined;
      const def = defs.get(ref);
      return def === undefined ? undefined : structuredClone(def);
    },
    role(name: string): RoleDef | undefined {
      return typeof name === "string" && roleSet.has(name) ? { name } : undefined;
    },
    modelProfile(): ModelProfileDef | undefined {
      return undefined;
    },
    delegateTarget(): DelegateTargetDef | undefined {
      return undefined;
    },
    flow(): FlowSignature | undefined {
      return undefined;
    },
    blockRefs(): string[] {
      return [...defs.keys()];
    },
    roleNames(): string[] {
      return [...roleSet];
    },
  };
}

export async function loadRegistryCatalogue(
  pool: TenantPool,
  ctx: TenantContext,
): Promise<Catalogue> {
  const { blocks, roles } = await withTenantTx(pool, ctx, async (tx) => ({
    blocks: await listAllBlockVersions(tx, ctx),
    roles: await listRoles(tx, ctx),
  }));
  return registryCatalogue(blocks, roles);
}
