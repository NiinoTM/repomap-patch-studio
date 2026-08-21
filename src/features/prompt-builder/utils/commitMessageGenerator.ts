import { DiffBlock } from "../../../types/patch";

interface SymbolDetail {
  name: string;
  kind: "component" | "hook" | "interface" | "type" | "function";
}

function getBaseName(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

function detectScope(files: string[]): string | null {
  if (files.length === 0) return null;

  const scopes = files.map((file) => {
    const matchFeature = file.match(/src\/features\/([^/]+)/);
    if (matchFeature) return matchFeature[1];

    if (file.startsWith("server/")) return "server";
    if (file.startsWith(".github/")) return "ci";
    if (file.includes("types/")) return "types";
    if (file.includes("components/")) return "ui";
    if (file.includes("hooks/")) return "hooks";
    if (file.includes("api/")) return "api";
    return null;
  });

  const validScopes = scopes.filter(Boolean) as string[];
  if (validScopes.length === 0) return null;

  const firstScope = validScopes[0];
  const allSame = validScopes.every((s) => s === firstScope);
  return allSame ? firstScope : null;
}

/**
 * Extracts key exported symbols from the modified code to make commit messages specific.
 */
function detectSymbol(content: string, isTsx: boolean): SymbolDetail | null {
  const hookMatch = content.match(
    /export\s+(?:function|const)\s+(use[A-Z0-9_$]+)/,
  );
  if (hookMatch) return { name: hookMatch[1], kind: "hook" };

  const ifaceMatch = content.match(/export\s+interface\s+([A-Za-z0-9_$]+)/);
  if (ifaceMatch) return { name: ifaceMatch[1], kind: "interface" };

  const typeMatch = content.match(/export\s+type\s+([A-Za-z0-9_$]+)/);
  if (typeMatch) return { name: typeMatch[1], kind: "type" };

  const compMatch = content.match(
    /export\s+(?:default\s+)?function\s+([A-Z][A-Za-z0-9_$]+)/,
  );
  if (compMatch && isTsx) return { name: compMatch[1], kind: "component" };

  const fnMatch = content.match(
    /export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/,
  );
  if (fnMatch) return { name: fnMatch[1], kind: "function" };

  return null;
}

/**
 * Analyzes the semantic patterns inside the added/removed lines.
 */
function detectContentIntent(search: string, replace: string): string | null {
  if (
    !search.includes("catch") &&
    (replace.includes("try {") ||
      replace.includes("catch (") ||
      replace.includes("throw new Error"))
  ) {
    return "improve error handling";
  }

  if (!search.includes("console.log") && replace.includes("console.log")) {
    return "add debug logging";
  }

  const isOnlyClassChanges =
    replace.includes("className=") &&
    !search.includes("className=") &&
    replace.length < 300;
  if (isOnlyClassChanges) {
    return "update component styling";
  }

  const isImportOnly = replace
    .trim()
    .split("\n")
    .every(
      (l) =>
        l.trim().startsWith("import ") ||
        l.trim().startsWith("import type") ||
        l.trim() === "",
    );
  if (isImportOnly && replace.trim().length > 0) {
    return "update module imports";
  }

  return null;
}

/**
 * Resolves intent for common configuration, test, and documentation files.
 */
function detectConfigFileIntent(file: string, replace: string): string | null {
  if (file.endsWith("package.json")) {
    if (
      replace.includes('"dependencies"') ||
      replace.includes('"devDependencies"')
    ) {
      return "chore(deps): update package dependencies";
    }
    if (replace.includes('"scripts"')) {
      return "chore: update npm scripts";
    }
    return "chore: update package.json";
  }
  if (file.endsWith(".md")) return `docs: update ${getBaseName(file)}`;
  if (file.includes("tsconfig")) {
    return "chore(config): update TypeScript configuration";
  }
  if (file.includes("eslint")) return "chore(lint): update ESLint rules";
  if (file.includes(".test.") || file.includes(".spec.")) {
    return `test: update ${getBaseName(file)}`;
  }
  return null;
}

function resolveIntentType(intent: string): string {
  if (intent.startsWith("update component styling")) return "style";
  if (intent.startsWith("improve error")) return "fix";
  return "chore";
}

function formatSingleFileCommit(
  file: string,
  block: DiffBlock,
  scopePrefix: string,
): string {
  const baseName = getBaseName(file);
  const replaceText = block.replace || "";
  const searchText = block.search || "";

  const configIntent = detectConfigFileIntent(file, replaceText);
  if (configIntent) return configIntent;

  const isMove =
    block.changeType === "MOVE" ||
    block.changeType === "RENAME" ||
    Boolean(block.moveTo);
  if (isMove) {
    const target = block.moveTo ? getBaseName(block.moveTo) : baseName;
    return `refactor${scopePrefix}: move ${baseName} to ${target}`;
  }

  const isTsx = file.endsWith(".tsx") || file.endsWith(".jsx");
  const symbol = detectSymbol(replaceText, isTsx);
  const isCreate =
    block.changeType === "CREATE" || (!block.search && Boolean(block.replace));

  if (isCreate) {
    return symbol
      ? `feat${scopePrefix}: add ${symbol.name} ${symbol.kind}`
      : `feat${scopePrefix}: add ${baseName}`;
  }

  const intent = detectContentIntent(searchText, replaceText);
  if (intent) {
    const type = resolveIntentType(intent);
    return `${type}${scopePrefix}: ${intent} in ${baseName}`;
  }

  if (symbol) {
    return `refactor${scopePrefix}: update ${symbol.name} in ${baseName}`;
  }

  return `refactor${scopePrefix}: update ${baseName}`;
}

function formatMultiFileCommit(
  diffBlocks: DiffBlock[],
  scopePrefix: string,
): string {
  const actions = diffBlocks.map((b) => {
    const file = b.matchedFile || b.file;
    const base = getBaseName(file);
    if (b.changeType === "CREATE" || (!b.search && b.replace)) {
      return `add ${base}`;
    }
    if (b.changeType === "MOVE" || b.changeType === "RENAME") {
      return `move ${base}`;
    }
    return `update ${base}`;
  });
  const uniqueActions = Array.from(new Set(actions));
  const allCreates = diffBlocks.every(
    (b) => b.changeType === "CREATE" || (!b.search && b.replace),
  );
  const type = allCreates ? "feat" : "refactor";
  return `${type}${scopePrefix}: ${uniqueActions.join(", ")}`;
}

function formatLargeChangesetCommit(
  files: string[],
  scopePrefix: string,
): string {
  const firstTwo = files.slice(0, 2).map(getBaseName).join(", ");
  const remaining = files.length - 2;
  return `refactor${scopePrefix}: update ${files.length} files (${firstTwo}, +${remaining} more)`;
}

/**
 * Generates an automatic, deterministic Conventional Commit message using
 * AST-like content heuristics (symbol detection, pattern analysis, and scope resolution)
 * without requiring any LLM calls.
 */
export function generateCommitMessage(diffBlocks: DiffBlock[]): string {
  if (!diffBlocks || diffBlocks.length === 0) {
    return "chore: update repository files";
  }

  const files = Array.from(
    new Set(
      diffBlocks.map((b) => b.matchedFile || b.file).filter(Boolean),
    ),
  );
  if (files.length === 0) return "chore: update repository files";

  const scope = detectScope(files);
  const scopePrefix = scope ? `(${scope})` : "";

  if (files.length === 1) {
    return formatSingleFileCommit(files[0], diffBlocks[0], scopePrefix);
  }

  if (files.length <= 3) {
    return formatMultiFileCommit(diffBlocks, scopePrefix);
  }

  return formatLargeChangesetCommit(files, scopePrefix);
}