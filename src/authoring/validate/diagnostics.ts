import type { Layer } from "./types.ts";
import { FLOW_ERROR_CODES, FLOW_RESERVED_CODES, FLOW_WARNING_CODES } from "./codes.ts";

export const DIAGNOSTICS_DOC_PATH: string = "docs/authoring/diagnostics.md";

export function diagnosticAnchor(code: string): string {
  return code.toLowerCase();
}

export function diagnosticLink(code: string): string | null {
  if (!isKnownCode(code)) {
    return null;
  }
  return `${DIAGNOSTICS_DOC_PATH}#${diagnosticAnchor(code)}`;
}

export interface DiagnosticInfo {
  code: string;
  layer: Layer | null;
  severity: "error" | "warning";
  summary: string;
  fix: string;
}

function isKnownCode(code: string): boolean {
  return (
    FLOW_ERROR_CODES.includes(code) ||
    FLOW_WARNING_CODES.includes(code) ||
    FLOW_RESERVED_CODES.includes(code)
  );
}

interface Entry {
  code: string;
  layer: Layer | null;
  severity: "error" | "warning";
  summary: string;
  fix: string;
}

const ENTRIES: readonly Entry[] = [
  {
    code: "L1_PARSE",
    layer: "L1",
    severity: "error",
    summary: "The flow text could not be parsed.",
    fix: "Check the YAML or JSON syntax, and any unsupported tags or duplicate keys.",
  },
  {
    code: "L1_REQUIRED",
    layer: "L1",
    severity: "error",
    summary: "A field the schema requires is absent.",
    fix: "Add the missing field at the reported path.",
  },
  {
    code: "L1_ADDITIONAL_PROPERTY",
    layer: "L1",
    severity: "error",
    summary: "The document has a field the schema does not list.",
    fix: "Remove the field or move it into a node kind that supports it.",
  },
  {
    code: "L1_TYPE",
    layer: "L1",
    severity: "error",
    summary: "A value has the wrong JSON type.",
    fix: "Use the JSON type the schema declares.",
  },
  {
    code: "L1_CONST",
    layer: "L1",
    severity: "error",
    summary: "A fixed value differs from the value the format requires.",
    fix: "Set the field to the required constant.",
  },
  {
    code: "L1_ENUM",
    layer: "L1",
    severity: "error",
    summary: "A value is not one of its allowed values.",
    fix: "Use one of the listed values.",
  },
  {
    code: "L1_UNKNOWN_KIND",
    layer: "L1",
    severity: "error",
    summary: "A node kind is not one of the fourteen known kinds.",
    fix: "Use a known node kind.",
  },
  {
    code: "L1_PATTERN",
    layer: "L1",
    severity: "error",
    summary: "A string does not match its required pattern.",
    fix: "Correct the identifier, version, role or reference to the required form.",
  },
  {
    code: "L1_MIN_ITEMS",
    layer: "L1",
    severity: "error",
    summary: "A list has fewer entries than the schema allows.",
    fix: "Add at least the minimum number of entries.",
  },
  {
    code: "L1_UNIQUE_ITEMS",
    layer: "L1",
    severity: "error",
    summary: "A list repeats an entry.",
    fix: "Remove the duplicate entry.",
  },
  {
    code: "L1_RANGE",
    layer: "L1",
    severity: "error",
    summary: "A number is outside its allowed range.",
    fix: "Use a value inside the allowed range.",
  },
  {
    code: "L1_MIN_LENGTH",
    layer: "L1",
    severity: "error",
    summary: "A required text field is empty.",
    fix: "Fill in the empty field.",
  },
  {
    code: "L1_MIN_PROPERTIES",
    layer: "L1",
    severity: "error",
    summary: "An object or map is missing members the schema requires.",
    fix: "Add the required members.",
  },
  {
    code: "L1_FOREACH_BODY",
    layer: "L1",
    severity: "error",
    summary: "A foreach has both or neither of uses and subflow.",
    fix: "Keep exactly one of uses and subflow on the foreach.",
  },
  {
    code: "L1_INVALID_JSON_SCHEMA",
    layer: "L1",
    severity: "error",
    summary: "An embedded JSON Schema is not valid.",
    fix: "Make the schema a valid JSON Schema 2020-12 object.",
  },
  {
    code: "L1_REF_SYNTAX",
    layer: "L1",
    severity: "error",
    summary: "A reference in a value field is not well formed.",
    fix: "Write the reference as ${{ inputs.x }}, ${{ nodes.id.output.path }} or ${{ item.path }}.",
  },
  {
    code: "L1_REF_NOT_ALLOWED",
    layer: "L1",
    severity: "error",
    summary: "A reference appears where references are not allowed.",
    fix: "Remove the reference from instructions, goal or source.",
  },
  {
    code: "L1_CODE_SYNTAX",
    layer: "L1",
    severity: "error",
    summary: "The code node source does not parse as a function body.",
    fix: "Fix the JavaScript syntax in the code source.",
  },
  {
    code: "L1_CODE_NO_RETURN",
    layer: "L1",
    severity: "error",
    summary: "The code source has no return of its own.",
    fix: "Return a value from the top level of the code body.",
  },
  {
    code: "L2_UNKNOWN_BLOCK",
    layer: "L2",
    severity: "error",
    summary: "A block or agent tool is not in the catalogue.",
    fix: "Use a block the catalogue defines.",
  },
  {
    code: "L2_WITH_MISSING_REQUIRED",
    layer: "L2",
    severity: "error",
    summary: "A with object lacks an input the block or flow requires.",
    fix: "Provide every required input of the block or flow.",
  },
  {
    code: "L2_WITH_UNKNOWN_PARAM",
    layer: "L2",
    severity: "error",
    summary: "A with key is not an input of the block or flow.",
    fix: "Remove the key or use a declared input.",
  },
  {
    code: "L2_UNKNOWN_ROLE",
    layer: "L2",
    severity: "error",
    summary: "The assignee role is not in the catalogue.",
    fix: "Use a role the catalogue defines.",
  },
  {
    code: "L2_UNKNOWN_DELEGATE_TARGET",
    layer: "L2",
    severity: "error",
    summary: "A delegate target is not in the catalogue.",
    fix: "Use a delegate target the catalogue offers.",
  },
  {
    code: "L2_UNKNOWN_DELEGATE_WORKFLOW",
    layer: "L2",
    severity: "error",
    summary: "A delegate workflow is not offered by its target.",
    fix: "Use a workflow the target offers.",
  },
  {
    code: "L2_UNKNOWN_FLOW",
    layer: "L2",
    severity: "error",
    summary: "A subflow is not in the catalogue.",
    fix: "Use a flow name and major version the catalogue defines.",
  },
  {
    code: "L2_UNKNOWN_MODEL_PROFILE",
    layer: "L2",
    severity: "error",
    summary: "A model profile is not in the catalogue.",
    fix: "Use a model profile the catalogue defines.",
  },
  {
    code: "L2_START_UNKNOWN",
    layer: "L2",
    severity: "error",
    summary: "The start field names no node.",
    fix: "Point start at an existing node id.",
  },
  {
    code: "L2_UNKNOWN_SUCCESSOR",
    layer: "L2",
    severity: "error",
    summary: "A successor names no node.",
    fix: "Point the successor at an existing node id.",
  },
  {
    code: "L2_MISSING_SUCCESSOR",
    layer: "L2",
    severity: "error",
    summary: "A node lacks a successor its kind requires.",
    fix: "Add the successor field the node kind requires.",
  },
  {
    code: "L2_UNREACHABLE_NODE",
    layer: "L2",
    severity: "error",
    summary: "A node is not reachable from start.",
    fix: "Connect the node to a path from start or remove it.",
  },
  {
    code: "L2_CYCLE",
    layer: "L2",
    severity: "error",
    summary: "The graph has a cycle.",
    fix: "Break the cycle; flows must be acyclic.",
  },
  {
    code: "L2_NO_END",
    layer: "L2",
    severity: "error",
    summary: "The flow has no end node.",
    fix: "Add an end node.",
  },
  {
    code: "L2_DECIDE_CASE_MISSING",
    layer: "L2",
    severity: "error",
    summary: "An llm.decide outcome has no cases entry.",
    fix: "Add a cases entry for every outcome.",
  },
  {
    code: "L2_DECIDE_CASE_EXTRA",
    layer: "L2",
    severity: "error",
    summary: "A cases key is not an outcome.",
    fix: "Remove cases keys that are not outcomes.",
  },
  {
    code: "L3_REF_UNKNOWN_NODE",
    layer: "L3",
    severity: "error",
    summary: "A nodes reference names no node.",
    fix: "Reference an existing node id.",
  },
  {
    code: "L3_REF_NOT_DOMINATING",
    layer: "L3",
    severity: "error",
    summary: "The referenced node is not guaranteed to have run.",
    fix: "Reference only a node that runs on every path to the reader.",
  },
  {
    code: "L3_REF_UNKNOWN_PATH",
    layer: "L3",
    severity: "error",
    summary: "A reference path does not resolve in the schema.",
    fix: "Reference a property the output schema declares.",
  },
  {
    code: "L3_REF_NO_OUTPUT",
    layer: "L3",
    severity: "error",
    summary: "The referenced node produces no output.",
    fix: "Reference a node that produces output.",
  },
  {
    code: "L3_REF_OUTCOME_NOT_DECIDE",
    layer: "L3",
    severity: "error",
    summary: "An outcome is read from a node that is not llm.decide.",
    fix: "Use outcome only on an llm.decide node.",
  },
  {
    code: "L3_ITEM_OUTSIDE_FOREACH",
    layer: "L3",
    severity: "error",
    summary: "An item reference appears outside the with of a foreach.",
    fix: "Use item only in the with of a foreach.",
  },
  {
    code: "L3_TYPE_MISMATCH",
    layer: "L3",
    severity: "error",
    summary: "A value type does not match the consumer's schema.",
    fix: "Pass a value of the declared type or convert it first.",
  },
  {
    code: "L3_ENUM_VIOLATION",
    layer: "L3",
    severity: "error",
    summary: "A value is not one of the consumer's allowed values.",
    fix: "Pass a value from the consumer's enum.",
  },
  {
    code: "L3_SWITCH_ON_TYPE",
    layer: "L3",
    severity: "error",
    summary: "A switch cannot switch on an object or array.",
    fix: "Switch on a string, number or boolean value.",
  },
  {
    code: "L3_SWITCH_KEY_INCOMPATIBLE",
    layer: "L3",
    severity: "error",
    summary: "A switch case key cannot match the switch value.",
    fix: "Use a case key compatible with the value's type and enum.",
  },
  {
    code: "L3_TAINT_TO_CONSEQUENTIAL",
    layer: "L3",
    severity: "error",
    summary: "Untrusted data reaches a consequential block.",
    fix: "Pass untrusted data through llm.extract before the call.",
  },
  {
    code: "L3_TAINT_TO_AGENT_WITH_EFFECTS",
    layer: "L3",
    severity: "error",
    summary: "Untrusted data reaches an agent with effectful tools.",
    fix: "Pass untrusted data through llm.extract before the agent.",
  },
  {
    code: "W_LETHAL_TRIFECTA",
    layer: "L3",
    severity: "warning",
    summary: "The flow reads untrusted content, reads private data and can send or pay.",
    fix: "Remove one capability or isolate it behind a policy-checked step.",
  },
  {
    code: "W_TAINT_TO_OPAQUE_CALL",
    layer: "L3",
    severity: "warning",
    summary: "Untrusted data is passed to a subflow, delegate or foreach subflow.",
    fix: "Pass untrusted data through llm.extract before the opaque call.",
  },
  {
    code: "W_OPTIONAL_REFERENCE",
    layer: "L3",
    severity: "warning",
    summary: "A reference ends at a field its schema does not require.",
    fix: "Reference a required field or handle the missing value.",
  },
  {
    code: "W_SUSPICIOUS_INTERPOLATION",
    layer: "L1",
    severity: "warning",
    summary: "Plain text around a reference looks like a mistaken interpolation.",
    fix: "Use a ${{ }} reference for each dynamic value.",
  },
  {
    code: "W_CODE_FORBIDDEN_API",
    layer: "L1",
    severity: "warning",
    summary: "A code source uses an API the sandbox forbids.",
    fix: "Remove the forbidden API from the code source.",
  },
  {
    code: "INTERNAL_ERROR",
    layer: null,
    severity: "error",
    summary: "The validator crashed or a taint analysis limit was exceeded.",
    fix: "Report this as a validator bug; simplify the flow if a limit was exceeded.",
  },
];

export const DIAGNOSTICS: readonly DiagnosticInfo[] = ENTRIES;

const TITLE = "# Flow diagnostics";

const GENERATED_BY =
  "Generated by `renderDiagnosticsDoc()` in `src/authoring/validate/diagnostics.ts`; do not edit by hand. Regenerate with `node -e \"import('./src/authoring/validate/diagnostics.ts').then((m) => process.stdout.write(m.renderDiagnosticsDoc()))\" > docs/authoring/diagnostics.md`.";

const INTRO =
  "Every flow diagnostic has a stable code. A validator issue carries its layer, code, node, JSON Pointer path and message; the table below gives what each code means and how to fix it.";

function layerLabel(layer: Layer | null): string {
  return layer === null ? "reserved" : layer;
}

export function renderDiagnosticsDoc(): string {
  const lines: string[] = [TITLE, "", GENERATED_BY, "", INTRO, ""];
  for (const entry of DIAGNOSTICS) {
    lines.push(`### ${entry.code}`);
    lines.push("");
    lines.push(`${layerLabel(entry.layer)} ${entry.severity}`);
    lines.push("");
    lines.push(entry.summary);
    lines.push("");
    lines.push(`Fix: ${entry.fix}`);
    lines.push("");
  }
  return lines.join("\n");
}
