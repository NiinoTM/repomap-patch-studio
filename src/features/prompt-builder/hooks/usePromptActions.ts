import type React from "react";
import { Ticket } from "../../../types/ticket";
import { filesApi } from "../../../api/repoApi";
import { ticketApi } from "../../../api/ticketApi";
import {
  buildArchitecturalBlueprintPrompt,
  buildUnitTestPrompt,
  formatActiveFilesContext,
} from "../utils/promptTemplates";
import { buildArchitecturalDiscoveryPrompt } from "../utils/blueprintDiscoveryPrompt";
import {
  buildSocraticConfrontationPrompt,
  sanitizeSocraticAnswers,
} from "../utils/socraticPrompt";
import {
  buildStepScopedPrompt,
  buildPhaseBatchStepPrompt,
} from "../utils/stepperPrompt";
import type { UseAtomicStepperReturn } from "./useAtomicStepper";
import type { UseBlueprintWorkflowReturn } from "./useBlueprintWorkflow";
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
  blueprintWorkflow?: UseBlueprintWorkflowReturn;
  hasErrorsOrUnapplied?: boolean;
}

async function fetchUpstreamContracts(completedPaths: string[]): Promise<string> {
  if (completedPaths.length === 0) return "";
  try {
    const res = await fetch("/api/repo/extract-contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths: completedPaths }),
    });
    if (!res.ok) {
      const fallback = await fetch("/api/extract-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: completedPaths }),
      });
      if (!fallback.ok) return "";
      const fbData = await fallback.json();
      return formatExtractedContracts(fbData.contracts);
    }
    const data = await res.json();
    return formatExtractedContracts(data.contracts);
  } catch {
    return "";
  }
}

export function formatExtractedContracts(contracts: unknown): string {
  if (!contracts || typeof contracts !== "object") return "";
  return Object.entries(contracts as Record<string, string>)
    .filter(([filePath, content]) => Boolean(filePath && content && content.trim()))
    .map(([filePath, content]) => `// --- ${filePath} ---\n${content.trim()}`)
    .join("\n\n");
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

  const handleGenerateDiscoveryPrompt = async () => {
    const activeFilesText = await fetchActiveFilesContent(selectedFiles);
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

    const activeFilesText = await fetchActiveFilesContent(selectedFiles);
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
    const activeFilesText = await fetchActiveFilesContent(selectedFiles);
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