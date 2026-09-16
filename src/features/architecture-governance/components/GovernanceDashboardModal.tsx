import { useState } from "react";
import { Shield, X, FolderTree } from "lucide-react";
import { useArchitectureRefactor } from "../hooks/useArchitectureRefactor";
import { useGovernancePatcher } from "../hooks/useGovernancePatcher";
import { GuardrailsPatcherTab } from "./tabs/GuardrailsPatcherTab";
import { ArchitectureRefactorTab } from "./tabs/ArchitectureRefactorTab";

interface GovernanceDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GovernanceDashboardModal({
  isOpen,
  onClose,
}: GovernanceDashboardModalProps) {
  const [activeTab, setActiveTab] = useState<"guardrails" | "refactor">("guardrails");
  const patcher = useGovernancePatcher();
  const refactor = useArchitectureRefactor();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <Shield className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">
                Architecture Governance & Remediation Studio
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono">
                Audit existing repository health, inject guardrails, and refactor messy directories
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/50 p-1 space-x-1">
          <button
            onClick={() => setActiveTab("guardrails")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
              activeTab === "guardrails"
                ? "bg-zinc-800 text-cyan-300 shadow-sm border border-zinc-700/60"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>1. Progressive Guardrails</span>
          </button>

          <button
            onClick={() => setActiveTab("refactor")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
              activeTab === "refactor"
                ? "bg-zinc-800 text-purple-300 shadow-sm border border-zinc-700/60"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>2. Feature Domain Refactor</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === "guardrails" ? (
            <GuardrailsPatcherTab
              options={patcher.options}
              onToggleOption={patcher.toggleOption}
              isPatching={patcher.isPatching}
              isBootstrapping={patcher.isBootstrapping}
              patchDone={patcher.patchDone}
              bootstrapOutput={patcher.bootstrapOutput}
              onApplyGuardrails={patcher.handleApplyGuardrails}
            />
          ) : (
            <ArchitectureRefactorTab
              step={refactor.refactorStep}
              blueprint={refactor.blueprint}
              selectedMoveIds={refactor.selectedMoveIds}
              onToggleMoveSelection={refactor.toggleMoveSelection}
              onAnalyzeProject={refactor.handleAnalyzeProject}
              onExecuteMoves={refactor.handleExecuteSelectedMoves}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 text-[11px] text-zinc-500 flex justify-between items-center font-mono">
          <span>Target Workspace: Active Repository</span>
          <span>Press Esc to close</span>
        </div>
      </div>
    </div>
  );
}