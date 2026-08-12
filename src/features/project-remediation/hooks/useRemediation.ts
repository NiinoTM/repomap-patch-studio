import { useState } from "react";
import {
  GovernanceScaffoldOptions,
  FeatureBlueprintDomain,
} from "../../../types/remediation";

export function useRemediation() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"scaffold" | "refactor">(
    "scaffold",
  );
  const [isScaffolding, setIsScaffolding] = useState(false);
  const [scaffoldDone, setScaffoldDone] = useState(false);

  const [scaffoldOptions, setScaffoldOptions] =
    useState<GovernanceScaffoldOptions>({
      eslintSizeLimits: true,
      eslintLayerBoundaries: true,
      huskyPreCommitHook: true,
      huskyLeakedMarkerCheck: true,
      softTechnicalDebtMode: true,
    });

  const [refactorStep, setRefactorStep] = useState<
    "idle" | "analyzing" | "blueprint-ready" | "executing" | "done"
  >("idle");

  // Mock initial blueprint data representing a messy, flat project being migrated into Feature-Driven domains
  const [blueprint] = useState<FeatureBlueprintDomain[]>([
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
      description:
        "Isolate payment gateways, pricing cards, and Stripe clients",
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
  ]);

  const [selectedMoveIds, setSelectedMoveIds] = useState<Set<string>>(
    new Set(["m1", "m2", "m3", "m4", "m5"]),
  );

  const toggleOption = (key: keyof GovernanceScaffoldOptions) => {
    setScaffoldOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApplyScaffold = async () => {
    setIsScaffolding(true);
    // Placeholder API call simulation
    await new Promise((res) => setTimeout(res, 1200));
    setIsScaffolding(false);
    setScaffoldDone(true);
  };

  const handleAnalyzeProject = async () => {
    setRefactorStep("analyzing");
    await new Promise((res) => setTimeout(res, 1800));
    setRefactorStep("blueprint-ready");
  };

  const toggleMoveSelection = (id: string) => {
    setSelectedMoveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExecuteSelectedMoves = async () => {
    setRefactorStep("executing");
    await new Promise((res) => setTimeout(res, 2000));
    setRefactorStep("done");
  };

  return {
    isOpen,
    setIsOpen,
    activeTab,
    setActiveTab,
    scaffoldOptions,
    toggleOption,
    isScaffolding,
    scaffoldDone,
    handleApplyScaffold,
    refactorStep,
    blueprint,
    selectedMoveIds,
    toggleMoveSelection,
    handleAnalyzeProject,
    handleExecuteSelectedMoves,
  };
}
