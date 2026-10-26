// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import ts from "typescript";

import { MODULES } from "./modules.ts";
import type { Egress, ModuleRule, Snapshot, SourceFile, Violation } from "./sources.ts";
import { collectImports, isTestFile, resolveSpecifier, sortViolations } from "./sources.ts";

const GRAPH_FILE = "test/arch/modules.ts";

const EGRESS_VALUES: readonly Egress[] = ["tools", "oidc", "otlp"];

const PINNED_EGRESS: Record<string, Egress> = {
  observability: "otlp",
  identity: "oidc",
  gateway: "tools",
};

function graphViolation(message: string): Violation {
  return { code: "ARCH_GRAPH_INVALID", file: GRAPH_FILE, line: 1, message };
}

function cycleIn(modules: Record<string, ModuleRule>, names: string[]): string[] | null {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const visit = (name: string): string[] | null => {
    if (visiting.has(name)) {
      const start = stack.indexOf(name);
      return [...stack.slice(start), name];
    }
    if (visited.has(name)) return null;
    visiting.add(name);
    stack.push(name);
    for (const target of modules[name]?.allowed ?? []) {
      if (target === name || !Object.hasOwn(modules, target)) continue;
      const cycle = visit(target);
      if (cycle !== null) return cycle;
    }
    stack.pop();
    visiting.delete(name);
    visited.add(name);
    return null;
  };

  for (const name of names) {
    const cycle = visit(name);
    if (cycle !== null) return cycle;
  }
  return null;
}

export function checkGraphIntegrity(modules: Record<string, ModuleRule> = MODULES): Violation[] {
  const violations: Violation[] = [];
  const names = Object.keys(modules);

  for (const [name, rule] of Object.entries(modules)) {
    const seen = new Set<string>();
    for (const allowed of rule.allowed) {
      if (!Object.hasOwn(modules, allowed)) {
        violations.push(
          graphViolation(`${name} allows ${allowed}, which is not in test/arch/modules.ts`),
        );
      }
      if (allowed === name) {
        violations.push(graphViolation(`${name} allows itself`));
      }
      if (seen.has(allowed)) {
        violations.push(graphViolation(`${name} allows ${allowed} twice`));
      }
      seen.add(allowed);
    }

    const egress = rule.egress as Egress | undefined;
    const pinned = PINNED_EGRESS[name];
    if (egress !== undefined && !EGRESS_VALUES.includes(egress)) {
      violations.push(
        graphViolation(
          `${name} has egress ${String(egress)}; allowed values are ${EGRESS_VALUES.join(", ")}`,
        ),
      );
    }
    if (egress !== undefined && pinned === undefined) {
      violations.push(
        graphViolation(
          `${name} may not carry an egress value; only observability, identity and gateway do`,
        ),
      );
    }
    if (pinned !== undefined && egress === undefined) {
      violations.push(
        graphViolation(
          `${name} must carry an egress value; the pin is ${pinned}`,
        ),
      );
    }
    if (pinned !== undefined && egress !== undefined && egress !== pinned) {
      violations.push(
        graphViolation(`${name} has egress ${String(egress)}; the pin is ${pinned}`),
      );
    }
  }

  const cycle = cycleIn(modules, names);
  if (cycle !== null) {
    violations.push(graphViolation(`cycle: ${cycle.join(" -> ")}`));
  }

  return violations;
}

function moduleNameOf(path: string): string | null {
  if (!path.startsWith("src/")) return null;
  const rest = path.slice("src/".length);
  const slash = rest.indexOf("/");
  if (slash === -1) return null;
  return rest.slice(0, slash);
}

function unknownModuleViolation(dir: string, file: string, line: number): Violation {
  return {
    code: "ARCH_UNKNOWN_MODULE",
    file,
    line,
    message: `${dir} is not in test/arch/modules.ts; add its row in a red step`,
  };
}

function isRootFile(path: string): boolean {
  return path.startsWith("src/") && !path.slice("src/".length).includes("/");
}

function dynamicImportViolation(file: string, line: number): Violation {
  return {
    code: "ARCH_DYNAMIC_IMPORT",
    file,
    line,
    message: "use a literal specifier",
  };
}

function deepImportViolation(file: string, line: number, to: string): Violation {
  return {
    code: "ARCH_DEEP_IMPORT",
    file,
    line,
    message: `import ${to} through src/${to}/index.ts`,
  };
}

function rootFileViolation(file: string, line: number, message: string): Violation {
  return { code: "ARCH_ROOT_FILE", file, line, message };
}

function loaderViolations(file: SourceFile): Violation[] {
  const source = ts.createSourceFile(file.path, file.text, ts.ScriptTarget.Latest, true);
  const violations: Violation[] = [];
  const lineOf = (node: ts.Node): number =>
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  const push = (name: string, node: ts.Node): void => {
    violations.push({
      code: "ARCH_DYNAMIC_IMPORT",
      file: file.path,
      line: lineOf(node),
      message: `${name} hides the module; use a static import`,
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === "createRequire") {
      push("createRequire", node);
    } else if (ts.isElementAccessExpression(node)) {
      const argument = node.argumentExpression;
      if (ts.isStringLiteral(argument) && argument.text === "createRequire") {
        push("createRequire", argument);
      }
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isIdentifier(callee) && callee.text === "getBuiltinModule") {
        push("getBuiltinModule", callee);
      } else if (ts.isPropertyAccessExpression(callee) && callee.name.text === "getBuiltinModule") {
        push("getBuiltinModule", callee.name);
      } else if (
        ts.isElementAccessExpression(callee) &&
        ts.isStringLiteral(callee.argumentExpression) &&
        callee.argumentExpression.text === "getBuiltinModule"
      ) {
        push("getBuiltinModule", callee.argumentExpression);
      }
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);
  return violations;
}

export function checkModuleGraph(
  s: Snapshot,
  modules: Record<string, ModuleRule> = MODULES,
): Violation[] {
  const violations: Violation[] = [];

  for (const dir of s.srcDirs) {
    if (!Object.hasOwn(modules, dir)) violations.push(unknownModuleViolation(dir, `src/${dir}`, 1));
  }

  for (const file of s.files) {
    if (isTestFile(file.path)) continue;
    const from = moduleNameOf(file.path);
    const root = isRootFile(file.path);
    const main = file.path === "src/main.ts";
    const allowed = from === null ? [] : modules[from]?.allowed ?? [];

    for (const ref of collectImports(file)) {
      if (ref.specifier === null) {
        violations.push(dynamicImportViolation(file.path, ref.line));
        continue;
      }
      const resolved = resolveSpecifier(file.path, ref.specifier);
      if (resolved === null) continue;
      const to = moduleNameOf(resolved);

      if (to === null) {
        if (resolved === "src/main.ts") {
          violations.push(
            rootFileViolation(file.path, ref.line, "src/main.ts is the composition root and is imported by nothing"),
          );
        }
        continue;
      }

      if (root && !main) {
        violations.push(
          rootFileViolation(
            file.path,
            ref.line,
            `${file.path} is a leaf file and may not import module ${to}`,
          ),
        );
        continue;
      }

      if (from !== null && to === from) continue;

      if (!Object.hasOwn(modules, to)) {
        violations.push(unknownModuleViolation(to, file.path, ref.line));
        continue;
      }

      if (from !== null && !allowed.includes(to)) {
        violations.push({
          code: "ARCH_MODULE_EDGE",
          file: file.path,
          line: ref.line,
          message: `${from} may not import ${to}; allowed: ${
            allowed.length === 0 ? "none" : allowed.join(", ")
          } (test/arch/modules.ts)`,
        });
        continue;
      }

      if (resolved !== `src/${to}/index.ts`) {
        violations.push(deepImportViolation(file.path, ref.line, to));
      }
    }

    violations.push(...loaderViolations(file));
  }

  return sortViolations(violations);
}

const NETWORK_ENTRY_POINTS: readonly string[] = [
  "http",
  "https",
  "http2",
  "net",
  "tls",
  "dgram",
  "dns",
  "dns/promises",
  "child_process",
  "cluster",
];

const NETWORK_PACKAGES: readonly string[] = [
  "undici",
  "ws",
  "axios",
  "got",
  "node-fetch",
  "cross-fetch",
];

const NETWORK_GLOBALS: readonly string[] = ["fetch", "WebSocket", "EventSource", "XMLHttpRequest"];

const WORKER_THREADS = "worker_threads";

function withoutNodePrefix(specifier: string): string {
  return specifier.startsWith("node:") ? specifier.slice("node:".length) : specifier;
}

function isNetworkSpecifier(specifier: string): boolean {
  const base = withoutNodePrefix(specifier);
  if (NETWORK_ENTRY_POINTS.includes(base)) return true;
  return NETWORK_PACKAGES.some((name) => base === name || base.startsWith(`${name}/`));
}

function isWorkerThreads(specifier: string): boolean {
  return withoutNodePrefix(specifier) === WORKER_THREADS;
}

function networkImportViolation(file: string, line: number, name: string): Violation {
  return {
    code: "ARCH_NETWORK_IMPORT",
    file,
    line,
    message: `${name} is allowed only in observability, identity and gateway; call through src/gateway`,
  };
}

function workerThreadsViolation(file: string, line: number, name: string): Violation {
  return {
    code: "ARCH_NETWORK_IMPORT",
    file,
    line,
    message: `${name} is allowed only in src/sandbox`,
  };
}

function networkCallViolation(file: string, line: number, name: string): Violation {
  return {
    code: "ARCH_NETWORK_CALL",
    file,
    line,
    message: `${name} is allowed only in observability, identity and gateway; call through src/gateway`,
  };
}

function networkCalleeName(node: ts.CallExpression | ts.NewExpression): string | null {
  const callee = node.expression;
  if (ts.isIdentifier(callee)) {
    return NETWORK_GLOBALS.includes(callee.text) ? callee.text : null;
  }
  if (ts.isPropertyAccessExpression(callee)) {
    const receiver = callee.expression;
    const globalReceiver =
      ts.isIdentifier(receiver) &&
      (receiver.text === "globalThis" || receiver.text === "self" || receiver.text === "window");
    if (globalReceiver && NETWORK_GLOBALS.includes(callee.name.text)) return callee.name.text;
  }
  return null;
}

function networkCalls(file: SourceFile): Violation[] {
  const source = ts.createSourceFile(file.path, file.text, ts.ScriptTarget.Latest, true);
  const violations: Violation[] = [];
  const lineOf = (node: ts.Node): number =>
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const name = networkCalleeName(node);
      if (name !== null) violations.push(networkCallViolation(file.path, lineOf(node), name));
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);
  return violations;
}

export function checkNetwork(s: Snapshot, modules: Record<string, ModuleRule> = MODULES): Violation[] {
  const violations: Violation[] = [];

  for (const file of s.files) {
    if (isTestFile(file.path)) continue;
    const moduleName = moduleNameOf(file.path);
    const egress = moduleName === null ? undefined : modules[moduleName]?.egress;
    const sandbox = moduleName === "sandbox";

    for (const ref of collectImports(file)) {
      if (ref.typeOnly || ref.specifier === null) continue;
      if (isWorkerThreads(ref.specifier)) {
        if (!sandbox) violations.push(workerThreadsViolation(file.path, ref.line, ref.specifier));
        continue;
      }
      if (egress === undefined && isNetworkSpecifier(ref.specifier)) {
        violations.push(networkImportViolation(file.path, ref.line, ref.specifier));
      }
    }

    if (egress === undefined) violations.push(...networkCalls(file));
  }

  return sortViolations(violations);
}

const SELF_PACKAGE = "ursitoare";

function forbiddenImportViolation(file: string, line: number, message: string): Violation {
  return { code: "ARCH_FORBIDDEN_IMPORT", file, line, message };
}

function isUnder(path: string, dir: string): boolean {
  return path === dir || path.startsWith(`${dir}/`);
}

export function checkForbiddenImports(s: Snapshot): Violation[] {
  const violations: Violation[] = [];

  for (const file of s.files) {
    if (!file.path.startsWith("src/")) continue;
    const test = isTestFile(file.path);

    for (const ref of collectImports(file)) {
      const specifier = ref.specifier;
      if (specifier === null) continue;
      const resolved = resolveSpecifier(file.path, specifier);

      if (resolved !== null && isUnder(resolved, "seed")) {
        violations.push(
          forbiddenImportViolation(
            file.path,
            ref.line,
            `${specifier} resolves into seed/; seed is not importable from src`,
          ),
        );
        continue;
      }

      if (test) continue;

      if (resolved !== null && isUnder(resolved, "test")) {
        violations.push(
          forbiddenImportViolation(
            file.path,
            ref.line,
            `${specifier} resolves into test/; test code is not importable from src`,
          ),
        );
        continue;
      }

      if (specifier.startsWith("#")) {
        violations.push(
          forbiddenImportViolation(
            file.path,
            ref.line,
            `${specifier} is a package.json imports alias; import the module directly`,
          ),
        );
        continue;
      }

      if (specifier === SELF_PACKAGE || specifier.startsWith(`${SELF_PACKAGE}/`)) {
        violations.push(
          forbiddenImportViolation(
            file.path,
            ref.line,
            `${specifier} is the package's own name; import the module directly`,
          ),
        );
      }
    }
  }

  return sortViolations(violations);
}

const CONSOLE_SPECIFIERS: readonly string[] = ["console", "node:console"];

function consoleViolation(file: string, line: number): Violation {
  return {
    code: "ARCH_CONSOLE",
    file,
    line,
    message: "use the logger from src/observability",
  };
}

function isConsoleObject(node: ts.Expression): boolean {
  if (ts.isIdentifier(node)) return node.text === "console";
  return (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "globalThis" &&
    node.name.text === "console"
  );
}

function consoleUses(file: SourceFile): Violation[] {
  const source = ts.createSourceFile(file.path, file.text, ts.ScriptTarget.Latest, true);
  const violations: Violation[] = [];
  const lineOf = (node: ts.Node): number =>
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

  const visit = (node: ts.Node): void => {
    if (
      (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
      isConsoleObject(node.expression)
    ) {
      violations.push(consoleViolation(file.path, lineOf(node)));
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);
  return violations;
}

export function checkConsole(s: Snapshot): Violation[] {
  const violations: Violation[] = [];

  for (const file of s.files) {
    if (!file.path.startsWith("src/") || isTestFile(file.path)) continue;
    for (const ref of collectImports(file)) {
      if (ref.typeOnly) continue;
      if (ref.specifier !== null && CONSOLE_SPECIFIERS.includes(ref.specifier)) {
        violations.push(consoleViolation(file.path, ref.line));
      }
    }
    violations.push(...consoleUses(file));
  }

  return sortViolations(violations);
}

const ENV_SPECIFIERS: readonly string[] = ["process", "node:process"];

function envViolation(file: string, line: number): Violation {
  return {
    code: "ARCH_PROCESS_ENV",
    file,
    line,
    message: "read configuration through src/config",
  };
}

function isProcessReference(node: ts.Expression): boolean {
  if (ts.isIdentifier(node)) return node.text === "process";
  return (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "globalThis" &&
    node.name.text === "process"
  );
}

function isEnvRequireCall(node: ts.Expression): boolean {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  if (!ts.isIdentifier(callee) || callee.text !== "require") return false;
  const argument = node.arguments[0];
  return (
    argument !== undefined && ts.isStringLiteral(argument) && ENV_SPECIFIERS.includes(argument.text)
  );
}

function bindingNamesEnv(element: ts.BindingElement): boolean {
  const named = element.propertyName ?? element.name;
  return (ts.isIdentifier(named) || ts.isStringLiteral(named)) && named.text === "env";
}

function importsEnv(node: ts.ImportDeclaration): boolean {
  if (
    !ts.isStringLiteral(node.moduleSpecifier) ||
    !ENV_SPECIFIERS.includes(node.moduleSpecifier.text)
  ) {
    return false;
  }
  const bindings = node.importClause?.namedBindings;
  return (
    bindings !== undefined &&
    ts.isNamedImports(bindings) &&
    bindings.elements.some((element) => element.name.text === "env")
  );
}

function isEnvNamedAccess(node: ts.PropertyAccessExpression | ts.ElementAccessExpression): boolean {
  if (ts.isPropertyAccessExpression(node)) return node.name.text === "env";
  return ts.isStringLiteral(node.argumentExpression) && node.argumentExpression.text === "env";
}

function processEnvUses(file: SourceFile): Violation[] {
  const source = ts.createSourceFile(file.path, file.text, ts.ScriptTarget.Latest, true);
  const violations: Violation[] = [];
  const lineOf = (node: ts.Node): number =>
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

  const visit = (node: ts.Node): void => {
    if (
      (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
      isEnvNamedAccess(node) &&
      (isProcessReference(node.expression) || isEnvRequireCall(node.expression))
    ) {
      violations.push(envViolation(file.path, lineOf(node)));
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer !== undefined &&
      (isProcessReference(node.initializer) || isEnvRequireCall(node.initializer)) &&
      node.name.elements.some(bindingNamesEnv)
    ) {
      violations.push(envViolation(file.path, lineOf(node)));
    } else if (ts.isImportDeclaration(node) && importsEnv(node)) {
      violations.push(envViolation(file.path, lineOf(node)));
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);
  return violations;
}

export function checkProcessEnv(s: Snapshot): Violation[] {
  const violations: Violation[] = [];

  for (const file of s.files) {
    if (!file.path.startsWith("src/") || isTestFile(file.path)) continue;
    if (moduleNameOf(file.path) === "config") continue;
    violations.push(...processEnvUses(file));
  }

  return sortViolations(violations);
}

export function checkAll(_s: Snapshot, _modules?: Record<string, ModuleRule>): Violation[] {
  throw new Error("not implemented");
}
