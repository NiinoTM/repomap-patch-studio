import { useState, useMemo, useEffect } from "react";
import type {
  BlueprintTargetFile,
  StructuredBlueprint,
} from "../../../types/remediation";
import { sortTargetFilesTopologically } from "../utils/stepperPrompt";

export interface UseAtomicStepperParams {
  blueprint?: StructuredBlueprint | null;
  isApproved?: boolean;
}

export interface UseAtomicStepperReturn {
  steps: BlueprintTargetFile[];
  currentStepIndex: number;
  currentStep: BlueprintTargetFile | null;
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

export function useAtomicStepper(
  params: UseAtomicStepperParams = {},
): UseAtomicStepperReturn {
  const { blueprint, isApproved } = params;
  const [steps, setSteps] = useState<BlueprintTargetFile[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedPaths, setCompletedPaths] = useState<Set<string>>(new Set());
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (
      isApproved &&
      blueprint?.targetFiles &&
      blueprint.targetFiles.length > 0 &&
      steps.length === 0
    ) {
      const sorted = sortTargetFilesTopologically(blueprint.targetFiles);
      setSteps(sorted);
      setCurrentStepIndex(0);
      setCompletedPaths(new Set());
      setIsFinished(false);
    }
  }, [isApproved, blueprint]);

  const initSteps = (files: BlueprintTargetFile[]) => {
    const sorted = sortTargetFilesTopologically(files);
    setSteps(sorted);
    setCurrentStepIndex(0);
    setCompletedPaths(new Set());
    setIsFinished(false);
  };

  const currentStep = useMemo(
    () => steps[currentStepIndex] || null,
    [steps, currentStepIndex],
  );

  const totalSteps = steps.length;
  const isLastStep = totalSteps > 0 && currentStepIndex === totalSteps - 1;
  const progressPercent =
    totalSteps > 0 ? Math.round(((currentStepIndex + 1) / totalSteps) * 100) : 0;

  const markCompleted = (path: string) => {
    setCompletedPaths((prev) => new Set([...prev, path]));
  };

  const nextStep = (allowBypass = false): boolean => {
    if (currentStep) {
      markCompleted(currentStep.path);
    }

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
    setCompletedPaths(new Set());
    setIsFinished(false);
  };

  return {
    steps,
    currentStepIndex,
    currentStep,
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