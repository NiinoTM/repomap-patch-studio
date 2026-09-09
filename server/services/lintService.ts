import { ESLint, type Linter } from "eslint";
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

function formatLintMessage(filePath: string, msg: Linter.LintMessage): string {
  const prefix = msg.severity === 1 ? "ESLint warning" : "ESLint error";
  const rule = msg.ruleId ? ` (${msg.ruleId})` : "";
  const line = msg.line ?? "?";
  return `${prefix} in ${filePath}:${line} — ${msg.message}${rule}`;
}

/**
 * Lints in-memory content (not yet written to disk) against the target
 * repo's own eslint.config.js. Both error and warning findings are returned
 * so pre-commit hooks enforcing --max-warnings=0 can be caught upfront in diffs.
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
        if (msg.severity >= 1) {
          errors.push(formatLintMessage(filePath, msg));
        }
      }
    }

    return errors;
  } catch {
    return [];
  }
}
