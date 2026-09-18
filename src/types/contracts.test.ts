import { describe, it, expect } from "vitest";
import {
  parseStructuredBlueprint,
  StructuredBlueprintSchema,
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

describe("contracts valid blueprint parsing", () => {
  it("successfully parses a valid blueprint object", () => {
    const result = parseStructuredBlueprint(validBlueprint);
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("Auth Refactor Blueprint");
    expect(result.data?.domains).toHaveLength(1);
    expect(result.data?.domains[0].layer).toBe("feature");
  });

  it("successfully parses a valid JSON string", () => {
    const jsonStr = JSON.stringify(validBlueprint);
    const result = parseStructuredBlueprint(jsonStr);
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("Auth Refactor Blueprint");
  });
});

describe("contracts invalid blueprint rejection", () => {
  it("rejects invalid JSON syntax", () => {
    const invalidJson = "{ title: 'missing quotes' ";
    const result = parseStructuredBlueprint(invalidJson);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse blueprint JSON");
  });

  it("rejects blueprints with invalid layer enum", () => {
    const invalidLayer = {
      ...validBlueprint,
      domains: [
        {
          ...validBlueprint.domains[0],
          layer: "magic-layer",
        },
      ],
    };
    const result = parseStructuredBlueprint(invalidLayer);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("rejects blueprints with an empty domains array", () => {
    const emptyDomains = {
      ...validBlueprint,
      domains: [],
    };
    const schemaResult = StructuredBlueprintSchema.safeParse(emptyDomains);
    expect(schemaResult.success).toBe(false);
  });
});