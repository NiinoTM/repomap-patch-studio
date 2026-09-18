import { describe, it, expect } from "vitest";
import {
  validateBlueprintPayload,
  evaluateContextSufficiency,
} from "./useBlueprintWorkflow";

const validBlueprintJson = JSON.stringify({
  title: "Auth Modularization",
  summary: "Decouple auth",
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
  phases: [
    {
      id: "phase-1",
      name: "Phase 1: Types",
      intent: "Define tokens",
      files: [{ path: "src/auth/types.ts", domain: "auth", responsibility: "Types" }],
      verificationCriteria: ["No syntax errors"],
    },
  ],
});

describe("validateBlueprintPayload - parsing & validation", () => {
  it("validates and parses valid blueprint JSON payload", () => {
    const result = validateBlueprintPayload(validBlueprintJson);
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("Auth Modularization");
    expect(result.data?.phases).toHaveLength(1);
  });

  it("handles markdown code fences in blueprint payload", () => {
    const fenced = "```json\n" + validBlueprintJson + "\n```";
    const result = validateBlueprintPayload(fenced);
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("Auth Modularization");
  });

  it("rejects invalid JSON syntax gracefully", () => {
    const result = validateBlueprintPayload("{ invalid json ");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse blueprint JSON");
  });

  it("rejects payload missing required schema fields", () => {
    const result = validateBlueprintPayload(JSON.stringify({ title: "Incomplete" }));
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("evaluateContextSufficiency - pre-flight thresholds", () => {
  it("requires discovery when zero files are selected", () => {
    const check = evaluateContextSufficiency(0);
    expect(check.isSufficient).toBe(false);
    expect(check.recommendation).toBe("discovery_required");
    expect(check.message).toContain("No active context files selected");
  });

  it("recommends discovery when exactly one file is selected", () => {
    const check = evaluateContextSufficiency(1);
    expect(check.isSufficient).toBe(false);
    expect(check.recommendation).toBe("discovery_recommended");
    expect(check.message).toContain("Only 1 file selected");
  });

  it("approves direct progression when two or more files are selected", () => {
    const check = evaluateContextSufficiency(2);
    expect(check.isSufficient).toBe(true);
    expect(check.recommendation).toBe("proceed");
  });
});