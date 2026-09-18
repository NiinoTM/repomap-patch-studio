import { GovernanceScaffoldOptions } from "../../../types/remediation";

interface TsConfigShape {
  compilerOptions?: Record<string, unknown>;
  include?: string[];
  exclude?: string[];
  [key: string]: unknown;
}

function mergeFeaturePaths(existingPaths: unknown): Record<string, unknown> {
  const paths =
    typeof existingPaths === "object" && existingPaths !== null
      ? { ...(existingPaths as Record<string, unknown>) }
      : {};
  paths["@features/*"] = paths["@features/*"] || ["src/features/*/index.ts"];
  return paths;
}

function mergeVitestTypes(existingTypes: unknown): string[] {
  const types = Array.isArray(existingTypes) ? [...existingTypes] : [];
  return types.includes("vitest/globals") ? types : [...types, "vitest/globals"];
}

function mergeCompilerOptions(
  existing: Record<string, unknown> = {},
  opts: GovernanceScaffoldOptions,
): Record<string, unknown> {
  const merged = { ...existing };
  merged.strict = merged.strict ?? true;
  merged.skipLibCheck = merged.skipLibCheck ?? true;

  if (opts.featurePublicApiBarrier) {
    merged.baseUrl = merged.baseUrl || ".";
    merged.paths = mergeFeaturePaths(merged.paths);
  }

  if (opts.vitestUnitTesting) {
    merged.types = mergeVitestTypes(merged.types);
  }
  return merged;
}

function mergeInclude(existing?: string[]): string[] {
  const list = Array.isArray(existing) ? [...existing] : ["src/**/*"];
  if (!list.includes("src/**/*")) list.push("src/**/*");
  if (!list.includes("server/**/*")) list.push("server/**/*");
  return list;
}

export function patchTsConfig(
  existingContent: string | null | undefined,
  opts: GovernanceScaffoldOptions,
): { content: string; isModified: boolean } {
  let parsed: TsConfigShape = {};
  if (existingContent) {
    try {
      parsed = JSON.parse(existingContent);
    } catch {
      parsed = {};
    }
  }

  parsed.compilerOptions = mergeCompilerOptions(parsed.compilerOptions, opts);
  parsed.include = mergeInclude(parsed.include);

  return {
    content: JSON.stringify(parsed, null, 2) + "\n",
    isModified: Boolean(existingContent),
  };
}