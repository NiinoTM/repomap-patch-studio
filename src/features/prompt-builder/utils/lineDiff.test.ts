import { describe, it, expect } from "vitest";
import { computeLineDiff, getLineDiffStats } from "./lineDiff";

describe("lineDiff algorithm", () => {
  describe("computeLineDiff", () => {
    it("returns an empty array when both inputs are empty", () => {
      expect(computeLineDiff("", "")).toEqual([]);
    });

    it("handles adding all lines when oldText is empty", () => {
      const result = computeLineDiff("", "line1\nline2");
      expect(result).toEqual([
        expect.objectContaining({ type: "added", text: "line1", newLineNumber: 1 }),
        expect.objectContaining({ type: "added", text: "line2", newLineNumber: 2 }),
      ]);
    });

    it("handles removing all lines when newText is empty", () => {
      const result = computeLineDiff("line1\nline2", "");
      expect(result).toEqual([
        expect.objectContaining({ type: "removed", text: "line1", oldLineNumber: 1 }),
        expect.objectContaining({ type: "removed", text: "line2", oldLineNumber: 2 }),
      ]);
    });

    it("marks identical lines as unchanged with aligned line numbers", () => {
      const text = "const a = 1;\nconst b = 2;";
      const result = computeLineDiff(text, text);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        type: "unchanged",
        text: "const a = 1;",
        oldLineNumber: 1,
        newLineNumber: 1,
      });
      expect(result[1]).toMatchObject({
        type: "unchanged",
        text: "const b = 2;",
        oldLineNumber: 2,
        newLineNumber: 2,
      });
    });

    it("correctly identifies common prefix, modified middle, and common suffix", () => {
      const oldText = ["header", "old-middle", "footer"].join("\n");
      const newText = ["header", "new-middle", "footer"].join("\n");

      const result = computeLineDiff(oldText, newText);

      expect(result).toHaveLength(4);
      expect(result[0]).toMatchObject({ type: "unchanged", text: "header" });
      expect(result[1]).toMatchObject({ type: "removed", text: "old-middle" });
      expect(result[2]).toMatchObject({ type: "added", text: "new-middle" });
      expect(result[3]).toMatchObject({ type: "unchanged", text: "footer" });
    });
  });

  describe("getLineDiffStats", () => {
    it("aggregates added, removed, and unchanged line counts", () => {
      const oldText = ["line 1", "remove me", "common"].join("\n");
      const newText = ["line 1", "added item", "common"].join("\n");

      const diff = computeLineDiff(oldText, newText);
      const stats = getLineDiffStats(diff);

      expect(stats).toEqual({
        added: 1,
        removed: 1,
        unchanged: 2,
      });
    });
  });
});