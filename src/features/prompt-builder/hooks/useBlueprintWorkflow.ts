import { useState } from "react";
import type {
  StructuredBlueprint,
  BlueprintPhaseState,
} from "../../../types/remediation";
import { parseStructuredBlueprint } from "../../../types/contracts";

export interface UseBlueprintWorkflowReturn {
  phase: BlueprintPhaseState;
  blueprint: StructuredBlueprint | null;
  rawInput: string;
  validationError: string | null;
  isReviewModalOpen: boolean;
  isApproved: boolean;
  activeTargetIndex: number | null;
  setRawInput: (text: string) => void;
  openReviewModal: () => void;
  closeReviewModal: () => void;
  validateAndApplyBlueprint: () => boolean;
  approveBlueprint: () => void;
  resetWorkflow: () => void;
  setActiveTargetIndex: (index: number | null) => void;
}

export function validateBlueprintPayload(rawInput: string) {
  return parseStructuredBlueprint(rawInput);
}

export function useBlueprintWorkflow(): UseBlueprintWorkflowReturn {
  const [phase, setPhase] = useState<BlueprintPhaseState>("idle");
  const [blueprint, setBlueprint] = useState<StructuredBlueprint | null>(null);
  const [rawInput, setRawInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [activeTargetIndex, setActiveTargetIndex] = useState<number | null>(null);

  const openReviewModal = () => {
    setIsReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setIsReviewModalOpen(false);
    setValidationError(null);
  };

  const validateAndApplyBlueprint = (): boolean => {
    const result = parseStructuredBlueprint(rawInput);
    if (!result.success || !result.data) {
      setValidationError(result.error || "Failed to validate architectural blueprint schema.");
      return false;
    }
    setBlueprint(result.data);
    setValidationError(null);
    setPhase("blueprint_review");
    return true;
  };

  const approveBlueprint = () => {
    if (!blueprint) return;
    setPhase("code_generation");
    setIsReviewModalOpen(false);
    if (blueprint.targetFiles.length > 0) {
      setActiveTargetIndex(0);
    }
  };

  const resetWorkflow = () => {
    setPhase("idle");
    setBlueprint(null);
    setRawInput("");
    setValidationError(null);
    setActiveTargetIndex(null);
    setIsReviewModalOpen(false);
  };

  return {
    phase,
    blueprint,
    rawInput,
    validationError,
    isReviewModalOpen,
    isApproved: phase === "code_generation",
    activeTargetIndex,
    setRawInput,
    openReviewModal,
    closeReviewModal,
    validateAndApplyBlueprint,
    approveBlueprint,
    resetWorkflow,
    setActiveTargetIndex,
  };
}