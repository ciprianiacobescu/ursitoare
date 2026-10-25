export type Layer = "L1" | "L2" | "L3";

export interface Issue {
  layer: Layer;
  code: string;
  /** node id the issue is about, or null for document-level issues */
  node: string | null;
  /** JSON Pointer (RFC 6901) into the flow document */
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  /**
   * Layers that actually executed. A layer is skipped when an earlier layer
   * produced errors (L2 needs a well-formed document, L3 needs a well-formed
   * graph). Consumers MUST NOT count a skipped layer as a pass.
   */
  layers_run: Layer[];
}

export interface BlockDef {
  effect: "read" | "write" | "send" | "pay";
  description?: string;
  input: any;
  output: any;
  untrusted_fields?: string[];
  /** optional explicit private-data marker; see REPORT.md "Interpretations" */
  private?: boolean;
}

export interface Catalogue {
  blocks: Record<string, BlockDef>;
  model_profiles: string[];
  roles: string[];
  delegate_targets: Record<string, string[]>;
  flows_registry: Record<string, { inputs: any; outputs: any }>;
  [k: string]: unknown;
}

export type Flow = any;
