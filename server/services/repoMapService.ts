import fs from "fs";
import path from "path";

/**
 * Generates a symbol map of the repository files.
 */
export function generateRepoMap(basePath: string, filesList: string[]): string {
  let mapOutput = "";
  for (const file of filesList) {
    const fullPath = path.join(basePath, file);
    const ext = path.extname(file).toLowerCase();
    let content: string;
    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch (e) {
      continue;
    }

    let symbols: string[] = [];
    const lines = content.split("\n");

    for (let line of lines) {
      const trimmed = line.trim();
      if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
        let match = trimmed.match(
          /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|type)\s+([A-Za-z0-9_]+)/,
        );
        if (match) {
          symbols.push(trimmed.replace(/\s*\{.*$/, ""));
          continue;
        }

        match = trimmed.match(
          /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>/,
        );
        if (match) {
          symbols.push(trimmed.replace(/\s*=>.*$/, "=> { ... }"));
          continue;
        }
      } else if ([".py"].includes(ext)) {
        if (/^(?:async\s+)?(?:def|class)\s+[A-Za-z0-9_]+/.test(trimmed)) {
          symbols.push(trimmed.replace(/:.*$/, ""));
        }
      } else if ([".go"].includes(ext)) {
        if (
          /^func\s+[A-Za-z0-9_]+/.test(trimmed) ||
          /^type\s+[A-Za-z0-9_]+\s+(?:struct|interface)/.test(trimmed)
        ) {
          symbols.push(trimmed.replace(/\{.*$/, ""));
        }
      }
    }

    if (symbols.length > 0) {
      mapOutput += file + ":\n";
      symbols.forEach((s) => (mapOutput += "│ " + s + "\n"));
    } else {
      mapOutput += file + "\n";
    }
  }
  return mapOutput.trim();
}