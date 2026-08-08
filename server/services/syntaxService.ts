import path from "path";
import { transformSync } from "esbuild";

/**
 * Validates JS/TS/JSX/TSX syntax in memory before writing to disk.
 */
export function validateSyntax(content: string, filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  if (![".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"].includes(ext)) {
    return null; // Skip non-code files (JSON, CSS, Markdown, etc.)
  }

  try {
    let loader = ext.slice(1);
    if (!["js", "jsx", "ts", "tsx"].includes(loader)) loader = "js";

    transformSync(content, {
      loader: loader as "js" | "jsx" | "ts" | "tsx",
      jsx: "transform",
      format: "esm",
    });
    return null; // Valid syntax!
  } catch (err: any) {
    const errorMsg =
      err.errors && err.errors[0]
        ? `${err.errors[0].text} (line ${err.errors[0].location?.line || "?"})`
        : err.message;
    return `Pre-flight SyntaxError in ${filePath}: ${errorMsg}`;
  }
}