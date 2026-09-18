import { describe, it, expect } from "vitest";
import { buildArchitecturalBlueprintPrompt } from "./blueprintPrompt";
import { buildAutoHealPrompt } from "./autoHealPrompt";

describe("buildArchitecturalBlueprintPrompt", () => {
  it("generates blueprint prompt containing schema definitions and rules", () => {
    const prompt = buildArchitecturalBlueprintPrompt({
      repoMap: "mock-map",
      activeFilesText: "mock-files",
      userRequest: "Create auth feature",
    });

    expect(prompt).toContain("Principal Software Architect");
    expect(prompt).toContain("BLUEPRINT JSON SCHEMA");
    expect(prompt).toContain("Create auth feature");
  });

  it("does not emit raw patch markers to avoid pre-commit false positives", () => {
    const prompt = buildArchitecturalBlueprintPrompt({
      repoMap: "",
      activeFilesText: "",
      userRequest: "Test request",
    });

    const leakedPattern = /<{7}\s*SEARCH|>{7}\s*REPLACE/;
    expect(prompt).not.toMatch(leakedPattern);
  });
});

describe("buildAutoHealPrompt", () => {
  it("formats validation errors and failed blocks into actionable remediation prompt", () => {
    const prompt = buildAutoHealPrompt({
      validationErrors: ["ESLint error in file.ts: line limit exceeded"],
      failedBlocks: [
        {
          file: "src/file.ts",
          search: "const x = 1;",
          replace: "const x = 2;",
        },
      ],
    });

    expect(prompt).toContain("Senior Software Architect & Healing Engineer");
    expect(prompt).toContain("1. ESLint error in file.ts: line limit exceeded");
    expect(prompt).toContain("FILE: src/file.ts");
    expect(prompt).toContain("REMEDIATION INSTRUCTIONS");
  });
});