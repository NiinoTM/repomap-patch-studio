import { describe, it, expect } from "vitest";
import { buildArchitecturalDiscoveryPrompt } from "./blueprintDiscoveryPrompt";

describe("buildArchitecturalDiscoveryPrompt", () => {
  const defaultParams = {
    repoMap: "src/auth/types.ts:\n│ export interface Session\nsrc/auth/service.ts:",
    userRequest: "Refactor session storage to use secure HTTP cookies.",
  };

  it("includes required architectural reconnaissance role and instructions", () => {
    const prompt = buildArchitecturalDiscoveryPrompt(defaultParams);
    expect(prompt).toContain("ROLE: Principal Architectural Reconnaissance & Discovery Engineer");
    expect(prompt).toContain("DISCOVERY JSON SCHEMA:");
    expect(prompt).toContain("DISCOVERY RULES:");
    expect(prompt).toContain("Reference ONLY real, existing file paths found in the REPO MAP");
  });

  it("injects the repo map and user request correctly", () => {
    const prompt = buildArchitecturalDiscoveryPrompt(defaultParams);
    expect(prompt).toContain(defaultParams.repoMap);
    expect(prompt).toContain(defaultParams.userRequest);
  });

  it("falls back gracefully when repo map is empty", () => {
    const prompt = buildArchitecturalDiscoveryPrompt({
      repoMap: "",
      userRequest: "Explore codebase",
    });
    expect(prompt).toContain("No map generated.");
  });

  it("formats and includes active files context when provided", () => {
    const prompt = buildArchitecturalDiscoveryPrompt({
      ...defaultParams,
      activeFilesText: "--- START OF FILE src/auth/types.ts ---\nexport interface Session {}",
    });
    expect(prompt).toContain("CURRENT ACTIVE FILES CONTEXT:");
    expect(prompt).toContain("export interface Session {}");
  });

  it("omits active files context section completely when empty or whitespace", () => {
    const prompt = buildArchitecturalDiscoveryPrompt({
      ...defaultParams,
      activeFilesText: "   ",
    });
    expect(prompt).not.toContain("CURRENT ACTIVE FILES CONTEXT:");
  });

  it("mandates JSON output format conforming to BlueprintDiscoveryPayloadSchema", () => {
    const prompt = buildArchitecturalDiscoveryPrompt(defaultParams);
    expect(prompt).toContain('"summary":');
    expect(prompt).toContain('"candidates":');
    expect(prompt).toContain('"suggestedPhases":');
    expect(prompt).toContain('"confidence":');
  });
});