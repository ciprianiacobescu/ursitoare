// The L1 checks of a code source (parse and return), pure: no sink, no warnings (design 3).

import * as acorn from "acorn";

import { isObj } from "./jsonschema.ts";

export interface CodeSourceProblem {
  code: "L1_CODE_SYNTAX" | "L1_CODE_NO_RETURN";
  message: string;
}

const FUNCTION_TYPES = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

function hasOwnReturn(node: unknown): boolean {
  if (Array.isArray(node)) return node.some(hasOwnReturn);
  if (!isObj(node)) return false;
  if (node.type === "ReturnStatement") return true;
  if (typeof node.type === "string" && FUNCTION_TYPES.has(node.type)) return false;
  return Object.values(node).some(hasOwnReturn);
}

function wellFormed(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 0) {
      out += "�";
    } else if (c >= 0xd800 && c <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += text.charAt(i) + text.charAt(i + 1);
        i++;
      } else {
        out += "�";
      }
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      out += "�";
    } else {
      out += text.charAt(i);
    }
  }
  return out;
}

export function codeSourceProblems(source: string): CodeSourceProblem[] {
  const wrapped = `(function (input) {\n${source}\n})`;
  let program: acorn.Program;
  try {
    program = acorn.parse(wrapped, { ecmaVersion: "latest", sourceType: "script" });
  } catch (error: unknown) {
    const loc = isObj(error) ? error.loc : undefined;
    const line = isObj(loc) && typeof loc.line === "number" ? loc.line - 1 : "?";
    const text = error instanceof Error ? error.message : String(error);
    return [
      {
        code: "L1_CODE_SYNTAX",
        message: wellFormed(`code source does not parse (line ${line}): ${text.replace(/ \(\d+:\d+\)$/, "")}`),
      },
    ];
  }
  const first: unknown = program.body[0];
  const fn = isObj(first) ? first.expression : undefined;
  const fnBody = isObj(fn) && isObj(fn.body) ? fn.body.body : undefined;
  if (!hasOwnReturn(fnBody)) {
    return [{ code: "L1_CODE_NO_RETURN", message: "code source never returns a value; it must `return` an object" }];
  }
  return [];
}
