import { useState } from "react";
import type {
  BlueprintPhaseState,
  BlueprintDiscoveryPayload,
  BlueprintPreflightResult,
  StructuredBlueprint,
} from "../../../types/remediation";
import {
  parseStructuredBlueprint,
  parseBlueprintDiscovery,
} from "../../../types/contracts";

export interface UseBlueprintWorkflowReturn {
  phase: BlueprintPhaseState;
  setPhase: (phase: BlueprintPhaseState) => void;
  blueprint: StructuredBlueprint | null;
  rawInput: string;
  setRawInput: (value: string) => void;
  onRawInputChange: (value: string) => void;
  validateAndApplyBlueprint: () => boolean;
  isReviewModalOpen: boolean;
  isApproved: boolean;
  validationError: string | null;
  isDiscoveryModalOpen: boolean;
  discoveryPayload: BlueprintDiscoveryPayload | null;
  openDiscoveryModal: () => void;
  closeDiscoveryModal: () => void;
  setDiscoveryPayload: (payload: BlueprintDiscoveryPayload | null) => void;
  setDiscoveryFromRaw: (raw: string) => boolean;
  evaluateContextSufficiency: (selectedCount: number) => BlueprintPreflightResult;
  openReviewModal: () => void;
  closeReviewModal: () => void;
  approveBlueprint: () => void;
  completeWorkflow: () => void;
  resetWorkflow: () => void;
  setBlueprintFromRaw: (raw: string) => boolean;
}

export function validateBlueprintPayload(rawInput: string) {
  return parseStructuredBlueprint(rawInput);
}

export function evaluateContextSufficiency(selectedCount: number): BlueprintPreflightResult {
  if (selectedCount === 0) {
    return {
      isSufficient: false,
      fileCount: 0,
      recommendation: "discovery_required",
      message: "No active context files selected. Discovery mode required to prevent hallucinated architecture.",
    };
  }
  if (selectedCount === 1) {
    return {
      isSufficient: false,
      fileCount: 1,
      recommendation: "discovery_recommended",
      message: "Only 1 file selected. Recommending discovery scan across cross-domain boundaries.",
    };
  }
  return {
    isSufficient: true,
    fileCount: selectedCount,
    recommendation: "proceed",
  };
}

export function useBlueprintWorkflow(): UseBlueprintWorkflowReturn {
  const [phase, setPhase] = useState<BlueprintPhaseState>("idle");
  const [blueprint, setBlueprint] = useState<StructuredBlueprint | null>(null);
  const [rawInput, setRawInput] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false);
  const [discoveryPayload, setDiscoveryPayload] = useState<BlueprintDiscoveryPayload | null>(null);

  const openDiscoveryModal = () => {
    setIsDiscoveryModalOpen(true);
    setPhase("blueprint_discovery");
  };

  const closeDiscoveryModal = () => {
    setIsDiscoveryModalOpen(false);
  };

  const onRawInputChange = (val: string) => {
    setRawInput(val);
  };

  const validateAndApplyBlueprint = (): boolean => {
    if (!rawInput.trim()) {
      setBlueprint(null);
      setValidationError("Blueprint input cannot be empty.");
      return false;
    }
    const result = parseStructuredBlueprint(rawInput);
    if (!result.success || !result.data) {
      setBlueprint(null);
      setValidationError(result.error || "Failed to parse blueprint JSON.");
      return false;
    }
    setBlueprint(result.data);
    setValidationError(null);
    return true;
  };

  const setDiscoveryFromRaw = (raw: string): boolean => {
    const result = parseBlueprintDiscovery(raw);
    if (!result.success || !result.data) {
      setValidationError(result.error || "Failed to parse architectural discovery JSON");
      return false;
    }
    setDiscoveryPayload(result.data);
    setValidationError(null);
    return true;
  };



  const openReviewModal = () => {
    setIsReviewModalOpen(true);
    setPhase("blueprint_review");
  };

  const closeReviewModal = () => {
    setIsReviewModalOpen(false);
  };

  const approveBlueprint = () => {
    setIsApproved(true);
    setIsReviewModalOpen(false);
    setPhase("code_generation");
  };

  const completeWorkflow = () => {
    setPhase("verified");
  };

  const resetWorkflow = () => {
    setPhase("idle");
    setBlueprint(null);
    setRawInput("");
    setIsApproved(false);
    setIsReviewModalOpen(false);
    setIsDiscoveryModalOpen(false);
    setDiscoveryPayload(null);
    setValidationError(null);
  };

  const setBlueprintFromRaw = (raw: string): boolean => {
    setRawInput(raw);
    const result = parseStructuredBlueprint(raw);
    if (!result.success || !result.data) {
      setValidationError(result.error || "Failed to parse blueprint JSON");
      return false;
    }
    setBlueprint(result.data);
    setValidationError(null);
    return true;
  };

  return {
    phase,
    setPhase,
    blueprint,
    rawInput,
    setRawInput,
    onRawInputChange,
    validateAndApplyBlueprint,
    isReviewModalOpen,
    isApproved,
    validationError,
    isDiscoveryModalOpen,
    discoveryPayload,
    openDiscoveryModal,
    closeDiscoveryModal,
    setDiscoveryPayload,
    setDiscoveryFromRaw,
    evaluateContextSufficiency,
    openReviewModal,
    closeReviewModal,
    approveBlueprint,
    completeWorkflow,
    resetWorkflow,
    setBlueprintFromRaw,
  };
}