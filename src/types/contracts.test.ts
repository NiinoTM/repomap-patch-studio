import { describe, it, expect } from "vitest";
import {
  parseStructuredBlueprint,
  parseBlueprintDiscovery,
  StructuredBlueprintSchema,
  BlueprintDiscoveryCandidateSchema,
  BlueprintDiscoveryPayloadSchema,
} from "./contracts";
import type { StructuredBlueprint } from "./remediation";

const validBlueprint: StructuredBlueprint = {
  title: "Auth Refactor Blueprint",
  summary: "Decouple authentication state from UI components into isolated domain.",
  domains: [
    {
      name: "auth",
      layer: "feature",
      description: "Authentication workflows and session management",
      publicExports: ["useAuth", "LoginForm", "AuthContext"],
      privateModules: ["hooks/useTokenStorage.ts"],
      allowedDependencies: ["@features/shared"],
    },
  ],
  targetFiles: [
    {
      path: "src/features/auth/index.ts",
      domain: "auth",
      responsibility: "Public API contract exposing auth features",
    },
  ],
};

const phasedInput = {
  title: "Phased Refactor",
  summary: "Sequential execution",
  domains: validBlueprint.domains,
  phases: [
    {
      id: "phase-1",
      name: "Phase 1: Contracts",
      intent: "Define tokens",
      files: [{ path: "src/types.ts", domain: "auth", responsibility: "Types" }],
      verificationCriteria: ["No syntax errors"],
    },
    {
      id: "phase-2",
      name: "Phase 2: Service",
      intent: "Implement auth",
      files: [{ path: "src/service.ts", domain: "auth", responsibility: "Service" }],
      verificationCriteria: ["Tests pass"],
    },
  ],
  targetFiles: [],
};

const validDiscovery = {
  summary: "Identified relevant authentication files",
  candidates: [
    {
      path: "src/features/auth/types.ts",
      domain: "auth",
      reason: "Core type contracts",
      layer: "feature" as const,
      confidence: 0.95,
    },
  ],
  suggestedPhases: ["Phase 1: Contracts", "Phase 2: Service"],
};

describe("parseStructuredBlueprint - basic parsing & code fences", () => {
  it("successfully parses a valid blueprint object", () => {
    const result = parseStructuredBlueprint(validBlueprint);
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("Auth Refactor Blueprint");
    expect(result.data?.domains).toHaveLength(1);
    expect(result.data?.domains[0].layer).toBe("feature");
  });

  it("successfully parses a valid JSON string", () => {
    const result = parseStructuredBlueprint(JSON.stringify(validBlueprint));
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("Auth Refactor Blueprint");
  });

  it("strips markdown code block fences before parsing", () => {
    const fencedJson = "```json\n" + JSON.stringify(validBlueprint, null, 2) + "\n```";
    expect(parseStructuredBlueprint(fencedJson).success).toBe(true);

    const genericFenced = "```\n" + JSON.stringify(validBlueprint) + "\n```";
    expect(parseStructuredBlueprint(genericFenced).success).toBe(true);
  });
});

describe("parseStructuredBlueprint - phase & target derivation", () => {
  it("derives targetFiles automatically from inlined phases when empty", () => {
    const result = parseStructuredBlueprint(phasedInput);
    expect(result.success).toBe(true);
    expect(result.data?.targetFiles).toHaveLength(2);
    expect(result.data?.targetFiles.map((f) => f.path)).toEqual([
      "src/types.ts",
      "src/service.ts",
    ]);
  });

  it("synthesizes fallback phase for legacy flat blueprints", () => {
    const legacyInput = {
      title: "Flat Blueprint",
      summary: "No phases provided",
      domains: validBlueprint.domains,
      targetFiles: [{ path: "src/file1.ts", domain: "auth", responsibility: "File 1" }],
    };
    const result = parseStructuredBlueprint(legacyInput);
    expect(result.success).toBe(true);
    expect(result.data?.phases).toHaveLength(1);
    expect(result.data?.phases?.[0].id).toBe("phase-1");
  });
});

describe("parseStructuredBlueprint - schema rejection & error handling", () => {
  it("rejects invalid JSON syntax gracefully without throwing", () => {
    const result = parseStructuredBlueprint("{ title: 'missing quotes' ");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse blueprint JSON");
  });

  it("rejects blueprints with invalid layer enum", () => {
    const invalidLayer = {
      ...validBlueprint,
      domains: [{ ...validBlueprint.domains[0], layer: "unsupported-layer" }],
    };
    const result = parseStructuredBlueprint(invalidLayer);
    expect(result.success).toBe(false);
    expect(result.error).toContain("domains.0.layer");
  });

  it("rejects blueprints with empty domains array", () => {
    const emptyDomains = { ...validBlueprint, domains: [] };
    expect(StructuredBlueprintSchema.safeParse(emptyDomains).success).toBe(false);
  });
});

describe("parseBlueprintDiscovery - parsing & markdown sanitization", () => {
  it("parses valid discovery object", () => {
    const result = parseBlueprintDiscovery(validDiscovery);
    expect(result.success).toBe(true);
    expect(result.data?.candidates).toHaveLength(1);
    expect(result.data?.candidates[0].path).toBe("src/features/auth/types.ts");
  });

  it("sanitizes and parses JSON string with markdown fences", () => {
    const fencedJson = "```json\n" + JSON.stringify(validDiscovery) + "\n```";
    const result = parseBlueprintDiscovery(fencedJson);
    expect(result.success).toBe(true);
    expect(result.data?.summary).toBe("Identified relevant authentication files");
  });

  it("rejects malformed JSON strings", () => {
    const result = parseBlueprintDiscovery("not-a-json");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse discovery JSON");
  });
});

describe("parseBlueprintDiscovery - schema validation constraints", () => {
  it("rejects candidate files missing required reason or domain", () => {
    const invalidCandidate = {
      summary: "Invalid",
      candidates: [{ path: "src/file.ts" }],
    };
    const result = parseBlueprintDiscovery(invalidCandidate);
    expect(result.success).toBe(false);
    expect(result.error).toContain("candidates.0.domain");
  });

  it("rejects candidate with invalid confidence bounds", () => {
    const invalidConfidence = {
      path: "src/file.ts",
      domain: "auth",
      reason: "Reason",
      confidence: 1.5,
    };
    expect(BlueprintDiscoveryCandidateSchema.safeParse(invalidConfidence).success).toBe(false);
  });

  it("defaults empty arrays for optional fields", () => {
    const result = BlueprintDiscoveryPayloadSchema.safeParse({ summary: "Summary" });
    expect(result.success).toBe(true);
    expect(result.data?.candidates).toEqual([]);
    expect(result.data?.suggestedPhases).toEqual([]);
  });
});