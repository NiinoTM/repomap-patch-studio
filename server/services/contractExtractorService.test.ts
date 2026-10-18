import { describe, it, expect } from "vitest";
import {
  extractSymbolBody,
  extractLineRange,
} from "./contractExtractorService";

const sampleCode = `
import { Router } from "express";

/**
 * Top-level utility function
 */
export function calculateSum(a: number, b: number): number {
  return a + b;
}

export const multiply = (a: number, b: number): number => a * b;

export class GitAdapter {
  /**
   * Moves a file safely in git
   */
  async gitMoveFile(from: string, to: string): Promise<boolean> {
    return true;
  }
}

export interface UserSession {
  token: string;
  expires: number;
}
`;

describe("extractSymbolBody", () => {
  it("extracts a top-level function declaration with its JSDoc", () => {
    const result = extractSymbolBody(sampleCode, "service.ts", "calculateSum");
    expect(result).not.toBeNull();
    expect(result).toContain("Top-level utility function");
    expect(result).toContain("export function calculateSum(a: number, b: number): number");
    expect(result).toContain("return a + b;");
  });

  it("extracts an arrow function assigned to a variable", () => {
    const result = extractSymbolBody(sampleCode, "service.ts", "multiply");
    expect(result).not.toBeNull();
    expect(result).toContain("export const multiply = (a: number, b: number): number => a * b;");
  });

  it("extracts a method located inside a class declaration", () => {
    const result = extractSymbolBody(sampleCode, "service.ts", "gitMoveFile");
    expect(result).not.toBeNull();
    expect(result).toContain("Moves a file safely in git");
    expect(result).toContain("async gitMoveFile(from: string, to: string): Promise<boolean>");
  });

  it("extracts an interface definition", () => {
    const result = extractSymbolBody(sampleCode, "service.ts", "UserSession");
    expect(result).not.toBeNull();
    expect(result).toContain("export interface UserSession");
    expect(result).toContain("token: string;");
  });

  it("returns null cleanly when identifier is not found in file", () => {
    const result = extractSymbolBody(sampleCode, "service.ts", "nonExistentMethod");
    expect(result).toBeNull();
  });
});

describe("extractLineRange", () => {
  const sampleLines = [
    "line 1",
    "line 2",
    "line 3",
    "line 4",
    "line 5",
    "line 6",
    "line 7",
    "line 8",
    "line 9",
    "line 10",
  ].join("\n");

  it("returns exact lines requested with boundary header", () => {
    const result = extractLineRange(sampleLines, 3, 5, "sample.ts");
    expect(result).toContain("// --- Lines 3-5 of 10 in sample.ts ---");
    expect(result).toContain("line 3\nline 4\nline 5");
    expect(result).not.toContain("line 2");
    expect(result).not.toContain("line 6");
  });

  it("clamps out-of-bounds start and end lines safely", () => {
    const result = extractLineRange(sampleLines, -5, 50, "sample.ts");
    expect(result).toContain("// --- Lines 1-10 of 10 in sample.ts ---");
    expect(result).toContain("line 1");
    expect(result).toContain("line 10");
  });

  it("handles reversed start and end lines by auto-ordering them", () => {
    const result = extractLineRange(sampleLines, 7, 4, "sample.ts");
    expect(result).toContain("// --- Lines 4-7 of 10 in sample.ts ---");
    expect(result).toContain("line 4\nline 5\nline 6\nline 7");
  });
});