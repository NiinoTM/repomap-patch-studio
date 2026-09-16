import { GovernanceScaffoldOptions } from "../../../types/remediation";

interface TsConfigShape {
  compilerOptions?: Record<string, unknown>;
  include?: string[];
  exclude?: string[];
  [key: string]: unknown;
}

function mergeCompilerOptions(
  existing: Record<string, unknown> = {},
  opts: GovernanceScaffoldOptions,
): Record<string, unknown> {
  const merged = { ...existing };
  if (merged.strict === undefined) merged.strict = true;
  if (merged.skipLibCheck === undefined) merged.skipLibCheck = true;

  if (opts.vitestUnitTesting) {
    const types = Array.isArray(merged.types) ? [...merged.types] : [];
    if (!types.includes("vitest/globals")) types.push("vitest/globals");
    merged.types = types;
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