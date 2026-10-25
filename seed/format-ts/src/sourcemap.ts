/** Minimal source-map v3 reader: generated (line, col) -> original line. No dependencies. */
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function decodeVlq(seg: string): number[] {
  const out: number[] = [];
  let shift = 0;
  let value = 0;
  for (const ch of seg) {
    const d = B64.indexOf(ch);
    if (d < 0) return out;
    value += (d & 31) << shift;
    if (d & 32) shift += 5;
    else {
      out.push(value & 1 ? -(value >>> 1) : value >>> 1);
      value = 0;
      shift = 0;
    }
  }
  return out;
}

export interface LineMap {
  /** original 1-based line for a generated 1-based line and 1-based column, or undefined */
  lookup(line: number, col?: number): number | undefined;
}

export function parseSourceMap(mapJson: string): LineMap {
  const { mappings } = JSON.parse(mapJson) as { mappings: string };
  // per generated line: sorted [genCol, origLine]
  const lines: Array<Array<[number, number]>> = [];
  let origLine = 0;
  for (const lineStr of mappings.split(";")) {
    const segs: Array<[number, number]> = [];
    let genCol = 0;
    for (const s of lineStr.split(",")) {
      if (!s) continue;
      const f = decodeVlq(s);
      genCol += f[0];
      if (f.length >= 4) {
        origLine += f[2];
        segs.push([genCol, origLine]);
      }
    }
    lines.push(segs);
  }
  return {
    lookup(line, col = 1) {
      const segs = lines[line - 1];
      if (!segs || !segs.length) return undefined;
      let best = segs[0];
      for (const sg of segs) if (sg[0] <= col - 1) best = sg;
      return best[1] + 1;
    },
  };
}
