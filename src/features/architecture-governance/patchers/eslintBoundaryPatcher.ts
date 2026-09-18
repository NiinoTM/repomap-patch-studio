import { GovernanceScaffoldOptions } from "../../../types/remediation";

function buildRestrictedImportsConfig(severity: string): string {
  return `,\n  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "${severity}",
        {
          patterns: [
            {
              group: ["@/src/features/*/**", "@/features/*/**", "src/features/*/**"],
              message: "Direct internal feature imports via root alias are forbidden. Import from '@features/<domain>'.",
            },
            {
              group: ["../*/features/**", "../../features/**", "../features/**"],
              message: "Cross-feature relative imports are forbidden. Import from '@features/<domain>'.",
            },
          ],
        },
      ],
    },
  }`;
}

function buildBoundaryObject(opts: GovernanceScaffoldOptions): string {
  const severity = opts.softTechnicalDebtMode ? "warn" : "error";
  const entryPointRule = opts.featurePublicApiBarrier
    ? `\n      "boundaries/entry-point": ["${severity}", { default: "disallow", rules: [{ target: ["src/features/*/**/*"], allow: "src/features/*/index.ts" }] }],`
    : "";
  const restrictedConfig = opts.featurePublicApiBarrier ? buildRestrictedImportsConfig(severity) : "";

  return `  {
    files: ["src/**/*.{ts,tsx}", "server/**/*.ts"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "components", pattern: "src/features/*/components/*" },
        { type: "hooks", pattern: "src/features/*/hooks/*" },
        { type: "feature-api", pattern: "src/features/*/api/*" },
        { type: "shared-api", pattern: "src/api/*" },
        { type: "routes", pattern: "server/routes/*" },
        { type: "services", pattern: "server/services/*" },
        { type: "adapters", pattern: "server/adapters/*" },
      ],
    },
    rules: {
      "boundaries/element-types": ["${severity}", {
        default: "disallow",
        rules: [
          { from: "components", allow: ["hooks"] },
          { from: "hooks", allow: ["feature-api", "shared-api"] },
          { from: "routes", allow: ["services"] },
          { from: "services", allow: ["adapters"] },
          { from: "adapters", allow: [] },
        ],
      }],${entryPointRule}
    },
  }${restrictedConfig}`;
}

function injectBoundaryConfig(content: string, chunk: string): string {
  let updated = content;
  if (!updated.includes('import boundaries from "eslint-plugin-boundaries"')) {
    updated = `import boundaries from "eslint-plugin-boundaries";\n${updated}`;
  }

  const exportMatch = updated.match(/(export\s+default\s+(?:tseslint\.config\(|\[))([\s\S]*?)(\]|\);?\s*$)/);
  if (exportMatch) {
    const prefix = exportMatch[1];
    const body = exportMatch[2].trimEnd();
    const suffix = exportMatch[3];
    const separator = body.length > 0 && !body.endsWith(",") ? ",\n" : "\n";
    return updated.replace(
      exportMatch[0],
      `${prefix}${body}${separator}${chunk}\n${suffix}`,
    );
  }

  return `${updated}\n\nexport default [\n${chunk}\n];\n`;
}

export function patchEslintConfig(
  existingContent: string | null | undefined,
  opts: GovernanceScaffoldOptions,
): { content: string; isModified: boolean } {
  if (!opts.eslintLayerBoundaries && !opts.featurePublicApiBarrier) {
    return { content: existingContent || "", isModified: false };
  }

  const chunk = buildBoundaryObject(opts);
  if (!existingContent || existingContent.trim() === "") {
    const starter = `import js from "@eslint/js";\nimport tseslint from "typescript-eslint";\nimport boundaries from "eslint-plugin-boundaries";\n\nexport default tseslint.config(\n  js.configs.recommended,\n  ...tseslint.configs.recommended,\n${chunk}\n);\n`;
    return { content: starter, isModified: false };
  }

  if (existingContent.includes('"boundaries/element-types"')) {
    return { content: existingContent, isModified: false };
  }

  return {
    content: injectBoundaryConfig(existingContent, chunk),
    isModified: true,
  };
}