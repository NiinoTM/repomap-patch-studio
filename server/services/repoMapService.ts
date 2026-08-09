import { readTextFile, joinPath, extnamePath } from "../adapters/fsAdapter";

const JS_LIKE_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

function extractJsLikeSymbol(trimmedLine: string): string | null {
  let match = trimmedLine.match(
    /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|type)\s+([A-Za-z0-9_]+)/,
  );
  if (match) return trimmedLine.replace(/\s*\{.*$/, "");

  match = trimmedLine.match(
    /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>/,
  );
  if (match) return trimmedLine.replace(/\s*=>.*$/, "=> { ... }");

  return null;
}

function extractPythonSymbol(trimmedLine: string): string | null {
  if (/^(?:async\s+)?(?:def|class)\s+[A-Za-z0-9_]+/.test(trimmedLine)) {
    return trimmedLine.replace(/:.*$/, "");
  }
  return null;
}

function extractGoSymbol(trimmedLine: string): string | null {
  if (
    /^func\s+[A-Za-z0-9_]+/.test(trimmedLine) ||
    /^type\s+[A-Za-z0-9_]+\s+(?:struct|interface)/.test(trimmedLine)
  ) {
    return trimmedLine.replace(/\{.*$/, "");
  }
  return null;
}

function extractSymbolFromLine(trimmedLine: string, ext: string): string | null {
  if (JS_LIKE_EXTENSIONS.includes(ext)) return extractJsLikeSymbol(trimmedLine);
  if (ext === ".py") return extractPythonSymbol(trimmedLine);
  if (ext === ".go") return extractGoSymbol(trimmedLine);
  return null;
}

function extractSymbolsFromContent(content: string, ext: string): string[] {
  const symbols: string[] = [];
  for (const line of content.split("\n")) {
    const symbol = extractSymbolFromLine(line.trim(), ext);
    if (symbol) symbols.push(symbol);
  }
  return symbols;
}

function formatFileEntry(file: string, symbols: string[]): string {
  if (symbols.length === 0) return file + "\n";
  return file + ":\n" + symbols.map((s) => "│ " + s + "\n").join("");
}

/**
 * Generates a symbol map of the repository files.
 */
export function generateRepoMap(basePath: string, filesList: string[]): string {
  let mapOutput = "";

  for (const file of filesList) {
    let content: string;
    try {
      content = readTextFile(joinPath(basePath, file));
    } catch {
      continue;
    }

    const symbols = extractSymbolsFromContent(content, extnamePath(file).toLowerCase());
    mapOutput += formatFileEntry(file, symbols);
  }

  return mapOutput.trim();
}