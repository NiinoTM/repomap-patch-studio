import { transformSync } from "esbuild";
import { extnamePath } from "../adapters/fsAdapter";

export function validateSyntax(content: string, filePath: string): string | null {
  const ext = extnamePath(filePath).toLowerCase();
  if (![".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"].includes(ext)) {
    return null;
  }

  try {
    let loader = ext.slice(1);
    if (!["js", "jsx", "ts", "tsx"].includes(loader)) loader = "js";

    transformSync(content, {
      loader: loader as "js" | "jsx" | "ts" | "tsx",
      jsx: "transform",
      format: "esm",
    });
    return null;
  } catch (err: unknown) {
    const esbuildErr = err as { errors?: { text: string; location?: { line?: number } }[] };
    const errorMsg =
      esbuildErr.errors && esbuildErr.errors[0]
        ? `${esbuildErr.errors[0].text} (line ${esbuildErr.errors[0].location?.line || "?"})`
        : err instanceof Error
          ? err.message
          : String(err);
    return `Pre-flight SyntaxError in ${filePath}: ${errorMsg}`;
  }
}