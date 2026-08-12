import { Shield, Sparkles, X } from "lucide-react";
import { useRemediation } from "../hooks/useRemediation";
import { GovernanceScaffoldTab } from "./tabs/GovernanceScaffoldTab";
import { ArchitectureRefactorTab } from "./tabs/ArchitectureRefactorTab";

interface RemediationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RemediationModal({ isOpen, onClose }: RemediationModalProps) {
  const remediation = useRemediation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">
                Project Remediation & Governance Studio
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono">
                Inject modular guardrails and refactor messy codebases into
                Feature-Driven domains
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

        {/* Tabs navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/50 p-1 space-x-1">
          <button
            onClick={() => remediation.setActiveTab("scaffold")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
              remediation.activeTab === "scaffold"
                ? "bg-zinc-800 text-cyan-300 shadow-sm border border-zinc-700/60"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>1. Governance & Rules Scaffolder</span>
          </button>

          <button
            onClick={() => remediation.setActiveTab("refactor")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
              remediation.activeTab === "refactor"
                ? "bg-zinc-800 text-purple-300 shadow-sm border border-zinc-700/60"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>2. Feature-Driven Refactoring</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
          {remediation.activeTab === "scaffold" ? (
            <GovernanceScaffoldTab
              options={remediation.scaffoldOptions}
              onToggleOption={remediation.toggleOption}
              isScaffolding={remediation.isScaffolding}
              scaffoldDone={remediation.scaffoldDone}
              onApplyScaffold={remediation.handleApplyScaffold}
            />
          ) : (
            <ArchitectureRefactorTab
              step={remediation.refactorStep}
              blueprint={remediation.blueprint}
              selectedMoveIds={remediation.selectedMoveIds}
              onToggleMoveSelection={remediation.toggleMoveSelection}
              onAnalyzeProject={remediation.handleAnalyzeProject}
              onExecuteMoves={remediation.handleExecuteSelectedMoves}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 text-[11px] text-zinc-500 flex justify-between items-center font-mono">
          <span>Target Path: Active Workspace</span>
          <span>Press Esc to exit</span>
        </div>
      </div>
    </div>
  );
}
