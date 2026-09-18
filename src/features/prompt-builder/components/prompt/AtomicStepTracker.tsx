import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ListOrdered,
  Plus,
  FlaskConical,
  Copy,
  AlertTriangle,
  X,
} from "lucide-react";
import type {
  BlueprintTargetFile,
  BlueprintPhase,
} from "../../../../types/remediation";
interface AtomicStepTrackerProps {
  currentStep: BlueprintTargetFile | null;
  currentStepIndex: number;
  totalSteps: number;
  progressPercent: number;
  isLastStep: boolean;
  isFinished: boolean;
  hasErrorsOrUnapplied: boolean;
  currentPhase?: BlueprintPhase | null;
  currentPhaseIndex?: number;
  totalPhases?: number;
  onCopyStepPrompt: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onAddAdHocStep: (file: BlueprintTargetFile) => void;
  onFinishAndGenerateTests: () => void;
  onDismiss?: () => void;
  onExitExecution?: (discard?: boolean) => void;
}

interface AdHocStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (file: BlueprintTargetFile) => void;
  defaultDomain: string;
}

function AdHocStepModal({
  isOpen,
  onClose,
  onAdd,
  defaultDomain,
}: AdHocStepModalProps) {
  const [newPath, setNewPath] = useState("");
  const [newResp, setNewResp] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPath.trim()) return;
    const inferredDomain = newPath.split("/")[2] || defaultDomain || "feature";
    onAdd({
      path: newPath.trim(),
      domain: inferredDomain,
      responsibility: newResp.trim() || "Supplementary implementation step",
    });
    setNewPath("");
    setNewResp("");
    onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-zinc-900 border border-zinc-700 p-2.5 rounded-lg space-y-2 text-[11px]"
    >
      <div className="font-bold text-zinc-200">Insert Ad-hoc Step</div>
      <input
        type="text"
        value={newPath}
        onChange={(e) => setNewPath(e.target.value)}
        placeholder="Target file path (e.g. src/utils/helper.ts)"
        className="w-full bg-zinc-950 border border-zinc-700 p-1.5 rounded text-zinc-200"
      />
      <input
        type="text"
        value={newResp}
        onChange={(e) => setNewResp(e.target.value)}
        placeholder="Responsibility description"
        className="w-full bg-zinc-950 border border-zinc-700 p-1.5 rounded text-zinc-200"
      />
      <div className="flex justify-end space-x-1.5">
        <button
          type="button"
          onClick={onClose}
          className="px-2 py-1 text-zinc-400 hover:text-zinc-200 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-1 bg-cyan-600 text-white rounded font-medium cursor-pointer"
        >
          Insert
        </button>
      </div>
    </form>
  );
}

export function AtomicStepTracker({
  currentStep,
  currentStepIndex,
  totalSteps,
  progressPercent,
  isLastStep,
  isFinished,
  hasErrorsOrUnapplied,
  currentPhase,
  currentPhaseIndex,
  totalPhases,
  onCopyStepPrompt,
  onNextStep,
  onPrevStep,
  onAddAdHocStep,
  onFinishAndGenerateTests,
  onDismiss,
  onExitExecution,
}: AtomicStepTrackerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!currentStep && !isFinished) return null;

  return (
    <div className={`bg-zinc-950 border border-cyan-500/30 rounded-xl ${isCollapsed ? "p-2.5 space-y-2" : "p-3 space-y-2.5"} shadow-lg shadow-cyan-950/20 shrink-0 font-sans text-xs`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ListOrdered className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-zinc-200 font-mono">
            {isFinished
              ? "All Steps Completed"
              : currentPhase
                ? `Phase ${(currentPhaseIndex ?? 0) + 1} of ${totalPhases ?? 1}: ${currentPhase.name}`
                : `Step ${currentStepIndex + 1} of ${totalSteps}`}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">({progressPercent}%)</span>
        </div>

        <div className="flex items-center space-x-1">
          {!isFinished && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10px] rounded border border-zinc-800 flex items-center space-x-1 cursor-pointer transition-colors"
              title="Insert an ad-hoc step into the execution pipeline"
            >
              <Plus className="w-3 h-3" />
              <span>Ad-hoc Step</span>
            </button>
          )}

          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 cursor-pointer transition-colors"
            title={isCollapsed ? "Expand step tracker" : "Collapse step tracker"}
            aria-label={isCollapsed ? "Expand step tracker" : "Collapse step tracker"}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 cursor-pointer transition-colors"
              title="Dismiss step tracker (pause execution)"
              aria-label="Dismiss step tracker"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {!isCollapsed && (
        <>
          {!isFinished && currentStep && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-cyan-300 font-bold truncate max-w-[70%]">
                  {currentStep.path}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 bg-zinc-800 text-zinc-400 rounded uppercase font-mono">
                  {currentStep.domain}
                </span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed truncate">
                {currentStep.responsibility}
              </p>
            </div>
          )}

          {hasErrorsOrUnapplied && (
            <div className="flex items-center space-x-1.5 text-amber-400 text-[11px] font-mono bg-amber-950/20 border border-amber-500/20 px-2 py-1 rounded">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Phase has unapplied diffs or validation warnings. Apply changes before advancing.</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={onPrevStep}
              disabled={currentStepIndex === 0 || isFinished}
              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 disabled:opacity-30 rounded flex items-center space-x-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            {!isFinished ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={onCopyStepPrompt}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded flex items-center space-x-1 cursor-pointer transition-colors shadow-sm"
                  title="Copy step-scoped prompt with bounded context"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Step Prompt</span>
                </button>

                {isLastStep ? (
                  <button
                    onClick={onFinishAndGenerateTests}
                    disabled={hasErrorsOrUnapplied}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded flex items-center space-x-1 cursor-pointer transition-colors shadow-sm"
                    title={hasErrorsOrUnapplied ? "Resolve unapplied diffs before finishing" : "Finish and generate tests"}
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>Finish & Test</span>
                  </button>
                ) : (
                  <button
                    onClick={onNextStep}
                    disabled={hasErrorsOrUnapplied}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-200 font-medium rounded flex items-center space-x-1 cursor-pointer transition-colors"
                    title={hasErrorsOrUnapplied ? "Resolve unapplied diffs or validation warnings before proceeding" : "Advance to next step"}
                  >
                    <span>Next Step</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={onFinishAndGenerateTests}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-emerald-950/30 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Generate Closing Tests (Vitest)</span>
                </button>
                {onExitExecution && (
                  <button
                    onClick={() => onExitExecution(false)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium rounded cursor-pointer transition-colors"
                  >
                    Exit Execution Mode
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <AdHocStepModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={onAddAdHocStep}
        defaultDomain={currentStep?.domain || "feature"}
      />
    </div>
  );
}