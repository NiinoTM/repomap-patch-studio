export const INDEX_HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Modular Governed Application</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

export const VITE_CONFIG_CONTENT = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
});
`;

export const MAIN_TSX_CONTENT = `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
`;

export const APP_TSX_CONTENT = `export default function App() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Modular Architecture Initialized</h1>
      <p>System boundaries, layering rules, and runtime type contracts active.</p>
    </main>
  );
}
`;

export const INDEX_CSS_CONTENT = `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #09090b;
  color: #f4f4f5;
}
`;

export const SERVER_INDEX_CONTENT = `import express from "express";

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(\`Backend service listening on port \${port}\`);
});
`;

export const ZOD_CONTRACTS_CONTENT = `import { z } from "zod";

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export type ApiResponse = z.infer<typeof ApiResponseSchema>;
`;

export const VITEST_SAMPLE_TEST = `import { describe, it, expect } from "vitest";

describe("core business logic smoke test", () => {
  it("verifies unit testing infrastructure is functional", () => {
    expect(1 + 1).toBe(2);
  });
});
`;

export const PLAYWRIGHT_CONFIG_CONTENT = `import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  use: { baseURL: "http://localhost:3000" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
`;

export const PLAYWRIGHT_SMOKE_TEST = `import { test, expect } from "@playwright/test";

test("loads homepage without runtime crash", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});
`;