import type { FeatureSpec } from "../app/features.ts";
import { registerFeature } from "../app/features.ts";

const mods = import.meta.glob<{ feature: FeatureSpec }>("./*.tsx", { eager: true });

for (const [, mod] of Object.entries(mods).sort(([a], [b]) => (a < b ? -1 : 1))) {
  registerFeature(mod.feature);
}
