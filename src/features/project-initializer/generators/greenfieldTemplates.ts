import { GovernanceScaffoldOptions } from "../../../types/remediation";

function getGreenfieldDevDeps(opts: GovernanceScaffoldOptions): Record<string, string> {
  const base: Record<string, string> = {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.9",
    "@vitejs/plugin-react": "^4.3.1",
    vite: "^5.3.1",
    typescript: "^5.5.2",
    "@eslint/js": "^9.5.0",
    eslint: "^9.5.0",
    "typescript-eslint": "^8.0.0",
  };
  if (opts.eslintLayerBoundaries || opts.featurePublicApiBarrier) base["eslint-plugin-boundaries"] = "^7.0.0";
  if (opts.huskyPreCommitHook) {
    base["husky"] = "^9.0.0";
    base["lint-staged"] = "^15.0.0";
  }
  if (opts.knipDeadCodeDetection) base["knip"] = "^5.0.0";
  if (opts.dpdmCircularCheck) base["dpdm"] = "^3.14.0";
  if (opts.vitestUnitTesting) base["vitest"] = "^2.0.0";
  if (opts.playwrightCriticalFlows) base["@playwright/test"] = "^1.50.0";
  return base;
}

function getGreenfieldScripts(opts: GovernanceScaffoldOptions): Record<string, string> {
  return {
    dev: "vite",
    build: "tsc && vite build",
    lint: "eslint .",
    typecheck: "tsc --noEmit",
    ...(opts.vitestUnitTesting ? { test: "vitest run", "test:watch": "vitest" } : {}),
    ...(opts.playwrightCriticalFlows ? { "test:e2e": "playwright test", "test:e2e:ui": "playwright test --ui" } : {}),
    ...(opts.knipDeadCodeDetection ? { knip: "knip" } : {}),
    ...(opts.dpdmCircularCheck ? { "check:circular": "dpdm --warning=false --tree=false --exit-code circular:1 src/" } : {}),
    "start:server": "node --loader ts-node/esm server/index.ts",
  };
}

export function buildGreenfieldPackageJson(opts: GovernanceScaffoldOptions): string {
  const deps: Record<string, string> = {
    react: "^18.3.1",
    "react-dom": "^18.3.1",
    express: "^4.19.2",
    ...(opts.zodRuntimeContracts ? { zod: "^3.23.8" } : {}),
  };
  const pkg: Record<string, unknown> = {
    name: "modular-governed-app",
    private: true,
    version: "0.1.0",
    type: "module",
    ...(opts.featurePublicApiBarrier || opts.strictSubpathExports
      ? {
          exports: {
            ".": "./src/main.tsx",
            "./features/*": "./src/features/*/index.ts",
          },
        }
      : {}),
    scripts: getGreenfieldScripts(opts),
    dependencies: deps,
    devDependencies: getGreenfieldDevDeps(opts),
    ...(opts.huskyPreCommitHook
      ? {
          "lint-staged": {
            "*.{ts,tsx,js,jsx}": ["eslint --max-warnings=0"],
          },
        }
      : {}),
    sideEffects: ["**/*.css", "**/*.scss"],
  };
  return JSON.stringify(pkg, null, 2);
}

export function buildGreenfieldTsConfig(opts?: GovernanceScaffoldOptions): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["DOM", "DOM.Iterable", "ES2022"],
        module: "NodeNext",
        moduleResolution: "NodeNext",
        jsx: "react-jsx",
        strict: true,
        skipLibCheck: true,
        esModuleInterop: true,
        isolatedModules: true,
        ...(opts?.featurePublicApiBarrier
          ? {
              baseUrl: ".",
              paths: {
                "@features/*": ["src/features/*/index.ts"],
                "@/*": ["./src/*"],
              },
            }
          : {}),
        ...(opts?.vitestUnitTesting ? { types: ["vitest/globals"] } : {}),
      },
      include: ["src/**/*", "server/**/*", "vite.config.ts"],
    },
    null,
    2,
  );
}

function buildRestrictedImportsConfig(severity: string): string {
  return `,
  {
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

function buildBoundariesConfig(opts: GovernanceScaffoldOptions, severity: string): string {
  if (!opts.eslintLayerBoundaries && !opts.featurePublicApiBarrier) return "";
  const entryPointRule = opts.featurePublicApiBarrier
    ? `"boundaries/entry-point": ["${severity}", { default: "disallow", rules: [{ target: ["src/features/*/**/*"], allow: "src/features/*/index.ts" }] }],`
    : "";
  const restrictedImportsConfig = opts.featurePublicApiBarrier ? buildRestrictedImportsConfig(severity) : "";

  return `,
  {
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
      }],
      ${entryPointRule}
    },
  }${restrictedImportsConfig}`;
}

export function buildGreenfieldEslintConfig(opts: GovernanceScaffoldOptions): string {
  const severity = opts.softTechnicalDebtMode ? "warn" : "error";
  const hasBoundaries = opts.eslintLayerBoundaries || opts.featurePublicApiBarrier;
  const boundariesImport = hasBoundaries ? 'import boundaries from "eslint-plugin-boundaries";\n' : "";
  const tsMax = opts.eslintSizeLimits ? 250 : 500;
  const tsxMax = opts.eslintSizeLimits ? 350 : 700;
  const asyncRules = opts.strictAsyncSafety
    ? '"@typescript-eslint/no-floating-promises": "error",\n      "@typescript-eslint/await-thenable": "error",\n      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { attributes: false } }],'
    : "";

  return `import js from "@eslint/js";
import tseslint from "typescript-eslint";
${boundariesImport}export default tseslint.config(
  { ignores: ["dist/**", "build/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "server/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true }${opts.strictAsyncSafety ? ", projectService: true" : ""} },
    },
    rules: {
      "max-lines": ["${severity}", { max: ${tsMax}, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 50, skipBlankLines: true }],
      complexity: ["warn", { max: 10 }],
      ${asyncRules}
    },
  },
  {
    files: ["src/**/*.tsx"],
    rules: {
      "max-lines": ["${severity}", { max: ${tsxMax}, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 280, skipBlankLines: true }],
      complexity: ["warn", { max: 35 }],
    },
  }${buildBoundariesConfig(opts, severity)}
);
`;
}

export function buildGreenfieldKnipConfig(): string {
  return JSON.stringify(
    {
      $schema: "https://unpkg.com/knip@5/overview/schema.json",
      entry: ["src/main.tsx!", "server/index.ts!"],
      project: ["src/**/*.{ts,tsx}!", "server/**/*.ts!"],
      ignoreDependencies: ["husky", "lint-staged"],
    },
    null,
    2,
  );
}

export function buildHuskyContent(opts: GovernanceScaffoldOptions): string {
  const lines = [
    'if git diff --cached | grep -E "<{7} SEARCH|>{7} REPLACE"; then',
    '  echo "❌ Commit rejected: Leaked patch markers found!"',
    "  exit 1",
    "fi",
    "",
  ];
  if (opts.dpdmCircularCheck) lines.push("npx dpdm --warning=false --tree=false --exit-code circular:1 src/", "");
  if (opts.vitestUnitTesting) lines.push("npm test", "");
  lines.push("npx lint-staged", "");
  return lines.join("\n");
}