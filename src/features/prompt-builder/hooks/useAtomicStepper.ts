import { useState, useMemo, useEffect } from "react";
import type {
  BlueprintTargetFile,
  StructuredBlueprint,
} from "../../../types/remediation";
import {
  sortTargetFilesTopologically,
  groupTargetFilesByDomain,
  type DomainBatchGroup,
} from "../utils/stepperPrompt";

export interface UseAtomicStepperParams {
  blueprint?: StructuredBlueprint | null;
  isApproved?: boolean;
}

export interface UseAtomicStepperReturn {
  steps: BlueprintTargetFile[];
  currentStepIndex: number;
  currentStep: BlueprintTargetFile | null;
  domainBatches: DomainBatchGroup[];
  currentBatchIndex: number;
  currentBatch: DomainBatchGroup | null;
  totalBatches: number;
  isBatchMode: boolean;
  toggleBatchMode: () => void;
  nextBatch: () => boolean;
  prevBatch: () => void;
  completedPaths: Set<string>;
  totalSteps: number;
  progressPercent: number;
  isLastStep: boolean;
  isFinished: boolean;
  initSteps: (files: BlueprintTargetFile[]) => void;
  nextStep: (allowBypass?: boolean) => boolean;
  prevStep: () => void;
  goToStep: (index: number) => void;
  addAdHocStep: (file: BlueprintTargetFile) => void;
  markCompleted: (path: string) => void;
  resetStepper: () => void;
}

function computeProgress(current: number, total: number): number {
  return total > 0 ? Math.round(((current + 1) / total) * 100) : 0;
}

function appendCompletedBatch(
  prev: Set<string>,
  batch: DomainBatchGroup | null,
): Set<string> {
  if (!batch) return prev;
  const next = new Set(prev);
  batch.files.forEach((f) => next.add(f.path));
  return next;
}

export function useAtomicStepper(
  params: UseAtomicStepperParams = {},
): UseAtomicStepperReturn {
  const { blueprint, isApproved } = params;
  const [steps, setSteps] = useState<BlueprintTargetFile[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [completedPaths, setCompletedPaths] = useState<Set<string>>(new Set());
  const [isFinished, setIsFinished] = useState(false);

  const domainBatches = useMemo(() => groupTargetFilesByDomain(steps), [steps]);
  const currentBatch = useMemo(
    () => domainBatches[currentBatchIndex] || null,
    [domainBatches, currentBatchIndex],
  );
  const currentStep = useMemo(
    () => steps[currentStepIndex] || null,
    [steps, currentStepIndex],
  );

  const totalSteps = steps.length;
  const totalBatches = domainBatches.length;

  const initSteps = (files: BlueprintTargetFile[]) => {
    setSteps(sortTargetFilesTopologically(files));
    setCurrentStepIndex(0);
    setCurrentBatchIndex(0);
    setCompletedPaths(new Set());
    setIsFinished(false);
  };

  useEffect(() => {
    if (isApproved && blueprint?.targetFiles?.length && steps.length === 0) {
      initSteps(blueprint.targetFiles);
    }
  }, [isApproved, blueprint]);

  const isLastStep = isBatchMode
    ? totalBatches > 0 && currentBatchIndex === totalBatches - 1
    : totalSteps > 0 && currentStepIndex === totalSteps - 1;

  const progressPercent = isBatchMode
    ? computeProgress(currentBatchIndex, totalBatches)
    : computeProgress(currentStepIndex, totalSteps);

  const markCompleted = (path: string) => {
    setCompletedPaths((prev) => new Set([...prev, path]));
  };

  const nextBatch = (): boolean => {
    setCompletedPaths((prev) => appendCompletedBatch(prev, currentBatch));
    if (currentBatchIndex >= totalBatches - 1) {
      setIsFinished(true);
      return true;
    }
    setCurrentBatchIndex((prev) => prev + 1);
    return true;
  };

  const prevBatch = () => {
    if (currentBatchIndex > 0) {
      setCurrentBatchIndex((prev) => prev - 1);
      setIsFinished(false);
    }
  };

  const nextStep = (allowBypass = false): boolean => {
    if (isBatchMode) return nextBatch();
    if (currentStep) markCompleted(currentStep.path);
    if (isLastStep) {
      setIsFinished(true);
      return true;
    }
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      return true;
    }
    return allowBypass;
  };

  const prevStep = () => {
    if (isBatchMode) return prevBatch();
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      setIsFinished(false);
    }
  };

  const goToStep = (index: number) => {
    if (index >= 0 && index < totalSteps) {
      setCurrentStepIndex(index);
      setIsFinished(false);
    }
  };

  const addAdHocStep = (file: BlueprintTargetFile) => {
    setSteps((prev) => {
      const next = [...prev];
      next.splice(currentStepIndex + 1, 0, file);
      return next;
    });
  };

  const resetStepper = () => {
    setSteps([]);
    setCurrentStepIndex(0);
    setCurrentBatchIndex(0);
    setCompletedPaths(new Set());
    setIsFinished(false);
  };

  return {
    steps,
    currentStepIndex,
    currentStep,
    domainBatches,
    currentBatchIndex,
    currentBatch,
    totalBatches,
    isBatchMode,
    toggleBatchMode: () => setIsBatchMode((prev) => !prev),
    nextBatch,
    prevBatch,
    completedPaths,
    totalSteps,
    progressPercent,
    isLastStep,
    isFinished,
    initSteps,
    nextStep,
    prevStep,
    goToStep,
    addAdHocStep,
    markCompleted,
    resetStepper,
  };
}