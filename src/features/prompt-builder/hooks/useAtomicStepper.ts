import { useState, useMemo, useEffect } from "react";
import type {
  BlueprintTargetFile,
  BlueprintPhase,
  StructuredBlueprint,
} from "../../../types/remediation";
import {
  groupTargetFilesByPhase,
  type DomainBatchGroup,
} from "../utils/stepperPrompt";

export interface UseAtomicStepperParams {
  blueprint?: StructuredBlueprint | null;
  isApproved?: boolean;
}

export interface UseAtomicStepperReturn {
  phases: BlueprintPhase[];
  currentPhaseIndex: number;
  currentPhase: BlueprintPhase | null;
  currentPhaseStepIndex: number;
  totalPhases: number;
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
  isDismissed: boolean;
  initSteps: (files: BlueprintTargetFile[]) => void;
  initPhases: (blueprint: StructuredBlueprint) => void;
  nextStep: (allowBypass?: boolean) => boolean;
  prevStep: () => void;
  goToStep: (index: number) => void;
  goToPhase: (phaseIndex: number) => void;
  addAdHocStep: (file: BlueprintTargetFile) => void;
  markCompleted: (path: string) => void;
  resetStepper: () => void;
  dismissStepper: () => void;
  resumeStepper: () => void;
}

function computeProgress(current: number, total: number): number {
  return total > 0 ? Math.round(((current + 1) / total) * 100) : 0;
}

function calculateGlobalStepIndex(phases: BlueprintPhase[], phaseIdx: number, stepIdx: number): number {
  let count = 0;
  for (let i = 0; i < phaseIdx; i++) {
    count += phases[i]?.files?.length || 0;
  }
  return count + stepIdx;
}

function locateStepCoordinates(phases: BlueprintPhase[], globalIndex: number): { phaseIdx: number; stepIdx: number } {
  let acc = 0;
  for (let p = 0; p < phases.length; p++) {
    const len = phases[p]?.files?.length || 0;
    if (globalIndex < acc + len) {
      return { phaseIdx: p, stepIdx: globalIndex - acc };
    }
    acc += len;
  }
  return { phaseIdx: 0, stepIdx: 0 };
}

function insertAdHocFile(prev: BlueprintPhase[], phaseIdx: number, stepIdx: number, file: BlueprintTargetFile): BlueprintPhase[] {
  if (prev.length === 0) {
    return [{ id: "phase-adhoc", name: "Ad-hoc Phase", intent: "Supplementary step", files: [file], verificationCriteria: [] }];
  }
  return prev.map((phase, pIdx) => {
    if (pIdx !== phaseIdx) return phase;
    const updatedFiles = [...phase.files];
    updatedFiles.splice(stepIdx + 1, 0, file);
    return { ...phase, files: updatedFiles };
  });
}

function getNextStepState(
  currentPhase: BlueprintPhase | null,
  phaseIdx: number,
  stepIdx: number,
  totalPhases: number,
): { nextPhaseIdx: number; nextStepIdx: number; finished: boolean } {
  if (currentPhase && stepIdx < currentPhase.files.length - 1) {
    return { nextPhaseIdx: phaseIdx, nextStepIdx: stepIdx + 1, finished: false };
  }
  if (phaseIdx < totalPhases - 1) {
    return { nextPhaseIdx: phaseIdx + 1, nextStepIdx: 0, finished: false };
  }
  return { nextPhaseIdx: phaseIdx, nextStepIdx: stepIdx, finished: true };
}

function getPrevStepState(
  phases: BlueprintPhase[],
  phaseIdx: number,
  stepIdx: number,
): { prevPhaseIdx: number; prevStepIdx: number } {
  if (stepIdx > 0) {
    return { prevPhaseIdx: phaseIdx, prevStepIdx: stepIdx - 1 };
  }
  if (phaseIdx > 0) {
    const prevPhaseLen = phases[phaseIdx - 1]?.files?.length || 1;
    return { prevPhaseIdx: phaseIdx - 1, prevStepIdx: prevPhaseLen - 1 };
  }
  return { prevPhaseIdx: 0, prevStepIdx: 0 };
}

export function useAtomicStepper(params: UseAtomicStepperParams = {}): UseAtomicStepperReturn {
  const { blueprint, isApproved } = params;
  const [phases, setPhases] = useState<BlueprintPhase[]>([]);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [currentPhaseStepIndex, setCurrentPhaseStepIndex] = useState(0);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [completedPaths, setCompletedPaths] = useState<Set<string>>(new Set());
  const [isFinished, setIsFinished] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const currentPhase = useMemo(() => phases[currentPhaseIndex] || null, [phases, currentPhaseIndex]);
  const steps = useMemo(() => phases.flatMap((p) => p.files), [phases]);
  const currentStep = useMemo(() => currentPhase?.files[currentPhaseStepIndex] || null, [currentPhase, currentPhaseStepIndex]);
  const currentStepIndex = useMemo(() => calculateGlobalStepIndex(phases, currentPhaseIndex, currentPhaseStepIndex), [phases, currentPhaseIndex, currentPhaseStepIndex]);

  const totalPhases = phases.length;
  const totalSteps = steps.length;
  const domainBatches = useMemo<DomainBatchGroup[]>(() => phases.map((p) => ({ domain: p.name, files: p.files })), [phases]);
  const currentBatch = useMemo<DomainBatchGroup | null>(() => (currentPhase ? { domain: currentPhase.name, files: currentPhase.files } : null), [currentPhase]);

  const initPhases = (bp: StructuredBlueprint) => {
    setPhases(groupTargetFilesByPhase(bp));
    setCurrentPhaseIndex(0);
    setCurrentPhaseStepIndex(0);
    setCompletedPaths(new Set());
    setIsFinished(false);
    setIsDismissed(false);
  };

  const initSteps = (files: BlueprintTargetFile[]) => {
    initPhases({ title: "Blueprint", summary: "", domains: [], targetFiles: files });
  };

  useEffect(() => {
    if (isApproved && blueprint && phases.length === 0) {
      initPhases(blueprint);
    }
  }, [isApproved, blueprint]);

  const isLastStep = isBatchMode
    ? totalPhases > 0 && currentPhaseIndex === totalPhases - 1
    : totalSteps > 0 && currentStepIndex === totalSteps - 1;

  const progressPercent = isBatchMode
    ? computeProgress(currentPhaseIndex, totalPhases)
    : computeProgress(currentStepIndex, totalSteps);

  const nextBatch = (): boolean => {
    if (currentBatch) {
      setCompletedPaths((prev) => new Set([...prev, ...currentBatch.files.map((f) => f.path)]));
    }
    if (currentPhaseIndex >= totalPhases - 1) {
      setIsFinished(true);
      return true;
    }
    setCurrentPhaseIndex((prev) => prev + 1);
    setCurrentPhaseStepIndex(0);
    return true;
  };

  const nextStep = (allowBypass = false): boolean => {
    if (isBatchMode) return nextBatch();
    if (currentStep) setCompletedPaths((prev) => new Set([...prev, currentStep.path]));
    const { nextPhaseIdx, nextStepIdx, finished } = getNextStepState(
      currentPhase,
      currentPhaseIndex,
      currentPhaseStepIndex,
      totalPhases,
    );
    if (finished) {
      setIsFinished(true);
      return allowBypass || isLastStep;
    }
    setCurrentPhaseIndex(nextPhaseIdx);
    setCurrentPhaseStepIndex(nextStepIdx);
    return true;
  };

  const prevStep = () => {
    if (isBatchMode) {
      if (currentPhaseIndex > 0) {
        setCurrentPhaseIndex((p) => p - 1);
        setCurrentPhaseStepIndex(0);
      }
    } else {
      const { prevPhaseIdx, prevStepIdx } = getPrevStepState(phases, currentPhaseIndex, currentPhaseStepIndex);
      setCurrentPhaseIndex(prevPhaseIdx);
      setCurrentPhaseStepIndex(prevStepIdx);
    }
    setIsFinished(false);
  };

  return {
    phases, currentPhaseIndex, currentPhase, currentPhaseStepIndex, totalPhases,
    steps, currentStepIndex, currentStep, domainBatches, currentBatch,
    currentBatchIndex: currentPhaseIndex, totalBatches: totalPhases,
    isBatchMode, toggleBatchMode: () => setIsBatchMode((prev) => !prev),
    nextBatch, prevBatch: () => prevStep(),
    completedPaths, totalSteps, progressPercent,
    isLastStep, isFinished, isDismissed,
    initSteps, initPhases, nextStep, prevStep,
    goToStep: (index: number) => {
      const coords = locateStepCoordinates(phases, index);
      setCurrentPhaseIndex(coords.phaseIdx);
      setCurrentPhaseStepIndex(coords.stepIdx);
      setIsFinished(false);
    },
    goToPhase: (pIdx: number) => {
      if (pIdx >= 0 && pIdx < totalPhases) {
        setCurrentPhaseIndex(pIdx);
        setCurrentPhaseStepIndex(0);
        setIsFinished(false);
      }
    },
    addAdHocStep: (file: BlueprintTargetFile) =>
      setPhases((prev) => insertAdHocFile(prev, currentPhaseIndex, currentPhaseStepIndex, file)),
    markCompleted: (p: string) => setCompletedPaths((prev) => new Set([...prev, p])),
    resetStepper: () => {
      setPhases([]);
      setCurrentPhaseIndex(0);
      setCurrentPhaseStepIndex(0);
      setCompletedPaths(new Set());
      setIsFinished(false);
      setIsDismissed(false);
    },
    dismissStepper: () => setIsDismissed(true),
    resumeStepper: () => setIsDismissed(false),
  };
}