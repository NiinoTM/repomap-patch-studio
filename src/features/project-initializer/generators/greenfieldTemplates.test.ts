import { describe, it, expect } from "vitest";
import {
  buildGreenfieldPackageJson,
  buildGreenfieldTsConfig,
  buildGreenfieldEslintConfig,
  buildHuskyContent,
} from "./greenfieldTemplates";
import type { GovernanceScaffoldOptions } from "../../../types/remediation";

const baseOptions: GovernanceScaffoldOptions = {
  eslintSizeLimits: true,
  eslintLayerBoundaries: true,
  huskyPreCommitHook: true,
  huskyLeakedMarkerCheck: true,
  telemetryDbMonitoring: false,
  featurePublicApiBarrier: true,
  strictSubpathExports: true,
  knipDeadCodeDetection: true,
  dpdmCircularCheck: true,
  strictAsyncSafety: true,
  featureDirectorySkeleton: true,
  autoInstallDependencies: true,
  zodRuntimeContracts: true,
  vitestUnitTesting: true,
  playwrightCriticalFlows: false,
  softTechnicalDebtMode: false,
};

describe("greenfield package and tsconfig generators", () => {
  it("generates package.json with subpath exports and lint-staged when public API barrier is on", () => {
    const raw = buildGreenfieldPackageJson(baseOptions);
    const pkg = JSON.parse(raw);

    expect(pkg.exports).toEqual({
      ".": "./src/main.tsx",
      "./features/*": "./src/features/*/index.ts",
    });
    expect(pkg["lint-staged"]).toBeDefined();
    expect(pkg["lint-staged"]["*.{ts,tsx,js,jsx}"]).toContain("eslint --max-warnings=0");
    expect(pkg.dependencies.zod).toBeDefined();
  });

  it("generates tsconfig.json with strict @features/* path fences", () => {
    const raw = buildGreenfieldTsConfig(baseOptions);
    const tsconfig = JSON.parse(raw);

    expect(tsconfig.compilerOptions.baseUrl).toBe(".");
    expect(tsconfig.compilerOptions.paths["@features/*"]).toEqual([
      "src/features/*/index.ts",
    ]);
    expect(tsconfig.compilerOptions.paths["@/*"]).toEqual(["./src/*"]);
  });
});

describe("greenfield eslint and husky generators", () => {
  it("generates eslint.config.js with no-restricted-imports rules", () => {
    const eslintConfig = buildGreenfieldEslintConfig(baseOptions);

    expect(eslintConfig).toContain('"no-restricted-imports"');
    expect(eslintConfig).toContain("@/src/features/*/**");
    expect(eslintConfig).toContain("../*/features/**");
    expect(eslintConfig).toContain("boundaries/entry-point");
  });

  it("generates pre-commit hook with marker checks, circular dependency gates, and lint-staged", () => {
    const husky = buildHuskyContent(baseOptions);

    expect(husky).toContain("Leaked patch markers found!");
    expect(husky).toContain("npx dpdm");
    expect(husky).toContain("npx lint-staged");
    expect(husky).toContain("npm test");
  });
});