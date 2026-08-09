import { ESLint } from "eslint";
import { resolvePath } from "../adapters/fsAdapter";

const LINTABLE_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];

// One ESLint instance per repo path — flat config resolution (reading
// eslint.config.js, resolving plugins) isn't free, and every apply-changes
// transaction can call this several times in one request.
let cachedLinter: { repoPath: string; instance: ESLint } | null = null;

function getLinter(repoPath: string): ESLint {
  if (cachedLinter && cachedLinter.repoPath === repoPath) {
    return cachedLinter.instance;
  }
  const instance = new ESLint({ cwd: repoPath });
  cachedLinter = { repoPath, instance };
  return instance;
}

/**
 * Lints in-memory content (not yet written to disk) against the target
 * repo's own eslint.config.js. Only error-severity findings are returned —
 * warn-level rules (e.g. @typescript-eslint/no-explicit-any) are
 * intentionally non-blocking, matching how the project's own config treats
 * them. Lint is a best-effort enhancement: if ESLint itself fails to run
 * (missing plugin, unresolvable config, etc.), this fails open rather than
 * aborting a transaction over tooling trouble unrelated to the edit itself.
 */
export async function validateLint(
  repoPath: string,
  content: string,
  filePath: string,
): Promise<string[]> {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  if (!LINTABLE_EXTENSIONS.includes(ext)) return [];

  try {
    const eslint = getLinter(repoPath);
    const absolutePath = resolvePath(repoPath, filePath);

    const isIgnored = await eslint.isPathIgnored(absolutePath);
    if (isIgnored) return [];

    const results = await eslint.lintText(content, { filePath: absolutePath });
    const errors: string[] = [];

    for (const result of results) {
      for (const msg of result.messages) {
        if (msg.severity === 2) {
          const rule = msg.ruleId ? ` (${msg.ruleId})` : "";
          errors.push(
            `ESLint error in ${filePath}:${msg.line ?? "?"} — ${msg.message}${rule}`,
          );
        }
      }
    }

    return errors;
  } catch {
    return [];
  }
}
