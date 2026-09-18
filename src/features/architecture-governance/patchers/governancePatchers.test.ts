import { describe, it, expect } from "vitest";
import { patchTsConfig } from "./tsConfigPatcher";
import { patchPackageJson } from "./packageJsonPatcher";
import { patchEslintConfig } from "./eslintBoundaryPatcher";
import type { GovernanceScaffoldOptions } from "../../../types/remediation";

const options: GovernanceScaffoldOptions = {
  eslintSizeLimits: true,
  eslintLayerBoundaries: true,
  huskyPreCommitHook: true,
  huskyLeakedMarkerCheck: true,
  telemetryDbMonitoring: false,
  featurePublicApiBarrier: true,
  strictSubpathExports: true,
  knipDeadCodeDetection: false,
  dpdmCircularCheck: false,
  strictAsyncSafety: false,
  featureDirectorySkeleton: true,
  autoInstallDependencies: false,
  zodRuntimeContracts: true,
  vitestUnitTesting: true,
  playwrightCriticalFlows: false,
  softTechnicalDebtMode: false,
};

describe("patchTsConfig", () => {
  it("non-destructively merges @features/* paths without overwriting user paths", () => {
    const existing = JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        paths: {
          "@custom/*": ["src/custom/*"],
        },
      },
    });

    const result = patchTsConfig(existing, options);
    const parsed = JSON.parse(result.content);

    expect(parsed.compilerOptions.baseUrl).toBe(".");
    expect(parsed.compilerOptions.paths["@custom/*"]).toEqual(["src/custom/*"]);
    expect(parsed.compilerOptions.paths["@features/*"]).toEqual(["src/features/*/index.ts"]);
    expect(parsed.compilerOptions.types).toContain("vitest/globals");
  });
});

describe("patchPackageJson and patchEslintConfig", () => {
  it("patchPackageJson merges exports, zod, and lint-staged non-destructively", () => {
    const existing = JSON.stringify({
      name: "existing-app",
      scripts: {
        start: "node index.js",
      },
      dependencies: {
        express: "^4.19.0",
      },
    });

    const result = patchPackageJson(existing, options);
    const parsed = JSON.parse(result.content);

    expect(parsed.scripts.start).toBe("node index.js");
    expect(parsed.scripts.lint).toBe("eslint .");
    expect(parsed.dependencies.zod).toBeDefined();
    expect(parsed.exports["./features/*"]).toBe("./src/features/*/index.ts");
    expect(parsed["lint-staged"]["*.{ts,tsx,js,jsx}"]).toContain("eslint --max-warnings=0");
  });

  it("patchEslintConfig injects no-restricted-imports and boundaries configuration", () => {
    const existing = `import tseslint from "typescript-eslint";\nexport default tseslint.config(\n);\n`;

    const result = patchEslintConfig(existing, options);

    expect(result.content).toContain('import boundaries from "eslint-plugin-boundaries";');
    expect(result.content).toContain('"no-restricted-imports"');
    expect(result.content).toContain("@/src/features/*/**");
    expect(result.content).toContain('"boundaries/element-types"');
  });
});