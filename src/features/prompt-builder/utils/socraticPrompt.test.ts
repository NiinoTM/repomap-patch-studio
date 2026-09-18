import { describe, it, expect } from "vitest";
import {
  buildSocraticConfrontationPrompt,
  sanitizeSocraticAnswers,
} from "./socraticPrompt";
import { Ticket } from "../../../types/ticket";

describe("buildSocraticConfrontationPrompt", () => {
  it("generates adversarial interrogation prompt with all 4 challenge vectors", () => {
    const prompt = buildSocraticConfrontationPrompt({
      repoMap: "test-map",
      activeFilesText: "test-files",
      userRequest: "Automate contractor job matching",
    });

    expect(prompt).toContain("Adversarial Principal Architect");
    expect(prompt).toContain("MISSING DOMAIN & ROUTING LOGIC");
    expect(prompt).toContain("FAILURE MODES & TIMEOUTS");
    expect(prompt).toContain("CONCURRENCY & IDEMPOTENCY");
    expect(prompt).toContain("EDGE CONDITIONS & BOUNDARIES");
  });

  it("includes active ticket requirements when provided", () => {
    const mockTicket: Ticket = {
      id: "TICK-100",
      title: "Contractor Dispatch",
      status: "in-progress",
      type: "feat",
      requirements: ["Match skills", "Send alert"],
      createdAt: "2026-01-01",
    };

    const prompt = buildSocraticConfrontationPrompt({
      repoMap: "",
      activeFilesText: "",
      userRequest: "Deploy job",
      activeTicket: mockTicket,
    });

    expect(prompt).toContain("ACTIVE TICKET: [TICK-100] Contractor Dispatch");
    expect(prompt).toContain("Match skills");
  });

  it("does not emit raw patch markers that collide with git pre-commit hooks", () => {
    const prompt = buildSocraticConfrontationPrompt({
      repoMap: "",
      activeFilesText: "",
      userRequest: "Test prompt",
    });

    const leakedPattern = /<{7}\s*SEARCH|>{7}\s*REPLACE/;
    expect(prompt).not.toMatch(leakedPattern);
    expect(prompt).not.toMatch(/={7}/);
  });
});

describe("sanitizeSocraticAnswers", () => {
  it("rejects empty or whitespace-only answers", () => {
    const emptyResult = sanitizeSocraticAnswers("   ");
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.error).toContain("cannot be empty");
  });

  it("rejects sub-15 character lazy answers", () => {
    const shortResult = sanitizeSocraticAnswers("1. Option A");
    expect(shortResult.isValid).toBe(false);
    expect(shortResult.error).toContain("at least 15 characters");
  });

  it("accepts and sanitizes valid architectural answers", () => {
    const validResult = sanitizeSocraticAnswers(
      "  1. Use Option A broadcast matching. 2. 30-minute timeout SLA.  ",
    );
    expect(validResult.isValid).toBe(true);
    expect(validResult.sanitized).toBe(
      "1. Use Option A broadcast matching. 2. 30-minute timeout SLA.",
    );
  });
});