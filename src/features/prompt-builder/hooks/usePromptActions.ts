import type React from "react";
import { Ticket } from "../../../types/ticket";
import {
  buildArchitecturalBlueprintPrompt,
  buildUnitTestPrompt,
} from "../utils/promptTemplates";
import { buildArchitecturalDiscoveryPrompt } from "../utils/blueprintDiscoveryPrompt";
import { buildSocraticConfrontationPrompt } from "../utils/socraticPrompt";
import {
  buildStepScopedPrompt,
  buildPhaseBatchStepPrompt,
} from "../utils/stepperPrompt";
import type { UseAtomicStepperReturn } from "./useAtomicStepper";
import type { UseBlueprintWorkflowReturn } from "./useBlueprintWorkflow";
import type { UseSocraticGateReturn } from "./useSocraticGate";
import {
  fetchActiveFilesContent,
  persistSocraticRequirement,
  fetchUpstreamContracts,
  formatExtractedContracts,
} from "../utils/promptActionHelpers";

export {
  fetchActiveFilesContent,
  persistSocraticRequirement,
  fetchUpstreamContracts,
  formatExtractedContracts,
};

interface UsePromptActionsParams {
  request: string;
  setRequest: React.Dispatch<React.SetStateAction<string>>;
  selectedFiles: Set<string>;
  repoMap: string;
  activeTicket?: Ticket | null;
  onCopy: (promptText: string) => void;
  socraticGate: UseSocraticGateReturn;
  atomicStepper: UseAtomicStepperReturn;
  blueprintWorkflow?: UseBlueprintWorkflowReturn;
  hasErrorsOrUnapplied?: boolean;
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
  blueprintWorkflow,
  hasErrorsOrUnapplied,
}: UsePromptActionsParams) {
  const handleConfrontLogic = async () => {
    const activeFilesText = await fetchActiveFilesContent(selectedFiles, request);
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

  const handleGenerateDiscoveryPrompt = async () => {
    const activeFilesText = await fetchActiveFilesContent(selectedFiles, request);

    const prompt = buildArchitecturalDiscoveryPrompt({
      repoMap,
      activeFilesText,
      userRequest: request || "Discover relevant architectural files from repo map.",
    });
    onCopy(prompt);
    blueprintWorkflow?.setPhase("blueprint_discovery");
    blueprintWorkflow?.openDiscoveryModal();
  };

  const handleGenerateBlueprintPrompt = async (bypassDiscovery = false) => {
    if (!bypassDiscovery && selectedFiles.size === 0) {
      await handleGenerateDiscoveryPrompt();
      return;
    }

    const activeFilesText = await fetchActiveFilesContent(selectedFiles, request);

    const prompt = buildArchitecturalBlueprintPrompt({
      repoMap,
      activeFilesText,
      userRequest: request || "Generate modular architecture following SRP.",
    });
    onCopy(prompt);
    blueprintWorkflow?.setPhase("blueprint_prompt");
  };

  const handleCopyStepPrompt = async () => {
    if (hasErrorsOrUnapplied && atomicStepper.isBatchMode && atomicStepper.currentPhaseIndex > 0) {
      console.warn("[execution-gate] Active phase has unapplied diffs or validation warnings.");
    }
    const activeFilesText = await fetchActiveFilesContent(selectedFiles, request);
    const completedList = Array.from(atomicStepper.completedPaths);
    const upstreamContracts = await fetchUpstreamContracts(completedList);

    if (atomicStepper.isBatchMode && atomicStepper.currentPhase) {
      const prompt = buildPhaseBatchStepPrompt({
        phaseNumber: atomicStepper.currentPhaseIndex + 1,
        totalPhases: atomicStepper.totalPhases,
        phase: atomicStepper.currentPhase,
        completedSteps: completedList,
        upstreamContracts,
        activeFilesText,
        repoMap,
        userRequest: request || "Implement cohesive architectural phase following SRP boundaries.",
      });
      onCopy(prompt);
      return;
    }

    if (!atomicStepper.currentStep) return;
    const prompt = buildStepScopedPrompt({
      stepNumber: atomicStepper.currentStepIndex + 1,
      totalSteps: atomicStepper.totalSteps,
      targetFile: atomicStepper.currentStep,
      completedSteps: completedList,
      upstreamContracts,
      activeFilesText,
      repoMap,
      userRequest: request || "Implement step following SRP boundaries.",
    });
    onCopy(prompt);
  };

  const handleExitStepExecution = (discard = false) => {
    atomicStepper.resetStepper();
    if (blueprintWorkflow) {
      if (discard) {
        blueprintWorkflow.resetWorkflow();
      } else {
        blueprintWorkflow.completeWorkflow();
      }
    }
  };

  const handleDismissStepExecution = () => {
    atomicStepper.dismissStepper();
  };

  const handleResumeStepExecution = () => {
    atomicStepper.resumeStepper();
  };

  const handleFinishAndGenerateTests = async (autoExit?: boolean) => {
    const testFiles = atomicStepper.steps
      .map((s) => s.path)
      .filter((p) => !p.endsWith(".d.ts") && !p.includes(".test."));
    const activeFilesText = await fetchActiveFilesContent(testFiles);
    const prompt = buildUnitTestPrompt({
      activeFilesText,
      userRequest: "Generate comprehensive Vitest unit tests for all implemented steps.",
    });
    onCopy(prompt);
    if (autoExit === true) {
      handleExitStepExecution(false);
    }
  };

  return {
    handleConfrontLogic,
    handleApplyFortifiedCriteria,
    handleGenerateDiscoveryPrompt,
    handleGenerateBlueprintPrompt,
    handleCopyStepPrompt,
    handleFinishAndGenerateTests,
    handleExitStepExecution,
    handleDismissStepExecution,
    handleResumeStepExecution,
  };
}