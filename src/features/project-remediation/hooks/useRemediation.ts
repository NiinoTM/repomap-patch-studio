import { useState } from "react";
import { useProjectInitializer } from "./useProjectInitializer";
import { useArchitectureRefactor } from "./useArchitectureRefactor";

export function useRemediation() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"scaffold" | "refactor">("scaffold");

  const initializer = useProjectInitializer();
  const refactor = useArchitectureRefactor();

  return {
    isOpen,
    setIsOpen,
    activeTab,
    setActiveTab,
    initializer,
    refactor,
    // Delegated properties for backwards compatibility
    scaffoldOptions: initializer.scaffoldOptions,
    toggleOption: initializer.toggleOption,
    isScaffolding: initializer.isScaffolding,
    isBootstrapping: initializer.isBootstrapping,
    scaffoldDone: initializer.scaffoldDone,
    bootstrapOutput: initializer.bootstrapOutput,
    handleApplyScaffold: initializer.handleApplyScaffold,
    refactorStep: refactor.refactorStep,
    blueprint: refactor.blueprint,
    selectedMoveIds: refactor.selectedMoveIds,
    toggleMoveSelection: refactor.toggleMoveSelection,
    handleAnalyzeProject: refactor.handleAnalyzeProject,
    handleExecuteSelectedMoves: refactor.handleExecuteSelectedMoves,
  };
}