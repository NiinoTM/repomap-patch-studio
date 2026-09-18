import { GovernanceScaffoldOptions } from "../../../types/remediation";

export function buildHuskyPreCommit(opts: GovernanceScaffoldOptions): string {
  const lines: string[] = [
    'if git diff --cached | grep -E "<{7} SEARCH|>{7} REPLACE"; then',
    '  echo "❌ Commit rejected: Leaked patch markers found!"',
    "  exit 1",
    "fi",
    "",
  ];
  if (opts.dpdmCircularCheck) {
    lines.push("npx dpdm --warning=false --tree=false --exit-code circular:1 src/", "");
  }
  if (opts.vitestUnitTesting) {
    lines.push("npm test", "");
  }
  lines.push("npx lint-staged", "");
  return lines.join("\n");
}

export function buildKnipConfig(): string {
  return JSON.stringify(
    {
      $schema: "https://unpkg.com/knip@5/overview/schema.json",
      entry: ["src/main.{ts,tsx}!", "server/index.ts!"],
      project: ["src/**/*.{ts,tsx}!", "server/**/*.ts!"],
      ignoreDependencies: ["husky", "lint-staged"],
    },
    null,
    2,
  );
}

export function buildTelemetryAdapter(): string {
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
    \`);
  }
  public record(entry: TelemetryRecord): void {
    try {
      const stmt = this.db.prepare(\`INSERT INTO api_telemetry (timestamp, method, route, status_code, duration_ms, query_params, ip) VALUES (datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?)\`);
      const params = typeof entry.query_params === "string" ? entry.query_params : JSON.stringify(entry.query_params || {});
      stmt.run(entry.method, entry.route, entry.status_code, Math.round(entry.duration_ms * 100) / 100, params, entry.ip || null);
    } catch (err) {
      console.error("[Telemetry] Failed to record:", err);
    }
  }
}
export const telemetryAdapter = new TelemetryAdapter();
`;
}

export function buildZodContractsStarter(): string {
  return `import { z } from "zod";

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export type ApiResponse = z.infer<typeof ApiResponseSchema>;
`;
}

export function buildVitestSampleTest(): string {
  return `import { describe, it, expect } from "vitest";

describe("core business logic smoke test", () => {
  it("verifies unit testing infrastructure is functional", () => {
    expect(1 + 1).toBe(2);
  });
});
`;
}

export function buildPlaywrightConfig(): string {
  return `import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  use: { baseURL: "http://localhost:3000" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
`;
}

export function buildPlaywrightSmokeTest(): string {
  return `import { test, expect } from "@playwright/test";

test("critical flow smoke test", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});
`;
}