import { DiffBlock } from "../../../types/patch";
import { GovernanceScaffoldOptions } from "../../../types/remediation";

function makeCreateBlock(file: string, replace: string): DiffBlock {
  return {
    id: `scaffold-${file.replace(/[^a-zA-Z0-9]/g, "-")}-${Math.random().toString(36).slice(2, 7)}`,
    file,
    status: "match",
    search: "",
    replace,
    changeType: "CREATE",
  };
}

function buildEslintConfig(opts: GovernanceScaffoldOptions): string {
  const debtSeverity = opts.softTechnicalDebtMode ? "warn" : "error";
  const tsMax = opts.eslintSizeLimits ? 250 : 500;
  const tsxMax = opts.eslintSizeLimits ? 350 : 700;

  return `import js from "@eslint/js";
import tseslint from "typescript-eslint";
${opts.eslintLayerBoundaries || opts.featurePublicApiBarrier ? 'import boundaries from "eslint-plugin-boundaries";' : ""}

export default tseslint.config(
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
      "max-lines": ["${debtSeverity}", { max: ${tsMax}, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 50, skipBlankLines: true }],
      complexity: ["warn", { max: 10 }],
      ${opts.strictAsyncSafety ? '"@typescript-eslint/no-floating-promises": "error",\n      "@typescript-eslint/await-thenable": "error",' : ""}
    },
  },
  {
    files: ["src/**/*.tsx"],
    rules: {
      "max-lines": ["${debtSeverity}", { max: ${tsxMax}, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 280, skipBlankLines: true }],
      complexity: ["warn", { max: 35 }],
    },
  }${opts.eslintLayerBoundaries || opts.featurePublicApiBarrier ? `,
  {
    files: ["src/**/*.{ts,tsx}", "server/**/*.ts"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "adapters", pattern: "server/adapters/*" },
        { type: "services", pattern: "server/services/*" },
        { type: "routes", pattern: "server/routes/*" },
        { type: "features", pattern: "src/features/*" },
        { type: "api", pattern: "src/api/*" },
      ],
    },
    rules: {
      "boundaries/dependencies": ["${debtSeverity}", {
        default: "allow",
        policies: [
          { from: { element: { type: "adapters" } }, disallow: [{ to: { element: { type: "services" } } }] },
          { from: { element: { type: "services" } }, disallow: [{ to: { element: { type: "routes" } } }] },
        ],
      }],
    },
  }` : ""}
);
`;
}

function buildHuskyPreCommit(opts: GovernanceScaffoldOptions): string {
  const lines: string[] = ["#!/bin/sh", '. "$(dirname "$0")/_/husky.sh"', ""];
  if (opts.huskyLeakedMarkerCheck) {
    lines.push(
      'if git diff --cached | grep -E "<{7} SEARCH|>{7} REPLACE"; then',
      '  echo "❌ Commit rejected: Leaked patch markers found!"',
      "  exit 1",
      "fi",
      "",
    );
  }
  if (opts.dpdmCircularCheck) {
    lines.push("npx dpdm --warning=false --tree=false --exit-code circular:1 src/", "");
  }
  lines.push("npx lint-staged", "");
  return lines.join("\n");
}

function buildKnipConfig(): string {
  return JSON.stringify(
    {
      $schema: "https://unpkg.com/knip@5/overview/schema.json",
      entry: ["src/main.{ts,tsx}!", "src/index.{ts,tsx}!", "server/index.ts!"],
      project: ["src/**/*.{ts,tsx}!", "server/**/*.ts!"],
    },
    null,
    2,
  );
}

function buildTelemetryAdapter(): string {
  return `import { DatabaseSync } from "node:sqlite";
import path from "path";

export interface TelemetryRecord {
  method: string;
  route: string;
  status_code: number;
  duration_ms: number;
  query_params?: Record<string, unknown> | string;
  ip?: string;
}

class TelemetryAdapter {
  private db: DatabaseSync;

  constructor(dbPath = "telemetry.db") {
    this.db = new DatabaseSync(path.resolve(process.cwd(), dbPath));
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.initTable();
  }

  private initTable() {
    this.db.exec(\`
      CREATE TABLE IF NOT EXISTS api_telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        method TEXT NOT NULL,
        route TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        duration_ms REAL NOT NULL,
        query_params TEXT,
        ip TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_telemetry_route ON api_telemetry (route);
      CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON api_telemetry (timestamp);
    \`);
  }

  public record(entry: TelemetryRecord): void {
    try {
      const stmt = this.db.prepare(\`
        INSERT INTO api_telemetry (timestamp, method, route, status_code, duration_ms, query_params, ip)
        VALUES (datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?)
      \`);
      const paramsJson = typeof entry.query_params === "string"
        ? entry.query_params
        : JSON.stringify(entry.query_params || {});
      stmt.run(entry.method, entry.route, entry.status_code, Math.round(entry.duration_ms * 100) / 100, paramsJson, entry.ip || null);
    } catch (err) {
      console.error("[Telemetry] Failed to record:", err);
    }
  }

  public autoClean(retentionDays = 7): number {
    try {
      const stmt = this.db.prepare(\`DELETE FROM api_telemetry WHERE timestamp < datetime('now', 'localtime', '-' || ? || ' days')\`);
      const res = stmt.run(retentionDays) as { changes: number };
      return res.changes;
    } catch (err) {
      console.error("[Telemetry Auto-Clean Error]:", err);
      return 0;
    }
  }
}

export const telemetryAdapter = new TelemetryAdapter();
`;
}

function buildPackageJson(opts: GovernanceScaffoldOptions): string {
  const devDeps: Record<string, string> = {
    eslint: "^9.0.0",
    typescript: "^5.0.0",
    "typescript-eslint": "^8.0.0",
  };
  if (opts.eslintLayerBoundaries || opts.featurePublicApiBarrier) {
    devDeps["eslint-plugin-boundaries"] = "^5.0.0";
  }
  if (opts.huskyPreCommitHook) {
    devDeps["husky"] = "^9.0.0";
    devDeps["lint-staged"] = "^15.0.0";
  }
  if (opts.knipDeadCodeDetection) {
    devDeps["knip"] = "^5.0.0";
  }
  if (opts.dpdmCircularCheck) {
    devDeps["dpdm"] = "^3.14.0";
  }

  const pkg = {
    name: "governance-scaffolded-app",
    private: true,
    version: "0.1.0",
    type: "module",
    scripts: {
      lint: "eslint .",
      ...(opts.knipDeadCodeDetection ? { knip: "knip" } : {}),
      ...(opts.dpdmCircularCheck ? { "check:circular": "dpdm --warning=false --tree=false --exit-code circular:1 src/" } : {}),
    },
    devDependencies: devDeps,
    sideEffects: ["**/*.css", "**/*.scss"],
  };
  return JSON.stringify(pkg, null, 2);
}

function buildTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
      },
      include: ["src/**/*", "server/**/*"],
    },
    null,
    2,
  );
}

const SKELETON_DIRS = [
  "src/api",
  "src/features",
  "src/types",
  "src/utils",
  "server/routes",
  "server/services",
  "server/adapters",
];

export function generateGovernanceDiffBlocks(opts: GovernanceScaffoldOptions): DiffBlock[] {
  const blocks: DiffBlock[] = [
    makeCreateBlock("tsconfig.json", buildTsConfig()),
    makeCreateBlock("eslint.config.js", buildEslintConfig(opts)),
    makeCreateBlock("package.json", buildPackageJson(opts)),
  ];

  if (opts.huskyPreCommitHook) {
    blocks.push(makeCreateBlock(".husky/pre-commit", buildHuskyPreCommit(opts)));
  }
  if (opts.knipDeadCodeDetection) {
    blocks.push(makeCreateBlock("knip.json", buildKnipConfig()));
  }
  if (opts.telemetryDbMonitoring) {
    blocks.push(makeCreateBlock("server/adapters/telemetryAdapter.ts", buildTelemetryAdapter()));
  }
  if (opts.featureDirectorySkeleton) {
    for (const dir of SKELETON_DIRS) {
      blocks.push(makeCreateBlock(`${dir}/.gitkeep`, ""));
    }
  }

  return blocks;
}