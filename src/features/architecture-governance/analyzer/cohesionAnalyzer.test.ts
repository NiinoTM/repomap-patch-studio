import { describe, it, expect } from "vitest";
import { analyzeModuleCohesion } from "./cohesionAnalyzer";
import { proposeCohesionSplits } from "./domainClusterEngine";

describe("analyzeModuleCohesion cohesive modules", () => {
  it("returns lcom4 of 1 and no violation for a single-function module", () => {
    const code = "export function singleUtil(x: number) { return x * 2; }";
    const result = analyzeModuleCohesion("src/utils/math.ts", code);

    expect(result.lcom4).toBe(1);
    expect(result.isViolating).toBe(false);
    expect(result.clusters).toHaveLength(1);
  });

  it("unifies functions that call a shared internal helper into one cluster", () => {
    const code = [
      "function helper(x: number) { return x + 1; }",
      "export function calcA(n: number) { return helper(n); }",
      "export function calcB(n: number) { return helper(n * 2); }",
    ].join("\n");

    const result = analyzeModuleCohesion("src/utils/calc.ts", code);

    expect(result.lcom4).toBe(1);
    expect(result.isViolating).toBe(false);
  });
});

describe("analyzeModuleCohesion disjoint modules and splits", () => {
  it("flags lcom4 >= 2 when functions share zero internal references", () => {
    const code = [
      "export function authenticate(user: string) { return user.trim(); }",
      "export function calculateTax(amount: number) { return amount * 0.2; }",
    ].join("\n");

    const result = analyzeModuleCohesion("src/utils/mixed.ts", code);

    expect(result.lcom4).toBe(2);
    expect(result.isViolating).toBe(true);
    expect(result.clusters).toHaveLength(2);
  });

  it("proposeCohesionSplits generates decomposition file move paths", () => {
    const cohesion = {
      file: "src/utils/mixed.ts",
      lcom4: 2,
      clusters: [["authenticate"], ["calculateTax"]],
      isViolating: true,
    };

    const splits = proposeCohesionSplits("src/utils/mixed.ts", cohesion);

    expect(splits).toHaveLength(2);
    expect(splits[0].targetPath).toContain("mixed.authenticate.ts");
    expect(splits[1].targetPath).toContain("mixed.calculateTax.ts");
  });
});