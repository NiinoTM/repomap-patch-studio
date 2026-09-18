import type React from "react";
import { Ticket } from "../../../types/ticket";
import { filesApi } from "../../../api/repoApi";
import { ticketApi } from "../../../api/ticketApi";
import {
  buildArchitecturalBlueprintPrompt,
  buildUnitTestPrompt,
  formatActiveFilesContext,
} from "../utils/promptTemplates";
import {
  buildSocraticConfrontationPrompt,
  sanitizeSocraticAnswers,
} from "../utils/socraticPrompt";
import {
  buildStepScopedPrompt,
  buildBatchStepPrompt,
} from "../utils/stepperPrompt";
import type { UseAtomicStepperReturn } from "./useAtomicStepper";
import type { UseSocraticGateReturn } from "./useSocraticGate";

export async function fetchActiveFilesContent(
  selectedFiles: Set<string> | string[],
): Promise<string> {
  const filesArray = Array.from(selectedFiles);
  if (filesArray.length === 0) {
    return "No specific files selected.";
  }
  try {
    const data = await filesApi.fetchFiles(filesArray);
    return formatActiveFilesContext(selectedFiles, data.contents || {});
  } catch (err) {
    console.error("Failed to fetch active files content:", err);
    return formatActiveFilesContext(selectedFiles, {});
  }
}

export async function persistSocraticRequirement(
  ticket: Ticket | null | undefined,
  answersText: string,
) {
  if (!ticket) return;
  const check = sanitizeSocraticAnswers(answersText);
  const currentReqs = ticket.requirements || [];
  const newReq = `[Socratic] ${check.sanitized.slice(0, 120)}`;
  if (!currentReqs.includes(newReq)) {
    const updatedReqs = [...currentReqs, newReq];
    try {
      await ticketApi.updateTicket(ticket.id, { requirements: updatedReqs });
      ticket.requirements = updatedReqs;
    } catch (err) {
      console.error("Failed to persist requirements to ticket on disk:", err);
    }
  }
}

interface UsePromptActionsParams {
  request: string;
  setRequest: React.Dispatch<React.SetStateAction<string>>;
  selectedFiles: Set<string>;
  repoMap: string;
  activeTicket?: Ticket | null;
  onCopy: (promptText: string) => void;
  socraticGate: UseSocraticGateReturn;
  atomicStepper: UseAtomicStepperReturn;
}

export function usePromptActions({
  request,
  setRequest,
  selectedFiles,
  repoMap,
  activeTicket,
  onCopy,
  socraticGate,
  atomicStepper,
}: UsePromptActionsParams) {
  const handleConfrontLogic = async () => {
    const activeFilesText = await fetchActiveFilesContent(selectedFiles);
    const prompt = buildSocraticConfrontationPrompt({
      repoMap,
      activeFilesText,
      userRequest: request || "Interrogate requirements for missing failure modes and routing.",
      activeTicket,
    });
    onCopy(prompt);
    socraticGate.openModal();
  };

  const handleApplyFortifiedCriteria = async () => {
    await socraticGate.applyFortifiedCriteria(async (fortified) => {
      setRequest((prev) => prev + fortified);
      await persistSocraticRequirement(activeTicket, socraticGate.answersText);
    });
  };

  const handleGenerateBlueprintPrompt = async () => {
    const activeFilesText = await fetchActiveFilesContent(selectedFiles);
    const prompt = buildArchitecturalBlueprintPrompt({
      repoMap,
      activeFilesText,
      userRequest: request || "Generate modular architecture following SRP.",
    });
    onCopy(prompt);
  };

  const handleCopyStepPrompt = async () => {
    const activeFilesText = await fetchActiveFilesContent(selectedFiles);

    if (atomicStepper.isBatchMode && atomicStepper.currentBatch) {
      const prompt = buildBatchStepPrompt({
        stepNumber: atomicStepper.currentBatchIndex + 1,
        totalSteps: atomicStepper.totalBatches,
        domainName: atomicStepper.currentBatch.domain,
        targetFiles: atomicStepper.currentBatch.files,
        completedSteps: Array.from(atomicStepper.completedPaths),
        activeFilesText,
        repoMap,
        userRequest: request || "Implement cohesive domain step following SRP boundaries.",
      });
      onCopy(prompt);
      return;
    }

    if (!atomicStepper.currentStep) return;
    const prompt = buildStepScopedPrompt({
      stepNumber: atomicStepper.currentStepIndex + 1,
      totalSteps: atomicStepper.totalSteps,
      targetFile: atomicStepper.currentStep,
      completedSteps: Array.from(atomicStepper.completedPaths),
      activeFilesText,
      repoMap,
      userRequest: request || "Implement step following SRP boundaries.",
    });
    onCopy(prompt);
  };

  const handleFinishAndGenerateTests = async () => {
    const testFiles = atomicStepper.steps
      .map((s) => s.path)
      .filter((p) => !p.endsWith(".d.ts") && !p.includes(".test."));
    const activeFilesText = await fetchActiveFilesContent(testFiles);
    const prompt = buildUnitTestPrompt({
      activeFilesText,
      userRequest: "Generate comprehensive Vitest unit tests for all implemented steps.",
    });
    onCopy(prompt);
  };

  return {
    handleConfrontLogic,
    handleApplyFortifiedCriteria,
    handleGenerateBlueprintPrompt,
    handleCopyStepPrompt,
    handleFinishAndGenerateTests,
  };
}