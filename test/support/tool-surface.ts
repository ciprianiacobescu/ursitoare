import type { SurfaceTool, ToolSurface } from "../../src/tools/types.ts";
import { loadTestCatalogue } from "./catalogue/loader.ts";
import { fakeToolPath } from "./fake-tools/index.ts";

export function fixtureSurface(
  refs: readonly string[],
  opts?: { untrustedResult?: Readonly<Record<string, boolean>> },
): ToolSurface {
  const catalogue = loadTestCatalogue();
  const names = new Set<string>();
  const tools: SurfaceTool[] = [];
  for (const ref of refs) {
    const def = catalogue.block(ref);
    if (def === undefined) {
      throw new Error(`unknown test block ${ref}`);
    }
    const name = ref.slice(ref.indexOf(".") + 1, ref.lastIndexOf("@"));
    if (names.has(name)) {
      throw new Error(`duplicate tool name ${name}`);
    }
    names.add(name);
    const tool: SurfaceTool = {
      name,
      effect: def.effect,
      input: def.input,
      output: def.output,
      http: { method: "POST", path: fakeToolPath(ref) },
    };
    if (def.description !== undefined) {
      tool.description = def.description;
    }
    if (def.untrusted_fields !== undefined) {
      tool.untrusted_fields = [...def.untrusted_fields];
    }
    if (def.data_class !== undefined) {
      tool.data_class = def.data_class;
    }
    if (def.unsafe_to_retry !== undefined) {
      tool.unsafe_to_retry = def.unsafe_to_retry;
    }
    if (opts?.untrustedResult !== undefined && Object.hasOwn(opts.untrustedResult, ref)) {
      tool.untrusted_result = opts.untrustedResult[ref] as boolean;
    }
    tools.push(tool);
  }
  return { tools };
}
