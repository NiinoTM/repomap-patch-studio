import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BlueprintDiscoveryModal } from "./BlueprintDiscoveryModal";
import type { BlueprintDiscoveryPayload } from "../../../../types/remediation";

describe("BlueprintDiscoveryModal", () => {
  const mockPayload: BlueprintDiscoveryPayload = {
    summary: "Architectural discovery scan found 2 candidates",
    candidates: [
      {
        path: "src/features/auth/types.ts",
        domain: "auth",
        reason: "Core type contracts for sessions",
      },
      {
        path: "src/features/auth/api.ts",
        domain: "auth",
        reason: "HTTP client endpoint handlers",
      },
    ],
    suggestedPhases: ["Phase 1: Contracts", "Phase 2: Endpoints"],
  };

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <BlueprintDiscoveryModal
        isOpen={false}
        onClose={vi.fn()}
        discoveryPayload={mockPayload}
        onAcceptCandidates={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders reconnaissance summary and candidate file details when open", () => {
    render(
      <BlueprintDiscoveryModal
        isOpen={true}
        onClose={vi.fn()}
        discoveryPayload={mockPayload}
        onAcceptCandidates={vi.fn()}
      />
    );

    expect(screen.getByText("Architectural Discovery Gate")).toBeDefined();
    expect(screen.getByText("Architectural discovery scan found 2 candidates")).toBeDefined();
    expect(screen.getByText("src/features/auth/types.ts")).toBeDefined();
    expect(screen.getByText("Core type contracts for sessions")).toBeDefined();
    expect(screen.getByText("src/features/auth/api.ts")).toBeDefined();
  });

  it("initializes with all candidate files selected", () => {
    render(
      <BlueprintDiscoveryModal
        isOpen={true}
        onClose={vi.fn()}
        discoveryPayload={mockPayload}
        onAcceptCandidates={vi.fn()}
      />
    );

    expect(screen.getByText(/Discovered Candidate Files \(2\/2\)/)).toBeDefined();
    expect(screen.getByText(/Accept & Populate Context \(2\)/)).toBeDefined();
  });

  it("toggles candidate file selection on click", () => {
    render(
      <BlueprintDiscoveryModal
        isOpen={true}
        onClose={vi.fn()}
        discoveryPayload={mockPayload}
        onAcceptCandidates={vi.fn()}
      />
    );

    const firstCandidateItem = screen.getByText("src/features/auth/types.ts");
    fireEvent.click(firstCandidateItem);

    // One candidate deselected, 1 remaining
    expect(screen.getByText(/Discovered Candidate Files \(1\/2\)/)).toBeDefined();
    expect(screen.getByText(/Accept & Populate Context \(1\)/)).toBeDefined();
  });

  it("handles Deselect All and Select All button clicks", () => {
    render(
      <BlueprintDiscoveryModal
        isOpen={true}
        onClose={vi.fn()}
        discoveryPayload={mockPayload}
        onAcceptCandidates={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Deselect All"));
    expect(screen.getByText(/Discovered Candidate Files \(0\/2\)/)).toBeDefined();

    fireEvent.click(screen.getByText("Select All"));
    expect(screen.getByText(/Discovered Candidate Files \(2\/2\)/)).toBeDefined();
  });

  it("invokes onAcceptCandidates with selected paths on submit", () => {
    const onAccept = vi.fn();
    render(
      <BlueprintDiscoveryModal
        isOpen={true}
        onClose={vi.fn()}
        discoveryPayload={mockPayload}
        onAcceptCandidates={onAccept}
      />
    );

    fireEvent.click(screen.getByText(/Accept & Populate Context/));
    expect(onAccept).toHaveBeenCalledWith([
      "src/features/auth/types.ts",
      "src/features/auth/api.ts",
    ]);
  });

  it("invokes onBypassDiscovery when clicking proceed without adding files", () => {
    const onBypass = vi.fn();
    render(
      <BlueprintDiscoveryModal
        isOpen={true}
        onClose={vi.fn()}
        discoveryPayload={mockPayload}
        onAcceptCandidates={vi.fn()}
        onBypassDiscovery={onBypass}
      />
    );

    fireEvent.click(screen.getByText("Proceed to Blueprint Without Adding Files"));
    expect(onBypass).toHaveBeenCalledOnce();
  });

  it("invokes onClose when clicking Cancel", () => {
    const onClose = vi.fn();
    render(
      <BlueprintDiscoveryModal
        isOpen={true}
        onClose={onClose}
        discoveryPayload={mockPayload}
        onAcceptCandidates={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});