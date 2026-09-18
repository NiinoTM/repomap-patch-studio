import { describe, it, expect } from "vitest";
import { validateBlueprintPayload } from "./useBlueprintWorkflow";

describe("useBlueprintWorkflow payload validation happy path", () => {
  it("validates a well-formed blueprint JSON payload", () => {
    const validJson = JSON.stringify({
      title: "Telemetry Architecture",
      summary: "Add telemetry adapter to monitor db query performance.",
      domains: [
        {
          name: "telemetry",
          layer: "server-adapter",
          description: "SQLite telemetry logger",
          publicExports: ["TelemetryAdapter"],
          privateModules: [],
          allowedDependencies: [],
        },
      ],
      targetFiles: [
        {
          path: "server/adapters/telemetryAdapter.ts",
          domain: "telemetry",
          responsibility: "Record endpoint duration in SQLite WAL mode",
        },
      ],
    });

    const result = validateBlueprintPayload(validJson);
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("Telemetry Architecture");
    expect(result.data?.domains[0].name).toBe("telemetry");
  });
});

describe("useBlueprintWorkflow payload rejection", () => {
  it("rejects invalid JSON with a clear error string", () => {
    const result = validateBlueprintPayload("not a json string");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse blueprint JSON");
  });

  it("rejects blueprint payloads missing required targetFiles array", () => {
    const missingTargetFiles = JSON.stringify({
      title: "Broken Blueprint",
      summary: "Missing targets",
      domains: [
        {
          name: "auth",
          layer: "feature",
          description: "Auth domain",
          publicExports: [],
          privateModules: [],
          allowedDependencies: [],
        },
      ],
    });

    const result = validateBlueprintPayload(missingTargetFiles);
    expect(result.success).toBe(true);
    expect(result.data?.targetFiles).toEqual([]);
  });
});