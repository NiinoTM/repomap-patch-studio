import { GovernanceScaffoldOptions } from "../../../types/remediation";

interface PackageJsonShape {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  sideEffects?: string[] | boolean;
  exports?: Record<string, unknown> | string;
  "lint-staged"?: Record<string, string[]>;
  [key: string]: unknown;
}

interface ScriptDefinition {
  name: string;
  cmd: string;
  enabled: boolean;
}

function getScriptDefinitions(opts: GovernanceScaffoldOptions): ScriptDefinition[] {
  return [
    { name: "lint", cmd: "eslint .", enabled: true },
    { name: "typecheck", cmd: "tsc --noEmit", enabled: true },
    { name: "test", cmd: "vitest run", enabled: opts.vitestUnitTesting },
    { name: "test:e2e", cmd: "playwright test", enabled: opts.playwrightCriticalFlows },
    { name: "knip", cmd: "knip", enabled: opts.knipDeadCodeDetection },
    {
      name: "check:circular",
      cmd: "dpdm --warning=false --tree=false --exit-code circular:1 src/",
      enabled: opts.dpdmCircularCheck,
    },
  ];
}

function getMissingScripts(
  existing: Record<string, string> = {},
  opts: GovernanceScaffoldOptions,
): Record<string, string> {
  const missing: Record<string, string> = {};
  const scripts = getScriptDefinitions(opts);
  for (const { name, cmd, enabled } of scripts) {
    if (enabled && !existing[name]) {
      missing[name] = cmd;
    }
  }
  return missing;
}

function getRequiredDevDeps(
  existing: Record<string, string> = {},
  opts: GovernanceScaffoldOptions,
): Record<string, string> {
  const needed: Record<string, string> = {};
  const addIfMissing = (pkg: string, ver: string) => {
    if (!existing[pkg]) needed[pkg] = ver;
  };
  addIfMissing("eslint", "^9.0.0");
  addIfMissing("typescript-eslint", "^8.0.0");
  if (opts.eslintLayerBoundaries || opts.featurePublicApiBarrier) {
    addIfMissing("eslint-plugin-boundaries", "^7.0.0");
  }
  if (opts.huskyPreCommitHook) {
    addIfMissing("husky", "^9.0.0");
    addIfMissing("lint-staged", "^15.0.0");
  }
  if (opts.knipDeadCodeDetection) addIfMissing("knip", "^5.0.0");
  if (opts.dpdmCircularCheck) addIfMissing("dpdm", "^3.14.0");
  if (opts.vitestUnitTesting) addIfMissing("vitest", "^2.0.0");
  if (opts.playwrightCriticalFlows) addIfMissing("@playwright/test", "^1.50.0");
  return needed;
}

function mergeSideEffects(existing?: string[] | boolean): string[] {
  const base = Array.isArray(existing) ? [...existing] : [];
  if (!base.includes("**/*.css")) base.push("**/*.css");
  if (!base.includes("**/*.scss")) base.push("**/*.scss");
  return base;
}

function parseExistingPackageJson(content?: string | null): PackageJsonShape {
  if (!content) return {};
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function mergeSubpathExports(existingExports?: unknown): Record<string, unknown> {
  const current =
    typeof existingExports === "object" && existingExports !== null
      ? { ...(existingExports as Record<string, unknown>) }
      : {};
  current["./features/*"] = current["./features/*"] || "./src/features/*/index.ts";
  current["."] = current["."] || "./src/main.tsx";
  return current;
}

function mergeLintStaged(existingLintStaged?: unknown): Record<string, string[]> {
  const current =
    typeof existingLintStaged === "object" && existingLintStaged !== null
      ? { ...(existingLintStaged as Record<string, string[]>) }
      : {};
  current["*.{ts,tsx,js,jsx}"] = current["*.{ts,tsx,js,jsx}"] || ["eslint --max-warnings=0"];
  return current;
}

function shouldAddZod(deps?: Record<string, string>, devDeps?: Record<string, string>): boolean {
  return !deps?.zod && !devDeps?.zod;
}

export function patchPackageJson(
  existingContent: string | null | undefined,
  opts: GovernanceScaffoldOptions,
): { content: string; isModified: boolean } {
  const parsed = parseExistingPackageJson(existingContent);

  parsed.scripts = { ...parsed.scripts, ...getMissingScripts(parsed.scripts, opts) };

  if (opts.zodRuntimeContracts && shouldAddZod(parsed.dependencies, parsed.devDependencies)) {
    parsed.dependencies = { ...parsed.dependencies, zod: "^3.23.8" };
  }

  parsed.devDependencies = {
    ...parsed.devDependencies,
    ...getRequiredDevDeps(parsed.devDependencies, opts),
  };

  if (opts.featurePublicApiBarrier) {
    parsed.sideEffects = mergeSideEffects(parsed.sideEffects);
    parsed.exports = mergeSubpathExports(parsed.exports);
  }

  if (opts.huskyPreCommitHook) {
    parsed["lint-staged"] = mergeLintStaged(parsed["lint-staged"]);
  }

  return {
    content: JSON.stringify(parsed, null, 2) + "\n",
    isModified: Boolean(existingContent),
  };
}