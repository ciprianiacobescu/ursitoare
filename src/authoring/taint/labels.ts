export type TaintLabel = "extracted" | "untrusted";

export type Taint = readonly TaintLabel[];

export const TAINT_LABELS: readonly TaintLabel[] = Object.freeze([
  "extracted",
  "untrusted",
] as const);

export const NO_TAINT: Taint = Object.freeze([] as const);

function isTaintLabel(value: string): value is TaintLabel {
  return value === "extracted" || value === "untrusted";
}

export function normalizeTaint(labels: readonly string[]): Taint {
  const present = new Set<TaintLabel>();
  for (const label of labels) {
    present.add(isTaintLabel(label) ? label : "untrusted");
  }
  const result: TaintLabel[] = [];
  for (const label of TAINT_LABELS) {
    if (present.has(label)) {
      result.push(label);
    }
  }
  return result;
}

export function joinTaint(a: Taint, b: Taint): Taint {
  return normalizeTaint([...a, ...b]);
}

export function relabelExtract(input: Taint): Taint {
  const labels = normalizeTaint(input).filter((label) => label !== "untrusted");
  if (!labels.includes("extracted")) {
    labels.push("extracted");
  }
  return normalizeTaint(labels);
}

export function taintIncludes(outer: Taint, inner: Taint): boolean {
  const outerLabels = normalizeTaint(outer);
  return normalizeTaint(inner).every((label) => outerLabels.includes(label));
}
