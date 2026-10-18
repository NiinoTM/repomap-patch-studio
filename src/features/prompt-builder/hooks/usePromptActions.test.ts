import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchActiveFilesContent,
  persistSocraticRequirement,
  formatExtractedContracts,
} from "./usePromptActions";
import { filesApi } from "../../../api/repoApi";
import { ticketApi } from "../../../api/ticketApi";
import type { Ticket } from "../../../types/ticket";

vi.mock("../../../api/repoApi", () => ({
  filesApi: {
    fetchFiles: vi.fn(),
    fetchBoundedContext: vi.fn(),
  },
}));

vi.mock("../../../api/ticketApi", () => ({
  ticketApi: {
    updateTicket: vi.fn(),
  },
}));

describe("fetchActiveFilesContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default message when selected files set is empty", async () => {
    const result = await fetchActiveFilesContent(new Set<string>());
    expect(result).toBe("No specific files selected.");
  });

  it("fetches file contents and formats active context text", async () => {
    vi.mocked(filesApi.fetchFiles).mockResolvedValue({
      success: true,
      contents: {
        "src/auth.ts": "export const token = '123';",
      },
    });

    const result = await fetchActiveFilesContent(["src/auth.ts"]);
    expect(filesApi.fetchFiles).toHaveBeenCalledWith(["src/auth.ts"]);
    expect(result).toContain("src/auth.ts");
    expect(result).toContain("export const token = '123';");
  });

  it("handles fetch failure gracefully by formatting with empty contents", async () => {
    vi.mocked(filesApi.fetchFiles).mockRejectedValue(new Error("Network failure"));
    const result = await fetchActiveFilesContent(["src/auth.ts"]);
    expect(result).toContain("src/auth.ts");
  });
});

describe("formatExtractedContracts", () => {
  it("returns empty string for null, undefined, or empty objects", () => {
    expect(formatExtractedContracts(null)).toBe("");
    expect(formatExtractedContracts(undefined)).toBe("");
    expect(formatExtractedContracts({})).toBe("");
  });

  it("formats valid contracts mapping into standardized comment blocks", () => {
    const contracts = {
      "src/types.ts": "export interface User { id: string; }",
      "src/api.ts": "export function login(): void;",
    };
    const formatted = formatExtractedContracts(contracts);
    expect(formatted).toContain("// --- src/types.ts ---");
    expect(formatted).toContain("export interface User { id: string; }");
    expect(formatted).toContain("// --- src/api.ts ---");
  });

  it("filters out empty or whitespace-only contract bodies", () => {
    const contracts = {
      "src/empty.ts": "   ",
      "src/valid.ts": "export const X = 1;",
    };
    const formatted = formatExtractedContracts(contracts);
    expect(formatted).not.toContain("src/empty.ts");
    expect(formatted).toContain("src/valid.ts");
  });
});

describe("persistSocraticRequirement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing if ticket is null or undefined", async () => {
    await persistSocraticRequirement(null, "Answers text");
    expect(ticketApi.updateTicket).not.toHaveBeenCalled();
  });

  it("persists new sanitized requirement to disk", async () => {
    const ticket: Ticket = {
      id: "TICK-001",
      title: "Test",
      description: "Desc",
      status: "todo",
      type: "feat",
      requirements: [],
      createdAt: "2026-10-18T00:00:00.000Z",
    };

    await persistSocraticRequirement(ticket, "Must validate JWT signature");

    expect(ticketApi.updateTicket).toHaveBeenCalledWith("TICK-001", {
      requirements: [expect.stringContaining("[Socratic] Must validate JWT signature")],
    });
    expect(ticket.requirements).toHaveLength(1);
  });

  it("does not duplicate requirements already present on the ticket", async () => {
    const existing = "[Socratic] Already added requirement";
    const ticket: Ticket = {
      id: "TICK-001",
      title: "Test",
      description: "Desc",
      status: "todo",
      type: "feat",
      requirements: [existing],
      createdAt: "2026-10-18T00:00:00.000Z",
    };

    await persistSocraticRequirement(ticket, "Already added requirement");
    expect(ticketApi.updateTicket).not.toHaveBeenCalled();
  });

  describe("bounded context reads", () => {
    it("fetches line range slices using file:[start-end] syntax", async () => {
      vi.mocked(filesApi.fetchBoundedContext).mockResolvedValue({
        success: true,
        content: "const token = '123';",
        linesCount: 1,
      });

      const result = await fetchActiveFilesContent(["src/auth.ts:[10-20]"]);
      expect(filesApi.fetchBoundedContext).toHaveBeenCalledWith("src/auth.ts", [10, 20]);
      expect(result).toContain("src/auth.ts:[10-20]");
      expect(result).toContain("const token = '123';");
    });

    it("strips leading @ from mentions in line range requests", async () => {
      vi.mocked(filesApi.fetchBoundedContext).mockResolvedValue({
        success: true,
        content: "const token = '123';",
        linesCount: 1,
      });

      await fetchActiveFilesContent(["@src/auth.ts:[10-20]"]);
      expect(filesApi.fetchBoundedContext).toHaveBeenCalledWith("src/auth.ts", [10, 20]);
    });

    it("fetches symbol bodies using file#symbolName syntax", async () => {
      vi.mocked(filesApi.fetchBoundedContext).mockResolvedValue({
        success: true,
        content: "export function login() {}",
        linesCount: 1,
      });

      const result = await fetchActiveFilesContent(["src/auth.ts#login"]);
      expect(filesApi.fetchBoundedContext).toHaveBeenCalledWith("src/auth.ts", undefined, "login");
      expect(result).toContain("src/auth.ts#login");
      expect(result).toContain("export function login() {}");
    });

    it("supports READ: and INSPECT: directive syntax", async () => {
      vi.mocked(filesApi.fetchBoundedContext).mockResolvedValue({
        success: true,
        content: "function gitMoveFile() {}",
        linesCount: 1,
      });

      await fetchActiveFilesContent(["READ: 'server/adapters/gitAdapter.ts:[160-200]'"]);
      expect(filesApi.fetchBoundedContext).toHaveBeenCalledWith("server/adapters/gitAdapter.ts", [160, 200]);

      await fetchActiveFilesContent(["INSPECT: 'gitMoveFile' IN 'server/adapters/gitAdapter.ts'"]);
      expect(filesApi.fetchBoundedContext).toHaveBeenCalledWith("server/adapters/gitAdapter.ts", undefined, "gitMoveFile");
    });
  });
});