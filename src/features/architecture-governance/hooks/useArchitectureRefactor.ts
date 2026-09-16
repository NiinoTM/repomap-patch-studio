import { useState } from "react";
import {
  FeatureBlueprintDomain,
  RefactorStep,
} from "../../../types/remediation";

const INITIAL_BLUEPRINT: FeatureBlueprintDomain[] = [
  {
    name: "Authentication & Users",
    description: "Encapsulate auth forms, session hooks, and token utils",
    proposedPath: "src/features/auth",
    filesToMove: [
      {
        id: "m1",
        sourcePath: "src/components/LoginModal.tsx",
        targetPath: "src/features/auth/components/LoginModal.tsx",
        targetFeature: "auth",
        reason: "UI component specific to user login flows",
        dependentFilesCount: 3,
        status: "pending",
      },
      {
        id: "m2",
        sourcePath: "src/hooks/useAuth.ts",
        targetPath: "src/features/auth/hooks/useAuth.ts",
        targetFeature: "auth",
        reason: "Authentication state management and token storage",
        dependentFilesCount: 8,
        status: "pending",
      },
      {
        id: "m3",
        sourcePath: "src/utils/jwtParser.ts",
        targetPath: "src/features/auth/utils/jwtParser.ts",
        targetFeature: "auth",
        reason: "Pure helper functions for decoding auth tokens",
        dependentFilesCount: 2,
        status: "pending",
      },
    ],
  },
  {
    name: "Billing & Subscriptions",
    description: "Isolate payment gateways, pricing cards, and Stripe clients",
    proposedPath: "src/features/billing",
    filesToMove: [
      {
        id: "m4",
        sourcePath: "src/components/PricingTable.tsx",
        targetPath: "src/features/billing/components/PricingTable.tsx",
        targetFeature: "billing",
        reason: "Presentation component for plans and tiers",
        dependentFilesCount: 1,
        status: "pending",
      },
      {
        id: "m5",
        sourcePath: "src/services/stripeClient.ts",
        targetPath: "src/features/billing/api/stripeClient.ts",
        targetFeature: "billing",
        reason: "Direct API integration client for payment processor",
        dependentFilesCount: 4,
        status: "pending",
      },
    ],
  },
];

const INITIAL_SELECTED_MOVE_IDS = ["m1", "m2", "m3", "m4", "m5"];

export interface UseArchitectureRefactorReturn {
  refactorStep: RefactorStep;
  blueprint: FeatureBlueprintDomain[];
  selectedMoveIds: Set<string>;
  toggleMoveSelection: (id: string) => void;
  handleAnalyzeProject: () => Promise<void>;
  handleExecuteSelectedMoves: () => Promise<void>;
  resetRefactorState: () => void;
}

export function useArchitectureRefactor(): UseArchitectureRefactorReturn {
  const [refactorStep, setRefactorStep] = useState<RefactorStep>("idle");
  const [blueprint] = useState<FeatureBlueprintDomain[]>(INITIAL_BLUEPRINT);
  const [selectedMoveIds, setSelectedMoveIds] = useState<Set<string>>(
    () => new Set(INITIAL_SELECTED_MOVE_IDS),
  );

  const toggleMoveSelection = (id: string) => {
    setSelectedMoveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAnalyzeProject = async () => {
    setRefactorStep("analyzing");
    await new Promise((res) => setTimeout(res, 1800));
    setRefactorStep("blueprint-ready");
  };

  const handleExecuteSelectedMoves = async () => {
    setRefactorStep("executing");
    await new Promise((res) => setTimeout(res, 2000));
    setRefactorStep("done");
  };

  const resetRefactorState = () => {
    setRefactorStep("idle");
    setSelectedMoveIds(new Set(INITIAL_SELECTED_MOVE_IDS));
  };

  return {
    refactorStep,
    blueprint,
    selectedMoveIds,
    toggleMoveSelection,
    handleAnalyzeProject,
    handleExecuteSelectedMoves,
    resetRefactorState,
  };
}